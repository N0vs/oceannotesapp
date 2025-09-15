import authMiddleware from '../../../../middlewares/authMiddleware';
import NoteSharingService from '../../../../services/NoteSharingService';
import NoteHistoryService from '../../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../../lib/db';

/**
 * API endpoint para obter informações rápidas de compartilhamento (para botão compartilhar)
 * GET /api/notas/[id]/quick-share-info
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { id: noteId } = req.query;
    const userId = req.userId;

    const db = await connectToDatabase();
    const historyService = new NoteHistoryService(db);
    const sharingService = new NoteSharingService(db, historyService);

    // Verificar propriedade
    const [noteOwnerData] = await db.query(
      'SELECT UtilizadorID FROM Nota WHERE id = ?',
      [noteId]
    );

    if (!noteOwnerData.length) {
      return res.status(404).json({ message: 'Nota não encontrada' });
    }

    const isOwner = noteOwnerData[0].UtilizadorID == userId;
    
    if (!isOwner) {
      return res.status(403).json({ message: 'Apenas o proprietário pode ver informações de compartilhamento' });
    }

    // Buscar usuários compartilhados
    const sharedUsers = await sharingService.getNoteSharedUsers(noteId);

    const quickInfo = {
      noteId: parseInt(noteId),
      isShared: sharedUsers.length > 0,
      sharedCount: sharedUsers.length,
      sharedUsers: sharedUsers.map(user => ({
        name: user.Nome,
        email: user.Email,
        permission: user.TipoPermissao,
        sharedDate: user.DataCompartilhamento
      }))
    };

    res.status(200).json(quickInfo);

  } catch (error) {
    console.error('Erro ao obter informações de compartilhamento:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
