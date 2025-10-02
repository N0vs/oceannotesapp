'use client';

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { validateRegisterForm } from '../../utils/validation';
import GoogleSignIn from '../../components/GoogleSignIn';

export default function RegistoPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(null);
  const { loading, error, setError, register, navigateToLogin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    // Validação usando funções separadas (SRP)
    const validation = validateRegisterForm(nome, email, password, confirmPassword);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    // Usar hook de autenticação (DIP)
    const result = await register(nome, email, password);
    
    if (result.success) {
      setSuccess('Utilizador registado com sucesso! A redirecionar para o login...');
      setTimeout(() => {
        navigateToLogin();
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-cyan-400">Criar Conta</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="nome" className="block mb-2 text-sm font-medium">Nome</label>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block mb-2 text-sm font-medium">E-mail</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block mb-2 text-sm font-medium">
              Senha <span className="text-gray-400 text-xs">(mínimo 8 caracteres)</span>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
              minLength="8"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium">Confirmar Senha</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
              minLength="8"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white font-bold py-2 px-4 rounded-md transition duration-300"
          >
            {loading ? 'Registando...' : 'Registar'}
          </button>
          {error && <p className="text-red-500 text-center mt-4">{error}</p>}
          {success && <p className="text-green-500 text-center mt-4">{success}</p>}
        </form>

        {/* Google Sign-In */}
        <GoogleSignIn 
          onSuccess={(data) => {
            console.log('Registro Google concluído:', data);
            if (data.isNewUser) {
              setSuccess('Conta criada com Google! Redirecionando...');
            }
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1500);
          }}
          onError={(error) => {
            setError(error);
          }}
          buttonText="Criar conta com Google"
        />
      </div>
    </div>
  );
}
