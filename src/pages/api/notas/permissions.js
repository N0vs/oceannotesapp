import { connectToDatabase } from '../../../lib/db';
import authMiddleware from '../../../middlewares/authMiddleware';

/**
 * API endpoint para gerenciar permissões de compartilhamento
 * GET /api/notas/permissions?noteId=123 - Listar usuários com acesso à nota
 * PUT /api/notas/permissions - Atualizar permissão de um usuário
 * DELETE /api/notas/permissions - Remover acesso de um usuário
 */
async function handler(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        message: 'Usuário não autenticado' 
      });
    }

    const db = await connectToDatabase();

    if (req.method === 'GET') {
      const { noteId } = req.query;

      if (!noteId) {
        return res.status(400).json({ 
          message: 'noteId é obrigatório' 
        });
      }

      // Verificar se o usuário é proprietário da nota
      const noteQuery = await db.query(
        'SELECT UtilizadorID FROM Nota WHERE id = ?',
        [parseInt(noteId)]
      );

      if (!noteQuery.length) {
        return res.status(404).json({ 
          message: 'Nota não encontrada' 
        });
      }

      if (noteQuery[0].UtilizadorID !== parseInt(userId)) {
        return res.status(403).json({ 
          message: 'Apenas o proprietário pode ver as permissões' 
        });
      }

      // Buscar usuários com acesso à nota
      const permissions = await db.query(`
        SELECT 
          nc.ID as shareId,
          nc.UsuarioCompartilhadoID as userId,
          nc.TipoPermissao as permission,
          nc.DataCompartilhamento as sharedAt,
          u.Nome as userName,
          u.Email as userEmail
        FROM NotaCompartilhamento nc
        JOIN Utilizador u ON nc.UsuarioCompartilhadoID = u.Id
        WHERE nc.NotaID = ? AND nc.Ativo = TRUE
        ORDER BY nc.DataCompartilhamento DESC
      `, [parseInt(noteId)]);

      return res.status(200).json({
        success: true,
        permissions
      });
    }

    if (req.method === 'PUT') {
      const { noteId, targetUserId, permission } = req.body;

      if (!noteId || !targetUserId || !permission) {
        return res.status(400).json({ 
          message: 'noteId, targetUserId e permission são obrigatórios' 
        });
      }

      // Verificar se o usuário é proprietário da nota
      const noteQuery = await db.query(
        'SELECT UtilizadorID FROM Nota WHERE id = ?',
        [parseInt(noteId)]
      );

      if (!noteQuery.length) {
        return res.status(404).json({ 
          message: 'Nota não encontrada' 
        });
      }

      if (noteQuery[0].UtilizadorID !== parseInt(userId)) {
        return res.status(403).json({ 
          message: 'Apenas o proprietário pode alterar permissões' 
        });
      }

      // Atualizar permissão
      await db.query(
        'UPDATE NotaCompartilhamento SET TipoPermissao = ? WHERE NotaID = ? AND UsuarioCompartilhadoID = ?',
        [permission, parseInt(noteId), parseInt(targetUserId)]
      );

      return res.status(200).json({
        success: true,
        message: 'Permissão atualizada com sucesso'
      });
    }

    if (req.method === 'DELETE') {
      const { noteId, targetUserId } = req.body;

      if (!noteId || !targetUserId) {
        return res.status(400).json({ 
          message: 'noteId e targetUserId são obrigatórios' 
        });
      }

      // Verificar se o usuário é proprietário da nota
      const noteQuery = await db.query(
        'SELECT UtilizadorID FROM Nota WHERE id = ?',
        [parseInt(noteId)]
      );

      if (!noteQuery.length) {
        return res.status(404).json({ 
          message: 'Nota não encontrada' 
        });
      }

      if (noteQuery[0].UtilizadorID !== parseInt(userId)) {
        return res.status(403).json({ 
          message: 'Apenas o proprietário pode remover acesso' 
        });
      }

      // Remover acesso (marcar como inativo)
      await db.query(
        'UPDATE NotaCompartilhamento SET Ativo = FALSE WHERE NotaID = ? AND UsuarioCompartilhadoID = ?',
        [parseInt(noteId), parseInt(targetUserId)]
      );

      // Verificar se ainda há compartilhamentos ativos
      const activeShares = await db.query(
        'SELECT COUNT(*) as count FROM NotaCompartilhamento WHERE NotaID = ? AND Ativo = TRUE',
        [parseInt(noteId)]
      );

      // Se não há mais compartilhamentos ativos, marcar nota como privada
      if (activeShares[0].count === 0) {
        await db.query(
          'UPDATE Nota SET StatusCompartilhamento = ? WHERE id = ?',
          ['privada', parseInt(noteId)]
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Acesso removido com sucesso'
      });
    }

    return res.status(405).json({ message: 'Método não permitido' });

  } catch (error) {
    console.error('Erro ao gerenciar permissões:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
