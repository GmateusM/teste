import { neon } from "@netlify/neon";
import jwt from "jsonwebtoken";

// Esta é a sua função principal que o Netlify irá executar.
export default async (req, context) => {
  // Configura o acesso ao banco de dados usando a variável de ambiente do Netlify
  const sql = neon();
  const method = req.method;

  try {
    // Rota Pública: Listar todos os produtos
    if (method === "GET") {
      const products =
        await sql`SELECT * FROM products ORDER BY created_at DESC`;

      // Organiza os produtos por categoria, da mesma forma que o front-end espera
      const productsByCategory = products.reduce((acc, product) => {
        const { category } = product;
        if (!acc[category]) {
          acc[category] = [];
        }
        // Converte os nomes dos campos de snake_case (do SQL) para camelCase (do JS)
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

    // Rota Privada/Admin: Adicionar um novo produto
    if (method === "POST") {
      // 1. Verificar autenticação e permissão de administrador
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) {
        return new Response(JSON.stringify({ message: "Acesso negado." }), {
          status: 401,
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [user] =
        await sql`SELECT is_admin FROM users WHERE id = ${decoded.id}`;

      if (!user || !user.is_admin) {
        return new Response(
          JSON.stringify({
            message: "Acesso negado. Rota apenas para administradores.",
          }),
          { status: 403 }
        );
      }

      // 2. Se for admin, adiciona o produto
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

    // Se o método HTTP não for GET ou POST
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  } catch (error) {
    console.error(error);
    // Trata erros de token inválido
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
