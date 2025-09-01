import authMiddleware from '../../../../middlewares/authMiddleware';
import SynchronizationService from '../../../../services/SynchronizationService';
import NoteVersionService from '../../../../services/NoteVersionService';
import ConflictDetectionService from '../../../../services/ConflictDetectionService';
import NoteHistoryService from '../../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../../lib/db';

/**
 * API endpoint para forçar sincronização de uma nota específica
 * POST /api/sync/force/[id]
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
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
    const versionService = new NoteVersionService(db);
    const historyService = new NoteHistoryService(db);
    const conflictDetectionService = new ConflictDetectionService(db, versionService);
    const syncService = new SynchronizationService(db, versionService, conflictDetectionService, historyService);

    // Forçar sincronização da nota
    await syncService.forceSyncNote(noteId, userId);

    res.status(200).json({
      success: true,
      message: 'Sincronização forçada iniciada'
    });

  } catch (error) {
    console.error('Erro ao forçar sincronização:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
