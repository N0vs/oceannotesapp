import { useState, useEffect } from 'react';
import styles from './ConflictTab.module.css';

/**
 * Componente de aba de conflitos com badge e expansão
 * Interface mais elegante e menos intrusiva que popup
 */
const ConflictTab = ({ 
  conflicts = [], 
  onResolveConflict, 
  onDismiss,
  isVisible = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedConflict, setExpandedConflict] = useState(null);
  const [hasNewConflicts, setHasNewConflicts] = useState(false);

  // Detectar novos conflitos para animação do badge
  useEffect(() => {
    if (conflicts.length > 0) {
      setHasNewConflicts(true);
      const timer = setTimeout(() => setHasNewConflicts(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [conflicts.length]);

  if (!isVisible) {
    return null;
  }

  // Mostrar aba mesmo sem conflitos para debug
  const displayConflicts = conflicts.length > 0 ? conflicts : [{
    ID: 'debug-1',
    TituloNota: 'Teste de Conflito (Debug)',
    DataDeteccao: new Date().toISOString(),
    complexidade: 'baixa',
    NomeUsuarioLocal: 'Usuário Local',
    DataLocal: new Date().toISOString(),
    TituloLocal: 'Versão Local',
    NomeUsuarioRemoto: 'Usuário Remoto',
    DataRemoto: new Date().toISOString(),
    TituloRemoto: 'Versão Remota',
    recomendacao: 'Esta é uma aba de teste para verificar se o componente está funcionando.'
  }];

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
    if (conflict.complexidade === 'alta') return 'high';
    if (conflict.complexidade === 'media') return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      default: return 'Baixa';
    }
  };

  return (
    <div className={`${styles.conflictTab} ${isExpanded ? styles.expanded : ''}`}>
      {/* Aba colapsada com badge */}
      <div 
        className={`${styles.tabHeader} ${hasNewConflicts ? styles.pulse : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.tabIcon}>
          ⚠️
        </div>
        <span className={styles.tabTitle}>Conflitos</span>
        <div className={`${styles.badge} ${hasNewConflicts ? styles.badgeNew : ''}`}>
          {displayConflicts.length}
        </div>
        <div className={styles.expandIcon}>
          {isExpanded ? '▼' : '▶'}
        </div>
      </div>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className={styles.tabContent}>
          <div className={styles.conflictHeader}>
            <h3>Conflitos Pendentes</h3>
            <button 
              className={styles.dismissAll}
              onClick={() => onDismiss('all')}
              title="Dispensar todas as notificações"
            >
              Dispensar Todos
            </button>
          </div>

          <div className={styles.conflictsList}>
            {displayConflicts.map((conflict, index) => {
              const severity = getConflictSeverity(conflict);
              const isConflictExpanded = expandedConflict === (conflict.ID || conflict.id);

              return (
                <div 
                  key={conflict.ID || conflict.id || `conflict-${index}`} 
                  className={`${styles.conflictItem} ${styles[severity]}`}
                >
                  <div 
                    className={styles.conflictItemHeader}
                    onClick={() => handleExpandConflict(conflict.ID || conflict.id)}
                  >
                    <div className={styles.conflictInfo}>
                      <div className={styles.noteTitle}>
                        {conflict.TituloNota || 'Nota sem título'}
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
                    <div className={styles.itemExpandIcon}>
                      {isConflictExpanded ? '▼' : '▶'}
                    </div>
                  </div>

                  {isConflictExpanded && (
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
      )}
    </div>
  );
};

export default ConflictTab;
