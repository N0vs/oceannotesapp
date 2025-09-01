import authMiddleware from '../../../middlewares/authMiddleware';
import ConflictResolutionService from '../../../services/ConflictResolutionService';
import ConflictDetectionService from '../../../services/ConflictDetectionService';
import NoteVersionService from '../../../services/NoteVersionService';
import NoteHistoryService from '../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../lib/db';

/**
 * API endpoint para resolver conflitos
 * POST /api/conflicts/resolve
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { conflictId, resolutionType, mergeData } = req.body;
    const userId = req.userId;

    if (!conflictId || !resolutionType) {
      return res.status(400).json({ 
        message: 'conflictId e resolutionType são obrigatórios' 
      });
    }

    const validResolutionTypes = ['manter_local', 'manter_remoto', 'merge_manual', 'criar_versoes_separadas'];
    if (!validResolutionTypes.includes(resolutionType)) {
      return res.status(400).json({ 
        message: 'Tipo de resolução inválido' 
      });
    }

    const db = await connectToDatabase();
    const versionService = new NoteVersionService(db);
    const historyService = new NoteHistoryService(db);
    const conflictDetectionService = new ConflictDetectionService(db, versionService);
    const resolutionService = new ConflictResolutionService(db, versionService, historyService);

    // Resolver conflito
    const result = await resolutionService.resolveConflict(
      conflictId,
      resolutionType,
      mergeData,
      userId
    );

    res.status(200).json({
      success: true,
      result,
      message: 'Conflito resolvido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao resolver conflito:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
