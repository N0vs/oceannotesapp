/**
 * Serviço de Histórico de Notas
 * Segue o Single Responsibility Principle - responsável apenas por histórico
 */
class NoteHistoryService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Adiciona entrada no histórico
   */
  async addHistoryEntry(notaId, versaoId, utilizadorId, tipoAcao, descricaoAcao, metadadosAcao = null) {
    // Se versaoId não foi fornecido, usar versão atual da nota
    if (!versaoId) {
      const currentVersion = await this.db.query(
        'SELECT VersaoAtual FROM Nota WHERE id = ?',
        [notaId]
      );
      versaoId = currentVersion[0]?.VersaoAtual;
    }

    const result = await this.db.query(
      `INSERT INTO NotaHistorico 
       (NotaID, VersaoID, UtilizadorID, TipoAcao, DescricaoAcao, MetadadosAcao) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [notaId, versaoId, utilizadorId, tipoAcao, descricaoAcao, JSON.stringify(metadadosAcao)]
    );

    return result.insertId;
  }

  /**
   * Obtém histórico completo de uma nota
   */
  async getNoteHistory(notaId, limit = 100) {
    return await this.db.query(
      `SELECT nh.*, u.Nome as NomeUsuario, nv.VersaoNumero
       FROM NotaHistorico nh
       INNER JOIN Utilizador u ON u.Id = nh.UtilizadorID
       LEFT JOIN NotaVersao nv ON nv.ID = nh.VersaoID
       WHERE nh.NotaID = ?
       ORDER BY nh.DataAcao DESC
       LIMIT ?`,
      [notaId, limit]
    );
  }

  /**
   * Obtém histórico de um usuário específico
   */
  async getUserHistory(utilizadorId, limit = 50) {
    return await this.db.query(
      `SELECT nh.*, n.titulo as TituloNota
       FROM NotaHistorico nh
       INNER JOIN Nota n ON n.id = nh.NotaID
       WHERE nh.UtilizadorID = ?
       ORDER BY nh.DataAcao DESC
       LIMIT ?`,
      [utilizadorId, limit]
    );
  }

  /**
   * Obtém estatísticas de atividade
   */
  async getActivityStats(notaId, periodo = '7 days') {
    return await this.db.query(
      `SELECT 
         TipoAcao,
         COUNT(*) as quantidade,
         COUNT(DISTINCT UtilizadorID) as usuarios_unicos
       FROM NotaHistorico 
       WHERE NotaID = ? 
       AND DataAcao >= DATE_SUB(NOW(), INTERVAL ${periodo})
       GROUP BY TipoAcao`,
      [notaId]
    );
  }
}

export default NoteHistoryService;
