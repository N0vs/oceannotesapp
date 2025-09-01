'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import ShareNoteModal from '../../components/ShareNoteModal';

// Componente interno que usa os contextos
function DashboardContent() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('#3B82F6');
  const [showShareModal, setShowShareModal] = useState(null);

  const fetchNotes = async () => {
    setLoading(true);
    const token = Cookies.get('token');
    console.log('Token encontrado:', !!token); // Debug
    
    if (!token) {
      console.log('Sem token, redirecionando para login');
      router.push('/');
      return;
    }

    try {
      console.log('Fazendo request para /api/notas');
      const res = await fetch('/api/notas', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Resposta da API notas:', res.status, res.ok);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.log('Erro da API:', errorData);
        throw new Error('Falha ao buscar notas. Faça login novamente.');
      }

      const data = await res.json();
      console.log('Notas recebidas:', data); // Debug
      console.log('Primeira nota com tópicos:', data[0]?.topicos); // Debug tópicos
      setNotes(data);
    } catch (err) {
      console.log('Erro no fetchNotes:', err);
      setError(err.message);
      Cookies.remove('token');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    const token = Cookies.get('token');
    console.log('fetchTopics - Token encontrado:', !!token);
    if (!token) return;
    
    try {
      console.log('Fazendo request para /api/topicos');
      const res = await fetch('/api/topicos', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Resposta da API topicos:', res.status, res.ok);
      
      if (res.ok) {
        const data = await res.json();
        console.log('Tópicos recebidos:', data);
        setAvailableTopics(data || []);
      } else if (res.status === 404) {
        console.log('Nenhum tópico encontrado (404)');
        setAvailableTopics([]);
      } else {
        console.log('Erro ao buscar tópicos:', res.status);
        setAvailableTopics([]);
      }
    } catch (err) {
      console.log('Erro no fetchTopics:', err);
      setAvailableTopics([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchNotes();
      await fetchTopics();
    };
    loadData();
  }, []);

  const handleLogout = () => {
    Cookies.remove('token');
    router.push('/');
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    const token = Cookies.get('token');
    setError('');

    try {
      const res = await fetch('/api/notas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          titulo: newNoteTitle, 
          conteudo: newNoteContent,
          topicos: selectedTopics.map(t => t.ID || t.id)
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao criar nota');
      }

      setNewNoteTitle('');
      setNewNoteContent('');
      setSelectedTopics([]);
      setShowCreateForm(false);
      setEditingNote(null);
      fetchNotes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNewNoteTitle(note.titulo);
    setNewNoteContent(note.conteudo);
    setSelectedTopics(note.topicos || []);
    setShowCreateForm(true);
  };

  const openCreateForm = () => {
    setEditingNote(null);
    setNewNoteTitle('');
    setNewNoteContent('');
    setSelectedTopics([]);
    setShowCreateForm(true);
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim()) return;
    
    const token = Cookies.get('token');
    try {
      const res = await fetch('/api/topicos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: newTopicName, cor: newTopicColor, utilizadorId: null }),
      });

      if (res.ok) {
        const newTopic = await res.json();
        setAvailableTopics([...availableTopics, newTopic]);
        setSelectedTopics([...selectedTopics, newTopic]);
        setNewTopicName('');
        setNewTopicColor('#3B82F6');
      }
    } catch (err) {
      console.log('Erro ao criar tópico:', err);
    }
  };

  const toggleTopic = (topic) => {
    const isSelected = selectedTopics.some(t => (t.ID || t.id) === (topic.ID || topic.id));
    if (isSelected) {
      setSelectedTopics(selectedTopics.filter(t => (t.ID || t.id) !== (topic.ID || topic.id)));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleUpdateNote = async (e) => {
    e.preventDefault();
    const token = Cookies.get('token');
    setError('');

    try {
      const noteId = editingNote.ID || editingNote.id;

      const res = await fetch(`/api/notas/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          titulo: newNoteTitle, 
          conteudo: newNoteContent,
          topicos: selectedTopics.map(t => t.ID || t.id)
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao atualizar nota');
      }

      setNewNoteTitle('');
      setNewNoteContent('');
      setSelectedTopics([]);
      setShowCreateForm(false);
      setEditingNote(null);
      fetchNotes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteNote = async (noteId) => {
    const token = Cookies.get('token');
    setError('');

    try {
      const res = await fetch(`/api/notas/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao excluir nota');
      }

      setShowDeleteConfirm(null);
      fetchNotes();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Minhas Notas</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/grafo')}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              🔗 Ver Grafo
            </button>
            <button
              onClick={() => {
                setEditingNote(null);
                setNewNoteTitle('');
                setNewNoteContent('');
                setShowCreateForm(true);
              }}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              + Nova Nota
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Modal para criar nova nota */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{editingNote ? 'Editar Nota' : 'Criar Nova Nota'}</h3>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={editingNote ? handleUpdateNote : handleCreateNote} className="space-y-4">
                    <div>
                      <label htmlFor="noteTitle" className="block text-sm font-medium text-gray-700">Título da Nota</label>
                      <input
                        type="text"
                        id="noteTitle"
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="noteContent" className="block text-sm font-medium text-gray-700">Conteúdo da Nota (opcional)</label>
                      <textarea
                        id="noteContent"
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        rows="4"
                        placeholder="Digite o conteúdo da nota (opcional)"
                      />
                    </div>
                    
                    {/* Seção de Tópicos */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tópicos</label>
                      
                      {/* Criar novo tópico */}
                      <div className="flex mb-3 gap-2">
                        <input
                          type="text"
                          value={newTopicName}
                          onChange={(e) => setNewTopicName(e.target.value)}
                          placeholder="Novo tópico..."
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
                        />
                        <input
                          type="color"
                          value={newTopicColor}
                          onChange={(e) => setNewTopicColor(e.target.value)}
                          className="w-10 h-8 border border-gray-300 rounded-md cursor-pointer"
                          title="Escolher cor"
                        />
                        <button
                          type="button"
                          onClick={handleCreateTopic}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
                        >
                          +
                        </button>
                      </div>
                      
                      {/* Lista de tópicos disponíveis */}
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {availableTopics && availableTopics.length > 0 ? (
                          availableTopics.map((topic) => {
                            const isSelected = selectedTopics.some(t => (t.ID || t.id) === (topic.ID || topic.id));
                            return (
                              <button
                                key={`topic-${topic.ID || topic.id}`}
                                type="button"
                                onClick={() => toggleTopic(topic)}
                                className={`px-2 py-1 rounded-full text-xs border ${
                                  isSelected 
                                    ? 'text-white border-transparent' 
                                    : 'text-gray-700 border-gray-300 hover:border-gray-400'
                                }`}
                                style={{
                                  backgroundColor: isSelected ? (topic.cor || '#3B82F6') : 'transparent',
                                  borderColor: !isSelected ? (topic.cor || '#3B82F6') : 'transparent'
                                }}
                              >
                                {topic.nome}
                              </button>
                            );
                          })
                        ) : (
                          <p className="text-xs text-gray-500">Nenhum tópico disponível. Crie o primeiro!</p>
                        )}
                      </div>
                      
                      {/* Tópicos selecionados */}
                      {selectedTopics.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-600">Selecionados: </span>
                          <span className="text-xs text-blue-600">
                            {selectedTopics.map(t => t.nome).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        {editingNote ? 'Atualizar Nota' : 'Criar Nota'}
                      </button>
                    </div>
                  </form>
                  {error && <p className="mt-4 text-red-500">{error}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Modal de confirmação para excluir */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                  <h3 className="text-lg font-medium text-gray-900">Confirmar Exclusão</h3>
                  <div className="mt-2 px-7 py-3">
                    <p className="text-sm text-gray-500">
                      Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.
                    </p>
                  </div>
                  <div className="items-center px-4 py-3">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleDeleteNote(showDeleteConfirm)}
                      className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-24 hover:bg-red-600"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de notas */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <p className="p-4 text-center text-gray-500">Carregando notas...</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {notes && notes.map((note, index) => (
                  <div 
                    key={`note-${note.ID || note.id || index}`} 
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative"
                    onClick={() => handleEditNote(note)}
                  >
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowShareModal(note);
                        }}
                        className="text-blue-500 hover:text-blue-700 text-sm font-bold"
                        title="Compartilhar nota"
                      >
                        🔗
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(note.ID || note.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-lg font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 pr-6">{note.titulo}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">{note.conteudo}</p>
                    
                    {/* Tópicos da nota */}
                    {note.topicos && note.topicos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {note.topicos.map((topico) => (
                          <span
                            key={`note-topic-${topico.ID || topico.id}`}
                            className="px-2 py-1 rounded-full text-xs text-white"
                            style={{ backgroundColor: topico.cor || '#3B82F6' }}
                          >
                            {topico.nome}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Informações de compartilhamento e histórico */}
                    <div className="space-y-2 mb-3">
                      {/* Indicador de nota compartilhada */}
                      {note.isShared && (
                        <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          <span className="mr-1">🔗</span>
                          <span>Compartilhada por {note.sharedBy}</span>
                          <span className="ml-2 px-1 bg-blue-200 rounded text-blue-800">
                            {note.permission}
                          </span>
                        </div>
                      )}
                      
                      {/* Informações de compartilhamento para notas próprias */}
                      {note.isOwned && note.sharedCount > 0 && (
                        <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          <span className="mr-1">👥</span>
                          <span>Compartilhada com {note.sharedCount} pessoa{note.sharedCount > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      
                      {/* Última modificação */}
                      {note.lastModifiedBy && (
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="mr-1">✏️</span>
                          <span>Última edição por {note.lastModifiedBy}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Criada em: {new Date(note.dataCriacao || note.DataCriacao).toLocaleDateString()}</span>
                      {note.lastModifiedDate && (
                        <span>Atualizada: {new Date(note.lastModifiedDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
                {notes && notes.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Nenhuma nota encontrada. Crie sua primeira nota!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal de Compartilhamento */}
          {showShareModal && (
            <ShareNoteModal
              isOpen={!!showShareModal}
              onClose={() => setShowShareModal(null)}
              noteId={showShareModal.ID || showShareModal.id}
              noteTitle={showShareModal.titulo}
            />
          )}

        </div>
      </main>
    </div>
  );
}

// Componente principal simplificado
export default function DashboardPage() {
  return <DashboardContent />;
}
