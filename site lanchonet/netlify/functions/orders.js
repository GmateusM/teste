import { neon } from "@netlify/neon";
import jwt from "jsonwebtoken";

export default async (req, context) => {
  // Esta função só aceita o método POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  }

  const sql = neon();

  try {
    // 1. Autenticar o utilizador e obter o seu ID
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return new Response(JSON.stringify({ message: "Acesso negado." }), {
        status: 401,
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const { items, total, address } = await req.json();

    // Inicia uma transação no banco de dados
    const result = await sql.transaction(async (tx) => {
      // 2. Busca os selos de fidelidade atuais do utilizador
      const [user] =
        await tx`SELECT loyalty_stamps FROM users WHERE id = ${userId}`;
      if (!user) {
        // Este erro irá cancelar a transação
        throw new Error("Utilizador não encontrado");
      }

      // 3. Lógica do Cartão Fidelidade
      let newLoyaltyStamps = user.loyalty_stamps + 1;
      let rewardApplied = false;
      let rewardMessage = "";
      if (newLoyaltyStamps >= 10) {
        rewardApplied = true;
        rewardMessage =
          "Parabéns! Você ganhou um X-Burguer de graça neste pedido!";
        newLoyaltyStamps = 0; // Zera o contador de selos
      }

      // 4. Atualiza a contagem de selos do utilizador
      await tx`UPDATE users SET loyalty_stamps = ${newLoyaltyStamps} WHERE id = ${userId}`;

      // 5. Cria o registo do pedido na tabela 'orders' e obtém o ID do novo pedido
      const [order] = await tx`
        INSERT INTO orders (user_id, total, address, reward_applied)
        VALUES (${userId}, ${total}, ${address}, ${rewardApplied})
        RETURNING id;
      `;
      const orderId = order.id;

      // 6. Insere cada item do carrinho na tabela 'order_items'
      for (const item of items) {
        await tx`
          INSERT INTO order_items (order_id, product_id, quantity, price, name)
          VALUES (${orderId}, ${item.id}, ${item.quantity}, ${item.price}, ${item.name});
        `;
      }

      // 7. Se tudo correu bem, retorna os dados de fidelidade
      return {
        loyalty: {
          newStampCount: newLoyaltyStamps,
          rewardMessage: rewardMessage,
        },
      };
    });

    // Se a transação foi bem-sucedida, envia a resposta
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
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
