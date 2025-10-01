/**
 * Serviço de Resolução de Conflitos
 * Segue o Single Responsibility Principle - responsável apenas por resolver conflitos
 * Segue o Strategy Pattern para diferentes tipos de resolução
 */
class ConflictResolutionService {
  constructor(database, versionService, historyService) {
    this.db = database;
    this.versionService = versionService;
    this.historyService = historyService;
    
    // Strategy Pattern para diferentes tipos de resolução
    this.resolutionStrategies = {
      'manter_local': this.resolveKeepLocal.bind(this),
      'manter_remoto': this.resolveKeepRemote.bind(this),
      'merge_manual': this.resolveMergeManual.bind(this),
      'criar_versoes_separadas': this.resolveCreateSeparateVersions.bind(this)
    };
  }

  /**
   * Resolve conflito usando estratégia especificada
   */
  async resolveConflict(conflictId, tipoResolucao, dadosResolucao = null, utilizadorId) {
    const conflict = await this.getConflictDetails(conflictId);
    
    if (!conflict) {
      throw new Error('Conflito não encontrado');
    }

    if (conflict.StatusConflito !== 'pendente') {
      throw new Error('Conflito já foi resolvido');
    }

    const strategy = this.resolutionStrategies[tipoResolucao];
    if (!strategy) {
      throw new Error(`Tipo de resolução inválido: ${tipoResolucao}`);
    }

    const result = await strategy(conflict, dadosResolucao, utilizadorId);

    // Atualizar registro do conflito
    await this.db.query(
      `UPDATE NotaConflito 
       SET StatusConflito = ?, TipoResolucao = ?, VersaoResolucao = ?, DataResolucao = NOW() 
       WHERE ID = ?`,
      ['resolvido_manual', tipoResolucao, result.versaoResolucao, conflictId]
    );

    // Registrar no histórico
    await this.historyService.addHistoryEntry(
      conflict.NotaID,
      result.versaoResolucao,
      utilizadorId,
      'conflito_resolvido',
      `Conflito resolvido usando estratégia: ${tipoResolucao}`,
      { conflictId, tipoResolucao, versaoAnterior: conflict.VersaoLocal }
    );

    return result;
  }

  /**
   * Estratégia: Manter versão local
   */
  async resolveKeepLocal(conflict, dadosResolucao, utilizadorId) {
    // Marcar versão local como atual
    await this.versionService.setCurrentVersion(
      conflict.NotaID, 
      conflict.VersaoLocal, 
      utilizadorId
    );

    // Marcar versão local como sincronizada
    await this.versionService.markVersionSynchronized(conflict.VersaoLocal);

    // Marcar versão remota como obsoleta
    await this.db.query(
      'UPDATE NotaVersao SET StatusSincronizacao = ? WHERE ID = ?',
      ['obsoleta', conflict.VersaoRemota]
    );

    return {
      versaoResolucao: conflict.VersaoLocal,
      tipo: 'manter_local'
    };
  }

  /**
   * Estratégia: Manter versão remota
   */
  async resolveKeepRemote(conflict, dadosResolucao, utilizadorId) {
    // Marcar versão remota como atual
    await this.versionService.setCurrentVersion(
      conflict.NotaID, 
      conflict.VersaoRemota, 
      utilizadorId
    );

    // Marcar versão remota como sincronizada
    await this.versionService.markVersionSynchronized(conflict.VersaoRemota);

    // Marcar versão local como obsoleta
    await this.db.query(
      'UPDATE NotaVersao SET StatusSincronizacao = ? WHERE ID = ?',
      ['obsoleta', conflict.VersaoLocal]
    );

    return {
      versaoResolucao: conflict.VersaoRemota,
      tipo: 'manter_remoto'
    };
  }

  /**
   * Estratégia: Merge manual
   */
  async resolveMergeManual(conflict, dadosResolucao, utilizadorId) {
    if (!dadosResolucao || !dadosResolucao.titulo || !dadosResolucao.conteudo) {
      throw new Error('Dados de merge são obrigatórios para resolução manual');
    }

    // Criar nova versão com conteúdo mesclado
    const mergedVersion = await this.versionService.createVersion(
      conflict.NotaID,
      utilizadorId,
      dadosResolucao.titulo,
      dadosResolucao.conteudo,
      dadosResolucao.dispositivoId,
      conflict.VersaoBase // Usar versão base como pai
    );

    // Definir como versão atual
    await this.versionService.setCurrentVersion(
      conflict.NotaID,
      mergedVersion.ID,
      utilizadorId
    );

    // Marcar versões conflitantes como mescladas
    await this.db.query(
      'UPDATE NotaVersao SET StatusSincronizacao = ? WHERE ID IN (?, ?)',
      ['mesclada', conflict.VersaoLocal, conflict.VersaoRemota]
    );

    return {
      versaoResolucao: mergedVersion.ID,
      tipo: 'merge_manual',
      versaoMesclada: mergedVersion
    };
  }

