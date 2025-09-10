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
  const method = req.method;

  try {
    // Garante que apenas administradores podem aceder a esta rota
    await isAdmin(req, sql);
    
    // Rota GET: Listar todos os pedidos
    if (method === "GET") {
        const orders = await sql`
          SELECT
            o.id,
            o.total,
            o.address,
            o.status, -- ADICIONADO: Busca o status do pedido
            o.reward_applied,
            o.created_at,
            u.name as user_name,
            u.phone as user_phone
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          ORDER BY o.created_at DESC;
        `;

        const ordersWithItems = [];
        for (const order of orders) {
          const items = await sql`
            SELECT name, quantity, price
            FROM order_items
            WHERE order_id = ${order.id};
          `;
          ordersWithItems.push({ ...order, items });
        }

        return new Response(JSON.stringify(ordersWithItems), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
    }

    // Rota PUT: Atualizar o status de um pedido
    if (method === "PUT") {
        const url = new URL(req.url);
        const orderId = url.pathname.includes('/api/admin-orders/') ? url.pathname.split('/').pop() : null;
        
        if (!orderId) {
            return new Response(JSON.stringify({ message: "ID do pedido não fornecido." }), { status: 400 });
        }
        
        const { status } = await req.json();
        
        if (!status || typeof status !== 'string') {
            return new Response(JSON.stringify({ message: "Status inválido." }), { status: 400 });
        }

        const [updatedOrder] = await sql`
            UPDATE orders SET status = ${status} WHERE id = ${orderId} RETURNING *;
        `;
        
        if (!updatedOrder) {
            return new Response(JSON.stringify({ message: "Pedido não encontrado." }), { status: 404 });
        }
        
        return new Response(JSON.stringify(updatedOrder), { status: 200 });
    }


    // Se o método HTTP não for GET nem PUT
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  } catch (error) {
    console.error("Erro na função admin-orders.js:", error);
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
