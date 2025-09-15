import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';

/**
 * Hook para gerenciar notificações de conflito
 * Segue o Single Responsibility Principle - responsável apenas por notificações de conflito
 */
const useConflictNotifications = () => {
  const [conflicts, setConflicts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  const getAuthHeaders = () => {
    const token = Cookies.get('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  /**
   * Carrega conflitos pendentes do usuário
   */
  const loadConflicts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/conflicts/pending', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        // Se for erro de servidor, não quebrar a aplicação
        console.warn('Erro ao carregar conflitos:', response.status);
        setConflicts([]);
        return;
      }

      const data = await response.json();
      
      // Filtrar apenas conflitos reais (não incluir criações de notas)
      const realConflicts = data.filter(conflict => 
        conflict.VersaoLocal && 
        conflict.VersaoRemota && 
        conflict.VersaoLocal !== conflict.VersaoRemota
      );
      
      setConflicts(realConflicts);
    } catch (err) {
      console.warn('Erro de rede ao carregar conflitos:', err.message);
      setError(null); // Não mostrar erro para o usuário
      setConflicts([]); // Array vazio em caso de erro
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Resolve conflito usando estratégia especificada
   */
  const resolveConflict = useCallback(async (conflictId, resolutionType, mergeData = null) => {
    if (!conflictId || !resolutionType) {
      setError('ID do conflito e tipo de resolução são obrigatórios');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/conflicts/resolve', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conflictId,
          resolutionType,
          mergeData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao resolver conflito');
      }

      const result = await response.json();
      
      // Remover conflito resolvido da lista
      setConflicts(prev => prev.filter(c => c.ID !== conflictId));
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Dispensa notificação de conflito
   */
  const dismissConflict = useCallback((conflictId) => {
    if (conflictId === 'all') {
      setConflicts([]);
      setIsVisible(false);
    } else {
      setConflicts(prev => prev.filter(c => c.ID !== conflictId));
    }
  }, []);

  /**
   * Detecta novos conflitos para uma nota específica
   */
  const checkNoteConflicts = useCallback(async (noteId) => {
    try {
      const response = await fetch(`/api/conflicts/detect/${noteId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        return [];
      }

      const newConflicts = await response.json();
      
      if (newConflicts.length > 0) {
        setConflicts(prev => {
          // Evitar duplicatas
          const existingIds = prev.map(c => c.ID);
          const uniqueNewConflicts = newConflicts.filter(c => !existingIds.includes(c.ID));
          return [...prev, ...uniqueNewConflicts];
        });
      }
      
      return newConflicts;
    } catch (err) {
      console.error('Erro ao verificar conflitos:', err);
      return [];
    }
  }, []);

  /**
   * Obtém sugestões de resolução para um conflito
   */
  const getResolutionSuggestions = useCallback(async (conflictId) => {
    try {
      const response = await fetch(`/api/conflicts/${conflictId}/suggestions`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Erro ao obter sugestões');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Configura polling para verificar novos conflitos
   */
  const startConflictPolling = useCallback((intervalMs = 30000) => {
    const interval = setInterval(() => {
      loadConflicts();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [loadConflicts]);

  /**
   * Mostra/esconde notificações
   */
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Carregar conflitos na inicialização
  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  // Configurar polling automático
  useEffect(() => {
    const cleanup = startConflictPolling();
    return cleanup;
  }, [startConflictPolling]);

  return {
    conflicts,
    isLoading,
    error,
    isVisible,
    loadConflicts,
    resolveConflict,
    dismissConflict,
    checkNoteConflicts,
    getResolutionSuggestions,
    toggleVisibility,
    setError
  };
};

export default useConflictNotifications;
