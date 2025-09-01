import TopicoService from '../../../services/TopicoService.js';
import NotaService from '../../../services/NotaService.js';
import authMiddleware from '../../../middlewares/authMiddleware.js';

const handler = async (req, res) => {
  const utilizadorId = req.userId;
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const topico = await TopicoService.getByIdAndUtilizadorId(id, utilizadorId);
      if (!topico) {
        return res.status(404).json({ message: 'Tópico não encontrado' });
      }

      const notas = await NotaService.getByTopicoId(id);
      res.status(200).json({ topico, notas });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { nome, cor } = req.body;
      const topicoAtualizado = await TopicoService.update(id, { nome, cor }, utilizadorId);
      res.status(200).json(topicoAtualizado);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await TopicoService.delete(id, utilizadorId);
      res.status(200).json({ message: 'Tópico deletado com sucesso' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default authMiddleware(handler);
