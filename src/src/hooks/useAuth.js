import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

/**
 * Hook personalizado para gerenciar autenticação
 * Segue o Single Responsibility Principle - responsável apenas por autenticação
 * Segue o Dependency Inversion Principle - abstrai dependências de cookies e navegação
 */
export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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
