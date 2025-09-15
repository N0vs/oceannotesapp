'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGraphData } from '../../hooks/useGraphData';
import { useGraphFilters } from '../../hooks/useGraphFilters';
import { useGraphDragDrop } from '../../hooks/useGraphDragDrop';
import { useGraphConnections } from '../../hooks/useGraphConnections';
import graphApiService from '../../services/GraphApiService';

export default function GrafoPage() {
  const router = useRouter();
  const [selectedNote, setSelectedNote] = useState(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('#3B82F6');
  const [topicFilter, setTopicFilter] = useState('');

  // Configurações do grafo
  const svgWidth = 1000;
  const svgHeight = 700;
  const nodeWidth = 120;
  const nodeHeight = 60;

  // Usar hooks customizados seguindo SOLID
  const { notes, topics, loading, error, setError, fetchData, updateNoteInState, addTopicToState } = useGraphData();
  const { selectedTopicsFilter, filterMode, filteredNotes, handleTopicFilterToggle, clearTopicFilter, setFilterMode } = useGraphFilters(notes);
  const { svgRef, nodePositions, dragging, handleMouseDown, initializeNodePositions } = useGraphDragDrop(svgWidth, svgHeight);
  const { connections, getVisibleConnections } = useGraphConnections(notes);

  // Inicializar posições dos nós quando as notas mudarem
  useEffect(() => {
    initializeNodePositions(notes);
  }, [notes, initializeNodePositions]);

  // Obter conexões visíveis baseadas nas notas filtradas
  const visibleConnections = getVisibleConnections(filteredNotes);

  const handleNodeClick = (note) => {
    setSelectedNote(note);
  };

  // Criar novo tópico e associar à nota selecionada usando GraphApiService
  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || !selectedNote) return;
    
    try {
      const newTopic = await graphApiService.createTopicAndAssociate(
        selectedNote.id,
        selectedNote,
        { nome: newTopicName, cor: newTopicColor }
      );
      
      // Atualizar estados locais
      addTopicToState(newTopic);
      updateNoteInState(selectedNote.id, {
        topicos: [...(selectedNote.topicos || []), newTopic]
      });
      
      setSelectedNote(prev => ({
        ...prev,
        topicos: [...(prev.topicos || []), newTopic]
      }));
      
      setNewTopicName('');
      setNewTopicColor('#3B82F6');
      
    } catch (error) {
      console.error('Erro ao criar tópico:', error);
      setError('Erro ao criar tópico');
    }
  };

  // Remover tópico específico da nota usando GraphApiService
  const handleRemoveTopic = async (topicId) => {
    if (!selectedNote) return;
    
    try {
      await graphApiService.removeTopicFromNote(selectedNote.id, selectedNote, topicId);
      
      // Atualizar estados locais
      const updatedTopics = selectedNote.topicos?.filter(t => (t.ID || t.id) !== topicId) || [];
      setSelectedNote(prev => ({
        ...prev,
        topicos: updatedTopics
      }));
      
      updateNoteInState(selectedNote.id, { topicos: updatedTopics });
      
    } catch (error) {
      console.error('Erro ao remover tópico:', error);
      setError('Erro ao remover tópico');
      fetchData();
    }
  };

  // Remover todos os tópicos da nota usando GraphApiService
  const handleRemoveAllTopics = async () => {
    if (!selectedNote) return;
    
    try {
      await graphApiService.removeAllTopicsFromNote(selectedNote.id, selectedNote);
      
      // Atualizar estados locais
      setSelectedNote(prev => ({
        ...prev,
        topicos: []
      }));
      
      updateNoteInState(selectedNote.id, { topicos: [] });
      
    } catch (error) {
      console.error('Erro ao remover todos os tópicos:', error);
      setError('Erro ao remover todos os tópicos');
      fetchData();
    }
  };

  // Associar tópico existente à nota usando GraphApiService
  const handleAssociateTopic = async (topicId) => {
    if (!selectedNote) return;
    
    try {
      const currentTopicIds = selectedNote.topicos?.map(t => t.ID || t.id) || [];
      const updatedTopicIds = [...currentTopicIds, topicId];
      
      await graphApiService.associateTopicsToNote(selectedNote.id, selectedNote, updatedTopicIds);
      
      // Atualizar estados locais
      const topicToAdd = topics.find(t => (t.ID || t.id) === topicId);
      if (topicToAdd) {
        setSelectedNote(prev => ({
          ...prev,
          topicos: [...(prev.topicos || []), topicToAdd]
        }));
        
        updateNoteInState(selectedNote.id, {
          topicos: [...(selectedNote.topicos || []), topicToAdd]
        });
      }
      
    } catch (error) {
      console.error('Erro ao associar tópico:', error);
      setError('Erro ao associar tópico');
      fetchData();
    }
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Carregando grafo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Grafo de Notas</h1>
            <div className="flex space-x-4">
              <button
                onClick={handleBackToDashboard}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          {/* Filtros de Visualização - Acima do Grafo */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-wrap items-center gap-4">
              {/* Botões de Modo */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterMode('none')}
                  className={`px-3 py-2 text-sm rounded ${
                    filterMode === 'none' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  Sem Tópicos
                </button>
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-2 text-sm rounded ${
                    filterMode === 'all' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  Exatamente Estes Tópicos
                </button>
                <button
                  onClick={() => setFilterMode('any')}
                  className={`px-3 py-2 text-sm rounded ${
                    filterMode === 'any' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  Pelo Menos Um
                </button>
                {(filterMode !== 'none' || selectedTopicsFilter.length > 0) && (
                  <button
                    onClick={clearTopicFilter}
                    className="px-3 py-2 text-sm text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
              
              {/* Status do Filtro */}
              <div className="text-sm text-gray-600">
                <span className="font-medium">Mostrando:</span> {filteredNotes.length} de {notes.length} notas
                {filterMode === 'none' && filteredNotes.length === 0 && (
                  <span className="text-green-600 ml-2">✓ Todas as notas têm tópicos!</span>
                )}
              </div>
            </div>
            
            {/* Seleção de Tópicos para Filtro */}
            {filterMode !== 'none' && (
              <div className="mt-4">
                <p className="text-sm text-gray-700 mb-2">
                  {filterMode === 'all' 
                    ? 'Selecione tópicos (nota deve ter EXATAMENTE estes):' 
                    : 'Selecione tópicos (nota deve ter PELO MENOS UM):'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <button
                      key={`filter-topic-${topic.ID || topic.id}`}
                      onClick={() => handleTopicFilterToggle(topic.ID || topic.id)}
                      className={`px-3 py-1 text-sm rounded-full transition-all ${
                        selectedTopicsFilter.includes(topic.ID || topic.id)
                          ? 'text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border'
                      }`}
                      style={{
                        backgroundColor: selectedTopicsFilter.includes(topic.ID || topic.id) 
                          ? (topic.cor || '#3B82F6') 
                          : undefined
                      }}
                    >
                      {topic.nome}
                    </button>
                  ))}
                </div>
                {filterMode !== 'none' && selectedTopicsFilter.length === 0 && (
                  <p className="text-orange-600 text-sm mt-2">Selecione tópicos para filtrar</p>
                )}
              </div>
            )}
          </div>

          <div className="flex">
            {/* Grafo SVG */}
            <div className="flex-1">
              <svg
                ref={svgRef}
                width={svgWidth}
                height={svgHeight}
                className="border border-gray-300 rounded"
              >
                {/* Renderizar conexões (linhas) apenas para notas filtradas */}
                {visibleConnections
                  .map((connection, index) => {
                    const fromPos = nodePositions[connection.from];
                    const toPos = nodePositions[connection.to];
                    
                    if (!fromPos || !toPos) return null;

                    return (
                      <line
                        key={`connection-${index}`}
                        x1={fromPos.x}
                        y1={fromPos.y}
                        x2={toPos.x}
                        y2={toPos.y}
                        stroke={connection.color}
                        strokeWidth="3"
                        opacity="0.7"
                      >
                        <title>{connection.topic.nome}</title>
                      </line>
                    );
                  })}

                {/* Renderizar nós (notas filtradas) */}
                {filteredNotes.map((note) => {
                  const position = nodePositions[note.id];
                  if (!position) return null;

                  return (
                    <g key={`node-${note.id}`}>
                      <rect
                        x={position.x - nodeWidth/2}
                        y={position.y - nodeHeight/2}
                        width={nodeWidth}
                        height={nodeHeight}
                        rx="8"
                        fill={selectedNote?.id === note.id ? '#EF4444' : '#3B82F6'}
                        stroke="#1F2937"
                        strokeWidth="2"
                        className="cursor-move hover:opacity-80"
                        onClick={() => handleNodeClick(note)}
                        onMouseDown={(e) => handleMouseDown(e, note.id)}
                      >
                        <title>{note.titulo}</title>
                      </rect>
                      
                      {/* Texto do título da nota */}
                      <text
                        x={position.x}
                        y={position.y - 5}
                        textAnchor="middle"
                        className="text-xs fill-white font-medium pointer-events-none"
                        style={{ fontSize: '11px', fontWeight: 'bold' }}
                      >
                        {note.titulo.length > 12 ? note.titulo.substring(0, 12) + '...' : note.titulo}
                      </text>
                      
                      {/* Subtexto com número de tópicos */}
                      <text
                        x={position.x}
                        y={position.y + 10}
                        textAnchor="middle"
                        className="text-xs fill-white opacity-80 pointer-events-none"
                        style={{ fontSize: '9px' }}
                      >
                        {note.topicos?.length || 0} tópicos
                      </text>
                    </g>
                  );
                })}
              </svg>

            </div>

            {/* Painel lateral para edição de tópicos */}
            <div className="w-80 ml-6 bg-gray-50 rounded-lg p-4">
              {selectedNote ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedNote.titulo}
                  </h3>
                  <p className="text-gray-700 text-sm mb-4">
                    {selectedNote.conteudo || 'Sem conteúdo'}
                  </p>
                  
                  {/* Tópicos atuais da nota */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Tópicos Atuais:</h4>
                      {selectedNote.topicos && selectedNote.topicos.length > 0 && (
                        <button
                          onClick={handleRemoveAllTopics}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remover Todos
                        </button>
                      )}
                    </div>
                    
                    {selectedNote.topicos && selectedNote.topicos.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {selectedNote.topicos.map((topico) => (
                          <button
                            key={`selected-topic-${topico.ID || topico.id}`}
                            onClick={() => handleRemoveTopic(topico.ID || topico.id)}
                            className="px-2 py-1 rounded-full text-xs text-white hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: topico.cor || '#3B82F6' }}
                            title="Clique para remover"
                          >
                            {topico.nome} ✕
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mb-3">Nenhum tópico associado</p>
                    )}
                  </div>

                  {/* Criar novo tópico */}
                  <div className="mb-4 p-3 bg-white rounded border">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Criar Novo Tópico:</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Nome do tópico"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={newTopicColor}
                          onChange={(e) => setNewTopicColor(e.target.value)}
                          className="w-8 h-6 border rounded cursor-pointer"
                        />
                        <button
                          onClick={handleCreateTopic}
                          disabled={!newTopicName.trim()}
                          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-xs py-1 px-2 rounded"
                        >
                          Criar e Associar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tópicos existentes para associar */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Associar Tópico Existente:</h4>
                    
                    {/* Filtro de busca */}
                    <input
                      type="text"
                      placeholder="Filtrar tópicos por nome..."
                      value={topicFilter}
                      onChange={(e) => setTopicFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    
                    <div className="max-h-32 overflow-y-auto">
                      {topics
                        .filter(topic => 
                          !selectedNote.topicos?.some(nt => (nt.ID || nt.id) === (topic.ID || topic.id)) &&
                          topic.nome.toLowerCase().includes(topicFilter.toLowerCase())
                        )
                        .map((topic) => (
                          <button
                            key={`available-topic-${topic.ID || topic.id}`}
                            onClick={() => {
                              handleAssociateTopic(topic.ID || topic.id);
                              setTopicFilter(''); // Limpar filtro após adicionar
                            }}
                            className="block w-full text-left px-2 py-1 text-xs rounded mb-1 hover:bg-gray-200 border transition-colors"
                            style={{ borderLeftColor: topic.cor || '#3B82F6', borderLeftWidth: '4px' }}
                          >
                            {topic.nome}
                          </button>
                        ))}
                    </div>
                    
                    {topics.filter(topic => 
                      !selectedNote.topicos?.some(nt => (nt.ID || nt.id) === (topic.ID || topic.id)) &&
                      topic.nome.toLowerCase().includes(topicFilter.toLowerCase())
                    ).length === 0 && (
                      <p className="text-xs text-gray-500">
                        {topicFilter ? 'Nenhum tópico encontrado com esse filtro' : 'Todos os tópicos já estão associados'}
                      </p>
                    )}
                  </div>

                  {/* Estatísticas */}
                  <div className="text-xs text-gray-500 space-y-1 pt-3 border-t">
                    <p>Conexões: {connections.filter(c => c.from === selectedNote.id || c.to === selectedNote.id).length}</p>
                    <p>Tópicos: {selectedNote.topicos?.length || 0}</p>
                    <p>Criada: {new Date(selectedNote.dataCriacao || selectedNote.DataCriacao).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p className="text-sm">Clique em uma nota para editar seus tópicos</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Controles - Abaixo do Grafo */}
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* Controles */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Controles:</h3>
                <div className="text-gray-600 space-y-1">
                  <p>• <strong>Arrastar:</strong> Mova as notas pelo grafo</p>
                  <p>• <strong>Clique:</strong> Selecionar nota para editar tópicos</p>
                </div>
              </div>
              
              {/* Estatísticas */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Estatísticas:</h3>
                <div className="text-gray-600 space-y-1">
                  <p><strong>Notas visíveis:</strong> {filteredNotes.length} de {notes.length}</p>
                  <p><strong>Conexões visíveis:</strong> {visibleConnections.length}</p>
                  <p><strong>Tópicos únicos:</strong> {topics.length}</p>
                </div>
              </div>
              
              {/* Status Atual */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Status:</h3>
                <div className="text-gray-600 space-y-1">
                  {filterMode === 'none' && (
                    <p className="text-blue-600">
                      <strong>Modo:</strong> Mostrando apenas notas sem tópicos
                    </p>
                  )}
                  {filterMode === 'all' && selectedTopicsFilter.length > 0 && (
                    <p className="text-purple-600">
                      <strong>Modo:</strong> Notas com exatamente {selectedTopicsFilter.length} tópico(s)
                    </p>
                  )}
                  {filterMode === 'any' && selectedTopicsFilter.length > 0 && (
                    <p className="text-green-600">
                      <strong>Modo:</strong> Notas com pelo menos 1 de {selectedTopicsFilter.length} tópico(s)
                    </p>
                  )}
                  {selectedNote && (
                    <p className="text-red-600">
                      <strong>Selecionada:</strong> {selectedNote.titulo}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
