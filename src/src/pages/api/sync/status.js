import authMiddleware from '../../../middlewares/authMiddleware';
import SynchronizationService from '../../../services/SynchronizationService';
import NoteVersionService from '../../../services/NoteVersionService';
import ConflictDetectionService from '../../../services/ConflictDetectionService';
import NoteHistoryService from '../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../lib/db';

/**
 * API endpoint para obter status de sincronização
 * GET /api/sync/status
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const userId = req.userId;

    const db = await connectToDatabase();
    const versionService = new NoteVersionService(db);
    const historyService = new NoteHistoryService(db);
    const conflictDetectionService = new ConflictDetectionService(db, versionService);
    const syncService = new SynchronizationService(db, versionService, conflictDetectionService, historyService);

    // Obter status de sincronização
    const syncStatus = await syncService.getSyncStatus(userId);
    
    // Obter conflitos pendentes de sincronização
    const pendingConflicts = await syncService.getPendingSyncConflicts(userId);

    res.status(200).json({
      ...syncStatus,
      pendingConflicts: pendingConflicts.length,
      conflicts: pendingConflicts
    });

  } catch (error) {
    console.error('Erro ao obter status de sincronização:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
