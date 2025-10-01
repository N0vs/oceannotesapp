import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

/**
 * Modal simples para compartilhar notas
 */
const ShareNoteModal = ({ 
  isOpen, 
  onClose, 
  noteId, 
  noteTitle
}) => {
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
      setError('Email é obrigatório');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Por favor, insira um email válido');
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
      'visualizar': 'Visualizar',
      'editar': 'Editar',
      'admin': 'Administrador',
      'owner': 'Proprietário'
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
      { value: 'visualizar', label: 'Visualizar' },
      { value: 'editar', label: 'Editar' }
    ];

    // Apenas proprietários e admins podem ver opções de modificação
    if (user.canEdit && (currentUserPermission === 'owner' || currentUserPermission === 'admin')) {
      // Se o usuário atual é proprietário, pode definir qualquer permissão (incluindo admin)
      // Se é admin, pode definir até editor (não pode promover para admin)
      if (currentUserPermission === 'owner') {
        permissions.push({ value: 'admin', label: 'Admin' });
      } else if (currentUserPermission === 'admin' && user.TipoPermissao !== 'admin') {
        permissions.push({ value: 'admin', label: 'Admin' });
      }
    }

    return permissions;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Compartilhar Nota</h2>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-gray-800">{noteTitle}</h3>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Apenas proprietários, admins e editores podem compartilhar */}
        {currentUserPermission && ['owner', 'admin', 'editar'].includes(currentUserPermission) && (
          <form onSubmit={handleShare} className="mb-6">
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email do usuário:
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@exemplo.com"
              disabled={isLoading}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="permission" className="block text-sm font-medium text-gray-700 mb-2">
              Permissão:
            </label>
            <select
              id="permission"
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="visualizar">Visualizar</option>
              <option value="editar">Editar</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Compartilhando...' : 'Compartilhar'}
          </button>
        </form>
        )}

        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Usuários com acesso:</h4>
          {sharedUsers.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum usuário com acesso</p>
          ) : (
            <div className="space-y-3">
              {sharedUsers.map((user) => (
                <div key={user.Id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {user.Nome}
                        {user.isCurrentUser && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Eu
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{user.Email}</div>
                      {user.DataCompartilhamento && (
                        <div className="text-xs text-gray-500">
                          Compartilhado em: {new Date(user.DataCompartilhamento).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {user.canEdit ? (
                        <select
                          value={user.TipoPermissao}
                          onChange={(e) => handlePermissionChange(user.Id, e.target.value)}
                          disabled={isLoading}
                          className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {getAvailablePermissions(user, currentUserPermission).map(perm => (
                            <option key={perm.value} value={perm.value}>
                              {perm.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span 
                          className="text-sm px-2 py-1 rounded"
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
                          title="Remover acesso"
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          🗑️
                        </button>
                      ) : (
                        <span className="w-6 h-6"></span> // Espaço vazio para manter alinhamento
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t">
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 disabled:opacity-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareNoteModal;
