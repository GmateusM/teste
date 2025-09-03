import { neon } from "@netlify/neon";
import jwt from "jsonwebtoken";

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  }

  const sql = neon();

  try {
    // Autenticação do utilizador
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return new Response(JSON.stringify({ message: "Acesso negado." }), {
        status: 401,
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const { items, total, address } = await req.json();

    if (!items || items.length === 0 || !total || !address) {
      return new Response(
        JSON.stringify({ message: "Dados do pedido incompletos." }),
        {
          status: 400,
        }
      );
    }
    
    // --- LÓGICA DE TRANSAÇÃO MANUAL CORRIGIDA ---
    let newLoyaltyStamps;
    let rewardMessage = "";

    await sql`BEGIN`; // Inicia a transação

    try {
      // 1. Busca e calcula os selos de fidelidade
      const [user] =
        await sql`SELECT loyalty_stamps FROM users WHERE id = ${userId}`;
      if (!user) {
        throw new Error("Utilizador não encontrado");
      }

      newLoyaltyStamps = user.loyalty_stamps + 1;
      let rewardApplied = false;
      if (newLoyaltyStamps >= 10) {
        rewardApplied = true;
        rewardMessage =
          "Parabéns! Você ganhou um X-Burguer de graça neste pedido!";
        newLoyaltyStamps = 0;
      }

      // 2. Atualiza os selos do utilizador
      await sql`UPDATE users SET loyalty_stamps = ${newLoyaltyStamps} WHERE id = ${userId}`;

      // 3. Cria o registo do pedido
      const [order] = await sql`
        INSERT INTO orders (user_id, total, address, reward_applied)
        VALUES (${userId}, ${total}, ${address}, ${rewardApplied})
        RETURNING id;
      `;
      const orderId = order.id;

      // 4. Insere cada item do pedido
      for (const item of items) {
        await sql`
          INSERT INTO order_items (order_id, product_id, quantity, price, name)
          VALUES (${orderId}, ${item.id}, ${item.quantity}, ${item.price}, ${item.name});
        `;
      }

      await sql`COMMIT`; // Confirma todas as operações se tudo correu bem

    } catch (error) {
      await sql`ROLLBACK`; // Desfaz todas as operações se algum erro ocorreu
      throw error; // Lança o erro para ser apanhado pelo catch principal
    }

    // Se a transação foi bem-sucedida, envia a resposta
    return new Response(
      JSON.stringify({
        loyalty: {
          newStampCount: newLoyaltyStamps,
          rewardMessage: rewardMessage,
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("--- ERRO GERAL NA FUNÇÃO ORDERS.JS ---");
    console.error(error);
    if (error.name === "JsonWebTokenError") {
      return new Response(JSON.stringify({ message: "Token inválido." }), {
        status: 401,
      });
    }
    return new Response(
      JSON.stringify({ message: `Erro ao criar o pedido: ${error.message}` }),
      { status: 500 }
    );
  }
};
