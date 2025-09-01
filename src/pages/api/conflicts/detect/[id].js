import authMiddleware from '../../../../middlewares/authMiddleware';
import ConflictDetectionService from '../../../../services/ConflictDetectionService';
import NoteVersionService from '../../../../services/NoteVersionService';
import { connectToDatabase } from '../../../../lib/db';

/**
 * API endpoint para detectar conflitos em uma nota específica
 * GET /api/conflicts/detect/[id]
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
    const versionService = new NoteVersionService(db);
    const conflictService = new ConflictDetectionService(db, versionService);

    // Detectar conflitos na nota
    const conflicts = await conflictService.detectConflicts(noteId);

    res.status(200).json(conflicts);

  } catch (error) {
    console.error('Erro ao detectar conflitos:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
