const UtilizadorService = require('../../../services/UtilizadorService.js');

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
