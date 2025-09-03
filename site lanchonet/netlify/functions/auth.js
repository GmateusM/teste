import { neon } from "@netlify/neon";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Função auxiliar para gerar o Token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d", // O token irá expirar em 30 dias
  });
};

export default async (req, context) => {
  // Se o método não for POST, recusa a requisição
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  }

  const sql = neon();

  try {
    const { action, ...body } = await req.json();

    // --- ROTA DE REGISTO ---
    if (action === "register") {
      const { name, phone, password } = body;

      // Validação básica
      if (!name || !phone || !password) {
        return new Response(JSON.stringify({ message: "Dados incompletos." }), {
          status: 400,
        });
      }

      // Verifica se o utilizador já existe
      const [existingUser] =
        await sql`SELECT id FROM users WHERE phone = ${phone}`;
      if (existingUser) {
        return new Response(
          JSON.stringify({
            message: "Um utilizador com este telefone já existe.",
          }),
          { status: 400 }
        );
      }

      // Criptografa a senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insere o novo utilizador no banco de dados
      const [newUser] = await sql`
        INSERT INTO users (name, phone, password)
        VALUES (${name}, ${phone}, ${hashedPassword})
        RETURNING id, name, phone, loyalty_stamps, is_admin;
      `;

      const token = generateToken(newUser.id);

      return new Response(JSON.stringify({ ...newUser, token }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- ROTA DE LOGIN ---
    if (action === "login") {
      const { phone, password } = body;

      if (!phone || !password) {
        return new Response(JSON.stringify({ message: "Dados incompletos." }), {
          status: 400,
        });
      }

      // Encontra o utilizador pelo telefone
      const [user] = await sql`SELECT * FROM users WHERE phone = ${phone}`;

      // Se encontrou o utilizador e a senha está correta
      if (user && (await bcrypt.compare(password, user.password))) {
        const token = generateToken(user.id);

        // Retorna os dados do utilizador sem a senha
        const { password: _, ...userData } = user;

        return new Response(JSON.stringify({ ...userData, token }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(
          JSON.stringify({ message: "Telefone ou senha inválidos." }),
          { status: 401 }
        );
      }
    }

    // Se a ação não for 'register' nem 'login'
    return new Response(JSON.stringify({ message: "Ação inválida." }), {
      status: 400,
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: "Erro interno do servidor." }),
      { status: 500 }
    );
  }
};
