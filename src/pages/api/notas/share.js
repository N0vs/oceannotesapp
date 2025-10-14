import { connectToDatabase } from '../../../lib/db';
import authMiddleware from '../../../middlewares/authMiddleware';
import crypto from 'crypto';

/**
 * Nova API de compartilhamento baseada em tokens de convite
 * POST /api/notas/share
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { noteId, userEmail, permission = 'visualizar' } = req.body;
    const userId = req.userId;


    if (!noteId || !userEmail) {
      return res.status(400).json({ 
        message: 'noteId e userEmail são obrigatórios' 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        message: 'Usuário não autenticado' 
      });
    }

    const db = await connectToDatabase();


    // Verificar se o usuário tem permissão para compartilhar (proprietário ou admin)
    const [userNotesData] = await db.query(
      'SELECT id FROM Nota WHERE UtilizadorID = ?',
      [parseInt(userId)]
    );

    const userNoteIds = userNotesData.map(note => note.id);
    const isOwner = userNoteIds.includes(parseInt(noteId));
    
    // Se não for proprietário, verificar se é administrador da nota
    let isAdmin = false;
    if (!isOwner) {
      const [adminCheck] = await db.query(
        'SELECT TipoPermissao FROM NotaCompartilhamento WHERE NotaID = ? AND UsuarioCompartilhadoID = ? AND Ativo = TRUE',
        [parseInt(noteId), parseInt(userId)]
      );
      isAdmin = adminCheck.length > 0 && adminCheck[0].TipoPermissao === 'admin';
    }

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        message: 'Apenas proprietários ou administradores podem compartilhar notas' 
      });
    }

    // Buscar usuário pelo email
    const [userQueryData] = await db.query(
      'SELECT Id, Nome FROM Utilizador WHERE Email = ?',
      [userEmail]
    );

    if (!userQueryData.length) {
      return res.status(404).json({ 
        message: 'Usuário não encontrado' 
      });
    }

    const targetUser = userQueryData[0];

    // Não permitir compartilhar consigo mesmo
    if (targetUser.Id === parseInt(userId)) {
      return res.status(400).json({ 
        message: 'Você não pode compartilhar uma nota consigo mesmo' 
      });
    }

    // Validar se o usuário pode conceder a permissão solicitada
    if (permission === 'admin' && !isOwner && isAdmin) {
      // Administradores agora podem promover outros para admin
      // Esta validação foi removida conforme nova regra
    }

    // Gerar token único para o compartilhamento
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Verificar se já existe compartilhamento (ativo ou inativo)
    const [existingShareData] = await db.query(
      'SELECT ID, Ativo FROM NotaCompartilhamento WHERE NotaID = ? AND UsuarioCompartilhadoID = ?',
      [parseInt(noteId), targetUser.Id]
    );

    console.log(`=== DEBUG SHARE ===`);
    console.log(`noteId: ${noteId}, targetUserId: ${targetUser.Id}, permission: ${permission}`);
    console.log(`existingShareData:`, existingShareData);

    if (existingShareData.length > 0) {
      // Atualizar compartilhamento existente (ativar se inativo e atualizar permissão)
      await db.query(
        'UPDATE NotaCompartilhamento SET TipoPermissao = ?, DataCompartilhamento = CURRENT_TIMESTAMP, Ativo = TRUE WHERE NotaID = ? AND UsuarioCompartilhadoID = ?',
        [permission, parseInt(noteId), targetUser.Id]
      );

      return res.status(200).json({
        success: true,
        message: `Permissão atualizada para ${targetUser.Nome}`
      });
    }

    // Criar novo compartilhamento com token
    try {
      const [result] = await db.query(
        'INSERT INTO NotaCompartilhamento (NotaID, ProprietarioID, UsuarioCompartilhadoID, TipoPermissao, Ativo) VALUES (?, ?, ?, ?, TRUE)',
        [parseInt(noteId), parseInt(userId), targetUser.Id, permission]
      );

      // Atualizar status da nota
      await db.query(
        'UPDATE Nota SET StatusCompartilhamento = ? WHERE id = ?',
        ['compartilhada', parseInt(noteId)]
      );

      res.status(200).json({
        success: true,
        shareId: result.insertId,
        shareToken: shareToken,
        message: `Nota compartilhada com ${targetUser.Nome}`
      });
    } catch (insertError) {
      // Se ainda houver erro de chave duplicada, tentar UPDATE como fallback
      if (insertError.code === 'ER_DUP_ENTRY') {
        console.log('Duplicate entry detected, trying UPDATE as fallback...');
        await db.query(
          'UPDATE NotaCompartilhamento SET TipoPermissao = ?, DataCompartilhamento = CURRENT_TIMESTAMP, Ativo = TRUE WHERE NotaID = ? AND UsuarioCompartilhadoID = ?',
          [permission, parseInt(noteId), targetUser.Id]
        );
        
        return res.status(200).json({
          success: true,
          message: `Permissão atualizada para ${targetUser.Nome} (fallback)`
        });
      }
      throw insertError; // Re-lançar outros erros
    }

  } catch (error) {
    console.error('Erro ao compartilhar nota:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
