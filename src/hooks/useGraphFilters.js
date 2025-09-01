import { useState, useMemo } from 'react';

/**
 * Hook personalizado para gerenciar filtros do grafo
 * Segue o Single Responsibility Principle - responsável apenas por lógica de filtros
 * Segue o Open/Closed Principle - extensível para novos tipos de filtro
 */
export const useGraphFilters = (notes) => {
  const [selectedTopicsFilter, setSelectedTopicsFilter] = useState([]);
  const [filterMode, setFilterMode] = useState('none'); // 'none', 'all', 'any'

  // Strategy Pattern para diferentes tipos de filtro
  const filterStrategies = {
    none: (notes) => notes.filter(note => !note.topicos || note.topicos.length === 0),
    
    all: (notes, selectedTopics) => {
      if (!selectedTopics.length) return notes;
      return notes.filter(note => {
        const noteTopicIds = note.topicos?.map(t => t.ID || t.id) || [];
        return noteTopicIds.length === selectedTopics.length &&
               selectedTopics.every(filterId => noteTopicIds.includes(filterId));
      });
    },
    
    any: (notes, selectedTopics) => {
      if (!selectedTopics.length) return notes;
      return notes.filter(note => {
        return selectedTopics.some(filterId => 
          note.topicos?.some(topic => (topic.ID || topic.id) === filterId)
        );
      });
    }
  };

  // Aplicar filtro usando strategy pattern
  const filteredNotes = useMemo(() => {
    const strategy = filterStrategies[filterMode];
    if (!strategy) return notes;
    
    return strategy(notes, selectedTopicsFilter);
  }, [notes, filterMode, selectedTopicsFilter]);

  const handleTopicFilterToggle = (topicId) => {
    setSelectedTopicsFilter(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId);
      } else {
        return [...prev, topicId];
      }
    });
  };

  const clearTopicFilter = () => {
    setSelectedTopicsFilter([]);
    setFilterMode('none');
  };

  const setFilterModeWithValidation = (mode) => {
    const validModes = ['none', 'all', 'any'];
    if (validModes.includes(mode)) {
      setFilterMode(mode);
    }
  };

  return {
    selectedTopicsFilter,
    filterMode,
    filteredNotes,
    handleTopicFilterToggle,
    clearTopicFilter,
    setFilterMode: setFilterModeWithValidation
  };
};
