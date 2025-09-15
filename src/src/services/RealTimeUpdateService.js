/**
 * Serviço de Atualizações em Tempo Real
 * Segue o Single Responsibility Principle - responsável apenas por atualizações em tempo real
 * Usa WebSockets para comunicação bidirecional
 */
class RealTimeUpdateService {
  constructor(conflictDetectionService, historyService) {
    this.conflictDetectionService = conflictDetectionService;
    this.historyService = historyService;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.userId = null;
    this.deviceId = this.generateDeviceId();
    
    // Configurar listeners de conectividade
    this.setupConnectivityListeners();
  }

  /**
   * Gera ID único do dispositivo
   */
  generateDeviceId() {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Conecta ao servidor WebSocket
   */
  async connect(userId, token) {
    this.userId = userId;
    
    try {
      const wsUrl = `ws://localhost:3001/ws?token=${token}&userId=${userId}&deviceId=${this.deviceId}`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout na conexão WebSocket'));
        }, 5000);
        
        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.handleOpen();
          resolve();
        };
        
        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      throw error;
    }
  }

  /**
   * Desconecta do servidor WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Manipula abertura da conexão
   */
  handleOpen() {
    console.log('WebSocket conectado');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Registrar dispositivo
    this.send('register_device', {
      deviceId: this.deviceId,
      userId: this.userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Manipula mensagens recebidas
   */
  async handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      await this.processMessage(message);
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  }

  /**
   * Processa mensagem recebida
   */
  async processMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'note_updated':
        await this.handleNoteUpdate(data);
        break;
      case 'note_shared':
        await this.handleNoteShared(data);
        break;
      case 'conflict_detected':
        await this.handleConflictDetected(data);
        break;
      case 'user_editing':
        await this.handleUserEditing(data);
        break;
      case 'sync_status':
        await this.handleSyncStatus(data);
        break;
      default:
        console.log('Tipo de mensagem desconhecido:', type);
    }
    
    // Notificar listeners
    this.notifyListeners(type, data);
  }

  /**
   * Manipula atualização de nota
   */
  async handleNoteUpdate(data) {
    const { noteId, versionId, userId, title, content } = data;
    
    // Verificar se não é uma atualização do próprio usuário
    if (userId === this.userId) {
      return;
    }
    
    // Detectar possíveis conflitos
    const conflicts = await this.conflictDetectionService.detectRealTimeConflict(
      noteId, 
      this.userId, 
      data.contentHash
    );
    
    if (conflicts) {
      this.send('conflict_detected', {
        noteId,
        conflictType: conflicts.tipo,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Manipula compartilhamento de nota
   */
  async handleNoteShared(data) {
    const { noteId, sharedWithUserId, permission } = data;
    
    if (sharedWithUserId === this.userId) {
      // Nota foi compartilhada com este usuário
      console.log(`Nova nota compartilhada: ${noteId} com permissão ${permission}`);
    }
  }

  /**
   * Manipula detecção de conflito
   */
  async handleConflictDetected(data) {
    const { noteId, conflictId, conflictType } = data;
    console.log(`Conflito detectado na nota ${noteId}: ${conflictType}`);
  }

  /**
   * Manipula usuário editando
   */
  async handleUserEditing(data) {
    const { noteId, userId, userName, isEditing } = data;
    
    if (userId !== this.userId) {
      console.log(`${userName} ${isEditing ? 'começou' : 'parou'} de editar a nota ${noteId}`);
    }
  }

  /**
   * Manipula status de sincronização
   */
  async handleSyncStatus(data) {
    const { status, pendingCount } = data;
    console.log(`Status de sincronização: ${status}, pendentes: ${pendingCount}`);
  }

  /**
   * Manipula fechamento da conexão
   */
  handleClose(event) {
    console.log('WebSocket desconectado:', event.code, event.reason);
    this.isConnected = false;
    
    // Tentar reconectar se não foi fechamento intencional
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Manipula erros da conexão
   */
  handleError(error) {
    console.error('Erro WebSocket:', error);
  }

  /**
   * Agenda tentativa de reconexão
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Tentando reconectar em ${delay}ms (tentativa ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected && this.userId) {
        this.connect(this.userId, this.getStoredToken());
      }
    }, delay);
  }

  /**
   * Obtém token armazenado
   */
  getStoredToken() {
    // Implementar lógica para obter token do armazenamento
    if (typeof window !== 'undefined') {
      return document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
    }
    return null;
  }

  /**
   * Envia mensagem para o servidor
   */
  send(type, data) {
    if (this.isConnected && this.ws) {
      const message = {
        type,
        data: {
          ...data,
          userId: this.userId,
          deviceId: this.deviceId,
          timestamp: new Date().toISOString()
        }
      };
      
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket não conectado, mensagem não enviada:', type, data);
    }
  }

  /**
   * Notifica início de edição de nota
   */
  startEditing(noteId) {
    this.send('start_editing', { noteId });
  }

  /**
   * Notifica fim de edição de nota
   */
  stopEditing(noteId) {
    this.send('stop_editing', { noteId });
  }

  /**
   * Notifica atualização de nota
   */
  noteUpdated(noteId, versionId, title, content, contentHash) {
    this.send('note_updated', {
      noteId,
      versionId,
      title,
      content,
      contentHash
    });
  }

  /**
   * Adiciona listener para eventos
   */
  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * Remove listener
   */
  removeListener(eventType, callback) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Notifica todos os listeners de um evento
   */
  notifyListeners(eventType, data) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Erro ao executar listener:', error);
        }
      });
    }
  }

  /**
   * Configura listeners de conectividade
   */
  setupConnectivityListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (!this.isConnected && this.userId) {
          this.connect(this.userId, this.getStoredToken());
        }
      });

      window.addEventListener('offline', () => {
        this.disconnect();
      });

      // Detectar quando a página está sendo fechada
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
    }
  }

  /**
   * Obtém status da conexão
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      deviceId: this.deviceId,
      userId: this.userId
    };
  }
}

export default RealTimeUpdateService;
