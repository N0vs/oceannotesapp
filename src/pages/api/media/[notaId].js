import { connectToDatabase } from '../../../lib/db.js';
import authMiddleware from '../../../middlewares/authMiddleware.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { notaId } = req.query;
    const utilizadorId = req.userId;
    
    if (!notaId) {
      return res.status(400).json({ error: 'ID da nota é obrigatório' });
    }

    const db = await connectToDatabase();
    
    // Verificar se o usuário tem acesso à nota
    const [notaAccess] = await db.query(`
      SELECT n.id 
      FROM Nota n
      LEFT JOIN NotaCompartilhamento nc ON n.id = nc.NotaID 
      WHERE n.id = ? AND (
        n.UtilizadorID = ? OR 
        (nc.UsuarioCompartilhadoID = ? AND nc.Ativo = true)
      )
    `, [notaId, utilizadorId, utilizadorId]);

    if (notaAccess.length === 0) {
      return res.status(403).json({ error: 'Sem permissão para aceder a esta nota' });
    }

    // Buscar todas as imagens da nota
    const [images] = await db.query(`
      SELECT Id, caminho, utilizadorId
      FROM Midia 
      WHERE notaId = ?
      ORDER BY Id DESC
    `, [notaId]);

    res.status(200).json({
      success: true,
      images: images.map(img => ({
        id: img.Id,
        url: img.caminho,
        uploadedBy: img.utilizadorId
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

export default authMiddleware(handler);
