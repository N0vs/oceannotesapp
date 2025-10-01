'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { validateLoginForm } from '../utils/validation';
<<<<<<< HEAD
import GoogleSignIn from './GoogleSignIn';
=======
>>>>>>> ec0a69fcb83df0726dccb4da8c1308550dc5822b

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading, error, setError, login, navigateToDashboard } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validação usando funções separadas (SRP)
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    // Usar hook de autenticação (DIP)
    const result = await login(email, password);
    
    if (result.success) {
      navigateToDashboard();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
<<<<<<< HEAD
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
=======
      <form onSubmit={handleSubmit} className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
>>>>>>> ec0a69fcb83df0726dccb4da8c1308550dc5822b
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>
        
        {error && <p className="mb-4 text-center text-red-500">{error}</p>}

<<<<<<< HEAD
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="flex items-center justify-between">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>

        {/* Google Sign-In */}
        <GoogleSignIn 
          onSuccess={(data) => {
            console.log('Login Google concluído:', data);
            navigateToDashboard();
          }}
          onError={(error) => {
            setError(error);
          }}
        />
=======
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Senha</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        <div className="flex items-center justify-between">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
>>>>>>> ec0a69fcb83df0726dccb4da8c1308550dc5822b

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Não tem uma conta?{' '}
            <Link href="/registo" className="font-medium text-blue-600 hover:text-blue-500">
              Crie uma aqui
            </Link>
          </p>
        </div>
<<<<<<< HEAD
      </div>
=======
      </form>
>>>>>>> ec0a69fcb83df0726dccb4da8c1308550dc5822b
    </div>
  );
}
