import jwt from 'jsonwebtoken';

// Em um projeto real, a chave secreta deve vir de variáveis de ambiente
const secretKey = 'sua_chave_secreta_super_segura';

/**
 * Middleware de autenticação JWT para proteger endpoints da API
 * Valida tokens JWT e injeta dados do usuário na requisição
 * 
 * @middleware authMiddleware
 * @param {Function} handler - Handler da API a ser protegido
 * @returns {Function} Função middleware que processa autenticação
 * 
 * @description Middleware HOF (Higher-Order Function) que:
 * - Extrai token JWT de Authorization header ou cookies
 * - Valida token usando jsonwebtoken
 * - Injeta dados do usuário em req.user e req.userId
 * - Bloqueia acesso se token inválido/ausente
 * - Suporta múltiplos métodos de autenticação (Bearer token, cookies)
 * 
 * @example
 * // Uso em endpoint protegido
 * export default authMiddleware(handler);
 * 
 * @example
 * // Acesso aos dados do usuário no handler
 * const handler = (req, res) => {
 *   const userId = req.userId; // ID extraído do token
 *   const userPayload = req.user; // Payload completo do JWT
 * };
 * 
 * @security
 * - Valida assinatura JWT com chave secreta
 * - Verifica expiração do token automaticamente
 * - Retorna 401 Unauthorized para tokens inválidos
 * - Suporta tokens via Authorization header (padrão) ou cookies
 * 
 * @note Chave secreta deve vir de variável de ambiente em produção
 */
const authMiddleware = (handler) => async (req, res) => {
  // Estratégia de extração multi-fonte: Authorization header tem prioridade
  // Fallback para cookies permite flexibilidade de autenticação
  let token;
  const authHeader = req.headers.authorization;
  
  // Método preferencial: Bearer token no Authorization header
  // Padrão REST/API: "Authorization: Bearer <token>"
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]; // Remove "Bearer " prefix
  } else if (req.headers.cookie) {
    // Fallback para cookies: útil para requests de browser/SPA
    // Parse manual de cookies: Next.js não parseia automaticamente
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    token = cookies.token; // Busca cookie 'token'
  }

  // Validação de presença: token é obrigatório para endpoints protegidos
  // Early return com 401 Unauthorized se token ausente
  if (!token) {
    return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
  }

  try {
    // Verificação JWT: validade + assinatura + expiração automática
    // jwt.verify() lança exceção se token inválido/expirado
    const decoded = jwt.verify(token, secretKey);
    
    // Injeção de dados na requisição: disponibiliza dados do usuário
    req.user = decoded; // Payload completo JWT (id, email, iat, exp, etc.)
    req.userId = decoded.id; // Shortcut conveniente para ID do usuário
    
    // Chain continuation: passa controle para handler original
    return handler(req, res);
  } catch (error) {
    // Error handling uniforme: qualquer erro JWT = 401 Unauthorized
    // Não vaza informações específicas do erro por segurança
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};

export default authMiddleware;
