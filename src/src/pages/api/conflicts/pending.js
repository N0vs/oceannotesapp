import authMiddleware from '../../../middlewares/authMiddleware';
import ConflictDetectionService from '../../../services/ConflictDetectionService';
import NoteVersionService from '../../../services/NoteVersionService';
import { connectToDatabase } from '../../../lib/db';

/**
 * API endpoint para obter conflitos pendentes do usuário
 * GET /api/conflicts/pending
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const userId = req.userId;

    const db = await connectToDatabase();
    const versionService = new NoteVersionService(db);
    const conflictService = new ConflictDetectionService(db, versionService);

    // Obter conflitos pendentes
    const conflicts = await conflictService.getPendingConflicts(userId);

    // Enriquecer com análise de complexidade
    const enrichedConflicts = await Promise.all(
      conflicts.map(async (conflict) => {
        try {
          const analysis = await conflictService.analyzeConflictComplexity(conflict.ID);
          return { ...conflict, ...analysis };
        } catch (error) {
          console.error(`Erro ao analisar conflito ${conflict.ID}:`, error);
          return conflict;
        }
      })
    );

    res.status(200).json(enrichedConflicts);

  } catch (error) {
    console.error('Erro ao obter conflitos pendentes:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
