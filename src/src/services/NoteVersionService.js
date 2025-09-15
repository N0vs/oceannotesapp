import crypto from 'crypto';

/**
 * Serviço de Versionamento de Notas
 * Segue o Single Responsibility Principle - responsável apenas por versionamento
 * Segue o Open/Closed Principle - extensível para novos tipos de versionamento
 */
class NoteVersionService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Gera hash SHA-256 do conteúdo para detecção de mudanças
   */
  generateContentHash(titulo, conteudo) {
    const content = `${titulo}|${conteudo || ''}`;
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Cria nova versão de uma nota
   */
  async createVersion(notaId, utilizadorId, titulo, conteudo, dispositivoId = null, versaoPai = null) {
    const hashConteudo = this.generateContentHash(titulo, conteudo);
    
    // Verificar se já existe versão com mesmo hash (evitar duplicatas)
    const existingVersion = await this.db.query(
      'SELECT ID FROM NotaVersao WHERE NotaID = ? AND HashConteudo = ? ORDER BY VersaoNumero DESC LIMIT 1',
      [notaId, hashConteudo]
    );

    if (existingVersion.length > 0) {
      return existingVersion[0];
    }

    // Obter próximo número de versão
    const lastVersion = await this.db.query(
      'SELECT MAX(VersaoNumero) as maxVersion FROM NotaVersao WHERE NotaID = ?',
      [notaId]
    );
    
    const nextVersion = (lastVersion[0]?.maxVersion || 0) + 1;

    // Criar nova versão
    const result = await this.db.query(
      `INSERT INTO NotaVersao 
       (NotaID, UtilizadorID, Titulo, Conteudo, VersaoNumero, HashConteudo, DispositivoID, VersaoPai) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [notaId, utilizadorId, titulo, conteudo, nextVersion, hashConteudo, dispositivoId, versaoPai]
    );

    return {
      ID: result.insertId,
      NotaID: notaId,
      VersaoNumero: nextVersion,
      HashConteudo: hashConteudo
    };
  }

  /**
   * Obtém versão atual de uma nota
   */
  async getCurrentVersion(notaId) {
    const result = await this.db.query(
      `SELECT nv.* FROM NotaVersao nv 
       INNER JOIN Nota n ON n.VersaoAtual = nv.ID 
       WHERE n.id = ?`,
      [notaId]
    );

    return result[0] || null;
  }

  /**
   * Obtém todas as versões de uma nota
   */
  async getVersionHistory(notaId, limit = 50) {
    return await this.db.query(
      `SELECT nv.*, u.Nome as NomeUsuario 
       FROM NotaVersao nv 
       INNER JOIN Utilizador u ON u.Id = nv.UtilizadorID 
       WHERE nv.NotaID = ? 
       ORDER BY nv.VersaoNumero DESC 
       LIMIT ?`,
      [notaId, limit]
    );
  }

  /**
   * Compara duas versões e detecta diferenças
   */
  async compareVersions(versaoId1, versaoId2) {
    const versions = await this.db.query(
      'SELECT ID, Titulo, Conteudo, HashConteudo, DataCriacao FROM NotaVersao WHERE ID IN (?, ?)',
      [versaoId1, versaoId2]
    );

    if (versions.length !== 2) {
      throw new Error('Uma ou ambas versões não foram encontradas');
    }

    const [v1, v2] = versions;
    
    return {
      versao1: v1,
      versao2: v2,
      tituloMudou: v1.Titulo !== v2.Titulo,
      conteudoMudou: v1.HashConteudo !== v2.HashConteudo,
      diferencaTempo: new Date(v2.DataCriacao) - new Date(v1.DataCriacao)
    };
  }

  /**
   * Atualiza versão atual da nota
   */
  async setCurrentVersion(notaId, versaoId, utilizadorId) {
    await this.db.query(
      'UPDATE Nota SET VersaoAtual = ?, UltimoModificadorID = ?, UltimaModificacao = NOW() WHERE id = ?',
      [versaoId, utilizadorId, notaId]
    );
  }

  /**
   * Marca versão como sincronizada
   */
  async markVersionSynchronized(versaoId) {
    await this.db.query(
      'UPDATE NotaVersao SET StatusSincronizacao = ? WHERE ID = ?',
      ['sincronizado', versaoId]
    );
  }

  /**
   * Obtém versões pendentes de sincronização
   */
  async getPendingSyncVersions(utilizadorId = null) {
    let query = 'SELECT * FROM NotaVersao WHERE StatusSincronizacao = ?';
    let params = ['pendente'];

    if (utilizadorId) {
      query += ' AND UtilizadorID = ?';
      params.push(utilizadorId);
    }

    return await this.db.query(query, params);
  }

  /**
   * Detecta versões conflitantes
   */
  async detectConflictingVersions(notaId, baseVersionId) {
    return await this.db.query(
      `SELECT * FROM NotaVersao 
       WHERE NotaID = ? 
       AND ID != ? 
       AND VersaoPai = ? 
       AND StatusSincronizacao IN ('pendente', 'conflito')`,
      [notaId, baseVersionId, baseVersionId]
    );
  }
}

export default NoteVersionService;
