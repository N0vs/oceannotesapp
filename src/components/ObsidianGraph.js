'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from '../hooks/useTranslation';

const ObsidianGraph = ({ notes = [], onSelectNote, selectedNote }) => {
  const { t } = useTranslation();
  const svgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [nodePositions, setNodePositions] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedNode, setLastClickedNode] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    showOrphanNodes: true,
    selectedTopics: [],
    showLabels: true
  });
  
  const [tagSearch, setTagSearch] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Gerar posição fixa para um nó baseado no seu ID
  const getNodePosition = (nodeId) => {
    if (nodePositions[nodeId]) {
      return nodePositions[nodeId];
    }
    
    // Usar hash do ID para gerar posição determinística
    let hash = 0;
    const idStr = nodeId.toString();
    for (let i = 0; i < idStr.length; i++) {
      const char = idStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    const margin = 100;
    const x = margin + Math.abs(hash % (dimensions.width - margin * 2));
    const y = margin + Math.abs((hash >> 16) % (dimensions.height - margin * 2));
    
    return { x, y };
  };

  // Obter todos os tópicos únicos das notas
  const getAvailableTopics = () => {
    const topicsMap = new Map();
    notes.forEach(note => {
      if (note.topicos) {
        note.topicos.forEach(topic => {
          topicsMap.set(topic.ID, topic);
        });
      }
    });
    return Array.from(topicsMap.values());
  };

  // Funções para busca de tags (similar à sidebar)
  const handleTagSearch = (value) => {
    setTagSearch(value);
    setShowTagSuggestions(true);
  };

  const selectTag = (topic) => {
    setFilters(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.includes(topic.ID)
        ? prev.selectedTopics
        : [...prev.selectedTopics, topic.ID]
    }));
    setTagSearch('');
    setShowTagSuggestions(false);
  };

  const removeSelectedTag = (topicId) => {
    setFilters(prev => ({
      ...prev,
      selectedTopics: prev.selectedTopics.filter(id => id !== topicId)
    }));
  };

  const getFilteredTopics = () => {
    if (!tagSearch) return [];
    return getAvailableTopics().filter(topic => 
      topic.nome.toLowerCase().includes(tagSearch.toLowerCase()) &&
      !filters.selectedTopics.includes(topic.ID)
    ).slice(0, 5);
  };

  const getSelectedTopics = () => {
    return getAvailableTopics().filter(topic => 
      filters.selectedTopics.includes(topic.ID)
    );
  };

  // Aplicar filtros aos dados
  const applyFilters = (nodes, links) => {
    let filteredNodes = [...nodes];
    let filteredLinks = [...links];

    // Filtro por tópicos selecionados
    if (filters.selectedTopics.length > 0) {
      filteredNodes = filteredNodes.filter(node =>
        node.topics.some(topic => filters.selectedTopics.includes(topic.ID))
      );
      
      const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
      filteredLinks = filteredLinks.filter(link =>
        filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target)
      );
    }

    // Removido filtro por força de conexão conforme solicitado

    // Recalcular conexões após filtro de links
    const connectionCounts = new Map();
    filteredLinks.forEach(link => {
      connectionCounts.set(link.source, (connectionCounts.get(link.source) || 0) + 1);
      connectionCounts.set(link.target, (connectionCounts.get(link.target) || 0) + 1);
    });

    // Atualizar contadores de conexões dos nós
    filteredNodes = filteredNodes.map(node => ({
      ...node,
      connections: connectionCounts.get(node.id) || 0
    }));

    // Removi filtros por número de conexões conforme solicitado

    // Filtro de nós órfãos
    if (!filters.showOrphanNodes) {
      filteredNodes = filteredNodes.filter(node => node.connections > 0);
    }

    // Atualizar links após filtro de nós
    const finalNodeIds = new Set(filteredNodes.map(n => n.id));
    filteredLinks = filteredLinks.filter(link =>
      finalNodeIds.has(link.source) && finalNodeIds.has(link.target)
    );

    return { nodes: filteredNodes, links: filteredLinks };
  };

  // Preparar dados do grafo
  const prepareGraphData = () => {
    // Gerar posições para todos os nós se ainda não existirem
    const newPositions = { ...nodePositions };
    
    const nodes = notes.map((note, index) => {
      const nodeId = note.id || note.ID;
      let position = newPositions[nodeId];
      
      if (!position) {
        // Layout em círculo com margens adequadas
        const angle = (index / notes.length) * 2 * Math.PI;
        const margin = 120; // Margem maior para evitar bordas e UI
        const availableWidth = dimensions.width - margin * 2;
        const availableHeight = dimensions.height - margin * 2;
        const radius = Math.min(availableWidth, availableHeight) * 0.35;
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        
        position = {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        };
        newPositions[nodeId] = position;
      }
      
      return {
        id: nodeId,
        title: note.titulo,
        topics: note.topicos || [],
        connections: 0,
        ...position
      };
    });

    // Atualizar state das posições se houve mudanças
    if (Object.keys(newPositions).length !== Object.keys(nodePositions).length) {
      setNodePositions(newPositions);
    }

    const links = [];
    
    // Criar conexões baseadas em tags compartilhadas
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        // Verificar se compartilham tópicos
        const sharedTopics = nodeA.topics.filter(topicA => 
          nodeB.topics.some(topicB => topicB.ID === topicA.ID)
        );
        
        if (sharedTopics.length > 0) {
          links.push({
            source: nodeA.id,
            target: nodeB.id,
            strength: sharedTopics.length,
            sharedTopics: sharedTopics
          });
          nodeA.connections++;
          nodeB.connections++;
        }
      }
    }

    return { nodes, links };
  };

  // Memoizar dados do grafo para evitar recálculos
  const graphData = useMemo(() => {
    const rawData = prepareGraphData();
    return applyFilters(rawData.nodes, rawData.links);
  }, [notes, dimensions.width, dimensions.height, nodePositions, filters]);

  // Atualizar dimensões
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.parentElement.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Reset posições quando dimensões mudam drasticamente
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      const margin = 120;
      const needsReset = Object.values(nodePositions).some(pos => 
        pos.x > dimensions.width - margin || pos.y > dimensions.height - margin || 
        pos.x < margin || pos.y < margin
      );
      
      if (needsReset) {
        setNodePositions({});
      }
    }
  }, [dimensions.width, dimensions.height]);

  // Handlers para drag and drop
  const handleMouseDown = (e, nodeId) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    
    // Check for double click
    if (timeSinceLastClick < 300 && lastClickedNode === nodeId) {
      // Double click - navigate to note
      const note = notes.find(n => (n.id || n.ID) === nodeId);
      if (note && onSelectNote) {
        onSelectNote(note);
      }
      return;
    }
    
    setLastClickTime(now);
    setLastClickedNode(nodeId);
    
    // Start dragging
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const nodePos = nodePositions[nodeId];
    if (nodePos) {
      setDragOffset({
        x: x - nodePos.x,
        y: y - nodePos.y
      });
      setDraggedNode(nodeId);
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !draggedNode) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const margin = 120;
    const newX = Math.max(margin, Math.min(dimensions.width - margin, x - dragOffset.x));
    const newY = Math.max(margin, Math.min(dimensions.height - margin, y - dragOffset.y));
    
    setNodePositions(prev => ({
      ...prev,
      [draggedNode]: {
        x: newX,
        y: newY
      }
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Event listeners para mouse events globais
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, draggedNode, dragOffset, dimensions]);

  // Renderizar grafo usando SVG nativo (sem D3)
  const renderGraph = () => {
    const { nodes, links } = graphData;
    
    return (
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ 
          background: 'transparent',
          userSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Definir gradients para as conexões */}
        <defs>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Renderizar links */}
        {links.map((link, index) => {
          const sourceNode = nodes.find(n => n.id === link.source);
          const targetNode = nodes.find(n => n.id === link.target);
          
          if (!sourceNode || !targetNode) return null;

          return (
            <line
              key={index}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke="url(#linkGradient)"
              strokeWidth={Math.max(1, link.strength)}
              className="transition-opacity duration-200"
              opacity={selectedNodeId ? 
                (selectedNodeId === sourceNode.id || selectedNodeId === targetNode.id) ? 0.8 : 0.2 
                : 0.6
              }
            />
          );
        })}

        {/* Renderizar nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNote && (selectedNote.id || selectedNote.ID) === node.id;
          const isHovered = selectedNodeId === node.id;
          const isDraggedNode = draggedNode === node.id;
          const nodeSize = Math.max(8, Math.min(20, 8 + node.connections * 2));
          
          return (
            <g key={node.id}>
              {/* Círculo do node */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeSize}
                fill={isSelected ? '#8b5cf6' : isDraggedNode ? '#c084fc' : isHovered ? '#a78bfa' : '#6b7280'}
                stroke={isSelected ? '#ffffff' : isDraggedNode ? '#8b5cf6' : isHovered ? '#8b5cf6' : '#4b5563'}
                strokeWidth={isSelected ? 3 : isDraggedNode ? 3 : isHovered ? 2 : 1}
                className={`transition-all duration-200 ${isDragging && draggedNode === node.id ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onMouseEnter={() => !isDragging && setSelectedNodeId(node.id)}
                onMouseLeave={() => !isDragging && setSelectedNodeId(null)}
                style={{
                  userSelect: 'none',
                  transform: isDraggedNode ? 'scale(1.1)' : 'scale(1)',
                  transformOrigin: `${node.x}px ${node.y}px`
                }}
              />
              
              {/* Label do node */}
              {filters.showLabels && (
                <text
                  x={node.x}
                  y={node.y + nodeSize + 15}
                  textAnchor="middle"
                  fill="#d1d5db"
                  fontSize="11"
                  className="pointer-events-none select-none"
                  opacity={isSelected || isHovered ? 1 : 0.7}
                >
                  {node.title.length > 15 ? node.title.substring(0, 15) + '...' : node.title}
                </text>
              )}
              
              {/* Mostrar tópicos quando hover */}
              {isHovered && node.topics.length > 0 && (
                <g>
                  <rect
                    x={node.x - 60}
                    y={node.y - nodeSize - 40}
                    width="120"
                    height="25"
                    fill="#374151"
                    stroke="#6b7280"
                    rx="4"
                    className="pointer-events-none"
                  />
                  <text
                    x={node.x}
                    y={node.y - nodeSize - 23}
                    textAnchor="middle"
                    fill="#d1d5db"
                    fontSize="9"
                    className="pointer-events-none"
                  >
                    {node.topics.slice(0, 2).map(t => t.nome).join(', ')}
                    {node.topics.length > 2 && ` +${node.topics.length - 2}`}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="h-full bg-gray-900 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-100">{t('graph.graphView')}</h1>
            <p className="text-sm text-gray-400">
              {notes.length} {t('graph.notesCount')} • {graphData.links.length} {t('graph.connectionsCount')}
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 text-xs text-gray-400">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span>{t('graph.nodes')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 bg-purple-500 opacity-60"></div>
                <span>{t('graph.connections')}</span>
              </div>
            </div>
            
            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center space-x-1 ${
                showFilters || filters.selectedTopics.length > 0 || !filters.showOrphanNodes
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              <span>{t('filters.title')}</span>
            </button>
            
            {/* Instructions */}
            <div className="text-xs text-gray-500 border-l border-gray-600 pl-3">
              <div>{t('graph.dragInstructions')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel - Overlay */}
      {showFilters && (
        <div className="absolute top-20 left-4 right-4 z-20 bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-2xl p-4">
          {/* Close button */}
          <button
            onClick={() => setShowFilters(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-200 p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Topic Filters with Search */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">{t('filters.filterByTags')}</label>
              
              {/* Selected Tags */}
              {getSelectedTopics().length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {getSelectedTopics().map((topic) => (
                    <button
                      key={topic.ID}
                      onClick={() => removeSelectedTag(topic.ID)}
                      className="px-2 py-1 text-xs rounded-full text-white border-transparent transition-colors hover:opacity-80 flex items-center space-x-1"
                      style={{ backgroundColor: topic.cor }}
                    >
                      <span>{topic.nome}</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {/* Tag Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('tags.searchTags')}
                  value={tagSearch}
                  onChange={(e) => handleTagSearch(e.target.value)}
                  onFocus={() => setShowTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && getFilteredTopics().length > 0) {
                      selectTag(getFilteredTopics()[0]);
                    }
                    if (e.key === 'Escape') {
                      setTagSearch('');
                      setShowTagSuggestions(false);
                    }
                  }}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded px-3 py-2 text-xs placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />

                {/* Suggestions Dropdown */}
                {showTagSuggestions && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-30 max-h-32 overflow-y-auto">
                    {getFilteredTopics().length > 0 ? (
                      getFilteredTopics().map((topic) => (
                        <button
                          key={topic.ID}
                          onClick={() => selectTag(topic)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-600 transition-colors flex items-center space-x-2"
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: topic.cor }}
                          ></div>
                          <span>{topic.nome}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-400 italic">
                        {tagSearch.trim() === '' ? t('tags.typeToSearch') : t('tags.noTagsFound')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>


            {/* Display Options */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">{t('filters.displayOptions')}</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.showOrphanNodes}
                    onChange={(e) => setFilters(prev => ({ ...prev, showOrphanNodes: e.target.checked }))}
                    className="mr-2 rounded"
                  />
                  <span className="text-xs text-gray-400">{t('filters.showOrphanNodes')}</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.showLabels}
                    onChange={(e) => setFilters(prev => ({ ...prev, showLabels: e.target.checked }))}
                    className="mr-2 rounded"
                  />
                  <span className="text-xs text-gray-400">{t('filters.showLabels')}</span>
                </label>
              </div>
              
              {/* Reset Filters */}
              <button
                onClick={() => {
                  setFilters({
                    showOrphanNodes: true,
                    selectedTopics: [],
                    showLabels: true
                  });
                  setTagSearch('');
                  setShowTagSuggestions(false);
                }}
                className="w-full mt-2 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                {t('filters.resetFilters')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Graph Container */}
      <div className="pt-20 h-full">
        {notes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <div className="w-16 h-16 mx-auto mb-4 opacity-40">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">No notes to display</h3>
              <p className="text-gray-500">Create some notes to see the graph view</p>
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            {renderGraph()}
          </div>
        )}
      </div>

      {/* Selected Node Info */}
      {selectedNodeId && (
        <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-lg p-3 max-w-xs">
          {(() => {
            const selectedNodeData = notes.find(n => (n.id || n.ID) === selectedNodeId);
            if (!selectedNodeData) return null;
            
            return (
              <div>
                <h4 className="font-medium text-gray-200 mb-1">{selectedNodeData.titulo}</h4>
                <p className="text-xs text-gray-400 mb-2">
                  {selectedNodeData.topicos?.length || 0} tags • {t('messages.updated')} {new Date(selectedNodeData.dataAtualizacao).toLocaleDateString()}
                </p>
                {selectedNodeData.topicos && selectedNodeData.topicos.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedNodeData.topicos.slice(0, 3).map((topico) => (
                      <span
                        key={topico.ID}
                        className="inline-block px-1.5 py-0.5 text-xs rounded"
                        style={{ backgroundColor: `${topico.cor}20`, color: topico.cor }}
                      >
                        {topico.nome}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ObsidianGraph;
