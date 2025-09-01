import authMiddleware from '../../../../middlewares/authMiddleware';
import NoteSharingService from '../../../../services/NoteSharingService';
import NoteHistoryService from '../../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../../lib/db';

/**
 * API endpoint para obter detalhes completos de compartilhamento de uma nota
 * GET /api/notas/[id]/sharing-details
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

    // Verificar se usuário é dono da nota ou tem permissão adequada
    const [noteData] = await db.query(
      'SELECT UtilizadorID, titulo, UltimaModificacao, UltimoModificadorID FROM Nota WHERE id = ?',
      [noteId]
    );

    if (!noteData.length) {
      return res.status(404).json({ 
        message: 'Nota não encontrada' 
      });
    }

    const note = noteData[0];
    const isOwner = note.UtilizadorID == userId;
    
    if (!isOwner) {
      const permission = await sharingService.getUserPermission(noteId, userId);
      if (!permission) {
        return res.status(403).json({ 
          message: 'Sem permissão para ver detalhes desta nota' 
        });
      }
    }

    // Buscar usuários com quem a nota foi compartilhada
    const sharedUsers = await sharingService.getNoteSharedUsers(noteId);

    // Buscar informações do último modificador
    let lastModifiedBy = null;
    if (note.UltimoModificadorID) {
      const [modifierData] = await db.query(
        'SELECT Nome FROM Utilizador WHERE Id = ?',
        [note.UltimoModificadorID]
      );
      lastModifiedBy = modifierData[0]?.Nome || null;
    }

    // Buscar proprietário da nota
    const [ownerData] = await db.query(
      'SELECT Nome FROM Utilizador WHERE Id = ?',
      [note.UtilizadorID]
    );
    const ownerName = ownerData[0]?.Nome || 'Desconhecido';

    // Montar resposta com detalhes completos
    const sharingDetails = {
      noteId: parseInt(noteId),
      title: note.titulo,
      owner: {
        id: note.UtilizadorID,
        name: ownerName,
        isCurrentUser: isOwner
      },
      lastModified: {
        date: note.UltimaModificacao,
        by: lastModifiedBy || ownerName
      },
      sharing: {
        isShared: sharedUsers.length > 0,
        totalUsers: sharedUsers.length,
        users: sharedUsers.map(user => ({
          id: user.Id,
          name: user.Nome,
          email: user.Email,
          permission: user.TipoPermissao,
          sharedDate: user.DataCompartilhamento
        }))
      },
      permissions: {
        canShare: isOwner,
        canEdit: isOwner || await sharingService.canUserEdit(noteId, userId),
        canView: isOwner || await sharingService.canUserView(noteId, userId)
      }
    };

    res.status(200).json(sharingDetails);

  } catch (error) {
    console.error('Erro ao obter detalhes de compartilhamento:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
