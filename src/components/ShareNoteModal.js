'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Modal simples para compartilhar notas
 */
const ShareNoteModal = ({ 
  isOpen, 
  onClose, 
  noteId, 
  noteTitle
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('visualizar');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [currentUserPermission, setCurrentUserPermission] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPermission('visualizar');
      setError('');
      setSuccess('');
    } else if (noteId) {
      loadSharedUsers();
    }
  }, [isOpen, noteId]);

  // Garantir que a permissão padrão seja válida quando as permissões do usuário mudam
  useEffect(() => {
    if (currentUserPermission && permission === 'admin' && 
        currentUserPermission !== 'owner' && currentUserPermission !== 'admin') {
      setPermission('visualizar'); // Reset para permissão segura
    }
  }, [currentUserPermission, permission]);

  const loadSharedUsers = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/notas/${noteId}/shared-users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSharedUsers(data || []);
        
        // Detectar permissão do usuário atual
        const currentUser = data.find(user => user.isCurrentUser);
        setCurrentUserPermission(currentUser ? currentUser.TipoPermissao : null);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários compartilhados:', err);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError(t('errors.emailRequired'));
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t('errors.invalidEmail'));
      return;
    }

    // Validar se a permissão selecionada é válida para o usuário atual
    if (permission === 'admin' && currentUserPermission !== 'owner' && currentUserPermission !== 'admin') {
      setError(t('errors.noPermissionToCreateAdmin'));
      return;
    }

    setIsLoading(true);

    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/notas/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          noteId,
          userEmail: email.trim(),
          permission
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Nota compartilhada com sucesso!');
        setEmail('');
        setPermission('visualizar');
        loadSharedUsers(); // Recarregar lista
      } else {
        setError(data.message || 'Erro ao compartilhar nota');
      }
    } catch (err) {
      setError('Erro de conexão. Verifique sua internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async (userId) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/notas/unshare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          noteId,
          targetUserId: userId
        })
      });

      if (response.ok) {
        setSuccess('Acesso removido com sucesso!');
        loadSharedUsers(); // Recarregar lista
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao remover acesso');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const handlePermissionChange = async (userId, newPermission) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/notas/update-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          noteId,
          targetUserId: userId,
          permission: newPermission
        })
      });

      if (response.ok) {
        setSuccess('Permissão atualizada com sucesso!');
        loadSharedUsers(); // Recarregar lista
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao atualizar permissão');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const getPermissionLabel = (perm) => {
    const labels = {
      'visualizar': t('sharing.permissions.visualizar'),
      'editar': t('sharing.permissions.editar'),
      'admin': t('sharing.permissions.admin'),
      'owner': t('sharing.permissions.owner')
    };
    return labels[perm] || perm;
  };

  const getPermissionColor = (perm) => {
    const colors = {
      'visualizar': '#4CAF50',
      'editar': '#FF9800',
      'admin': '#F44336',
      'owner': '#9C27B0'
    };
    return colors[perm] || '#757575';
  };

  const getAvailablePermissions = (user, currentUserPermission) => {
    const permissions = [
      { value: 'visualizar', label: t('sharing.permissions.visualizar') },
      { value: 'editar', label: t('sharing.permissions.editar') }
    ];

    // Regras de permissões:
    // - Proprietários (owner): podem definir qualquer permissão (incluindo admin)
    // - Administradores (admin): podem promover outros para admin, editar ou visualizar
    // - Editores (editar): podem apenas definir visualizar ou editar
    if (user.canEdit && (currentUserPermission === 'owner' || currentUserPermission === 'admin')) {
      permissions.push({ value: 'admin', label: t('sharing.permissions.admin') });
    }

    return permissions;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">{t('sharing.shareNote')}</h2>
            <p className="text-sm text-gray-400 mt-1">{t('sharing.manageAccess')}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-200 hover:bg-gray-700 p-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="font-medium text-gray-200 truncate">{noteTitle}</h3>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4 flex items-center space-x-2">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-900/30 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg mb-4 flex items-center space-x-2">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Proprietários, administradores e editores podem compartilhar */}
        {currentUserPermission && ['owner', 'admin', 'editar'].includes(currentUserPermission) && (
          <form onSubmit={handleShare} className="mb-6 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
            <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span>{t('sharing.addUser')}</span>
            </h4>

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t('sharing.emailAddress')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('sharing.emailPlaceholder')}
                disabled={isLoading}
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder-gray-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="permission" className="block text-sm font-medium text-gray-300 mb-2">
                {t('sharing.permissionLevel')}
              </label>
              <select
                id="permission"
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              >
                <option value="visualizar">{t('sharing.viewOnly')}</option>
                <option value="editar">{t('sharing.edit')}</option>
                {/* Administradores e proprietários podem criar outros admins */}
                {(currentUserPermission === 'owner' || currentUserPermission === 'admin') && (
                  <option value="admin">{t('sharing.admin')}</option>
                )}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('sharing.sharing')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>{t('sharing.sendInvite')}</span>
                </>
              )}
            </button>
          </form>
        )}

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{t('sharing.peopleWithAccess')}</span>
            <span className="text-xs text-gray-500">({sharedUsers.length})</span>
          </h4>
          {sharedUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm">{t('sharing.noAccess')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sharedUsers.map((user) => (
                <div key={user.Id} className="bg-gray-700/30 border border-gray-600 rounded-lg p-3 hover:bg-gray-700/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-gray-200">
                          {user.Nome}
                        </div>
                        {user.isCurrentUser && (
                          <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                            {t('sharing.you')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 truncate">{user.Email}</div>
                      {user.DataCompartilhamento && (
                        <div className="text-xs text-gray-500 mt-1">
                          {t('messages.shared')} {new Date(user.DataCompartilhamento).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {user.canEdit ? (
                        <select
                          value={user.TipoPermissao}
                          onChange={(e) => handlePermissionChange(user.Id, e.target.value)}
                          disabled={isLoading}
                          className="text-sm px-2 py-1 bg-gray-600 border border-gray-500 text-gray-200 rounded focus:outline-none focus:border-purple-500"
                        >
                          {getAvailablePermissions(user, currentUserPermission).map(perm => (
                            <option key={perm.value} value={perm.value}>
                              {perm.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span 
                          className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ 
                            backgroundColor: getPermissionColor(user.TipoPermissao) + '20',
                            color: getPermissionColor(user.TipoPermissao),
                            border: `1px solid ${getPermissionColor(user.TipoPermissao)}40`
                          }}
                        >
                          {getPermissionLabel(user.TipoPermissao)}
                        </span>
                      )}
                      
                      {user.canRemove ? (
                        <button
                          onClick={() => handleUnshare(user.Id)}
                          disabled={isLoading}
                          title={t('tooltips.removeAccess')}
                          className="text-gray-400 hover:text-red-400 hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      ) : (
                        <div className="w-8 h-8"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-600">
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="w-full bg-gray-700 text-gray-200 py-2.5 px-4 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors border border-gray-600"
          >
            {t('sharing.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareNoteModal;
