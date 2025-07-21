const NotaService = require('../../../services/NotaService.js');
import authMiddleware from '../../../middlewares/authMiddleware.js';

async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      const { topicoId } = req.query;
      const utilizadorId = req.user.id;

      if (!topicoId) {
        return res.status(400).json({ message: 'O ID do tópico é obrigatório.' });
      }

      try {
        const notas = await NotaService.findByTopicId(topicoId, utilizadorId);
        res.status(200).json(notas);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar as notas do tópico.', error: error.message });
      }
      break;
    case 'POST':
      try {
        // O ID do usuário vem do token JWT, decodificado pelo middleware
        const utilizadorId = req.user.id;
        const novaNota = await NotaService.create(req.body, utilizadorId);
        res.status(201).json(novaNota);
      } catch (error) {
        res.status(400).json({ message: 'Erro ao criar nota', error: error.message });
      }
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default authMiddleware(handler);
