/**
 * Serviço de Compartilhamento de Notas
 * Segue o Single Responsibility Principle - responsável apenas por compartilhamento
 * Segue o Dependency Inversion Principle - abstrai operações de banco de dados
 */
class NoteSharingService {
  constructor(database, historyService) {
    this.db = database;
    this.historyService = historyService;
  }

  /**
   * @deprecated Esta função está obsoleta devido a problemas de verificação de propriedade.
   * Use shareNoteWithOwnershipValidation() que implementa verificação mais robusta.
   * Substituída por: shareNoteWithOwnershipValidation()
   */
  async shareNote(notaId, proprietarioId, usuarioCompartilhadoId, tipoPermissao = 'visualizar', dataExpiracao = null) {
    // Verificar se o usuário é proprietário da nota
    const nota = await this.db.query(
      'SELECT UtilizadorID FROM Nota WHERE ID = ?',
      [notaId]
    );

    if (!nota.length || nota[0].UtilizadorID != proprietarioId) {
      throw new Error('Apenas o proprietário pode compartilhar a nota');
    }

    // Verificar se já existe compartilhamento
    const existingShare = await this.db.query(
      'SELECT ID FROM NotaCompartilhamento WHERE NotaID = ? AND UsuarioCompartilhadoID = ? AND Ativo = TRUE',
      [notaId, usuarioCompartilhadoId]
    );

    if (existingShare.length > 0) {
      // Atualizar permissão existente
      await this.db.query(
        'UPDATE NotaCompartilhamento SET TipoPermissao = ?, DataExpiracao = ? WHERE ID = ?',
        [tipoPermissao, dataExpiracao, existingShare[0].ID]
      );
      
      return existingShare[0].ID;
    }

    // Criar novo compartilhamento
    const result = await this.db.query(
      `INSERT INTO NotaCompartilhamento 
       (NotaID, ProprietarioID, UsuarioCompartilhadoID, TipoPermissao, DataExpiracao) 
       VALUES (?, ?, ?, ?, ?)`,
      [notaId, proprietarioId, usuarioCompartilhadoId, tipoPermissao, dataExpiracao]
    );

    // Atualizar status da nota
    await this.db.query(
      'UPDATE Nota SET StatusCompartilhamento = ? WHERE ID = ?',
      ['compartilhada', notaId]
    );

    // Registrar no histórico
    await this.historyService.addHistoryEntry(
      notaId,
      null, // versaoId será definido pelo historyService
      proprietarioId,
      'compartilhamento',
      `Nota compartilhada com usuário ${usuarioCompartilhadoId} com permissão ${tipoPermissao}`,
      { usuarioCompartilhado: usuarioCompartilhadoId, permissao: tipoPermissao }
    );

    return result.insertId;
  }

  /**
   * Compartilha nota com validação robusta de propriedade
   * Segue o Single Responsibility Principle - foca apenas no compartilhamento
   * Implementa verificação mais confiável de propriedade
   */
  async shareNoteWithOwnershipValidation(notaId, proprietarioId, usuarioCompartilhadoId, tipoPermissao = 'visualizar', dataExpiracao = null) {
    // Verificação robusta de propriedade usando conversão de tipos
    const nota = await this.db.query(
      'SELECT UtilizadorID FROM Nota WHERE ID = ?',
      [notaId]
    );

    if (!nota.length) {
      throw new Error('Nota não encontrada');
    }

    // Conversão explícita para garantir comparação correta
    const noteOwnerId = parseInt(nota[0].UtilizadorID);
    const requesterId = parseInt(proprietarioId);

    if (noteOwnerId !== requesterId) {
      throw new Error(`Acesso negado. Proprietário da nota: ${noteOwnerId}, Solicitante: ${requesterId}`);
    }

    // Verificar se já existe compartilhamento
    const existingShare = await this.db.query(
      'SELECT ID FROM NotaCompartilhamento WHERE NotaID = ? AND UsuarioCompartilhadoID = ? AND Ativo = TRUE',
      [notaId, usuarioCompartilhadoId]
    );

    if (existingShare.length > 0) {
      // Atualizar permissão existente
      await this.db.query(
        'UPDATE NotaCompartilhamento SET TipoPermissao = ?, DataExpiracao = ? WHERE ID = ?',
        [tipoPermissao, dataExpiracao, existingShare[0].ID]
      );
      
      return existingShare[0].ID;
    }

    // Criar novo compartilhamento
    const result = await this.db.query(
      `INSERT INTO NotaCompartilhamento 
       (NotaID, ProprietarioID, UsuarioCompartilhadoID, TipoPermissao, DataExpiracao) 
       VALUES (?, ?, ?, ?, ?)`,
      [notaId, proprietarioId, usuarioCompartilhadoId, tipoPermissao, dataExpiracao]
    );

    // Atualizar status da nota
    await this.db.query(
      'UPDATE Nota SET StatusCompartilhamento = ? WHERE ID = ?',
      ['compartilhada', notaId]
    );

    // Registrar no histórico
    await this.historyService.addHistoryEntry(
      notaId,
      null, // versaoId será definido pelo historyService
      proprietarioId,
      'compartilhamento',
      `Nota compartilhada com usuário ${usuarioCompartilhadoId} com permissão ${tipoPermissao}`,
      { usuarioCompartilhadoId, tipoPermissao, dataExpiracao }
    );

    return result.insertId;
  }

