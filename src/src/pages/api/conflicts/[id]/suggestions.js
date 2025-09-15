import authMiddleware from '../../../../middlewares/authMiddleware';
import ConflictResolutionService from '../../../../services/ConflictResolutionService';
import ConflictDetectionService from '../../../../services/ConflictDetectionService';
import NoteVersionService from '../../../../services/NoteVersionService';
import NoteHistoryService from '../../../../services/NoteHistoryService';
import { connectToDatabase } from '../../../../lib/db';

/**
 * API endpoint para obter sugestões de resolução de conflito
 * GET /api/conflicts/[id]/suggestions
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { id: conflictId } = req.query;
    const userId = req.userId;

    if (!conflictId) {
      return res.status(400).json({ 
        message: 'ID do conflito é obrigatório' 
      });
    }

    const db = await connectToDatabase();
    const versionService = new NoteVersionService(db);
    const historyService = new NoteHistoryService(db);
    const conflictDetectionService = new ConflictDetectionService(db, versionService);
    const resolutionService = new ConflictResolutionService(db, versionService, historyService);

    // Obter sugestões de resolução
    const suggestions = await resolutionService.getResolutionSuggestions(conflictId);

    res.status(200).json(suggestions);

  } catch (error) {
    console.error('Erro ao obter sugestões de resolução:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
