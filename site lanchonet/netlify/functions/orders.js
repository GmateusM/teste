import { neon } from "@netlify/neon";
import jwt from "jsonwebtoken";

export default async (req, context) => {
  console.log("--- INICIANDO FUNÇÃO ORDERS.JS ---");

  if (req.method !== "POST") {
    console.error("Erro: Método não permitido. Recebido:", req.method);
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  }

  const sql = neon();

  try {
    console.log("Passo 1: Autenticando o utilizador...");
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      console.error("Erro no Passo 1: Token não encontrado.");
      return new Response(JSON.stringify({ message: "Acesso negado." }), {
        status: 401,
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    console.log("Passo 1 concluído. ID do Utilizador:", userId);

    const { items, total, address } = await req.json();
    console.log("Dados do pedido recebidos:", { items, total, address });

    // Validação básica dos dados recebidos
    if (!items || items.length === 0 || !total || !address) {
        console.error("Erro: Dados do pedido incompletos.", { items, total, address });
        return new Response(JSON.stringify({ message: "Dados do pedido incompletos." }), {
          status: 400,
        });
    }


    console.log("Iniciando transação no banco de dados...");
    const result = await sql.transaction(async (tx) => {
      console.log("Passo 2: Buscando selos de fidelidade do utilizador...");
      const [user] =
        await tx`SELECT loyalty_stamps FROM users WHERE id = ${userId}`;
      if (!user) {
        // Este erro irá cancelar a transação
        console.error("Erro no Passo 2: Utilizador não encontrado na transação.");
        throw new Error("Utilizador não encontrado");
      }
      console.log("Passo 2 concluído. Selos atuais:", user.loyalty_stamps);


      console.log("Passo 3: Calculando lógica de fidelidade...");
      let newLoyaltyStamps = user.loyalty_stamps + 1;
      let rewardApplied = false;
      let rewardMessage = "";
      if (newLoyaltyStamps >= 10) {
        rewardApplied = true;
        rewardMessage =
          "Parabéns! Você ganhou um X-Burguer de graça neste pedido!";
        newLoyaltyStamps = 0;
      }
      console.log("Passo 3 concluído. Novos selos:", newLoyaltyStamps);

      
      console.log("Passo 4: Atualizando contagem de selos...");
      await tx`UPDATE users SET loyalty_stamps = ${newLoyaltyStamps} WHERE id = ${userId}`;
      console.log("Passo 4 concluído.");

      
      console.log("Passo 5: Inserindo o pedido na tabela 'orders'...");
      const [order] = await tx`
        INSERT INTO orders (user_id, total, address, reward_applied)
        VALUES (${userId}, ${total}, ${address}, ${rewardApplied})
        RETURNING id;
      `;
      const orderId = order.id;
      console.log("Passo 5 concluído. ID do Pedido:", orderId);

      
      console.log("Passo 6: Inserindo itens do pedido na tabela 'order_items'...");
      for (const item of items) {
        await tx`
          INSERT INTO order_items (order_id, product_id, quantity, price, name)
          VALUES (${orderId}, ${item.id}, ${item.quantity}, ${item.price}, ${item.name});
        `;
      }
      console.log("Passo 6 concluído. Itens inseridos.");

      
      console.log("Passo 7: Retornando dados da transação...");
      return {
        loyalty: {
          newStampCount: newLoyaltyStamps,
          rewardMessage: rewardMessage,
        },
      };
    });

    console.log("Transação concluída com sucesso. Enviando resposta.");
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
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
