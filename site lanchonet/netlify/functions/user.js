import { neon } from "@netlify/neon";
import jwt from "jsonwebtoken";

export default async (req, context) => {
  // Esta função só aceita o método GET
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  }

  const sql = neon();

  try {
    // 1. Extrai e valida o token JWT dos cabeçalhos da requisição
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return new Response(
        JSON.stringify({ message: "Acesso negado. Nenhum token encontrado." }),
        { status: 401 }
      );
    }

    // 2. Verifica o token para obter o ID do utilizador
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Busca os dados do utilizador no banco de dados, excluindo a senha
    const [user] = await sql`
      SELECT id, name, phone, is_admin, loyalty_stamps
      FROM users
      WHERE id = ${decoded.id}
    `;

    if (user) {
      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(
        JSON.stringify({ message: "Utilizador não encontrado." }),
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(error);
    if (error.name === "JsonWebTokenError") {
      return new Response(JSON.stringify({ message: "Token inválido." }), {
        status: 401,
      });
    }
    return new Response(
      JSON.stringify({ message: "Erro interno do servidor." }),
      { status: 500 }
    );
  }
};
