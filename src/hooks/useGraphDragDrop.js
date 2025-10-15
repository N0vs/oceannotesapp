import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook especializado para funcionalidade de drag and drop no grafo
 * Gerencia estado e operações de arrastar nós do grafo
 * 
 * @hook useGraphDragDrop
 * @param {Object} nodePositions - Posições atuais dos nós
 * @param {Function} setNodePositions - Função para atualizar posições
 * @returns {Object} Objeto contendo estados e handlers de drag
 * @returns {boolean} returns.isDragging - Indica se está arrastando
 * @returns {Object|null} returns.draggedNode - Nó sendo arrastado
 * @returns {Object} returns.dragOffset - Offset do mouse relativo ao nó
 * @returns {Function} returns.handleMouseDown - Handler para início do drag
 * @returns {Function} returns.handleMouseMove - Handler para movimento do drag
 * @returns {Function} returns.handleMouseUp - Handler para fim do drag
 * @description Hook otimizado para interações de drag and drop em grafos
 */
export const useGraphDragDrop = (nodePositions, setNodePositions) => {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Inicializar posições dos nós em círculo
  const initializeNodePositions = useCallback((notes, svgWidth = 800, svgHeight = 600) => {
    if (notes.length > 0 && Object.keys(nodePositions).length === 0) {
      const positions = {};
      const centerX = svgWidth / 2;
      const centerY = svgHeight / 2;
      const radius = Math.min(svgWidth, svgHeight) / 3;

      notes.forEach((note, index) => {
        const angle = (2 * Math.PI * index) / notes.length;
        positions[note.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      });

      setNodePositions(positions);
    }
  }, [nodePositions, setNodePositions]);

  const handleMouseDown = (e, noteId) => {
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const nodePos = nodePositions[noteId];
    
    setDragging(noteId);
    setDragOffset({
      x: mouseX - nodePos.x,
      y: mouseY - nodePos.y
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setNodePositions(prev => ({
      ...prev,
      [dragging]: {
        x: mouseX - dragOffset.x,
        y: mouseY - dragOffset.y
      }
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Event listeners para drag
  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, dragOffset]);

  return {
    svgRef,
    nodePositions,
    dragging,
    handleMouseDown,
    initializeNodePositions
  };
};
