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
    throw error;
  }
};

export default async (req, context) => {
  const sql = neon();
  const method = req.method;

  try {
    // Rota Pública: Listar todas as categorias
    if (method === "GET") {
      const categories =
        await sql`SELECT * FROM categories ORDER BY display_order ASC, name ASC`;
      return new Response(JSON.stringify(categories), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- ROTAS PRIVADAS / ADMIN ---
    await isAdmin(req, sql);

    const url = new URL(req.url);
    const categoryId = url.pathname.includes("/api/categories/")
      ? url.pathname.split("/").pop()
      : null;

    // Rota Privada/Admin: Adicionar uma nova categoria
    if (method === "POST") {
      const { name, display_order } = await req.json();

      if (!name || typeof name !== "string" || name.trim() === "") {
        return new Response(
          JSON.stringify({ message: "O nome da categoria é obrigatório." }),
          { status: 400 }
        );
      }

      const [newCategory] = await sql`
        INSERT INTO categories (name, display_order)
        VALUES (${name}, ${display_order || 0})
        RETURNING *;
      `;

      return new Response(JSON.stringify(newCategory), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rota Privada/Admin: Atualizar uma categoria
    if (method === "PUT") {
      if (!categoryId) {
        return new Response(
          JSON.stringify({ message: "ID da categoria não fornecido." }),
          { status: 400 }
        );
      }

      const { name, display_order } = await req.json();

      if (!name || typeof name !== "string" || name.trim() === "") {
        return new Response(
          JSON.stringify({ message: "O nome da categoria é obrigatório." }),
          { status: 400 }
        );
      }

      const [updatedCategory] = await sql`
            UPDATE categories
            SET name = ${name}, display_order = ${display_order || 0}
            WHERE id = ${categoryId}
            RETURNING *;
        `;

      if (!updatedCategory) {
        return new Response(
          JSON.stringify({ message: "Categoria não encontrada." }),
          { status: 404 }
        );
      }

      return new Response(JSON.stringify(updatedCategory), { status: 200 });
    }

    // Rota Privada/Admin: Apagar uma categoria
    if (method === "DELETE") {
      if (!categoryId) {
        return new Response(
          JSON.stringify({ message: "ID da categoria não fornecido." }),
          { status: 400 }
        );
      }

      const result =
        await sql`DELETE FROM categories WHERE id = ${categoryId};`;

      if (result.rowCount === 0) {
        return new Response(
          JSON.stringify({ message: "Categoria não encontrada." }),
          { status: 404 }
        );
      }

      // Lembrete: Graças ao `ON DELETE SET NULL` no schema, os produtos desta categoria não serão apagados.
      return new Response(
        JSON.stringify({ message: "Categoria apagada com sucesso." }),
        { status: 200 }
      );
    }

    // Se o método HTTP não for um dos esperados
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  } catch (error) {
    console.error("Erro na função categories.js:", error);
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
