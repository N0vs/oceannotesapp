import authMiddleware from '../../../../middlewares/authMiddleware';
import NoteSharingService from '../../../../services/NoteSharingService';
import NoteHistoryService from '../../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../../lib/db';

/**
 * API endpoint para verificar permissão do usuário em uma nota
 * GET /api/notas/[id]/permission
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { id: noteId } = req.query;
    const userId = req.userId;

    if (!noteId) {
      return res.status(400).json({ 
        message: 'ID da nota é obrigatório' 
      });
    }

    const db = await connectToDatabase();
    const historyService = new NoteHistoryService(db);
    const sharingService = new NoteSharingService(db, historyService);

    // Verificar permissão do usuário
    const permission = await sharingService.getUserPermission(noteId, userId);

    res.status(200).json({
      permission,
      canView: await sharingService.canUserView(noteId, userId),
      canEdit: await sharingService.canUserEdit(noteId, userId)
    });

  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
