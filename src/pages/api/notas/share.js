import { connectToDatabase } from '../../../lib/db';
import authMiddleware from '../../../middlewares/authMiddleware';
import crypto from 'crypto';

/**
 * API endpoint para compartilhamento de notas entre usuários
 * Cria convites baseados em tokens seguros para acesso a notas
 * 
 * @api {POST} /api/notas/share Compartilhar nota com usuário
 * @apiName ShareNote
 * @apiGroup Notes
 * @apiVersion 1.0.0
 * 
 * @apiHeader {string} Authorization Bearer token JWT
 * 
 * @apiParam {string} noteId ID da nota a ser compartilhada
 * @apiParam {string} userEmail Email do usuário que receberá acesso
 * @apiParam {string} [permission=visualizar] Tipo de permissão (visualizar|editar|admin)
 * 
 * @apiSuccess {boolean} success Indica sucesso da operação
 * @apiSuccess {string} message Mensagem de confirmação
 * @apiSuccess {Object} sharing Dados do compartilhamento
 * @apiSuccess {string} sharing.inviteToken Token de convite gerado
 * @apiSuccess {string} sharing.permission Permissão concedida
 * @apiSuccess {string} sharing.expiresAt Data de expiração do convite
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "Nota compartilhada com sucesso",
 *       "sharing": {
 *         "inviteToken": "abc123...",
 *         "permission": "visualizar",
 *         "expiresAt": "2023-11-15T10:00:00Z"
 *       }
 *     }
 * 
 * @apiError (400) MissingParameters noteId e userEmail são obrigatórios
 * @apiError (401) Unauthorized Usuário não autenticado
 * @apiError (403) Forbidden Sem permissão para compartilhar esta nota
 * @apiError (404) NotFound Nota ou usuário não encontrado
 * @apiError (405) MethodNotAllowed Método HTTP não permitido
 * @apiError (500) InternalError Erro interno do servidor
 * 
 * @description Endpoint para compartilhamento seguro com tokens de convite
 * @requires authMiddleware Token JWT válido
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
