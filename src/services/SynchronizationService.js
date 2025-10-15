/**
 * Serviço de Sincronização Offline/Online
 * Segue o Single Responsibility Principle - responsável apenas por sincronização
 * Segue o Dependency Inversion Principle - abstrai operações de rede e armazenamento
 * 
 * @class SynchronizationService
 * @extends EventEmitter
 * @description Service responsável por sincronização em tempo real via WebSocket
 */
import { EventEmitter } from 'events';

class SynchronizationService extends EventEmitter {
  constructor(database, versionService, conflictDetectionService, historyService) {
    super();
    this.db = database;
    this.versionService = versionService;
    this.conflictDetectionService = conflictDetectionService;
    this.historyService = historyService;
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    
    // Configurar listeners de conectividade
    this.setupConnectivityListeners();
  }

  /**
   * Configura listeners para mudanças de conectividade
   */
  setupConnectivityListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processSyncQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Salva edição offline na fila de sincronização
   */
  async saveOfflineEdit(notaId, utilizadorId, titulo, conteudo, dispositivoId) {
    // Criar versão local pendente
    const version = await this.versionService.createVersion(
      notaId,
      utilizadorId,
      titulo,
      conteudo,
      dispositivoId
    );

    // Adicionar à fila de sincronização
    const syncItem = {
      id: `sync_${Date.now()}_${Math.random()}`,
      tipo: 'edicao_nota',
      notaId,
      versaoId: version.ID,
      utilizadorId,
      dispositivoId,
      timestamp: new Date(),
      tentativas: 0,
      maxTentativas: 3
    };

    await this.addToSyncQueue(syncItem);

    // Registrar no histórico local
    await this.historyService.addHistoryEntry(
      notaId,
      version.ID,
      utilizadorId,
      'edicao_offline',
      'Edição salva offline, aguardando sincronização',
      { dispositivoId, syncItemId: syncItem.id }
    );

    return version;
  }

