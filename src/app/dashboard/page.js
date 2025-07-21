'use client';

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';

export default function DashboardPage() {
  const router = useRouter();
  const [topics, setTopics] = useState([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('#ffffff');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // 1. Adicionar estado de loading

  const fetchTopics = async () => {
    setLoading(true);
    const token = Cookies.get('token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const res = await fetch('/api/topicos', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Falha ao buscar tópicos. Faça login novamente.');
      }

      const data = await res.json();
      setTopics(data);
    } catch (err) {
      setError(err.message);
      Cookies.remove('token');
      router.push('/');
    } finally {
      setLoading(false); // 2. Parar o loading no final
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleLogout = () => {
    Cookies.remove('token');
    router.push('/');
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    const token = Cookies.get('token');
    setError('');

    try {
      const res = await fetch('/api/topicos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: newTopicName, cor: newTopicColor }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao criar tópico');
      }

      setNewTopicName('');
      setNewTopicColor('#ffffff');
      fetchTopics(); // Re-fetch topics to show the new one
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Meus Tópicos</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Sair
          </button>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Formulário para criar novo tópico */}
          <div className="mb-8 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Criar Novo Tópico</h2>
            <form onSubmit={handleCreateTopic} className="flex items-end gap-4">
              <div className="flex-grow">
                <label htmlFor="topicName" className="block text-sm font-medium text-gray-700">Nome do Tópico</label>
                <input
                  type="text"
                  id="topicName"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="topicColor" className="block text-sm font-medium text-gray-700">Cor</label>
                <input
                  type="color"
                  id="topicColor"
                  value={newTopicColor}
                  onChange={(e) => setNewTopicColor(e.target.value)}
                  className="mt-1 block w-20 h-10 border-gray-300 rounded-md"
                />
              </div>
              <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Criar
              </button>
            </form>
            {error && <p className="mt-4 text-red-500">{error}</p>}
          </div>

          {/* Lista de tópicos */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <p className="p-4 text-center text-gray-500">Carregando tópicos...</p>
            ) : (
              <ul role="list" className="divide-y divide-gray-200">
                {topics && topics.filter(topic => topic.ID).map((topic) => (
                  <li key={topic.ID}>
                    <Link href={`/topicos/${topic.ID}`} className="block hover:bg-gray-50">
                      <div className="px-4 py-4 flex items-center sm:px-6">
                        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                          <div className="truncate">
                            <div className="flex text-sm">
                              <p style={{ color: topic.cor }} className="font-bold mr-2">●</p>
                              <p className="font-medium text-indigo-600 truncate">{topic.nome}</p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-5 flex-shrink-0">
                          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
