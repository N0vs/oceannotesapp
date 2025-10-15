import UtilizadorService from '../../../services/UtilizadorService.js';

/**
 * API endpoint para autenticação de usuários
 * Processa login tradicional com email e senha
 * 
 * @api {POST} /api/auth/login Autenticar usuário
 * @apiName LoginUser
 * @apiGroup Authentication
 * @apiVersion 1.0.0
 * 
 * @apiParam {string} Email Email do usuário
 * @apiParam {string} Password Senha do usuário
 * 
 * @apiSuccess {string} token JWT token para autenticação
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     }
 * 
 * @apiError (400) MissingCredentials Email e senha são obrigatórios
 * @apiError (401) InvalidCredentials Credenciais inválidas
 * @apiError (500) InternalError Erro interno do servidor
 * 
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *     {
 *       "message": "Credenciais inválidas"
 *     }
 * 
 * @description Endpoint para autenticação tradicional com validação de credenciais
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { Email, Password } = req.body;

  if (!Email || !Password) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const { token } = await UtilizadorService.login(Email, Password);
    res.status(200).json({ token });
  } catch (error) {
    // Se o erro for de credenciais inválidas, retornar 401 (Não Autorizado)
    if (error.message.includes('Credenciais inválidas')) {
      return res.status(401).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
}
