import authMiddleware from '../../../middlewares/authMiddleware';
import NoteSharingService from '../../../services/NoteSharingService';
import NoteHistoryService from '../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../lib/db';

/**
 * API endpoint para atualizar permissões de compartilhamento
 * POST /api/notas/update-permission
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { noteId, targetUserId, permission } = req.body;
    const userId = req.userId;

    if (!noteId || !targetUserId || !permission) {
      return res.status(400).json({ 
        message: 'noteId, userId e permission são obrigatórios' 
      });
    }

    const validPermissions = ['visualizar', 'editar', 'admin'];
    if (!validPermissions.includes(permission)) {
      return res.status(400).json({ 
        message: 'Permissão inválida. Use: visualizar, editar ou admin' 
      });
    }

    const db = await connectToDatabase();
    const historyService = new NoteHistoryService(db);
    const sharingService = new NoteSharingService(db, historyService);

    // Atualizar permissão
    await sharingService.updatePermission(noteId, userId, targetUserId, permission);

    res.status(200).json({
      success: true,
      message: 'Permissão atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar permissão:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
