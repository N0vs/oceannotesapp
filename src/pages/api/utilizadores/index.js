const UtilizadorService = require('../../../services/UtilizadorService.js');

export default async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      try {
        const novoUtilizador = await UtilizadorService.create(req.body);
        res.status(201).json(novoUtilizador);
      } catch (error) {
        // Se o erro for de e-mail duplicado, retornar um status 409 (Conflito)
        if (error.message.includes('e-mail fornecido já está em uso')) {
          return res.status(409).json({ message: error.message });
        }
        res.status(400).json({ message: 'Erro ao criar utilizador', error: error.message });
      }
      break;
    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
