/**
 * Serviço de Detecção de Conflitos
 * Segue o Single Responsibility Principle - responsável apenas por detectar conflitos
 * Segue o Open/Closed Principle - extensível para novos tipos de detecção
 */
class ConflictDetectionService {
  constructor(database, versionService) {
    this.db = database;
    this.versionService = versionService;
  }

  /**
   * Detecta conflitos entre versões de uma nota
   */
  async detectConflicts(notaId) {
    // Obter versões pendentes de sincronização
    const pendingVersions = await this.db.query(
      `SELECT * FROM NotaVersao 
       WHERE NotaID = ? 
       AND StatusSincronizacao IN ('pendente', 'conflito')
       ORDER BY DataCriacao ASC`,
      [notaId]
    );

    if (pendingVersions.length < 2) {
      return []; // Não há conflitos possíveis
    }

    const conflicts = [];

    // Comparar versões para detectar conflitos
    for (let i = 0; i < pendingVersions.length; i++) {
      for (let j = i + 1; j < pendingVersions.length; j++) {
        const v1 = pendingVersions[i];
        const v2 = pendingVersions[j];

        // Verificar se são versões conflitantes
        const isConflict = await this.isConflictingVersions(v1, v2);
        
        if (isConflict) {
          const conflict = await this.createConflictRecord(notaId, v1, v2);
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Verifica se duas versões são conflitantes
   */
  async isConflictingVersions(version1, version2) {
    // Não há conflito se uma das versões é a primeira (criação da nota)
    if (!version1.VersaoPai || !version2.VersaoPai) {
      return false;
    }

    // Não há conflito se são do mesmo usuário no mesmo dispositivo
    if (version1.UtilizadorID === version2.UtilizadorID && 
        version1.DispositivoID === version2.DispositivoID) {
      return false;
    }

    // Conflito se:
    // 1. Têm a mesma versão pai (edições paralelas)
    // 2. Têm conteúdo diferente (hashes diferentes)
    // 3. Foram criadas em dispositivos diferentes
    
    return (
      version1.VersaoPai === version2.VersaoPai &&
      version1.HashConteudo !== version2.HashConteudo &&
      version1.DispositivoID !== version2.DispositivoID
    );
  }

  /**
   * Cria registro de conflito no banco
   */
  async createConflictRecord(notaId, versionLocal, versionRemota) {
    // Encontrar versão base comum
    const versaoBase = versionLocal.VersaoPai || versionRemota.VersaoPai;

    const result = await this.db.query(
      `INSERT INTO NotaConflito 
       (NotaID, VersaoBase, VersaoLocal, VersaoRemota, UsuarioLocal, UsuarioRemoto) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        notaId,
        versaoBase,
        versionLocal.ID,
        versionRemota.ID,
        versionLocal.UtilizadorID,
        versionRemota.UtilizadorID
      ]
    );

    // Marcar versões como em conflito
    await this.db.query(
      'UPDATE NotaVersao SET StatusSincronizacao = ? WHERE ID IN (?, ?)',
      ['conflito', versionLocal.ID, versionRemota.ID]
    );

    return {
      ID: result.insertId,
      NotaID: notaId,
      VersaoLocal: versionLocal,
      VersaoRemota: versionRemota,
      StatusConflito: 'pendente'
    };
  }

  /**
   * Obtém conflitos pendentes para um usuário
   */
  async getPendingConflicts(utilizadorId) {
    try {
      console.log('Debug - getPendingConflicts chamado para usuário:', utilizadorId);
      
      const result = await this.db.query(
        `SELECT nc.*, n.titulo as TituloNota,
                vl.Titulo as TituloLocal, vl.DataCriacao as DataLocal,
                vr.Titulo as TituloRemoto, vr.DataCriacao as DataRemoto,
                ul.Nome as NomeUsuarioLocal, ur.Nome as NomeUsuarioRemoto
         FROM NotaConflito nc
         INNER JOIN Nota n ON n.id = nc.NotaID
         INNER JOIN NotaVersao vl ON vl.ID = nc.VersaoLocal
         INNER JOIN NotaVersao vr ON vr.ID = nc.VersaoRemota
         INNER JOIN Utilizador ul ON ul.Id = nc.UsuarioLocal
         INNER JOIN Utilizador ur ON ur.Id = nc.UsuarioRemoto
         WHERE nc.StatusConflito = 'pendente'
         AND (nc.UsuarioLocal = ? OR nc.UsuarioRemoto = ?)
         ORDER BY nc.DataDeteccao DESC`,
        [utilizadorId, utilizadorId]
      );
      
      console.log('Debug - Conflitos encontrados:', result.length);
      return result;
    } catch (error) {
      console.error('Erro em getPendingConflicts:', error);
      // Retornar array vazio em caso de erro para evitar quebra da aplicação
      return [];
    }
  }

  /**
   * Detecta conflitos em tempo real durante edição
   */
  async detectRealTimeConflict(notaId, utilizadorId, currentHash) {
    // Verificar se há outras sessões ativas editando a mesma nota
    const activeSessions = await this.db.query(
      `SELECT * FROM NotaSessaoEdicao 
       WHERE NotaID = ? 
       AND UtilizadorID != ? 
       AND StatusSessao = 'ativa' 
       AND DataUltimaAtividade > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
      [notaId, utilizadorId]
    );

    if (activeSessions.length === 0) {
      return null; // Não há conflito
    }

    // Verificar se o conteúdo mudou desde que o usuário começou a editar
    const currentVersion = await this.versionService.getCurrentVersion(notaId);
    
    if (currentVersion && currentVersion.HashConteudo !== currentHash) {
      return {
        tipo: 'edicao_simultanea',
        sessoes_ativas: activeSessions,
        versao_atual: currentVersion
      };
    }

    return null;
  }

  /**
   * Analisa complexidade do conflito
   */
  async analyzeConflictComplexity(conflictId) {
    const conflict = await this.db.query(
      `SELECT nc.*, vl.Titulo as TituloLocal, vl.Conteudo as ConteudoLocal,
              vr.Titulo as TituloRemoto, vr.Conteudo as ConteudoRemoto
       FROM NotaConflito nc
       INNER JOIN NotaVersao vl ON vl.ID = nc.VersaoLocal
       INNER JOIN NotaVersao vr ON vr.ID = nc.VersaoRemota
       WHERE nc.ID = ?`,
      [conflictId]
    );

    if (!conflict.length) {
      throw new Error('Conflito não encontrado');
    }

    const c = conflict[0];
    
    // Análise de complexidade
    const tituloConflito = c.TituloLocal !== c.TituloRemoto;
    const conteudoConflito = c.ConteudoLocal !== c.ConteudoRemoto;
    
    // Calcular similaridade do conteúdo (simplificado)
    const similaridade = this.calculateSimilarity(c.ConteudoLocal, c.ConteudoRemoto);
    
    let complexidade = 'baixa';
    if (tituloConflito && conteudoConflito) {
      complexidade = 'alta';
    } else if (similaridade < 0.5) {
      complexidade = 'media';
    }

    return {
      complexidade,
      tituloConflito,
      conteudoConflito,
      similaridade,
      recomendacao: this.getResolutionRecommendation(complexidade, similaridade)
    };
  }

  /**
   * Calcula similaridade entre dois textos (algoritmo simplificado)
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
   * Obtém recomendação de resolução baseada na análise
   */
  getResolutionRecommendation(complexidade, similaridade) {
    if (complexidade === 'baixa' && similaridade > 0.8) {
      return 'merge_automatico';
    } else if (complexidade === 'alta' || similaridade < 0.3) {
      return 'resolucao_manual';
    } else {
      return 'manter_mais_recente';
    }
  }
}

export default ConflictDetectionService;
