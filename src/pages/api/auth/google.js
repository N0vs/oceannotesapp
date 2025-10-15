import { OAuth2Client } from 'google-auth-library';
import UtilizadorService from '../../../services/UtilizadorService.js';
import EmailService from '../../../services/EmailService.js';
import { SignJWT } from 'jose';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * API endpoint para autenticação via Google OAuth 2.0
 * Processa tokens do Google Identity Services e cria/autentica usuários
 * 
 * @api {POST} /api/auth/google Autenticar com Google
 * @apiName GoogleAuth
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 * 
 * @apiParam {string} credential Token JWT do Google Identity Services
 * 
 * @apiSuccess {string} token JWT token para autenticação na aplicação
 * @apiSuccess {Object} user Dados do usuário
 * @apiSuccess {string} user.email Email do usuário
 * @apiSuccess {string} user.name Nome do usuário
 * @apiSuccess {boolean} isNewUser Indica se é um novo usuário
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *       "user": {
 *         "email": "user@gmail.com",
 *         "name": "User Name"
 *       },
 *       "isNewUser": false
 *     }
 * 
 * @apiError (400) MissingCredential Token Google é obrigatório
 * @apiError (401) InvalidToken Token Google inválido
 * @apiError (500) InternalError Erro interno do servidor
 * 
 * @description Endpoint para OAuth com Google incluindo criação automática de contas
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Token Google é obrigatório' });
    }

    // Verificar o token Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    console.log('Usuário Google autenticado:', { email, name });

    // Verificar se o usuário já existe
    const existingUser = await UtilizadorService.findByEmail(email);
    
    let user;
    let isNewUser = false;

    if (existingUser) {
      // Usuário existe - fazer login
      user = existingUser;
      console.log('Usuário existente fazendo login:', email);
    } else {
      // Usuário novo - criar conta
      console.log('Criando novo usuário Google:', email);
      
      try {
        user = await UtilizadorService.createGoogleUser({
          Nome: name,
          Email: email,
          GoogleId: googleId,
          Avatar: picture
        });
        
        isNewUser = true;
        console.log('Usuário Google criado com sucesso:', user);

        // Enviar email de boas-vindas para novos usuários
        try {
          const emailResult = await EmailService.sendWelcomeEmail(email, name);
          console.log('Email de boas-vindas:', emailResult.success ? 'enviado' : 'falhou');
        } catch (emailError) {
          console.error('Erro ao enviar email de boas-vindas:', emailError);
          // Não falhar o login por causa do email
        }
        
      } catch (createError) {
        console.error('Erro ao criar usuário Google:', createError);
        return res.status(500).json({ 
          message: 'Erro ao criar conta com Google',
          error: createError.message 
        });
      }
    }

    // Gerar JWT token
    const tokenPayload = {
      id: user.Id || user.id,
      nome: user.Nome,
      email: user.Email,
      isGoogleUser: true
    };

    const secret = new TextEncoder().encode('sua_chave_secreta_super_segura');
    const token = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret);

    // Definir cookie SEM HttpOnly para permitir leitura no frontend
    const cookieValue = `token=${token}; Path=/; Max-Age=86400; SameSite=Lax`;
    res.setHeader('Set-Cookie', cookieValue);
    console.log('🍪 Cookie definido:', cookieValue.substring(0, 100) + '...');

    res.status(200).json({
      success: true,
      message: isNewUser ? 'Conta criada com Google!' : 'Login com Google realizado!',
      user: {
        id: user.Id || user.id,
        nome: user.Nome,
        email: user.Email,
        avatar: user.Avatar,
        isGoogleUser: true,
        isNewUser
      },
      token
    });

  } catch (error) {
    console.error('Erro na autenticação Google:', error);
    
    if (error.message.includes('Token used too early')) {
      return res.status(400).json({ message: 'Token Google inválido ou expirado' });
    }
    
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
}
