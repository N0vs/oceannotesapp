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
   */
  async unshareNote(notaId, proprietarioId, usuarioCompartilhadoId) {
    const result = await this.db.query(
      'UPDATE NotaCompartilhamento SET Ativo = FALSE WHERE NotaID = ? AND ProprietarioID = ? AND UsuarioCompartilhadoID = ?',
      [notaId, proprietarioId, usuarioCompartilhadoId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Compartilhamento não encontrado');
    }

    // Verificar se ainda há outros compartilhamentos ativos
    const activeShares = await this.db.query(
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
    const nota = await this.db.query(
      'SELECT UtilizadorID FROM Nota WHERE ID = ?',
      [notaId]
    );

    if (nota.length && nota[0].UtilizadorID == utilizadorId) {
      return 'admin'; // Proprietário tem permissão total
    }

    // Verificar compartilhamento
    const share = await this.db.query(
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
    return ['editar', 'admin'].includes(permission);
  }

  /**
   * Verifica se usuário pode visualizar nota
   */
  async canUserView(notaId, utilizadorId) {
    const permission = await this.getUserPermission(notaId, utilizadorId);
    return ['visualizar', 'editar', 'admin'].includes(permission);
  }

  /**
   * Obtém todas as notas compartilhadas com um usuário
   */
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
   * Atualiza permissão de compartilhamento
   */
  async updatePermission(notaId, proprietarioId, usuarioCompartilhadoId, novaPermissao) {
    const [result] = await this.db.query(
      'UPDATE NotaCompartilhamento SET TipoPermissao = ? WHERE NotaID = ? AND ProprietarioID = ? AND UsuarioCompartilhadoID = ? AND Ativo = TRUE',
      [novaPermissao, notaId, proprietarioId, usuarioCompartilhadoId]
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
