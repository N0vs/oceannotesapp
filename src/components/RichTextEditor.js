'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';

// Importar Quill dinamicamente para evitar problemas de SSR
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill');
    // Importar CSS e configurar highlight.js
    await import('react-quill/dist/quill.snow.css');
    await import('highlight.js/styles/github.css');
    
    // Configurar highlight.js
    const hljs = await import('highlight.js');
    window.hljs = hljs.default;
    
    return RQ;
  },
  { 
    ssr: false,
    loading: () => <div className="w-full h-48 bg-gray-100 animate-pulse rounded"></div>
  }
);

const RichTextEditor = ({ value, onChange, notaId = null, placeholder = "Escreva o conteúdo da sua nota..." }) => {
  const [editorValue, setEditorValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const quillRef = useRef(null);
  const currentContentRef = useRef('');

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const safeValue = value || '';
      setEditorValue(safeValue);
      currentContentRef.current = safeValue;
    }
  }, [value, isMounted]);



  // Handler de imagem separado para ter acesso às refs
  const handleImageUpload = async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem é muito grande. Máximo 10MB.');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (notaId) formData.append('notaId', notaId);

      const token = Cookies.get('token');
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        // Usar o conteúdo mais atual da ref
        const currentContent = currentContentRef.current || '';
        
        // HTML da imagem
        const imageHtml = `<p><img src="${result.media.url}" style="max-width: 100%; height: auto;" /></p>`;
        
        // Inserir no final do conteúdo atual
        const newContent = currentContent + imageHtml;
        
        // Atualizar tanto o estado quanto a ref
        setEditorValue(newContent);
        currentContentRef.current = newContent;
        
        // Notificar o componente pai sobre a mudança
        if (onChange) {
          onChange(newContent);
        }
      } else {
        throw new Error(result.error || 'Erro no upload da imagem');
      }
      
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload da imagem: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Configurações do Quill com syntax highlighting
  const modules = useMemo(() => ({
    syntax: {
      highlight: (text) => {
        if (window.hljs) {
          return window.hljs.highlightAuto(text).value;
        }
        return text;
      }
    },
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['code-block'],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: () => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();
          
          input.onchange = async () => {
            const file = input.files[0];
            if (file) {
              await handleImageUpload(file);
            }
          };
        }
      }
    }
  }), []);

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'color', 'background', 'align',
    'link', 'image', 'code', 'code-block'
  ];

  const handleChange = (content) => {
    if (isMounted) {
      setEditorValue(content);
      currentContentRef.current = content;
      if (onChange) {
        onChange(content);
      }
    }
  };

  // Não renderizar até estar montado
  if (!isMounted) {
    return <div className="w-full h-48 bg-gray-100 animate-pulse rounded"></div>;
  }

  return (
    <div className="rich-text-editor">
      {isUploading && (
        <div className="mb-2 text-blue-600 text-sm">
          📤 Carregando imagem...
        </div>
      )}
      
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={editorValue}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
