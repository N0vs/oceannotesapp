import { useState, useEffect } from 'react';
import { useSyncContext } from '../contexts/SyncContext';
import styles from './SyncStatusIndicator.module.css';

/**
 * Componente para mostrar status de sincronização
 * Indica se está online/offline e status da conexão WebSocket
 */
const SyncStatusIndicator = () => {
  const { isConnected, syncStatus, connectionStatus } = useSyncContext();
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return '#ef4444'; // Vermelho - Offline
    if (!isConnected) return '#f59e0b'; // Amarelo - Online mas sem WebSocket
    return '#10b981'; // Verde - Totalmente conectado
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (!isConnected) return 'Conectando...';
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return '📡';
    if (!isConnected) return '🔄';
    return '✅';
  };

  return (
    <div className={styles.syncIndicator}>
      <div 
        className={styles.statusBadge}
        onClick={() => setShowDetails(!showDetails)}
        style={{ backgroundColor: getStatusColor() }}
      >
        <span className={styles.icon}>{getStatusIcon()}</span>
        <span className={styles.text}>{getStatusText()}</span>
      </div>

      {showDetails && (
        <div className={styles.statusDetails}>
          <div className={styles.detailItem}>
            <strong>Conexão Internet:</strong> {syncStatus.isOnline ? 'Conectado' : 'Desconectado'}
          </div>
          <div className={styles.detailItem}>
            <strong>WebSocket:</strong> {isConnected ? 'Conectado' : 'Desconectado'}
          </div>
          <div className={styles.detailItem}>
            <strong>Sincronização:</strong> {syncStatus.syncInProgress ? 'Em andamento' : 'Inativa'}
          </div>
          {syncStatus.pendingCount > 0 && (
            <div className={styles.detailItem}>
              <strong>Pendentes:</strong> {syncStatus.pendingCount} alterações
            </div>
          )}
          {connectionStatus && (
            <div className={styles.detailItem}>
              <strong>Status WebSocket:</strong> {connectionStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
