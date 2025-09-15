import { useState, useEffect } from 'react';
import styles from './ConflictNotification.module.css';

/**
 * Componente de notificação de conflitos
 * Segue o Single Responsibility Principle - responsável apenas por exibir notificações de conflito
 */
const ConflictNotification = ({ 
  conflicts = [], 
  onResolveConflict, 
  onDismiss,
  isVisible = true 
}) => {
  const [expandedConflict, setExpandedConflict] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (conflicts.length > 0 && isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [conflicts.length, isVisible]);

  if (!isVisible || conflicts.length === 0) {
    return null;
  }

  const handleExpandConflict = (conflictId) => {
    setExpandedConflict(expandedConflict === conflictId ? null : conflictId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    return date.toLocaleString('pt-BR');
  };

  const getConflictSeverity = (conflict) => {
    // Determinar severidade baseada na análise do conflito
    if (conflict.complexidade === 'alta') return 'high';
    if (conflict.complexidade === 'media') return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'high': '#f44336',
      'medium': '#ff9800',
      'low': '#4caf50'
    };
    return colors[severity] || '#757575';
  };

  const getSeverityLabel = (severity) => {
    const labels = {
      'high': 'Alta',
      'medium': 'Média',
      'low': 'Baixa'
    };
    return labels[severity] || 'Desconhecida';
  };

  return (
    <div className={`${styles.container} ${isAnimating ? styles.animating : ''}`}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.icon}>⚠️</span>
          <h3>Conflitos Detectados ({conflicts.length})</h3>
        </div>
        <button 
          className={styles.dismissAll}
          onClick={() => onDismiss('all')}
          title="Dispensar todas as notificações"
        >
          ✕
        </button>
      </div>

      <div className={styles.conflictsList}>
        {conflicts.map((conflict, index) => {
          const severity = getConflictSeverity(conflict);
          const isExpanded = expandedConflict === conflict.ID;

          return (
            <div 
              key={conflict.ID || `conflict-${index}`} 
              className={`${styles.conflictItem} ${styles[severity]}`}
            >
              <div 
                className={styles.conflictHeader}
                onClick={() => handleExpandConflict(conflict.ID)}
              >
                <div className={styles.conflictInfo}>
                  <div className={styles.noteTitle}>
                    {conflict.TituloNota}
                  </div>
                  <div className={styles.conflictMeta}>
                    <span 
                      className={styles.severity}
                      style={{ backgroundColor: getSeverityColor(severity) }}
                    >
                      {getSeverityLabel(severity)}
                    </span>
                    <span className={styles.date}>
                      {formatDate(conflict.DataDeteccao)}
                    </span>
                  </div>
                </div>
                <div className={styles.expandIcon}>
                  {isExpanded ? '▼' : '▶'}
                </div>
              </div>

              {isExpanded && (
                <div className={styles.conflictDetails}>
                  <div className={styles.versionsComparison}>
                    <div className={styles.version}>
                      <h5>Versão Local</h5>
                      <div className={styles.versionInfo}>
                        <p><strong>Usuário:</strong> {conflict.NomeUsuarioLocal || 'Usuário não identificado'}</p>
                        <p><strong>Data:</strong> {formatDate(conflict.DataLocal)}</p>
                        <p><strong>Título:</strong> {conflict.TituloLocal || 'Título não disponível'}</p>
                      </div>
                    </div>
                    
                    <div className={styles.versionDivider}>VS</div>
                    
                    <div className={styles.version}>
                      <h5>Versão Remota</h5>
                      <div className={styles.versionInfo}>
                        <p><strong>Usuário:</strong> {conflict.NomeUsuarioRemoto || 'Usuário não identificado'}</p>
                        <p><strong>Data:</strong> {formatDate(conflict.DataRemoto)}</p>
                        <p><strong>Título:</strong> {conflict.TituloRemoto || 'Título não disponível'}</p>
                      </div>
                    </div>
                  </div>

                  {conflict.recomendacao && (
                    <div className={styles.recommendation}>
                      <h5>Recomendação:</h5>
                      <p>{conflict.recomendacao}</p>
                    </div>
                  )}

                  <div className={styles.actions}>
                    <button 
                      className={styles.actionButton}
                      onClick={() => onResolveConflict(conflict.ID || conflict.id, 'manter_local')}
                    >
                      Manter Local
                    </button>
                    <button 
                      className={styles.actionButton}
                      onClick={() => onResolveConflict(conflict.ID || conflict.id, 'manter_remoto')}
                    >
                      Manter Remoto
                    </button>
                    <button 
                      className={`${styles.actionButton} ${styles.primary}`}
                      onClick={() => onResolveConflict(conflict.ID || conflict.id, 'merge_manual')}
                    >
                      Resolver Manualmente
                    </button>
                    <button 
                      className={styles.dismissButton}
                      onClick={() => onDismiss(conflict.ID || conflict.id)}
                    >
                      Dispensar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConflictNotification;
