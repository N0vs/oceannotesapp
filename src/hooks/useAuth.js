import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

/**
 * Hook personalizado para gerenciar autenticação de usuários
 * Centraliza todas as operações de login, registro, logout e verificação de sessão
 * 
 * @hook useAuth
 * @returns {Object} Objeto contendo estados e funções de autenticação
 * @returns {boolean} returns.loading - Estado de carregamento das operações
 * @returns {string} returns.error - Mensagem de erro atual
 * @returns {Function} returns.setError - Função para definir mensagens de erro
 * @returns {Function} returns.login - Função para autenticar usuário
 * @returns {Function} returns.register - Função para registrar novo usuário
 * @returns {Function} returns.logout - Função para deslogar usuário
 * @returns {Function} returns.getToken - Função para obter token atual
 * @returns {Function} returns.isAuthenticated - Função para verificar se está autenticado
 * @returns {Function} returns.navigateToDashboard - Função para navegar ao dashboard
 * @returns {Function} returns.navigateToLogin - Função para navegar ao login
 * @description Hook completo seguindo princípios SOLID para gestão de autenticação
 */
export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  /**
   * Autentica usuário com email e senha
   * Faz requisição à API de login e armazena token em cookie
   * @async
   * @function login
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise<Object>} Objeto com success e token ou error
   * @description Gerencia login completo incluindo armazenamento seguro de token
   */
  const login = async (email, password) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Email: email, Password: password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Falha no login');
      }

      const { token } = await response.json();
      
      // Guardar token no cookie
      Cookies.set('token', token, { expires: 1/24, path: '/' }); // Expira em 1 hora

      return { success: true, token };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registra novo usuário no sistema
   * Faz requisição à API de usuários para criar nova conta
   * @async
   * @function register
   * @param {string} nome - Nome completo do usuário
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise<Object>} Objeto com success e data ou error
   * @description Cria nova conta de usuário e trata erros de validação
   */
  const register = async (nome, email, password) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/utilizadores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Nome: nome, Email: email, Password: password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao registar');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Desloga usuário removendo token e redirecionando
   * @function logout
   * @returns {void} Não retorna valor, remove token e navega
   * @description Limpa sessão e redireciona para página inicial
   */
  const logout = () => {
    Cookies.remove('token');
    router.push('/');
  };

  const getToken = () => {
    return Cookies.get('token');
  };

  const isAuthenticated = () => {
    return !!getToken();
  };

  const navigateToDashboard = () => {
    router.push('/dashboard');
  };

  const navigateToLogin = () => {
    router.push('/');
  };

  return {
    loading,
    error,
    setError,
    login,
    register,
    logout,
    getToken,
    isAuthenticated,
    navigateToDashboard,
    navigateToLogin
  };
};
