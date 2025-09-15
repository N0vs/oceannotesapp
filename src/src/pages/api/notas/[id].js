import NotaService from '../../../services/NotaService.js';
import authMiddleware from '../../../middlewares/authMiddleware.js';

async function handler(req, res) {
  const { id } = req.query;

  switch (req.method) {
    case 'GET':
      try {
        const nota = await NotaService.findByIdWithConsistentFields(id);
        if (nota) {
          res.status(200).json(nota);
        } else {
          res.status(404).json({ message: 'Nota não encontrada' });
        }
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar nota', error: error.message });
      }
      break;
    case 'PUT':
      try {
        const atualizada = await NotaService.updateWithConsistentFields(id, req.body, req.userId);
        if (atualizada) {
          res.status(200).json({ message: 'Nota atualizada com sucesso' });
        } else {
          res.status(404).json({ message: 'Nota não encontrada' });
        }
      } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar nota', error: error.message });
      }
      break;
    case 'DELETE':
      try {
        // A segurança é garantida no NotaService/NotaRepository
        const deletada = await NotaService.deleteWithConsistentFields(id, req.userId);
        if (deletada) {
          res.status(200).json({ message: 'Nota deletada com sucesso' });
        } else {
          res.status(404).json({ message: 'Nota não encontrada' });
        }
      } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar nota', error: error.message });
      }
      break;
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default authMiddleware(handler);
