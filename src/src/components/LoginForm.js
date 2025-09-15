'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { validateLoginForm } from '../utils/validation';

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
//modificar front 
  return (
		
		<div className="flex items-center justify-center min-h-screen bg-gray-100 ">
			<div className="flex w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden ">
				{/* Lado Esquerdo - Boas-vindas */}
				<div className="w-1/2 bg-cyan-400 p-10 flex flex-col justify-center items-center">
					<h2 className="text-3xl font-bold text-black text-center mb-4">
						Bem vindo <br /> de volta !
					</h2>
					<p className="text-black text-sm text-center">
						Para manter-se conectado, por favor faça seu login com
						suas informações.
					</p>
				</div>

				{/* Lado Direito - Formulário de Login */}
				<form onSubmit={handleSubmit} className="w-1/2 p-10">
					<h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
						Login
					</h2>

					{error && (
						<p className="mb-4 text-center text-red-500">{error}</p>
					)}

					<div className="mb-4">
						<label
							htmlFor="email"
							className="block text-gray-700 text-sm font-bold mb-2"
						>
							Email
						</label>
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
						<label
							htmlFor="password"
							className="block text-gray-700 text-sm font-bold mb-2"
						>
							Senha
						</label>
						<input
							type="password"
							id="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="bg-cyan-400 hover:bg-cyan-500 disabled:bg-cyan-300 text-white font-bold py-2 px-4 rounded w-full focus:outline-none focus:shadow-outline"
					>
						{loading ? "Entrando..." : "Entrar"}
					</button>

					<div className="text-center mt-6">
						<p className="text-sm text-gray-600">
							Não tem uma conta?{" "}
							<Link
								href="/registo"
								className="font-medium text-blue-600 hover:text-blue-500"
							>
								Crie uma aqui
							</Link>
						</p>
					</div>
				</form>
			</div>
		</div>
  );
}

  /*  <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>
        
        {error && <p className="mb-4 text-center text-red-500">{error}</p>}

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

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Não tem uma conta?{' '}
            <Link href="/registo" className="font-medium text-blue-600 hover:text-blue-500">
              Crie uma aqui
            </Link>
          </p>
        </div>
      </form>
    </div> */