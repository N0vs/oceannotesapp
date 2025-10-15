import authMiddleware from '../../../middlewares/authMiddleware';
import NoteSharingService from '../../../services/NoteSharingService';
import NoteHistoryService from '../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../lib/db';

/**
 * API endpoint para remover compartilhamento de notas
 * POST /api/notas/unshare
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { noteId, targetUserId } = req.body;
    const userId = req.userId;

    if (!noteId || !targetUserId) {
      return res.status(400).json({ 
        message: 'noteId e userId são obrigatórios' 
      });
    }

    const db = await connectToDatabase();
    const historyService = new NoteHistoryService(db);
    const sharingService = new NoteSharingService(db, historyService);

    // Se targetUserId é 'self', usar o próprio userId
    const actualTargetUserId = targetUserId === 'self' ? userId : targetUserId;

    // Remover compartilhamento
    await sharingService.unshareNote(noteId, userId, actualTargetUserId);

    res.status(200).json({
      success: true,
      message: 'Compartilhamento removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover compartilhamento:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
