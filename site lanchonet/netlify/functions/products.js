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

// Função auxiliar para validar os dados de um produto
const validateProductData = (data) => {
    const { name, description, price, image, category_id } = data;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw { message: "O nome do produto é obrigatório.", status: 400 };
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
        throw { message: "A descrição do produto é obrigatória.", status: 400 };
    }
    if (price === undefined || typeof price !== 'number' || price <= 0) {
        throw { message: "O preço deve ser um número positivo.", status: 400 };
    }
    if (!image || typeof image !== 'string' || !image.startsWith('http')) {
        throw { message: "O URL da imagem é inválido.", status: 400 };
    }
    // Validação simples para UUID. Pode ser mais robusta se necessário.
    if (!category_id || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(category_id)) {
        throw { message: "O ID da categoria é inválido.", status: 400 };
    }
    return true;
}


export default async (req, context) => {
  const sql = neon();
  const method = req.method;

  try {
    // Rota Pública: Listar todos os produtos ativos
    if (method === "GET") {
      const products = await sql`
        SELECT
            p.id,
            p.name,
            p.description,
            p.price,
            p.old_price,
            p.image,
            p.promo,
            c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = TRUE
        ORDER BY c.display_order, p.created_at DESC
      `;

      const productsByCategory = products.reduce((acc, product) => {
        const { category_name } = product;
        if (!acc[category_name]) {
          acc[category_name] = [];
        }
        acc[category_name].push({
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
    const productId = url.pathname.includes('/api/products/') ? url.pathname.split('/').pop() : null;

    // Rota Privada/Admin: Adicionar um novo produto
    if (method === "POST") {
      const productData = await req.json();
      validateProductData(productData);
      
      const { name, description, price, oldPrice, image, category_id, promo } = productData;

      const [newProduct] = await sql`
        INSERT INTO products (name, description, price, old_price, image, category_id, promo)
        VALUES (${name}, ${description}, ${price}, ${
        oldPrice || null
      }, ${image}, ${category_id}, ${promo})
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

      const productData = await req.json();
      validateProductData(productData);

      const { name, description, price, oldPrice, image, category_id, promo } = productData;

      const [updatedProduct] = await sql`
        UPDATE products
        SET name = ${name}, description = ${description}, price = ${price}, old_price = ${
        oldPrice || null
      }, image = ${image}, category_id = ${category_id}, promo = ${promo}
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

    // Rota Privada/Admin: "Apagar" um produto (Soft Delete)
    if (method === "DELETE") {
      if (!productId) {
        return new Response(
          JSON.stringify({ message: "ID do produto não fornecido." }),
          { status: 400 }
        );
      }
      
      // Em vez de apagar, atualiza o campo is_active para false
      const result = await sql`
        UPDATE products SET is_active = FALSE WHERE id = ${productId};
      `;

      if (result.rowCount === 0) {
        return new Response(
          JSON.stringify({ message: "Produto não encontrado." }),
          { status: 404 }
        );
      }

      return new Response(
        JSON.stringify({ message: "Produto desativado com sucesso." }),
        { status: 200 }
      );
    }

    // Se o método HTTP não for um dos esperados
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  } catch (error) {
    console.error("Erro na função products.js:", error);
    // Trata erros de validação e de permissão
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
