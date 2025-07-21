const jwt = require('jsonwebtoken');

// Em um projeto real, a chave secreta deve vir de variáveis de ambiente
const secretKey = 'sua_chave_secreta_super_segura';

const authMiddleware = (handler) => async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded; // Adiciona o payload do usuário (id, nome) à requisição
    return handler(req, res);
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};

module.exports = authMiddleware;
