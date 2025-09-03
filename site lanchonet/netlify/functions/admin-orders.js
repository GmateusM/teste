import { neon } from "@netlify/neon";
import jwt from "jsonwebtoken";

// Função auxiliar para verificar se o utilizador é um administrador
const isAdmin = async (req, sql) => {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) {
    throw { message: "Acesso negado.", status: 401 };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [user] =
      await sql`SELECT is_admin FROM users WHERE id = ${decoded.id}`;

    if (!user || !user.is_admin) {
      throw {
        message: "Acesso negado. Rota apenas para administradores.",
        status: 403,
      };
    }
    return true;
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw { message: "Token inválido.", status: 401 };
    }
    throw error; // Lança outros erros
  }
};

export default async (req, context) => {
  const sql = neon();

  // Esta rota só aceita o método GET
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  }

  try {
    // 1. Garante que apenas administradores podem aceder a esta rota
    await isAdmin(req, sql);

    // 2. Busca todos os pedidos, juntando os dados do cliente (utilizador)
    // e ordenando pelos mais recentes
    const orders = await sql`
      SELECT
        o.id,
        o.total,
        o.address,
        o.reward_applied,
        o.created_at,
        u.name as user_name,
        u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC;
    `;

    // 3. Para cada pedido, busca os itens correspondentes
    const ordersWithItems = [];
    for (const order of orders) {
      const items = await sql`
        SELECT
          name,
          quantity,
          price
        FROM order_items
        WHERE order_id = ${order.id};
      `;
      ordersWithItems.push({ ...order, items });
    }

    return new Response(JSON.stringify(ordersWithItems), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    if (error.status) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: error.status,
      });
    }
    return new Response(
      JSON.stringify({ message: "Erro interno do servidor." }),
      { status: 500 }
    );
  }
};