  /**
   * Adiciona item à fila de sincronização
   */
  async addToSyncQueue(syncItem) {
    await this.db.query(
      `INSERT INTO NotaSincronizacaoOffline 
       (ID, NotaID, VersaoID, UtilizadorID, DispositivoID, TipoOperacao, DadosOperacao, StatusSincronizacao) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        syncItem.id,
        syncItem.notaId,
        syncItem.versaoId,
        syncItem.utilizadorId,
        syncItem.dispositivoId,
        syncItem.tipo,
        JSON.stringify(syncItem),
        'pendente'
      ]
    );

    this.syncQueue.push(syncItem);

    // Tentar sincronizar imediatamente se online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  /**
   * Processa fila de sincronização
   */
  async processSyncQueue() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Obter itens pendentes do banco
      const pendingItems = await this.db.query(
        `SELECT * FROM NotaSincronizacaoOffline 
         WHERE StatusSincronizacao = 'pendente' 
         ORDER BY DataCriacao ASC`
      );

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
        } catch (error) {
          console.error(`Erro ao sincronizar item ${item.ID}:`, error);
          await this.handleSyncError(item, error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sincroniza item individual
   */
  async syncItem(syncItem) {
    const dados = JSON.parse(syncItem.DadosOperacao);

    switch (syncItem.TipoOperacao) {
      case 'edicao_nota':
        await this.syncNoteEdit(syncItem, dados);
        break;
      case 'criacao_nota':
        await this.syncNoteCreation(syncItem, dados);
        break;
      case 'exclusao_nota':
        await this.syncNoteDeletion(syncItem, dados);
        break;
      default:
        throw new Error(`Tipo de operação desconhecido: ${syncItem.TipoOperacao}`);
    }
  }

  /**
   * Sincroniza edição de nota
   */
  async syncNoteEdit(syncItem, dados) {
    // Verificar se há conflitos
    const conflicts = await this.conflictDetectionService.detectConflicts(syncItem.NotaID);

    if (conflicts.length > 0) {
      // Marcar como conflito
      await this.db.query(
        'UPDATE NotaSincronizacaoOffline SET StatusSincronizacao = ? WHERE ID = ?',
        ['conflito', syncItem.ID]
      );

      await this.db.query(
        'UPDATE NotaVersao SET StatusSincronizacao = ? WHERE ID = ?',
        ['conflito', syncItem.VersaoID]
      );

      return;
    }

    // Sincronizar versão
    await this.versionService.markVersionSynchronized(syncItem.VersaoID);
    
    // Atualizar versão atual da nota
    await this.versionService.setCurrentVersion(
      syncItem.NotaID,
      syncItem.VersaoID,
      syncItem.UtilizadorID
    );

    // Marcar como sincronizado
    await this.db.query(
      'UPDATE NotaSincronizacaoOffline SET StatusSincronizacao = ?, DataSincronizacao = NOW() WHERE ID = ?',
      ['sincronizado', syncItem.ID]
    );

    // Registrar no histórico
    await this.historyService.addHistoryEntry(
      syncItem.NotaID,
      syncItem.VersaoID,
      syncItem.UtilizadorID,
      'sincronizacao_completa',
      'Edição offline sincronizada com sucesso',
      { syncItemId: syncItem.ID }
    );
  }

  /**
   * Sincroniza criação de nota
   */
  async syncNoteCreation(syncItem, dados) {
    // Verificar se nota já existe (pode ter sido criada em outro dispositivo)
    const existingNote = await this.db.query(
      'SELECT id FROM Nota WHERE titulo = ? AND UtilizadorID = ? AND DataCriacao > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      [dados.titulo, syncItem.UtilizadorID]
    );

    if (existingNote.length > 0) {
      // Nota já existe, marcar como duplicada
      await this.db.query(
        'UPDATE NotaSincronizacaoOffline SET StatusSincronizacao = ? WHERE ID = ?',
        ['duplicada', syncItem.ID]
      );
      return;
    }

    // Sincronizar criação
    await this.db.query(
      'UPDATE NotaSincronizacaoOffline SET StatusSincronizacao = ?, DataSincronizacao = NOW() WHERE ID = ?',
      ['sincronizado', syncItem.ID]
    );
  }

  /**
   * Sincroniza exclusão de nota
   */
  async syncNoteDeletion(syncItem, dados) {
    // Verificar se nota ainda existe
    const note = await this.db.query(
      'SELECT id FROM Nota WHERE id = ?',
      [syncItem.NotaID]
    );

    if (note.length === 0) {
      // Nota já foi excluída
      await this.db.query(
        'UPDATE NotaSincronizacaoOffline SET StatusSincronizacao = ? WHERE ID = ?',
        ['ja_processado', syncItem.ID]
      );
      return;
    }

    // Processar exclusão
    await this.db.query(
      'UPDATE Nota SET ativo = FALSE WHERE id = ?',
      [syncItem.NotaID]
    );

    await this.db.query(
      'UPDATE NotaSincronizacaoOffline SET StatusSincronizacao = ?, DataSincronizacao = NOW() WHERE ID = ?',
      ['sincronizado', syncItem.ID]
    );
  }

  /**
   * Trata erros de sincronização
   */
  async handleSyncError(syncItem, error) {
    const tentativas = (syncItem.Tentativas || 0) + 1;

    if (tentativas >= 3) {
      // Marcar como falha permanente
      await this.db.query(
        'UPDATE NotaSincronizacaoOffline SET StatusSincronizacao = ?, Tentativas = ?, UltimoErro = ? WHERE ID = ?',
        ['falha', tentativas, error.message, syncItem.ID]
      );
    } else {
      // Incrementar tentativas e reagendar
      await this.db.query(
        'UPDATE NotaSincronizacaoOffline SET Tentativas = ?, UltimoErro = ?, ProximaTentativa = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE ID = ?',
        [tentativas, error.message, Math.pow(2, tentativas) * 5, syncItem.ID]
      );
    }
  }

  /**
   * Força sincronização de uma nota específica
   */
  async forceSyncNote(notaId, utilizadorId) {
    const pendingVersions = await this.versionService.getPendingSyncVersions(utilizadorId);
    const noteVersions = pendingVersions.filter(v => v.NotaID === notaId);

    for (const version of noteVersions) {
      const syncItem = {
        id: `force_sync_${Date.now()}_${version.ID}`,
        tipo: 'edicao_nota',
        notaId: version.NotaID,
        versaoId: version.ID,
        utilizadorId: version.UtilizadorID,
        dispositivoId: version.DispositivoID,
        timestamp: new Date(),
        tentativas: 0,
        maxTentativas: 1
      };

      await this.addToSyncQueue(syncItem);
    }

    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  /**
   * Obtém status de sincronização
   */
  async getSyncStatus(utilizadorId = null) {
    let query = `
      SELECT 
        StatusSincronizacao,
        COUNT(*) as quantidade
      FROM NotaSincronizacaoOffline
      WHERE 1=1
    `;
    
    const params = [];
    
    if (utilizadorId) {
      query += ' AND UtilizadorID = ?';
      params.push(utilizadorId);
    }
    
    query += ' GROUP BY StatusSincronizacao';

    const result = await this.db.query(query, params);

    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      statusCounts: result.reduce((acc, row) => {
        acc[row.StatusSincronizacao] = row.quantidade;
        return acc;
      }, {}),
      queueSize: this.syncQueue.length
    };
  }

  /**
   * Limpa itens sincronizados antigos
   */
  async cleanupSyncHistory(diasAntigos = 30) {
    const result = await this.db.query(
      `DELETE FROM NotaSincronizacaoOffline 
       WHERE StatusSincronizacao IN ('sincronizado', 'duplicada', 'ja_processado') 
       AND DataSincronizacao < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [diasAntigos]
    );

    return result.affectedRows;
  }

  /**
   * Obtém conflitos pendentes de sincronização
   */
  async getPendingSyncConflicts(utilizadorId) {
    return await this.db.query(
      `SELECT nso.*, n.titulo as TituloNota
       FROM NotaSincronizacaoOffline nso
       INNER JOIN Nota n ON n.id = nso.NotaID
       WHERE nso.StatusSincronizacao = 'conflito'
       AND nso.UtilizadorID = ?
       ORDER BY nso.DataCriacao DESC`,
      [utilizadorId]
    );
  }
}

export default SynchronizationService;
