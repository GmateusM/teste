import { neon } from "@netlify/neon";
import jwt from "jsonwebtoken";

// Função auxiliar para verificar se o utilizador é um administrador
const isAdmin = async (req, sql) => {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) {
    throw { message: "Acesso negado.", status: 401 };
  }

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
};

export default async (req, context) => {
  const sql = neon();
  const method = req.method;

  try {
    // Rota Pública: Listar todos os produtos
    if (method === "GET") {
      const products =
        await sql`SELECT * FROM products ORDER BY created_at DESC`;

      const productsByCategory = products.reduce((acc, product) => {
        const { category } = product;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          ...product,
          oldPrice: product.old_price,
        });
        return acc;
      }, {});

      return new Response(JSON.stringify(productsByCategory), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- ROTAS PRIVADAS / ADMIN ---
    await isAdmin(req, sql);

    const url = new URL(req.url);
    const productId = url.pathname.split("/").pop(); // Pega o ID do produto da URL

    // Rota Privada/Admin: Adicionar um novo produto
    if (method === "POST") {
      const { name, description, price, oldPrice, image, category, promo } =
        await req.json();

      const [newProduct] = await sql`
        INSERT INTO products (name, description, price, old_price, image, category, promo)
        VALUES (${name}, ${description}, ${price}, ${
        oldPrice || null
      }, ${image}, ${category}, ${promo})
        RETURNING *;
      `;

      return new Response(JSON.stringify(newProduct), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rota Privada/Admin: Atualizar um produto existente
    if (method === "PUT") {
      if (!productId) {
        return new Response(
          JSON.stringify({ message: "ID do produto não fornecido." }),
          { status: 400 }
        );
      }

      const { name, description, price, oldPrice, image, category, promo } =
        await req.json();

      const [updatedProduct] = await sql`
        UPDATE products
        SET name = ${name}, description = ${description}, price = ${price}, old_price = ${
        oldPrice || null
      }, image = ${image}, category = ${category}, promo = ${promo}
        WHERE id = ${productId}
        RETURNING *;
      `;

      if (!updatedProduct) {
        return new Response(
          JSON.stringify({ message: "Produto não encontrado." }),
          { status: 404 }
        );
      }

      return new Response(JSON.stringify(updatedProduct), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rota Privada/Admin: Apagar um produto
    if (method === "DELETE") {
      if (!productId) {
        return new Response(
          JSON.stringify({ message: "ID do produto não fornecido." }),
          { status: 400 }
        );
      }

      const result = await sql`
        DELETE FROM products WHERE id = ${productId};
      `;

      if (result.rowCount === 0) {
        return new Response(
          JSON.stringify({ message: "Produto não encontrado." }),
          { status: 404 }
        );
      }

      return new Response(
        JSON.stringify({ message: "Produto apagado com sucesso." }),
        { status: 200 }
      );
    }

    // Se o método HTTP não for um dos esperados
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  } catch (error) {
    console.error(error);
    // Trata erros de token inválido ou falta de permissão da função isAdmin
    if (error.status) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: error.status,
      });
    }
    // Trata outros erros
    return new Response(
      JSON.stringify({ message: "Erro interno do servidor." }),
      { status: 500 }
    );
  }
};
