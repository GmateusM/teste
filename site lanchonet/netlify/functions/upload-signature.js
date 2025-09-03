import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import { neon } from "@netlify/neon";

// Função auxiliar para verificar se o utilizador é um administrador
// (Reutilizada para garantir que apenas administradores possam obter a assinatura)
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
  // Configura a conexão com o NeonDB
  const sql = neon();

  // Esta rota só aceita GET
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ message: "Método não permitido" }), {
      status: 405,
    });
  }

  try {
    // 1. Garante que o utilizador é um administrador
    await isAdmin(req, sql);

    // 2. Configura o Cloudinary com as suas credenciais das variáveis de ambiente do Netlify
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    // 3. Gera a assinatura segura
    const timestamp = Math.round(new Date().getTime() / 1000);

    // O `folder` é opcional, mas ajuda a organizar as imagens na sua conta Cloudinary
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: "tocomfome-vr-produtos", // Nome da pasta onde as imagens serão guardadas
      },
      process.env.CLOUDINARY_API_SECRET
    );

    // 4. Retorna a assinatura, o timestamp e a chave da API para o frontend
    // Estes dados serão usados para fazer o upload diretamente do navegador para o Cloudinary
    return new Response(
      JSON.stringify({
        signature,
        timestamp,
        api_key: process.env.CLOUDINARY_API_KEY,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
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
