'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Componente de sidebar principal da aplicação
 * Gerencia navegação, filtros, busca de notas e criação de novas notas
 * 
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.notes - Array de notas para exibir na sidebar
 * @param {Function} props.onCreateNote - Callback para criar nova nota
 * @param {Function} props.onSelectNote - Callback para selecionar nota
 * @param {string} props.selectedNoteId - ID da nota atualmente selecionada
 * @param {Function} props.onLogout - Callback para logout do usuário
 * @param {Array} props.availableTopics - Array de tags disponíveis para filtros
 * @param {Function} props.onFiltersChange - Callback quando filtros mudam
 * @param {Function} props.onShowGraph - Callback para exibir visualização em grafo
 * @param {boolean} props.showingGraph - Indica se está exibindo grafo atualmente
 * @returns {JSX.Element} Elemento JSX da sidebar
 * @description Sidebar completa com navegação, filtros avançados, busca e gestão de notas
 */
const ObsidianSidebar = ({ notes = [], onCreateNote, onSelectNote, selectedNoteId, onLogout, availableTopics = [], onFiltersChange, onShowGraph, showingGraph }) => {
  const { t } = useTranslation();
  
  const [expandedSections, setExpandedSections] = useState({
    recent: true,
    notes: false,  // Todas as Notas fechada por padrão
    filters: false
  });

  const [filters, setFilters] = useState({
    searchText: '',
    selectedTopics: [],
    dateFilter: 'all',
    customDateStart: '',
    customDateEnd: ''
  });

  const [tagSearch, setTagSearch] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showNoteSuggestions, setShowNoteSuggestions] = useState(false);

  const router = useRouter();

  /**
   * Gerencia logout do usuário
   * Remove token de autenticação e redireciona para página de login
   * @function handleLogout
   * @returns {void} Não retorna valor, executa logout e redirecionamento
   * @description Limpa sessão do usuário e redireciona para página inicial
   */
  const handleLogout = () => {
    Cookies.remove('token');
    if (onLogout) onLogout();
    router.push('/');
  };

  /**
   * Alterna expansão/colapso de seções da sidebar
   * Controla quais seções estão visíveis (filtros, notas recentes, todas as notas)
   * @function toggleSection
   * @param {string} section - Nome da seção a ser alternada
   * @returns {void} Não retorna valor, atualiza estado expandedSections
   * @description Permite colapsar/expandir seções para melhor organização visual
   */
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  /**
   * Gerencia mudanças nos filtros da sidebar
   * Atualiza filtros locais e notifica componente pai sobre mudanças
   * @function handleFilterChange
   * @param {string} key - Chave do filtro a ser alterado
   * @param {any} value - Novo valor para o filtro
   * @returns {void} Não retorna valor, atualiza filters e chama onFiltersChange
   * @description Centraliza lógica de mudança de filtros e limpa campos relacionados quando necessário
   */
  const handleFilterChange = (key, value) => {
    let newFilters = { ...filters, [key]: value };
    
    // Limpar campos de data personalizada quando mudar para outro filtro de data
    if (key === 'dateFilter' && value !== 'custom') {
      newFilters.customDateStart = '';
      newFilters.customDateEnd = '';
    }
    
    // Não expandir automaticamente - deixar o usuário controlar
    
    setFilters(newFilters);
    
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const handleTopicFilter = (topicId) => {
    const newSelectedTopics = filters.selectedTopics.includes(topicId)
      ? filters.selectedTopics.filter(id => id !== topicId)
      : [...filters.selectedTopics, topicId];
    
    handleFilterChange('selectedTopics', newSelectedTopics);
  };

  const clearFilters = () => {
    const clearedFilters = {
      searchText: '',
      selectedTopics: [],
      dateFilter: 'all',
      customDateStart: '',
      customDateEnd: ''
    };
    setFilters(clearedFilters);
    setTagSearch('');
    setShowNoteSuggestions(false);
    setShowTagSuggestions(false);
    
    if (onFiltersChange) {
      onFiltersChange(clearedFilters);
    }
  };

  const handleTagSearch = (value) => {
    setTagSearch(value);
    setShowTagSuggestions(value.length > 0);
  };

  const selectTag = (topic) => {
    handleTopicFilter(topic.ID);
    setTagSearch('');
    setShowTagSuggestions(false);
  };

  const removeSelectedTag = (topicId) => {
    handleTopicFilter(topicId);
  };

  const getFilteredTopics = () => {
    if (!tagSearch) return [];
    return availableTopics.filter(topic => 
      topic.nome.toLowerCase().includes(tagSearch.toLowerCase()) &&
      !filters.selectedTopics.includes(topic.ID)
    ).slice(0, 5); // Limitar a 5 sugestões
  };

  const getSelectedTopics = () => {
    return availableTopics.filter(topic => 
      filters.selectedTopics.includes(topic.ID)
    );
  };

  const handleNoteSearch = (value) => {
    handleFilterChange('searchText', value);
    setShowNoteSuggestions(value.length > 0);
  };

  const selectNote = (note) => {
    onSelectNote(note);
    handleFilterChange('searchText', '');
    setShowNoteSuggestions(false);
  };

  const getFilteredNotes = () => {
    if (!filters.searchText || filters.searchText.length < 2) return [];
    return notes.filter(note => 
      note.titulo.toLowerCase().includes(filters.searchText.toLowerCase())
    ).slice(0, 5); // Limitar a 5 sugestões
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return t('dates.today');
    if (diffDays === 2) return t('dates.yesterday');
    if (diffDays <= 7) return `${diffDays} ${t('dates.daysAgo')}`;
    return date.toLocaleDateString();
  };

  const recentNotes = notes.slice(0, 5);

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header da Sidebar */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 space-y-2">
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Ocean Notes</h2>
        
        {/* Header com botões */}
        <button
          onClick={onCreateNote}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2.5 px-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t('notes.newNote')}</span>
        </button>
        
        <button
          onClick={onShowGraph}
          className={`w-full rounded-lg py-2.5 px-3 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
            showingGraph 
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' 
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{t('graph.title')}</span>
        </button>
      </div>

      {/* Conteúdo principal scrollável */}
      <div className="flex-1 overflow-y-auto">
        {/* Filtros */}
        <div className="px-4 py-3 border-b border-gray-700">
          <button
          onClick={() => toggleSection('filters')}
          className="w-full flex items-center justify-between p-2 text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
            </svg>
            <span>{t('filters.title')}</span>
            {(filters.searchText || filters.selectedTopics.length > 0 || filters.dateFilter !== 'all' || filters.customDateStart || filters.customDateEnd) && (
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            )}
          </div>
          <svg 
            className={`w-4 h-4 transition-transform ${expandedSections.filters ? 'rotate-90' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        {expandedSections.filters && (
          <div className="mt-3 space-y-3 max-h-80 overflow-y-auto">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder={t('notes.searchNotes')}
                value={filters.searchText}
                onChange={(e) => handleNoteSearch(e.target.value)}
                onFocus={() => setShowNoteSuggestions(filters.searchText.length > 1)}
                onBlur={() => setTimeout(() => setShowNoteSuggestions(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && getFilteredNotes().length > 0) {
                    selectNote(getFilteredNotes()[0]);
                  }
                  if (e.key === 'Escape') {
                    handleFilterChange('searchText', '');
                    setShowNoteSuggestions(false);
                  }
                }}
                className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />

              {/* Note Suggestions Dropdown */}
              {showNoteSuggestions && getFilteredNotes().length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {getFilteredNotes().map((note) => (
                    <button
                      key={note.id || note.ID}
                      onClick={() => selectNote(note)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{note.titulo}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {formatDate(note.dataAtualizacao)}
                          </div>
                          {/* Tags da nota */}
                          {note.topicos && note.topicos.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {note.topicos.slice(0, 3).map((topico) => (
                                <span
                                  key={topico.ID}
                                  className="inline-block px-1.5 py-0.5 text-xs rounded"
                                  style={{ backgroundColor: `${topico.cor}20`, color: topico.cor }}
                                >
                                  {topico.nome}
                                </span>
                              ))}
                              {note.topicos.length > 3 && (
                                <span className="text-xs text-gray-500">+{note.topicos.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-gray-500 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Topic Filters */}
            {availableTopics.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-2">Tags</div>
                
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
                    placeholder="Search tags..."
                    value={tagSearch}
                    onChange={(e) => handleTagSearch(e.target.value)}
                    onFocus={() => setShowTagSuggestions(tagSearch.length > 0)}
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
                  {showTagSuggestions && getFilteredTopics().length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      {getFilteredTopics().map((topic) => (
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
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Date Filter */}
            <div>
              <div className="text-xs text-gray-400 mb-2">{t('filters.date')}</div>
              <select
                value={filters.dateFilter}
                onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="all">{t('dates.allTime')}</option>
                <option value="today">{t('dates.today')}</option>
                <option value="week">{t('dates.thisWeek')}</option>
                <option value="month">{t('dates.thisMonth')}</option>
                <option value="custom">{t('dates.customPeriod')}</option>
              </select>
              
              {/* Campos de período personalizado - Layout compacto */}
              {filters.dateFilter === 'custom' && (
                <div className="mt-2 p-2 bg-gray-800/30 border border-gray-600/50 rounded">
                  {/* Campos de data compactos */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">De:</label>
                      <input
                        type="date"
                        value={filters.customDateStart}
                        onChange={(e) => handleFilterChange('customDateStart', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Até:</label>
                      <input
                        type="date"
                        value={filters.customDateEnd}
                        onChange={(e) => handleFilterChange('customDateEnd', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {(filters.searchText || filters.selectedTopics.length > 0 || filters.dateFilter !== 'all' || filters.customDateStart || filters.customDateEnd) && (
              <button
                onClick={clearFilters}
                className="w-full text-xs text-gray-400 hover:text-gray-200 py-1.5 border border-gray-600 rounded hover:border-gray-500 transition-colors"
              >
                {t('filters.clearFilters')}
              </button>
            )}
          </div>
        )}
        </div>

        {/* Seção Recentes */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('recent')}
            className="w-full flex items-center justify-between p-2 text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span>{t('sidebar.recent')}</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.recent ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.recent && (
            <div className="ml-2 mt-1 space-y-1">
              {recentNotes.map((note) => (
                <button
                  key={note.id || note.ID}
                  onClick={() => onSelectNote(note)}
                  className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                    selectedNoteId === (note.id || note.ID)
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  <div className="truncate font-medium">{note.titulo}</div>
                  <div className="text-xs opacity-60 mt-0.5">
                    {formatDate(note.dataAtualizacao)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Seção Todas as Notas */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('notes')}
            className="w-full flex items-center justify-between p-2 text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span>{t('sidebar.allNotes')} ({notes.length})</span>
            <svg 
              className={`w-4 h-4 transition-transform ${expandedSections.notes ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.notes && (
            <div className="ml-2 mt-1 space-y-1 max-h-96 overflow-y-auto">
              {notes.map((note) => (
                <button
                  key={note.id || note.ID}
                  onClick={() => onSelectNote(note)}
                  className={`w-full text-left p-2 rounded-lg text-sm transition-colors group ${
                    selectedNoteId === (note.id || note.ID)
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{note.titulo}</div>
                      <div className="text-xs opacity-60 mt-0.5">
                        {formatDate(note.dataAtualizacao)}
                      </div>
                      {/* Tags */}
                      {note.topicos && note.topicos.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {note.topicos.slice(0, 2).map((topico) => (
                            <span
                              key={topico.ID}
                              className="inline-block px-1.5 py-0.5 text-xs rounded"
                              style={{ backgroundColor: `${topico.cor}20`, color: topico.cor }}
                            >
                              {topico.nome}
                            </span>
                          ))}
                          {note.topicos.length > 2 && (
                            <span className="text-xs opacity-50">+{note.topicos.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logout - Footer fixo */}
      <div className="flex-shrink-0 p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default ObsidianSidebar;
