import { neon } from "@netlify/neon";
import jwt from "jsonwebtoken";

// Função auxiliar para validar os dados do pedido
const validateOrderData = (data) => {
    const { items, total, address } = data;

    if (!address || typeof address !== 'string' || address.trim().length < 10) {
        throw { message: "O endereço de entrega parece curto ou inválido. Por favor, verifique.", status: 400 };
    }
    if (total === undefined || typeof total !== 'number' || total <= 0) {
        throw { message: "O valor total do pedido é inválido.", status: 400 };
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw { message: "O carrinho não pode estar vazio.", status: 400 };
    }

    // Validação de cada item no carrinho
    for (const item of items) {
        if (!item.id || !item.name || !item.price || !item.quantity) {
            throw { message: `O item "${item.name || 'desconhecido'}" no carrinho está com dados em falta.`, status: 400 };
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
            throw { message: `A quantidade para o item "${item.name}" é inválida.`, status: 400 };
        }
    }
    return true;
}


export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  }

  const sql = neon();

  try {
    // Autenticação do utilizador (obrigatória para registar pedido no sistema)
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return new Response(JSON.stringify({ message: "Acesso negado. Faça login para pontuar e registar o seu pedido." }), {
        status: 401,
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const orderData = await req.json();
    
    // Validação dos dados do pedido
    validateOrderData(orderData);
    
    const { items, total, address } = orderData;

    let newLoyaltyStamps;
    let rewardMessage = "";

    await sql`BEGIN`; // Inicia a transação

    try {
      // 1. Busca e calcula os selos de fidelidade
      const [user] =
        await sql`SELECT loyalty_stamps FROM users WHERE id = ${userId}`;
      if (!user) {
        throw { message: "Utilizador não encontrado", status: 404 };
      }

      newLoyaltyStamps = user.loyalty_stamps + 1;
      let rewardApplied = false;
      if (newLoyaltyStamps >= 10) {
        rewardApplied = true;
        rewardMessage =
          "Parabéns! Você ganhou um X-Burguer de graça neste pedido!";
        newLoyaltyStamps = 0; // Reinicia os selos
      }

      // 2. Atualiza os selos do utilizador
      await sql`UPDATE users SET loyalty_stamps = ${newLoyaltyStamps} WHERE id = ${userId}`;

      // 3. Cria o registo do pedido com o status inicial 'Recebido'
      const [order] = await sql`
        INSERT INTO orders (user_id, total, address, reward_applied, status)
        VALUES (${userId}, ${total}, ${address.trim()}, ${rewardApplied}, 'Recebido')
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

      await sql`COMMIT`; // Confirma todas as operações

    } catch (error) {
      await sql`ROLLBACK`; // Desfaz tudo em caso de erro
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
        status: 201, // 201 Created
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Erro na função orders.js:", error);
    if (error.status) {
        return new Response(JSON.stringify({ message: error.message }), { status: error.status });
    }
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
