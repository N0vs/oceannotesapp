'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TopicDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [topic, setTopic] = useState(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para o modal de edição
  const [isEditing, setIsEditing] = useState(false);
  const [editedTopic, setEditedTopic] = useState({ nome: '', cor: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/topicos/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Falha ao buscar dados do tópico.');
        }

        const data = await res.json();
        setTopic({ ...data, notas: data.notas || [] });
        // Inicializa o formulário de edição com os dados atuais
        setEditedTopic({ nome: data.nome, cor: data.cor });

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    const token = localStorage.getItem('token');
    setError('');
    try {
      const res = await fetch('/api/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ conteudo: newNoteContent, topicoId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao criar a nota.');
      }
      const newNote = await res.json();
      setTopic(currentTopic => ({ ...currentTopic, notas: [newNote, ...currentTopic.notas] }));
      setNewNoteContent('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta nota?')) return;
    const token = localStorage.getItem('token');
    setError('');
    try {
      const res = await fetch(`/api/notas/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao excluir a nota.');
      }
      setTopic(currentTopic => ({ ...currentTopic, notas: currentTopic.notas.filter(note => note.ID !== noteId) }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTopic = async () => {
    if (!window.confirm('Tem certeza que deseja apagar este tópico e todas as suas notas? Esta ação é irreversível.')) return;
    const token = localStorage.getItem('token');
    setError('');
    try {
      const res = await fetch(`/api/topicos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao apagar o tópico.');
      }
      alert('Tópico apagado com sucesso!');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateTopic = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    setError('');
    try {
      const res = await fetch(`/api/topicos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editedTopic),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao atualizar o tópico.');
      }
      setTopic(currentTopic => ({ ...currentTopic, ...editedTopic }));
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="text-center p-8">Carregando...</p>;
  if (error) return <p className="text-center p-8 text-red-500">Erro: {error}</p>;
  if (!topic) return <p className="text-center p-8">Tópico não encontrado.</p>;

  return (
    <div className="container mx-auto p-4 md:p-8">
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Editar Tópico</h2>
            <form onSubmit={handleUpdateTopic}>
              <div className="mb-4">
                <label htmlFor="nome" className="block text-gray-700 text-sm font-bold mb-2">Nome do Tópico</label>
                <input
                  id="nome"
                  type="text"
                  value={editedTopic.nome}
                  onChange={(e) => setEditedTopic({ ...editedTopic, nome: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="cor" className="block text-gray-700 text-sm font-bold mb-2">Cor</label>
                <input
                  id="cor"
                  type="color"
                  value={editedTopic.cor}
                  onChange={(e) => setEditedTopic({ ...editedTopic, cor: e.target.value })}
                  className="w-full h-10 p-1 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold" style={{ color: topic.cor || '#333' }}>
            {topic.nome}
          </h1>
          <div className="flex space-x-2 flex-shrink-0">
            <button onClick={() => setIsEditing(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded text-sm">
              Editar
            </button>
            <button onClick={handleDeleteTopic} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm">
              Apagar
            </button>
          </div>
        </div>
        <p className="text-gray-600">Gerencie suas notas para este tópico.</p>
      </div>

      {/* Formulário para Nova Nota */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Adicionar Nova Nota</h2>
        <form onSubmit={handleCreateNote}>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Digite o conteúdo da sua nota..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
          ></textarea>
          <button 
            type="submit"
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Salvar Nota
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Minhas Notas</h2>
        <div className="space-y-4">
            {/* Lemos as notas diretamente de 'topic.notas' */}
            {topic.notas && topic.notas.map(note => (
                <div key={note.ID} className="bg-white p-4 shadow rounded-lg flex justify-between items-start">
                    <div>
                        <p className="text-gray-800">{note.conteudo}</p>
                        <p className="text-xs text-gray-500 mt-2">Criado em: {new Date(note.data_criacao).toLocaleString()}</p>
                    </div>
                    <button 
                        onClick={() => handleDeleteNote(note.ID)}
                        className="ml-4 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 text-xs rounded focus:outline-none focus:shadow-outline"
                    >
                        Excluir
                    </button>
                </div>
            ))}
            {topic.notas?.length === 0 && (
                <p className="text-gray-500">Nenhuma nota encontrada para este tópico.</p>
            )}
        </div>
      </div>
    </div>
  );
}
