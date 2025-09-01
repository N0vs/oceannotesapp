const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { connectToDatabase } = require('./src/lib/db');

/**
 * Servidor WebSocket para atualizações em tempo real
 * Gerencia conexões, autenticação e broadcasting de eventos
 */
class WebSocketServer {
  constructor(port = 3001) {
    this.port = port;
    this.wss = null;
    this.clients = new Map(); // Map<userId, Set<WebSocket>>
    this.deviceSessions = new Map(); // Map<deviceId, {userId, ws, lastActivity}>
    this.editingSessions = new Map(); // Map<noteId, Set<userId>>
    this.db = null;
  }

  /**
   * Inicia o servidor WebSocket
   */
  async start() {
    try {
      this.db = await connectToDatabase();
      
      this.wss = new WebSocket.Server({ 
        port: this.port,
        verifyClient: this.verifyClient.bind(this)
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      
      console.log(`WebSocket server iniciado na porta ${this.port}`);
      
      // Configurar limpeza periódica
      this.setupPeriodicCleanup();
      
    } catch (error) {
      console.error('Erro ao iniciar servidor WebSocket:', error);
      throw error;
    }
  }

  /**
   * Verifica cliente antes da conexão
   */
  verifyClient(info) {
    const url = new URL(info.req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.log('Conexão rejeitada: token não fornecido');
      return false;
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      return true;
    } catch (error) {
      console.log('Conexão rejeitada: token inválido');
      return false;
    }
  }

  /**
   * Manipula nova conexão WebSocket
   */
  handleConnection(ws, req) {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const userId = url.searchParams.get('userId');
    const deviceId = url.searchParams.get('deviceId');

    if (!userId || !deviceId) {
      ws.close(1008, 'userId e deviceId são obrigatórios');
      return;
    }

    // Registrar cliente
    this.registerClient(userId, deviceId, ws);

    // Configurar handlers
    ws.on('message', (data) => this.handleMessage(ws, userId, deviceId, data));
    ws.on('close', () => this.handleDisconnection(userId, deviceId, ws));
    ws.on('error', (error) => this.handleError(userId, deviceId, error));

    // Enviar confirmação de conexão
    this.sendToClient(ws, 'connection_established', {
      userId,
      deviceId,
      timestamp: new Date().toISOString()
    });

    console.log(`Cliente conectado: userId=${userId}, deviceId=${deviceId}`);
  }

  /**
   * Registra cliente conectado
   */
  registerClient(userId, deviceId, ws) {
    // Registrar por usuário
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);

    // Registrar sessão do dispositivo
    this.deviceSessions.set(deviceId, {
      userId,
      ws,
      lastActivity: new Date()
    });

    // Marcar propriedades no WebSocket
    ws.userId = userId;
    ws.deviceId = deviceId;
  }

  /**
   * Manipula mensagens recebidas
   */
  async handleMessage(ws, userId, deviceId, data) {
    try {
      const message = JSON.parse(data.toString());
      await this.processMessage(ws, userId, deviceId, message);
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      this.sendToClient(ws, 'error', { message: 'Erro ao processar mensagem' });
    }
  }

  /**
   * Processa mensagem recebida
   */
  async processMessage(ws, userId, deviceId, message) {
    const { type, data } = message;

    // Atualizar última atividade
    const session = this.deviceSessions.get(deviceId);
    if (session) {
      session.lastActivity = new Date();
    }

    switch (type) {
      case 'register_device':
        await this.handleRegisterDevice(userId, deviceId, data);
        break;
      case 'start_editing':
        await this.handleStartEditing(userId, data.noteId);
        break;
      case 'stop_editing':
        await this.handleStopEditing(userId, data.noteId);
        break;
      case 'note_updated':
        await this.handleNoteUpdated(userId, deviceId, data);
        break;
      case 'conflict_detected':
        await this.handleConflictDetected(userId, data);
        break;
      case 'ping':
        this.sendToClient(ws, 'pong', { timestamp: new Date().toISOString() });
        break;
      default:
        console.log(`Tipo de mensagem desconhecido: ${type}`);
    }
  }

  /**
   * Manipula registro de dispositivo
   */
  async handleRegisterDevice(userId, deviceId, data) {
    try {
      // Registrar dispositivo no banco se necessário
      await this.db.query(
        `INSERT IGNORE INTO NotaDispositivo (ID, UtilizadorID, Nome, TipoDispositivo, UltimaConexao) 
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE UltimaConexao = NOW()`,
        [deviceId, userId, data.deviceName || 'Dispositivo Desconhecido', 'web']
      );

      console.log(`Dispositivo registrado: ${deviceId} para usuário ${userId}`);
    } catch (error) {
      console.error('Erro ao registrar dispositivo:', error);
    }
  }

  /**
   * Manipula início de edição
   */
  async handleStartEditing(userId, noteId) {
    if (!this.editingSessions.has(noteId)) {
      this.editingSessions.set(noteId, new Set());
    }
    
    this.editingSessions.get(noteId).add(userId);

    // Notificar outros usuários com acesso à nota
    await this.broadcastToNoteUsers(noteId, userId, 'user_editing', {
      noteId,
      userId,
      isEditing: true
    });

    // Registrar sessão de edição no banco
    try {
      await this.db.query(
        `INSERT INTO NotaSessaoEdicao (NotaID, UtilizadorID, StatusSessao) 
         VALUES (?, ?, 'ativa')
         ON DUPLICATE KEY UPDATE StatusSessao = 'ativa', DataUltimaAtividade = NOW()`,
        [noteId, userId]
      );
    } catch (error) {
      console.error('Erro ao registrar sessão de edição:', error);
    }
  }

  /**
   * Manipula fim de edição
   */
  async handleStopEditing(userId, noteId) {
    const editingUsers = this.editingSessions.get(noteId);
    if (editingUsers) {
      editingUsers.delete(userId);
      if (editingUsers.size === 0) {
        this.editingSessions.delete(noteId);
      }
    }

    // Notificar outros usuários
    await this.broadcastToNoteUsers(noteId, userId, 'user_editing', {
      noteId,
      userId,
      isEditing: false
    });

    // Atualizar sessão no banco
    try {
      await this.db.query(
        `UPDATE NotaSessaoEdicao 
         SET StatusSessao = 'inativa', DataFim = NOW() 
         WHERE NotaID = ? AND UtilizadorID = ?`,
        [noteId, userId]
      );
    } catch (error) {
      console.error('Erro ao finalizar sessão de edição:', error);
    }
  }

  /**
   * Manipula atualização de nota
   */
  async handleNoteUpdated(userId, deviceId, data) {
    const { noteId, versionId, title, content, contentHash } = data;

    // Broadcast para outros usuários com acesso à nota
    await this.broadcastToNoteUsers(noteId, userId, 'note_updated', {
      noteId,
      versionId,
      title,
      content,
      contentHash,
      userId,
      deviceId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Manipula detecção de conflito
   */
  async handleConflictDetected(userId, data) {
    const { noteId, conflictType } = data;

    // Notificar usuários com acesso à nota sobre o conflito
    await this.broadcastToNoteUsers(noteId, null, 'conflict_detected', {
      noteId,
      conflictType,
      detectedBy: userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Faz broadcast para usuários com acesso a uma nota
   */
  async broadcastToNoteUsers(noteId, excludeUserId, messageType, data) {
    try {
      // Obter usuários com acesso à nota
      const noteUsers = await this.db.query(
        `SELECT DISTINCT u.Id, u.Nome
         FROM Utilizador u
         WHERE u.Id = (SELECT UtilizadorID FROM Nota WHERE id = ?)
         OR u.Id IN (
           SELECT UsuarioCompartilhadoID 
           FROM NotaCompartilhamento 
           WHERE NotaID = ? AND Ativo = TRUE
         )`,
        [noteId, noteId]
      );

      // Enviar mensagem para cada usuário conectado
      for (const user of noteUsers) {
        if (excludeUserId && user.Id === excludeUserId) {
          continue;
        }

        const userClients = this.clients.get(user.Id);
        if (userClients) {
          const messageData = {
            ...data,
            userName: user.Nome
          };

          userClients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              this.sendToClient(ws, messageType, messageData);
            }
          });
        }
      }
    } catch (error) {
      console.error('Erro ao fazer broadcast para usuários da nota:', error);
    }
  }

  /**
   * Envia mensagem para cliente específico
   */
  sendToClient(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString()
      };
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Manipula desconexão de cliente
   */
  handleDisconnection(userId, deviceId, ws) {
    // Remover cliente da lista
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }

    // Remover sessão do dispositivo
    this.deviceSessions.delete(deviceId);

    // Finalizar sessões de edição ativas
    this.editingSessions.forEach((users, noteId) => {
      if (users.has(userId)) {
        this.handleStopEditing(userId, noteId);
      }
    });

    console.log(`Cliente desconectado: userId=${userId}, deviceId=${deviceId}`);
  }

  /**
   * Manipula erros de conexão
   */
  handleError(userId, deviceId, error) {
    console.error(`Erro WebSocket para userId=${userId}, deviceId=${deviceId}:`, error);
  }

  /**
   * Configura limpeza periódica
   */
  setupPeriodicCleanup() {
    // Limpar sessões inativas a cada 5 minutos
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);

    // Enviar ping a cada 30 segundos
    setInterval(() => {
      this.sendPingToAllClients();
    }, 30 * 1000);
  }

  /**
   * Limpa sessões inativas
   */
  cleanupInactiveSessions() {
    const now = new Date();
    const inactiveThreshold = 10 * 60 * 1000; // 10 minutos

    this.deviceSessions.forEach((session, deviceId) => {
      if (now - session.lastActivity > inactiveThreshold) {
        console.log(`Removendo sessão inativa: ${deviceId}`);
        session.ws.close(1000, 'Sessão inativa');
        this.deviceSessions.delete(deviceId);
      }
    });
  }

  /**
   * Envia ping para todos os clientes
   */
  sendPingToAllClients() {
    this.clients.forEach((clientSet) => {
      clientSet.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          this.sendToClient(ws, 'ping', {});
        }
      });
    });
  }

  /**
   * Para o servidor
   */
  stop() {
    if (this.wss) {
      this.wss.close();
      console.log('WebSocket server parado');
    }
  }
}

// Iniciar servidor se executado diretamente
if (require.main === module) {
  const server = new WebSocketServer();
  server.start().catch(console.error);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Parando servidor WebSocket...');
    server.stop();
    process.exit(0);
  });
}

module.exports = WebSocketServer;
