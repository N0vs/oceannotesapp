import { connectToDatabase } from '../../../lib/db';
import authMiddleware from '../../../middlewares/authMiddleware';

/**
 * API endpoint para listar notas compartilhadas
 * GET /api/notas/shared
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const userId = req.userId;
    console.log('=== DEBUG SHARED API ===');
    console.log('userId:', userId, 'type:', typeof userId);

    if (!userId) {
      return res.status(401).json({ 
        message: 'Usuário não autenticado' 
      });
    }

    const db = await connectToDatabase();

    // Buscar notas compartilhadas com o usuário
    const [sharedNotesData] = await db.query(`
      SELECT 
        n.id,
        n.titulo,
        n.conteudo,
        n.dataCriacao,
        n.dataAtualizacao,
        nc.TipoPermissao as permissao,
        nc.DataCompartilhamento,
        u.Nome as proprietario,
        u.Email as proprietarioEmail
      FROM NotaCompartilhamento nc
      JOIN Nota n ON nc.NotaID = n.id
      JOIN Utilizador u ON nc.ProprietarioID = u.Id
      WHERE nc.UsuarioCompartilhadoID = ? AND nc.Ativo = TRUE
      ORDER BY nc.DataCompartilhamento DESC
    `, [parseInt(userId)]);
    
    console.log('Notas compartilhadas encontradas:', sharedNotesData);
    console.log('Quantidade:', sharedNotesData?.length || 0);

    res.status(200).json({
      success: true,
      notes: sharedNotesData
    });

  } catch (error) {
    console.error('Erro ao buscar notas compartilhadas:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
