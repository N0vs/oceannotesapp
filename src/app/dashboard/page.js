'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useTranslation } from '../../hooks/useTranslation';
import ObsidianLayout from '../../components/ObsidianLayout';
import ObsidianSidebar from '../../components/ObsidianSidebar';
import ObsidianEditor from '../../components/ObsidianEditor';
import ObsidianGraph from '../../components/ObsidianGraph';
import ShareNoteModal from '../../components/ShareNoteModal';

/**
 * Componente principal do dashboard da aplicação Ocean Notes
 * Interface tipo Obsidian com sidebar, editor e visualização em grafo
 * 
 * @component ObsidianDashboard
 * @description Componente raiz do dashboard que:
 * - Gerencia estado global de notas e tópicos da aplicação
 * - Implementa autenticação via cookies JWT
 * - Coordena comunicação entre sidebar, editor e grafo
 * - Controla modais de compartilhamento e criação de notas
 * - Realiza fetching inicial e refresh de dados
 * - Suporta internacionalização via useTranslation
 * 
 * @features
 * - Interface responsiva tipo Obsidian
 * - Criação, edição e exclusão de notas
 * - Sistema de tags/tópicos
 * - Visualização em grafo de conexões
 * - Compartilhamento colaborativo de notas
 * - Filtros e busca avançada
 * - Refresh específico de notas individuais
 * 
 * @state
 * - notes: Array de notas filtradas para exibição
 * - allNotes: Array completo de notas (cache local)
 * - selectedNote: Nota atualmente selecionada no editor
 * - isCreatingNote: Flag para modo de criação de nova nota
 * - availableTopics: Lista de tópicos disponíveis do usuário
 * - loading: Estado de carregamento inicial
 * - error: Mensagens de erro para exibição
 * - showShareModal: Controle do modal de compartilhamento
 * - showGraph: Toggle entre editor e visualização em grafo
 * 
 * @example
 * // Uso como página principal
 * export default function DashboardPage() {
 *   return <ObsidianDashboard />;
 * }
 * 
 * @requires Authentication via JWT cookie
 * @redirects Redirects to login if no valid token
 */
function ObsidianDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null); // Por padrão nenhuma nota selecionada
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(null);
  const [showGraph, setShowGraph] = useState(false);

  // Fetch notes: função principal para carregamento de todas as notas do usuário
  const fetchNotes = async () => {
    // Loading state: indica carregamento para mostrar feedback visual ao usuário
    setLoading(true);
    
    // Authentication check: obtém token JWT dos cookies para API calls
    const token = Cookies.get('token');
    
    // Redirect se não autenticado: proteção de rota
    if (!token) {
      router.push('/'); // Volta para página de login
      return;
    }

    try {
      // API call para buscar notas: endpoint protegido que retorna notas + dados de compartilhamento
      const response = await fetch('/api/notas', {
        headers: {
          'Authorization': `Bearer ${token}` // JWT authentication header
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Estado dual: notes para exibição (pode ser filtrado), allNotes para cache completo
        // Callback pattern força atualização síncrona, evita race conditions
        setNotes(() => data);     // Notas visíveis na sidebar
        setAllNotes(() => data);  // Cache completo para filtros e buscas
      } else {
        throw new Error('Erro ao carregar notas');
      }
    } catch (error) {
      // Error handling: captura erros de rede, API ou parsing
      setError('Erro ao carregar notas: ' + error.message);
    } finally {
      // Cleanup: sempre desativa loading independente de sucesso/erro
      setLoading(false);
    }
  };

  // Fetch topics: função para carregamento de tópicos/tags disponíveis do usuário
  const fetchTopics = async () => {
    // Reutiliza token para consistência de autenticação
    const token = Cookies.get('token');
    
    try {
      // API call para tópicos: endpoint que retorna lista de tags do usuário
      const response = await fetch('/api/topicos', {
        headers: {
          'Authorization': `Bearer ${token}` // Mesmo padrão de auth das notas
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Atualiza lista de tópicos disponíveis para seleção no editor
        setAvailableTopics(data);
      }
    } catch (error) {
      // Error handling não crítico: tópicos são opcionais, não quebra funcionalidade
      console.error('Erro ao carregar tópicos:', error);
      // Não define erro no state - falha silenciosa por ser funcionalidade secundária
    }
  };

  // Effect de inicialização: executa uma vez quando componente monta
  useEffect(() => {
    // Fetch inicial: carrega dados essenciais da aplicação
    fetchNotes();   // Notas são priority #1
    fetchTopics();  // Tópicos são complementares
    
    // Estado limpo inicial: garante que dashboard inicia sem seleções
    setSelectedNote(null);    // Nenhuma nota selecionada
    setIsCreatingNote(false); // Não está criando nota nova
  }, []); // Dependency array vazio = executa apenas no mount

  // Refresh single note from API
  const refreshSingleNote = async (noteId) => {
    const token = Cookies.get('token');
    
    try {
      // Como a API individual não retorna tópicos, vamos buscar todas as notas
      // e encontrar a específica (que já vem com tópicos)
      console.log('Fazendo fetch de todas as notas para encontrar a atualizada...');
      const response = await fetch('/api/notas', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const allNotes = await response.json();
        const updatedNote = allNotes.find(note => (note.id || note.ID) === noteId);
        
        if (updatedNote) {
          console.log('Nota atualizada encontrada:', updatedNote);
          console.log('Tags da nota atualizada:', updatedNote.topicos);
          
          // Garantir que a nota tem timestamp atualizado para forçar re-render
          updatedNote.dataAtualizacao = new Date().toISOString();
          
          // Atualizar TODAS as notas (já que fizemos fetch de todas)
          setNotes(allNotes);
          setAllNotes(allNotes);
          
          // Também atualizar tópicos para garantir que as novas tags existem
          await fetchTopics();
          
          // Atualizar a nota selecionada se for a mesma - FORÇAR update
          if (selectedNote && (selectedNote.id || selectedNote.ID) === (updatedNote.id || updatedNote.ID)) {
            // Primeiro limpar a nota selecionada, depois definir a nova (forçar re-render)
            setSelectedNote(null);
            setTimeout(() => {
              setSelectedNote(updatedNote);
            }, 10);
          }
          
          console.log('Estado atualizado com nota:', updatedNote);
        } else {
          console.error('Nota não encontrada nas notas retornadas');
        }
      } else {
        console.error('Erro na resposta da API:', response.status);
      }
    } catch (error) {
      console.error('Erro ao recarregar nota:', error);
    }
  };

  // Handle create new note
  const handleCreateNote = () => {
    setSelectedNote(null);
    setIsCreatingNote(true);
    setShowGraph(false);
  };

  // Handle select note
  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setIsCreatingNote(false);
    setShowGraph(false);
  };

  // Handle save note
  const handleSaveNote = async (noteData) => {
    console.log('=== INÍCIO SAVE ===');
    console.log('Dados sendo salvos:', noteData);
    console.log('IDs das tags:', noteData.topicos);
    
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
        response = await fetch(`/api/notas/${selectedNote.id || selectedNote.ID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(noteData)
        });
      }

      if (response && response.ok) {
        try {
          const responseText = await response.text();
          
          let savedNote;
          if (responseText) {
            savedNote = JSON.parse(responseText);
          } else {
            await fetchNotes();
            return;
          }
          
          // Verificar se a API retornou apenas mensagem de sucesso
          if (savedNote.message && !savedNote.nota && !savedNote.id && !savedNote.ID) {
            // Recarregar apenas a nota específica
            if (!isCreatingNote && selectedNote) {
              console.log('Refreshing single note:', selectedNote.id || selectedNote.ID);
              await refreshSingleNote(selectedNote.id || selectedNote.ID);
              console.log('=== FIM SAVE (refresh note) ===');
            } else {
              // Para nova nota, refazer fetch das notas
              await fetchNotes();
              setIsCreatingNote(false);
              console.log('=== FIM SAVE (new note) ===');
            }
            return;
          }
          
          // A API retornou dados da nota, vamos normalizar
          const noteData = savedNote.nota || savedNote;
          
          if (isCreatingNote) {
            setNotes(prev => [noteData, ...prev]);
            setAllNotes(prev => [noteData, ...prev]);
            setSelectedNote(noteData);
            setIsCreatingNote(false);
          } else {
            setNotes(prev => prev.map(note => 
              (note.id || note.ID) === (noteData.id || noteData.ID) ? noteData : note
            ));
            setAllNotes(prev => prev.map(note => 
              (note.id || note.ID) === (noteData.id || noteData.ID) ? noteData : note
            ));
            setSelectedNote(noteData);
          }
        } catch (parseError) {
          // Se há erro no parse, refazer fetch das notas
          await fetchNotes();
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

  // Handle create topic
  const handleCreateTopic = async (topicData) => {
    const token = Cookies.get('token');
    
    try {
      const response = await fetch('/api/topicos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: topicData.nome,
          cor: topicData.cor
        })
      });

      if (response.ok) {
        const newTopic = await response.json();
        setAvailableTopics(prev => [...prev, newTopic]);
        return newTopic;
      }
    } catch (error) {
      console.error('Erro ao criar tópico:', error);
    }
  };

  // Handle share note
  const handleShareNote = (note) => {
    setShowShareModal(note);
  };

  // Handle delete note
  const handleDeleteNote = async (note) => {
    const token = Cookies.get('token');
    
    try {
      const response = await fetch(`/api/notas/${note.id || note.ID}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remover nota de ambas as listas
        setNotes(prev => prev.filter(n => (n.id || n.ID) !== (note.id || note.ID)));
        setAllNotes(prev => prev.filter(n => (n.id || n.ID) !== (note.id || note.ID)));
        
        // Se era a nota selecionada, limpar seleção
        if (selectedNote && (selectedNote.id || selectedNote.ID) === (note.id || note.ID)) {
          setSelectedNote(null);
          setIsCreatingNote(false);
        }
      } else {
        throw new Error('Erro ao deletar nota');
      }
    } catch (error) {
      console.error('Erro ao deletar nota:', error);
      setError('Erro ao deletar nota: ' + error.message);
    }
  };

  // Handle logout
  const handleLogout = () => {
    Cookies.remove('token');
    router.push('/');
  };

  // Handle show graph
  const handleShowGraph = () => {
    setShowGraph(true);
    setSelectedNote(null);
    setIsCreatingNote(false);
  };

  // Handle select note from graph or sidebar
  const handleSelectNoteFromGraph = (note) => {
    setSelectedNote(note);
    setShowGraph(false);
    setIsCreatingNote(false);
  };

  // Handle filters change
  const handleFiltersChange = (filters) => {
    // Se não há filtros ativos, mostrar todas as notas
    if (!filters.searchText && filters.selectedTopics.length === 0 && filters.dateFilter === 'all' && !filters.customDateStart && !filters.customDateEnd) {
      setNotes(allNotes);
      return;
    }

    // Aplicar filtros usando as notas originais
    let filteredNotes = [...allNotes];

    // Filtro de texto
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filteredNotes = filteredNotes.filter(note => 
        note.titulo.toLowerCase().includes(searchLower) ||
        (note.conteudo && note.conteudo.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por tópicos
    if (filters.selectedTopics.length > 0) {
      filteredNotes = filteredNotes.filter(note =>
        note.topicos && note.topicos.some(topic => 
          filters.selectedTopics.includes(topic.ID)
        )
      );
    }

    // Filtro por data
    if (filters.dateFilter !== 'all') {
      const now = new Date();
      filteredNotes = filteredNotes.filter(note => {
        const noteDate = new Date(note.dataAtualizacao);
        
        switch (filters.dateFilter) {
          case 'today':
            return noteDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return noteDate >= weekAgo;
          case 'month':
            return noteDate.getMonth() === now.getMonth() && noteDate.getFullYear() === now.getFullYear();
          case 'custom':
            // Filtro por período personalizado
            if (filters.customDateStart && filters.customDateEnd) {
              const startDate = new Date(filters.customDateStart);
              const endDate = new Date(filters.customDateEnd);
              // Ajustar para incluir o dia inteiro
              endDate.setHours(23, 59, 59, 999);
              return noteDate >= startDate && noteDate <= endDate;
            } else if (filters.customDateStart) {
              const startDate = new Date(filters.customDateStart);
              return noteDate >= startDate;
            } else if (filters.customDateEnd) {
              const endDate = new Date(filters.customDateEnd);
              endDate.setHours(23, 59, 59, 999);
              return noteDate <= endDate;
            }
            return true;
          default:
            return true;
        }
      });
    }

    setNotes(filteredNotes);
  };

  // Render sidebar
  const sidebar = (
    <ObsidianSidebar
      notes={notes}
      onCreateNote={handleCreateNote}
      onSelectNote={handleSelectNote}
      selectedNoteId={selectedNote?.id || selectedNote?.ID}
      onLogout={handleLogout}
      availableTopics={availableTopics}
      onFiltersChange={handleFiltersChange}
      onShowGraph={handleShowGraph}
      showingGraph={showGraph}
    />
  );

  // Render main content
  const mainContent = showGraph ? (
    <ObsidianGraph
      notes={allNotes}
      onSelectNote={handleSelectNoteFromGraph}
      selectedNote={selectedNote}
    />
  ) : (
    <ObsidianEditor
      note={selectedNote}
      onSave={handleSaveNote}
      onClose={handleCloseEditor}
      isCreating={isCreatingNote}
      availableTopics={availableTopics}
      onCreateTopic={handleCreateTopic}
      onShare={handleShareNote}
      onDelete={handleDeleteNote}
    />
  );

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">{t('messages.loadingNotes')}</p>
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
            {t('messages.tryAgain')}
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
          noteId={showShareModal.id || showShareModal.ID}
          noteTitle={showShareModal.titulo}
        />
      )}
    </>
  );
}

export default function DashboardPage() {
  return <ObsidianDashboard />;
}
