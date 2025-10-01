import authMiddleware from '../../../../middlewares/authMiddleware';
import NoteSharingService from '../../../../services/NoteSharingService';
import NoteHistoryService from '../../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../../lib/db';

/**
 * API endpoint para obter usuários com quem uma nota foi compartilhada
 * GET /api/notas/[id]/shared-users
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
    const [noteOwnerData] = await db.query(
      'SELECT UtilizadorID FROM Nota WHERE ID = ?',
      [noteId]
    );

    if (!noteOwnerData.length) {
      return res.status(404).json({ 
        message: 'Nota não encontrada' 
      });
    }

    const isOwner = noteOwnerData[0].UtilizadorID == userId; // Usar == para comparação flexível
    
    if (!isOwner) {
      const permission = await sharingService.getUserPermission(noteId, userId);
      if (!permission || !['visualizar', 'editar', 'admin', 'owner'].includes(permission)) {
        return res.status(403).json({ 
          message: 'Sem permissão para ver compartilhamentos desta nota' 
        });
      }
    }

    // Obter usuários compartilhados com informações de permissões
    console.log('=== DEBUG SHARED-USERS ===');
    console.log('noteId:', noteId, 'userId:', userId);
    console.log('isOwner:', isOwner);
    
    const sharedUsersWithPermissions = await sharingService.getNoteSharedUsersWithPermissions(noteId, userId);
    console.log('sharedUsersWithPermissions retornados:', sharedUsersWithPermissions);
    console.log('Quantidade de usuários:', sharedUsersWithPermissions?.length || 0);

    // Retornar lista vazia se não há compartilhamentos
    res.status(200).json(sharedUsersWithPermissions || []);

  } catch (error) {
    console.error('Erro ao obter usuários compartilhados:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
