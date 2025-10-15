import { useMemo } from 'react';

/**
 * Hook especializado para calcular conexões entre notas no grafo
 * Gera links baseados em tags compartilhadas entre notas
 * 
 * @hook useGraphConnections
 * @param {Array} notes - Array de notas para calcular conexões
 * @returns {Object} Objeto contendo nós e links do grafo
 * @returns {Array} returns.nodes - Nós processados para o grafo
 * @returns {Array} returns.links - Links entre nós baseados em tags
 * @description Hook otimizado para cálculo de conexões de grafo com useMemo
 */
export const useGraphConnections = (notes) => {
  
  // Estratégia para encontrar conexões baseadas em tópicos compartilhados
  const findTopicBasedConnections = (notes) => {
    const connections = [];
    
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const note1 = notes[i];
        const note2 = notes[j];
        
        // Encontrar tópicos em comum
        const sharedTopics = note1.topicos?.filter(topic1 =>
          note2.topicos?.some(topic2 => 
            (topic1.ID || topic1.id) === (topic2.ID || topic2.id)
          )
        ) || [];

        // Criar conexão para cada tópico compartilhado
        sharedTopics.forEach(topic => {
          connections.push({
            from: note1.id,
            to: note2.id,
            topic: topic,
            color: topic.cor || '#3B82F6',
            type: 'topic-based'
          });
        });
      }
    }

    return connections;
  };

  // Memoizar cálculo de conexões para performance
  const connections = useMemo(() => {
    return findTopicBasedConnections(notes);
  }, [notes]);

  // Filtrar conexões para notas visíveis
  const getVisibleConnections = (visibleNotes) => {
    const visibleNoteIds = new Set(visibleNotes.map(note => note.id));
    
    return connections.filter(connection => 
      visibleNoteIds.has(connection.from) && visibleNoteIds.has(connection.to)
    );
  };

  // Obter estatísticas das conexões
  const getConnectionStats = (visibleConnections) => {
    const uniqueTopics = new Set(visibleConnections.map(conn => conn.topic.ID || conn.topic.id));
    
    return {
      totalConnections: visibleConnections.length,
      uniqueTopics: uniqueTopics.size,
      connectionsByTopic: Array.from(uniqueTopics).map(topicId => {
        const topicConnections = visibleConnections.filter(conn => 
          (conn.topic.ID || conn.topic.id) === topicId
        );
        return {
          topicId,
          count: topicConnections.length,
          topic: topicConnections[0]?.topic
        };
      })
    };
  };

  return {
    connections,
    getVisibleConnections,
    getConnectionStats
  };
};
