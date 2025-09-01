import { useState, useEffect, useRef } from 'react';

/**
 * Hook personalizado para gerenciar drag & drop dos nós do grafo
 * Segue o Single Responsibility Principle - responsável apenas por drag & drop
 */
export const useGraphDragDrop = (svgWidth, svgHeight) => {
  const svgRef = useRef(null);
  const [nodePositions, setNodePositions] = useState({});
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Inicializar posições dos nós em círculo
  const initializeNodePositions = (notes) => {
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
  };

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
