import authMiddleware from '../../../middlewares/authMiddleware';
import NoteSharingService from '../../../services/NoteSharingService';
import NoteHistoryService from '../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../lib/db';

/**
 * API endpoint para obter notas compartilhadas com o usuário atual
 * GET /api/notas/shared-with-me
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const userId = req.userId;
    console.log('=== DEBUG SHARED-WITH-ME ===');
    console.log('userId:', userId, 'type:', typeof userId);

    const db = await connectToDatabase();
    const historyService = new NoteHistoryService(db);
    const sharingService = new NoteSharingService(db, historyService);

    // Obter notas compartilhadas com o usuário
    const sharedNotes = await sharingService.getSharedNotes(userId);
    console.log('sharedNotes retornadas:', sharedNotes);
    console.log('Quantidade de notas:', sharedNotes?.length || 0);

    res.status(200).json(sharedNotes);

  } catch (error) {
    console.error('Erro ao obter notas compartilhadas:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
