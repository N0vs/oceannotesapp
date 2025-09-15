import { connectToDatabase } from '../../../lib/db';
import authMiddleware from '../../../middlewares/authMiddleware';

/**
 * API para listar notas compartilhadas pelo usuário (como proprietário)
 * GET /api/notas/my-shared
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        message: 'Usuário não autenticado' 
      });
    }

    const db = await connectToDatabase();

    // Buscar notas que o usuário compartilhou com outros
    const sharedNotes = await db.query(`
      SELECT 
        n.id,
        n.titulo,
        n.conteudo,
        n.dataCriacao,
        COUNT(nc.ID) as totalShares,
        GROUP_CONCAT(
          CONCAT(u.Nome, ' (', nc.TipoPermissao, ')')
          SEPARATOR ', '
        ) as sharedWith
      FROM Nota n
      LEFT JOIN NotaCompartilhamento nc ON n.id = nc.NotaID AND nc.Ativo = TRUE
      LEFT JOIN Utilizador u ON nc.UsuarioCompartilhadoID = u.Id
      WHERE n.UtilizadorID = ? AND n.StatusCompartilhamento = 'compartilhada'
      GROUP BY n.id, n.titulo, n.conteudo, n.dataCriacao
      ORDER BY n.dataCriacao DESC
    `, [parseInt(userId)]);

    res.status(200).json({
      success: true,
      notes: sharedNotes
    });

  } catch (error) {
    console.error('Erro ao buscar notas compartilhadas:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
