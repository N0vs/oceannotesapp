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


    // Verificar se a nota existe e buscar todas as notas do usuário
    const [userNotesData] = await db.query(
      'SELECT id FROM Nota WHERE UtilizadorID = ?',
      [parseInt(userId)]
    );

    const userNoteIds = userNotesData.map(note => note.id);
    const isOwner = userNoteIds.includes(parseInt(noteId));

    if (!isOwner) {
      return res.status(403).json({ 
        message: `Você só pode compartilhar suas próprias notas. Suas notas: [${userNoteIds.join(', ')}], Nota solicitada: ${noteId}` 
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

    // Gerar token único para o compartilhamento
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Verificar se já existe compartilhamento
    const [existingShareData] = await db.query(
      'SELECT ID FROM NotaCompartilhamento WHERE NotaID = ? AND UsuarioCompartilhadoID = ? AND Ativo = TRUE',
      [parseInt(noteId), targetUser.Id]
    );

    if (existingShareData.length > 0) {
      // Atualizar compartilhamento existente
      await db.query(
        'UPDATE NotaCompartilhamento SET TipoPermissao = ?, DataCompartilhamento = CURRENT_TIMESTAMP WHERE NotaID = ? AND UsuarioCompartilhadoID = ?',
        [permission, parseInt(noteId), targetUser.Id]
      );

      return res.status(200).json({
        success: true,
        message: `Permissão atualizada para ${targetUser.Nome}`
      });
    }

    // Criar novo compartilhamento com token
    const [result] = await db.query(
      'INSERT INTO NotaCompartilhamento (NotaID, ProprietarioID, UsuarioCompartilhadoID, TipoPermissao) VALUES (?, ?, ?, ?)',
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

  } catch (error) {
    console.error('Erro ao compartilhar nota:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor' 
    });
  }
}

export default authMiddleware(handler);
