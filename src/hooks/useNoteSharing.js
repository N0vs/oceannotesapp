import { useState, useCallback } from 'react';
import Cookies from 'js-cookie';

/**
 * Hook personalizado para gerenciar compartilhamento de notas entre usuários
 * Centraliza operações de compartilhar, remover acesso e gerenciar permissões
 * 
 * @hook useNoteSharing
 * @returns {Object} Objeto contendo estados e funções de compartilhamento
 * @returns {boolean} returns.isLoading - Estado de carregamento das operações
 * @returns {string|null} returns.error - Mensagem de erro atual ou null
 * @returns {Array} returns.sharedUsers - Lista de usuários com acesso à nota
 * @returns {Function} returns.shareNote - Função para compartilhar nota com usuário
 * @returns {Function} returns.unshareNote - Função para remover acesso de usuário
 * @returns {Function} returns.getSharedUsers - Função para buscar usuários compartilhados
 * @returns {Function} returns.updatePermission - Função para atualizar permissões
 * @description Hook completo seguindo Single Responsibility Principle para compartilhamento
 */
const useNoteSharing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sharedUsers, setSharedUsers] = useState([]);

  const getAuthHeaders = () => {
    const token = Cookies.get('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  /**
   * Compartilha nota com usuário
   */
  const shareNote = useCallback(async (noteId, userEmail, permission, expirationDate = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notas/share', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          noteId,
          userEmail,
          permission,
          expirationDate
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao compartilhar nota');
      }

      const result = await response.json();
      
      // Atualizar lista de usuários compartilhados
      await loadSharedUsers(noteId);
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove compartilhamento de nota
   */
  const unshareNote = useCallback(async (noteId, userId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notas/unshare', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          noteId,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao remover compartilhamento');
      }

      // Atualizar lista de usuários compartilhados
      await loadSharedUsers(noteId);
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Atualiza permissão de compartilhamento
   */
  const updatePermission = useCallback(async (noteId, userId, newPermission) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notas/update-permission', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          noteId,
          userId,
          permission: newPermission
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar permissão');
      }

      // Atualizar lista de usuários compartilhados
      await loadSharedUsers(noteId);
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Carrega usuários com quem a nota foi compartilhada
   */
  const loadSharedUsers = useCallback(async (noteId) => {
    if (!noteId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notas/${noteId}/shared-users`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        // Se for erro 403 (sem permissão) ou 404 (nota não encontrada), retornar lista vazia
        if (response.status === 403 || response.status === 404) {
          setSharedUsers([]);
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao carregar usuários compartilhados');
      }

      const users = await response.json();
      setSharedUsers(users || []);
    } catch (err) {
      setError(err.message);
      setSharedUsers([]);
      console.error('Erro ao carregar usuários compartilhados:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Obtém notas compartilhadas com o usuário atual
   */
  const getSharedNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notas/shared-with-me', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao carregar notas compartilhadas');
      }

      const notes = await response.json();
      return notes;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verifica permissão do usuário para uma nota
   */
  const checkUserPermission = useCallback(async (noteId) => {
    try {
      const response = await fetch(`/api/notas/${noteId}/permission`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.permission;
    } catch (err) {
      return null;
    }
  }, []);

  return {
    isLoading,
    error,
    sharedUsers,
    shareNote,
    unshareNote,
    updatePermission,
    loadSharedUsers,
    getSharedNotes,
    checkUserPermission,
    setError
  };
};

export default useNoteSharing;
