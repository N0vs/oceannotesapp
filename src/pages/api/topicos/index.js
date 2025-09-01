import TopicoService from '../../../services/TopicoService.js';
import authMiddleware from '../../../middlewares/authMiddleware.js';

const handler = async (req, res) => {
  const utilizadorId = req.userId;

  if (req.method === 'GET') {
    try {
      const topicos = await TopicoService.getByUtilizadorId(utilizadorId);
      res.status(200).json(topicos || []);
    } catch (error) {
      console.log('Erro ao buscar tópicos:', error);
      res.status(200).json([]); // Retorna array vazio em vez de erro
    }
  } else if (req.method === 'POST') {
    try {
      const { nome, cor } = req.body;
      const novoTopico = await TopicoService.create({ nome, cor, utilizadorId });
      res.status(201).json(novoTopico);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default authMiddleware(handler);
