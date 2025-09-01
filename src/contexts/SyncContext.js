import React, { createContext, useContext, useEffect, useState } from 'react';
import RealTimeUpdateService from '../services/RealTimeUpdateService';
import SynchronizationService from '../services/SynchronizationService';
import ConflictDetectionService from '../services/ConflictDetectionService';
import NoteVersionService from '../services/NoteVersionService';
import NoteHistoryService from '../services/NoteHistoryService';
import Cookies from 'js-cookie';

/**
 * Context para gerenciar sincronização e atualizações em tempo real
 * Centraliza todos os serviços de sincronização da aplicação
 */
const SyncContext = createContext();

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext deve ser usado dentro de SyncProvider');
  }
  return context;
};

export const SyncProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    syncInProgress: false,
    pendingCount: 0
  });
  const [services, setServices] = useState(null);

  // Inicializar serviços
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Simular conexão com banco (em produção, usar conexão real)
        const mockDb = {
          query: async (sql, params) => {
            console.log('Mock DB Query:', sql, params);
            return [];
          }
        };

        const versionService = new NoteVersionService(mockDb);
        const historyService = new NoteHistoryService(mockDb);
        const conflictDetectionService = new ConflictDetectionService(mockDb, versionService);
        const syncService = new SynchronizationService(
          mockDb, 
          versionService, 
          conflictDetectionService, 
          historyService
        );
        const realTimeService = new RealTimeUpdateService(
          conflictDetectionService, 
          historyService
        );

        setServices({
          version: versionService,
          history: historyService,
          conflictDetection: conflictDetectionService,
          sync: syncService,
          realTime: realTimeService
        });

        // Conectar WebSocket se usuário autenticado
        const token = Cookies.get('token');
        const userId = Cookies.get('userId');
        
        if (token && userId) {
          try {
            await realTimeService.connect(userId, token);
            setIsConnected(true);
          } catch (error) {
            console.warn('Falha ao conectar WebSocket:', error);
            setIsConnected(false);
          }
        } else {
          console.log('Token ou userId não encontrado para WebSocket');
          setIsConnected(false);
        }

      } catch (error) {
        console.error('Erro ao inicializar serviços de sincronização:', error);
      }
    };

    initializeServices();
  }, []);

  // Detectar mudanças de conectividade
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setSyncStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSyncStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Configurar listeners de tempo real
  useEffect(() => {
    if (!services?.realTime) return;

    const realTimeService = services.realTime;

    // Listener para atualizações de nota
    const handleNoteUpdate = (data) => {
      console.log('Nota atualizada em tempo real:', data);
      // Disparar evento customizado para componentes
      window.dispatchEvent(new CustomEvent('noteUpdated', { detail: data }));
    };

    // Listener para conflitos
    const handleConflictDetected = (data) => {
      console.log('Conflito detectado:', data);
      window.dispatchEvent(new CustomEvent('conflictDetected', { detail: data }));
    };

    // Listener para usuários editando
    const handleUserEditing = (data) => {
      console.log('Usuário editando:', data);
      window.dispatchEvent(new CustomEvent('userEditing', { detail: data }));
    };

    realTimeService.addListener('note_updated', handleNoteUpdate);
    realTimeService.addListener('conflict_detected', handleConflictDetected);
    realTimeService.addListener('user_editing', handleUserEditing);

    return () => {
      realTimeService.removeListener('note_updated', handleNoteUpdate);
      realTimeService.removeListener('conflict_detected', handleConflictDetected);
      realTimeService.removeListener('user_editing', handleUserEditing);
    };
  }, [services]);

  // Funções de conveniência
  const startEditing = (noteId) => {
    if (services?.realTime && isConnected) {
      services.realTime.startEditing(noteId);
    }
  };

  const stopEditing = (noteId) => {
    if (services?.realTime && isConnected) {
      services.realTime.stopEditing(noteId);
    }
  };

  const notifyNoteUpdate = (noteId, versionId, title, content, contentHash) => {
    if (services?.realTime && isConnected) {
      services.realTime.noteUpdated(noteId, versionId, title, content, contentHash);
    }
  };

  const saveOfflineEdit = async (noteId, userId, title, content, deviceId) => {
    if (services?.sync) {
      return await services.sync.saveOfflineEdit(noteId, userId, title, content, deviceId);
    }
  };

  const forceSyncNote = async (noteId, userId) => {
    if (services?.sync) {
      return await services.sync.forceSyncNote(noteId, userId);
    }
  };

  const getSyncStatus = async (userId) => {
    if (services?.sync) {
      const status = await services.sync.getSyncStatus(userId);
      setSyncStatus(prev => ({ ...prev, ...status }));
      return status;
    }
  };

  const value = {
    // Estado
    isConnected,
    syncStatus,
    services,

    // Funções de tempo real
    startEditing,
    stopEditing,
    notifyNoteUpdate,

    // Funções de sincronização
    saveOfflineEdit,
    forceSyncNote,
    getSyncStatus,

    // Status da conexão
    connectionStatus: services?.realTime?.getConnectionStatus() || null
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
};

export default SyncContext;