  /**
   * Remove compartilhamento de nota
   * Hierarquia: Proprietário > Admin > Editor > Visualizador
   * - Proprietário pode remover qualquer compartilhamento
   * - Admin pode remover apenas compartilhamentos de Editor e Visualizador
   * - Admin não pode remover outros Admins
   */
  async unshareNote(notaId, requesterUserId, usuarioCompartilhadoId) {
    // Verificar se o usuário tem permissão para remover compartilhamento
    const requesterPermission = await this.getUserPermission(notaId, requesterUserId);
    
    if (!['admin', 'owner'].includes(requesterPermission)) {
      throw new Error('Apenas o proprietário ou usuários com permissão admin podem remover compartilhamentos');
    }

    // Verificar se está tentando remover o proprietário (não deveria ser possível, mas por segurança)
    const [noteOwner] = await this.db.query(
      'SELECT UtilizadorID FROM Nota WHERE ID = ?',
      [notaId]
    );

    if (noteOwner.length && parseInt(noteOwner[0].UtilizadorID) === parseInt(usuarioCompartilhadoId)) {
      throw new Error('Não é possível remover o compartilhamento do proprietário da nota');
    }

    // Se o requerente é admin (não proprietário), verificar hierarquia
    if (requesterPermission === 'admin') {
      // Buscar permissão do usuário que está sendo removido
      const targetPermission = await this.getUserPermission(notaId, usuarioCompartilhadoId);
      
      // Admin não pode remover outros admins ou proprietário
      if (targetPermission === 'admin' || targetPermission === 'owner') {
        throw new Error('Admins não podem remover outros administradores ou proprietário');
      }
    }

    const [result] = await this.db.query(
      'UPDATE NotaCompartilhamento SET Ativo = FALSE WHERE NotaID = ? AND UsuarioCompartilhadoID = ?',
      [notaId, usuarioCompartilhadoId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Compartilhamento não encontrado');
    }

    // Verificar se ainda há outros compartilhamentos ativos
    const [activeShares] = await this.db.query(
      'SELECT COUNT(*) as count FROM NotaCompartilhamento WHERE NotaID = ? AND Ativo = TRUE',
      [notaId]
    );

    if (activeShares[0].count === 0) {
      await this.db.query(
        'UPDATE Nota SET StatusCompartilhamento = ? WHERE id = ?',
        ['privada', notaId]
      );
    }

    return true;
  }

  /**
   * Obtém permissão do usuário para uma nota
   */
  async getUserPermission(notaId, utilizadorId) {
    // Verificar se é proprietário
    const [nota] = await this.db.query(
      'SELECT UtilizadorID FROM Nota WHERE ID = ?',
      [notaId]
    );

    if (nota.length && nota[0].UtilizadorID == utilizadorId) {
      return 'owner'; // Proprietário tem permissão total
    }

    // Verificar compartilhamento
    const [share] = await this.db.query(
      `SELECT TipoPermissao FROM NotaCompartilhamento 
       WHERE NotaID = ? AND UsuarioCompartilhadoID = ? AND Ativo = TRUE 
       AND (DataExpiracao IS NULL OR DataExpiracao > NOW())`,
      [notaId, utilizadorId]
    );

    return share.length ? share[0].TipoPermissao : null;
  }

  /**
   * Verifica se usuário pode editar nota
   */
  async canUserEdit(notaId, utilizadorId) {
    const permission = await this.getUserPermission(notaId, utilizadorId);
    return ['editar', 'admin', 'owner'].includes(permission);
  }

  /**
   * Verifica se usuário pode visualizar nota
   */
  async canUserView(notaId, utilizadorId) {
    const permission = await this.getUserPermission(notaId, utilizadorId);
    return ['visualizar', 'editar', 'admin', 'owner'].includes(permission);
  }

  /**
   * Obtém todas as notas compartilhadas com um usuário
   */
  /* async getSharedNotes(utilizadorId) {
    const [sharedNotesData] = await this.db.query(
      `SELECT n.*, nc.TipoPermissao, u.Nome as ProprietarioNome
       FROM Nota n
       INNER JOIN NotaCompartilhamento nc ON n.id = nc.NotaID
       INNER JOIN Utilizador u ON nc.ProprietarioID = u.Id
       WHERE nc.UsuarioCompartilhadoID = ? 
       AND nc.Ativo = TRUE 
       AND (nc.DataExpiracao IS NULL OR nc.DataExpiracao > NOW())
       ORDER BY n.UltimaModificacao DESC`,
      [utilizadorId]
    );
    return sharedNotesData;
  } */
async getSharedNotes(utilizadorId) {
  const [sharedNotesData] = await this.db.query(
    `SELECT n.*, nc.TipoPermissao, u.Nome as ProprietarioNome
     FROM Nota n
     INNER JOIN NotaCompartilhamento nc ON n.id = nc.NotaID
     INNER JOIN Utilizador u ON nc.ProprietarioID = u.Id
     WHERE nc.UsuarioCompartilhadoID = ? 
     AND nc.Ativo = TRUE 
     AND (nc.DataExpiracao IS NULL OR nc.DataExpiracao > NOW())
     ORDER BY n.UltimaModificacao DESC`,
    [utilizadorId]
  );
  
  // Buscar tópicos específicos do usuário para cada nota compartilhada
  for (let nota of sharedNotesData) {
    const [topicos] = await this.db.query(`
      SELECT t.* 
      FROM Topico t
      JOIN NotaTopico nt ON t.ID = nt.TopicoID
      WHERE nt.NotaID = ? AND nt.UtilizadorID = ?
    `, [nota.id, utilizadorId]);
    nota.topicos = topicos;
  }
  
  return sharedNotesData;
}


  /**
   * Obtém usuários com quem uma nota foi compartilhada
   */
  async getNoteSharedUsers(notaId) {
    console.log('=== DEBUG getNoteSharedUsers ===');
    console.log('Buscando usuários para notaId:', notaId, 'type:', typeof notaId);
    
    const [sharedUsersData] = await this.db.query(
      `SELECT u.Id, u.Nome, u.Email, nc.TipoPermissao, nc.DataCompartilhamento
       FROM NotaCompartilhamento nc
       INNER JOIN Utilizador u ON nc.UsuarioCompartilhadoID = u.Id
       WHERE nc.NotaID = ? AND nc.Ativo = TRUE
       AND (nc.DataExpiracao IS NULL OR nc.DataExpiracao > NOW())
       ORDER BY nc.DataCompartilhamento DESC`,
      [notaId]
    );
    
    console.log('Query executada com notaId:', notaId);
    console.log('Usuários compartilhados encontrados:', sharedUsersData);
    console.log('Quantidade:', sharedUsersData?.length || 0);
    
    return sharedUsersData;
  }

  /**
   * Obtém usuários compartilhados com informações sobre o que o usuário atual pode fazer
   * Inclui proprietário e ordena corretamente: Proprietário → Usuário atual → Outros
   */
  async getNoteSharedUsersWithPermissions(notaId, currentUserId) {
    const currentUserPermission = await this.getUserPermission(notaId, currentUserId);
    
    // Buscar proprietário da nota
    const [noteOwnerData] = await this.db.query(
      'SELECT u.Id, u.Nome, u.Email FROM Nota n JOIN Utilizador u ON n.UtilizadorID = u.Id WHERE n.ID = ?',
      [notaId]
    );
    
    const ownerId = noteOwnerData.length ? parseInt(noteOwnerData[0].Id) : null;
    
    // Buscar usuários compartilhados
    const sharedUsers = await this.getNoteSharedUsers(notaId);
    
    // Construir lista completa de usuários
    const allUsers = [];
    
    // 1. Adicionar proprietário primeiro
    if (noteOwnerData.length) {
      allUsers.push({
        Id: noteOwnerData[0].Id,
        Nome: parseInt(noteOwnerData[0].Id) === parseInt(currentUserId) ? 'Eu (Proprietário)' : `${noteOwnerData[0].Nome} (Proprietário)`,
        Email: noteOwnerData[0].Email,
        TipoPermissao: 'owner',
        DataCompartilhamento: null,
        isOwner: true,
        isCurrentUser: parseInt(noteOwnerData[0].Id) === parseInt(currentUserId)
      });
    }
    
    // 2. Adicionar usuários compartilhados (excluindo proprietário se ele estiver na lista compartilhada)
    sharedUsers.forEach(user => {
      if (parseInt(user.Id) !== ownerId) {
        allUsers.push({
          ...user,
          Nome: parseInt(user.Id) === parseInt(currentUserId) ? 'Eu' : user.Nome,
          isOwner: false,
          isCurrentUser: parseInt(user.Id) === parseInt(currentUserId)
        });
      }
    });
    
    // 3. Ordenar: Proprietário → Usuário atual → Outros por data
    allUsers.sort((a, b) => {
      if (a.isOwner) return -1;
      if (b.isOwner) return 1;
      if (a.isCurrentUser) return -1;  
      if (b.isCurrentUser) return 1;
      return new Date(b.DataCompartilhamento || 0) - new Date(a.DataCompartilhamento || 0);
    });
    
    // 4. Adicionar permissões de ação
    return allUsers.map(user => ({
      ...user,
      canEdit: user.isCurrentUser ? false : this._canEditUserPermission(currentUserPermission, user.TipoPermissao, parseInt(user.Id), ownerId, parseInt(currentUserId)),
      canRemove: user.isCurrentUser ? false : this._canRemoveUser(currentUserPermission, user.TipoPermissao, parseInt(user.Id), ownerId, parseInt(currentUserId))
    }));
  }

  /**
   * Verifica se o usuário atual pode editar as permissões de outro usuário
   */
  _canEditUserPermission(currentPermission, targetPermission, targetUserId, ownerId, currentUserId) {
    // Proprietário pode editar qualquer um (incluindo outros admins)
    if (currentPermission === 'owner') return true;
    
    // Admin não pode editar proprietário ou outros admins
    if (currentPermission === 'admin') {
      if (targetPermission === 'owner') return false; // Não pode editar proprietário
      if (targetPermission === 'admin') return false; // Não pode editar outros admins
      return true; // Pode editar editores e visualizadores
    }
    
    // Editores e visualizadores não podem editar ninguém
    if (currentPermission === 'editar' || currentPermission === 'visualizar') {
      return false;
    }
    
    return false;
  }

  /**
   * Verifica se o usuário atual pode remover outro usuário
   */
  _canRemoveUser(currentPermission, targetPermission, targetUserId, ownerId, currentUserId) {
    // Proprietário pode remover qualquer um (incluindo outros admins)
    if (currentPermission === 'owner') return true;
    
    // Admin não pode remover proprietário ou outros admins
    if (currentPermission === 'admin') {
      if (targetPermission === 'owner') return false; // Não pode remover proprietário
      if (targetPermission === 'admin') return false; // Não pode remover outros admins
      return true; // Pode remover editores e visualizadores
    }
    
    // Editores e visualizadores não podem remover ninguém
    if (currentPermission === 'editar' || currentPermission === 'visualizar') {
      return false;
    }
    
    return false;
  }

  /**
   * Atualiza permissão de compartilhamento
   * Hierarquia: Proprietário > Admin > Editor > Visualizador
   * - Proprietário pode alterar qualquer permissão
   * - Admin pode alterar apenas permissões de Editor e Visualizador
   * - Admin não pode alterar permissões de outros Admins ou do Proprietário
   */
  async updatePermission(notaId, requesterUserId, usuarioCompartilhadoId, novaPermissao) {
    // Verificar se o usuário tem permissão para alterar compartilhamento
    const requesterPermission = await this.getUserPermission(notaId, requesterUserId);
    
    if (!['admin', 'owner'].includes(requesterPermission)) {
      throw new Error('Apenas o proprietário ou usuários com permissão admin podem alterar permissões');
    }

    // Verificar se está tentando alterar permissão do proprietário
    const [noteOwner] = await this.db.query(
      'SELECT UtilizadorID FROM Nota WHERE ID = ?',
      [notaId]
    );

    if (noteOwner.length && parseInt(noteOwner[0].UtilizadorID) === parseInt(usuarioCompartilhadoId)) {
      throw new Error('Não é possível alterar as permissões do proprietário da nota');
    }

    // Se o requerente é admin (não proprietário), verificar hierarquia
    if (requesterPermission === 'admin') {
      // Buscar permissão atual do usuário alvo
      const targetCurrentPermission = await this.getUserPermission(notaId, usuarioCompartilhadoId);
      
      // Admin não pode alterar permissões de outros admins ou proprietário
      if (targetCurrentPermission === 'admin' || targetCurrentPermission === 'owner') {
        throw new Error('Admins não podem alterar permissões de outros administradores ou proprietário');
      }

      // Admin não pode promover alguém para admin
      if (novaPermissao === 'admin') {
        throw new Error('Apenas o proprietário pode conceder permissões de administrador');
      }
    }

    const [result] = await this.db.query(
      'UPDATE NotaCompartilhamento SET TipoPermissao = ? WHERE NotaID = ? AND UsuarioCompartilhadoID = ? AND Ativo = TRUE',
      [novaPermissao, notaId, usuarioCompartilhadoId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Compartilhamento não encontrado');
    }

    return true;
  }

  /**
   * Remove compartilhamentos expirados
   */
  async cleanupExpiredShares() {
    const [result] = await this.db.query(
      'UPDATE NotaCompartilhamento SET Ativo = FALSE WHERE DataExpiracao IS NOT NULL AND DataExpiracao <= NOW() AND Ativo = TRUE'
    );

    return result.affectedRows;
  }
}

export default NoteSharingService;
