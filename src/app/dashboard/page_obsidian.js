'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import ObsidianLayout from '../../components/ObsidianLayout';
import ObsidianSidebar from '../../components/ObsidianSidebar';
import ObsidianEditor from '../../components/ObsidianEditor';
import ShareNoteModal from '../../components/ShareNoteModal';

function ObsidianDashboard() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(null);

  // Fetch notes
  const fetchNotes = async () => {
    setLoading(true);
    const token = Cookies.get('token');
    
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const response = await fetch('/api/notas', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      } else {
        throw new Error('Erro ao carregar notas');
      }
    } catch (error) {
      setError('Erro ao carregar notas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch topics
  const fetchTopics = async () => {
    const token = Cookies.get('token');
    
    try {
      const response = await fetch('/api/topicos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTopics(data);
      }
    } catch (error) {
      console.error('Erro ao carregar tópicos:', error);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchTopics();
  }, []);

  // Handle create note
  const handleCreateNote = () => {
    setSelectedNote(null);
    setIsCreatingNote(true);
  };

  // Handle select note
  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setIsCreatingNote(false);
  };

  // Handle save note
  const handleSaveNote = async (noteData) => {
    const token = Cookies.get('token');
    
    try {
      let response;
      
      if (isCreatingNote) {
        // Create new note
        response = await fetch('/api/notas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(noteData)
        });
      } else if (selectedNote) {
        // Update existing note
        response = await fetch(`/api/notas/${selectedNote.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(noteData)
        });
      }

      if (response && response.ok) {
        const savedNote = await response.json();
        
        if (isCreatingNote) {
          setNotes(prev => [savedNote.nota, ...prev]);
          setSelectedNote(savedNote.nota);
          setIsCreatingNote(false);
        } else {
          setNotes(prev => prev.map(note => 
            note.id === savedNote.nota.id ? savedNote.nota : note
          ));
          setSelectedNote(savedNote.nota);
        }
      } else {
        throw new Error('Erro ao salvar nota');
      }
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      setError('Erro ao salvar nota: ' + error.message);
    }
  };

  // Handle close editor
  const handleCloseEditor = () => {
    setSelectedNote(null);
    setIsCreatingNote(false);
  };

  // Handle logout
  const handleLogout = () => {
    Cookies.remove('token');
    router.push('/');
  };

  // Render sidebar
  const sidebar = (
    <ObsidianSidebar
      notes={notes}
      onCreateNote={handleCreateNote}
      onSelectNote={handleSelectNote}
      selectedNoteId={selectedNote?.id}
      onLogout={handleLogout}
    />
  );

  // Render main content
  const mainContent = (
    <ObsidianEditor
      note={selectedNote}
      onSave={handleSaveNote}
      onClose={handleCloseEditor}
      isCreating={isCreatingNote}
      availableTopics={availableTopics}
    />
  );

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your notes...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg">{error}</p>
          </div>
          <button
            onClick={() => {
              setError('');
              fetchNotes();
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ObsidianLayout sidebar={sidebar}>
        {mainContent}
      </ObsidianLayout>

      {/* Modal de Compartilhamento */}
      {showShareModal && (
        <ShareNoteModal
          isOpen={!!showShareModal}
          onClose={() => setShowShareModal(null)}
          noteId={showShareModal.id}
          noteTitle={showShareModal.titulo}
        />
      )}
    </>
  );
}

export default function DashboardPage() {
  return <ObsidianDashboard />;
}
