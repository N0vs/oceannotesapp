import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

/**
 * Hook personalizado para gerenciar dados de notas e tópicos do grafo
 * Segue o Single Responsibility Principle - responsável apenas por dados
 */
export const useGraphData = () => {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    const token = Cookies.get('token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      setLoading(true);
      
      // Buscar notas
      const notesRes = await fetch('/api/notas', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData);
      }

      // Buscar tópicos
      const topicsRes = await fetch('/api/topicos', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setTopics(topicsData);
      }
    } catch (err) {
      setError('Erro ao carregar dados');
      console.log('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Função para atualizar uma nota específica no estado local
  const updateNoteInState = (noteId, updatedNote) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, ...updatedNote } : note
    ));
  };

  // Função para adicionar novo tópico ao estado local
  const addTopicToState = (newTopic) => {
    setTopics(prev => [...prev, newTopic]);
  };

  return {
    notes,
    topics,
    loading,
    error,
    setError,
    fetchData,
    updateNoteInState,
    addTopicToState
  };
};
