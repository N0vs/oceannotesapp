import jwt from 'jsonwebtoken';

// Em um projeto real, a chave secreta deve vir de variáveis de ambiente
const secretKey = 'sua_chave_secreta_super_segura';

const authMiddleware = (handler) => async (req, res) => {
  // Tentar obter token do header Authorization primeiro, depois dos cookies
  let token;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.headers.cookie) {
    // Extrair token dos cookies
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    token = cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded; // Mantém o payload completo em req.user
    req.userId = decoded.id; // Adiciona o ID do usuário diretamente em req para fácil acesso
    return handler(req, res);
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};

export default authMiddleware;