  /**
   * Estratégia: Criar versões separadas
   */
  async resolveCreateSeparateVersions(conflict, dadosResolucao, utilizadorId) {
    // Obter dados da nota original
    const notaOriginal = await this.db.query(
      'SELECT * FROM Nota WHERE id = ?',
      [conflict.NotaID]
    );

    if (!notaOriginal.length) {
      throw new Error('Nota original não encontrada');
    }

    const nota = notaOriginal[0];

    // Criar cópia da nota para versão local
    const notaCopiaLocal = await this.db.query(
      `INSERT INTO Nota (titulo, conteudo, UtilizadorID, StatusCompartilhamento) 
       VALUES (?, ?, ?, ?)`,
      [
        `${nota.titulo} (Versão Local)`,
        conflict.ConteudoLocal,
        conflict.UsuarioLocal,
        'privada'
      ]
    );

    // Criar cópia da nota para versão remota
    const notaCopiaRemota = await this.db.query(
      `INSERT INTO Nota (titulo, conteudo, UtilizadorID, StatusCompartilhamento) 
       VALUES (?, ?, ?, ?)`,
      [
        `${nota.titulo} (Versão Remota)`,
        conflict.ConteudoRemoto,
        conflict.UsuarioRemoto,
        'privada'
      ]
    );

    // Manter versão mais recente como principal
    const versaoMaisRecente = conflict.DataCriacaoLocal > conflict.DataCriacaoRemota 
      ? conflict.VersaoLocal 
      : conflict.VersaoRemota;

    await this.versionService.setCurrentVersion(
      conflict.NotaID,
      versaoMaisRecente,
      utilizadorId
    );

    return {
      versaoResolucao: versaoMaisRecente,
      tipo: 'criar_versoes_separadas',
      notaCopiaLocal: notaCopiaLocal.insertId,
      notaCopiaRemota: notaCopiaRemota.insertId
    };
  }

  /**
   * Resolução automática baseada em regras
   */
  async resolveAutomatically(conflictId) {
    const conflict = await this.getConflictDetails(conflictId);
    
    if (!conflict) {
      throw new Error('Conflito não encontrado');
    }

    // Regra 1: Se uma versão é muito mais recente, mantê-la
    const diffTempo = Math.abs(
      new Date(conflict.DataCriacaoRemota) - new Date(conflict.DataCriacaoLocal)
    );
    
    if (diffTempo > 24 * 60 * 60 * 1000) { // Mais de 24 horas
      const versaoMaisRecente = conflict.DataCriacaoRemota > conflict.DataCriacaoLocal
        ? 'manter_remoto'
        : 'manter_local';
      
      return await this.resolveConflict(
        conflictId, 
        versaoMaisRecente, 
        null, 
        conflict.UsuarioLocal
      );
    }

    // Regra 2: Se conteúdos são muito similares, manter mais recente
    const similarity = this.calculateSimilarity(
      conflict.ConteudoLocal, 
      conflict.ConteudoRemoto
    );
    
    if (similarity > 0.8) {
      const versaoMaisRecente = conflict.DataCriacaoRemota > conflict.DataCriacaoLocal
        ? 'manter_remoto'
        : 'manter_local';
      
      return await this.resolveConflict(
        conflictId, 
        versaoMaisRecente, 
        null, 
        conflict.UsuarioLocal
      );
    }

    // Caso contrário, criar versões separadas
    return await this.resolveConflict(
      conflictId, 
      'criar_versoes_separadas', 
      null, 
      conflict.UsuarioLocal
    );
  }

  /**
   * Obtém detalhes completos do conflito
   */
  async getConflictDetails(conflictId) {
    const result = await this.db.query(
      `SELECT nc.*, 
              vl.Titulo as TituloLocal, vl.Conteudo as ConteudoLocal, vl.DataCriacao as DataCriacaoLocal,
              vr.Titulo as TituloRemoto, vr.Conteudo as ConteudoRemoto, vr.DataCriacao as DataCriacaoRemota,
              n.titulo as TituloNota
       FROM NotaConflito nc
       INNER JOIN NotaVersao vl ON vl.ID = nc.VersaoLocal
       INNER JOIN NotaVersao vr ON vr.ID = nc.VersaoRemota
       INNER JOIN Nota n ON n.id = nc.NotaID
       WHERE nc.ID = ?`,
      [conflictId]
    );

    return result[0] || null;
  }

  /**
   * Calcula similaridade entre textos
   */
  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }

  /**
   * Obtém sugestões de resolução para um conflito
   */
  async getResolutionSuggestions(conflictId) {
    const conflict = await this.getConflictDetails(conflictId);
    
    if (!conflict) {
      throw new Error('Conflito não encontrado');
    }

    const suggestions = [];
    
    // Analisar diferenças
    const similarity = this.calculateSimilarity(
      conflict.ConteudoLocal, 
      conflict.ConteudoRemoto
    );
    
    const timeDiff = Math.abs(
      new Date(conflict.DataCriacaoRemota) - new Date(conflict.DataCriacaoLocal)
    );

    // Sugestão baseada em tempo
    if (timeDiff > 24 * 60 * 60 * 1000) {
      const maisRecente = conflict.DataCriacaoRemota > conflict.DataCriacaoLocal
        ? 'remoto' : 'local';
      
      suggestions.push({
        tipo: `manter_${maisRecente}`,
        confianca: 0.8,
        razao: `Versão ${maisRecente} é significativamente mais recente`
      });
    }

    // Sugestão baseada em similaridade
    if (similarity > 0.8) {
      suggestions.push({
        tipo: 'merge_automatico',
        confianca: 0.7,
        razao: 'Conteúdos são muito similares, merge automático possível'
      });
    } else if (similarity < 0.3) {
      suggestions.push({
        tipo: 'criar_versoes_separadas',
        confianca: 0.9,
        razao: 'Conteúdos muito diferentes, melhor manter versões separadas'
      });
    }

    // Sugestão padrão
    suggestions.push({
      tipo: 'merge_manual',
      confianca: 0.6,
      razao: 'Revisão manual recomendada para melhor resultado'
    });

    return suggestions.sort((a, b) => b.confianca - a.confianca);
  }
}

export default ConflictResolutionService;
