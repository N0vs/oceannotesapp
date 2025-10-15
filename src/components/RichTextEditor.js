'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Cookies from 'js-cookie';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Configuração de importação dinâmica do ReactQuill
 * Evita problemas de SSR (Server-Side Rendering) carregando Quill apenas no cliente
 * @constant ReactQuill - Componente Quill carregado dinamicamente
 * @description Carrega React Quill, CSS, highlight.js e configura syntax highlighting
 */
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

/**
 * Editor de texto rico com funcionalidades de upload de imagem e drag & drop
 * Baseado em Quill.js com suporte a syntax highlighting e inserção de mídia
 * 
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {string} props.value - Conteúdo HTML atual do editor
 * @param {Function} props.onChange - Callback chamado quando conteúdo muda
 * @param {string|null} props.notaId - ID da nota para associar uploads de imagem
 * @param {string} props.placeholder - Texto placeholder para o editor
 * @returns {JSX.Element} Elemento JSX do editor de texto rico
 * @description Editor completo com upload de imagens, drag & drop, syntax highlighting
 */
const RichTextEditor = ({ value, onChange, notaId = null, placeholder = "Escreva o conteúdo da sua nota..." }) => {
  const { t } = useTranslation();
  
  // Estados do editor
  const [editorValue, setEditorValue] = useState(''); // Conteúdo HTML atual do editor
  const [isUploading, setIsUploading] = useState(false); // Indicador de upload em progresso
  const [isDragging, setIsDragging] = useState(false); // Feedback visual para drag & drop
  const [isMounted, setIsMounted] = useState(false); // Controle de hidratação SSR
  
  // Referências para controle direto
  const quillRef = useRef(null); // Referência para instância do Quill
  const currentContentRef = useRef(''); // Cache do conteúdo para comparações

  // Efeito de montagem: controla hidratação para evitar erros de SSR
  // Componente só renderiza após montagem completa no cliente
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Efeito de sincronização: atualiza editor quando prop value muda
  // Garante que editor reflete mudanças externas no conteúdo
  useEffect(() => {
    if (isMounted) {
      const safeValue = value || ''; // Fallback para string vazia
      setEditorValue(safeValue);
      currentContentRef.current = safeValue; // Mantém cache sincronizado
    }
  }, [value, isMounted]);



  /**
   * Gerencia upload de imagens e inserção no editor
   * Valida tamanho, faz upload via API e insere na posição do cursor
   * @async
   * @function handleImageUpload
   * @param {File} file - Arquivo de imagem a ser enviado
   * @param {number|null} explicitPosition - Posição específica para inserção, null usa cursor atual
   * @returns {Promise<void>} Não retorna valor, atualiza conteúdo do editor
   * @description Faz upload para API de mídia e insere imagem no editor na posição correta
   */
  const handleImageUpload = async (file, explicitPosition = null) => {
    if (file.size > 10 * 1024 * 1024) {
      alert(t('editor.imageTooLarge'));
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
        const quill = quillRef.current?.getEditor();
        
        if (quill) {
          // Garantir que o editor tenha foco
          quill.focus();
          
          // Obter posição atual do cursor
          let position;
          
          if (explicitPosition !== null) {
            position = explicitPosition;
          } else {
            const selection = quill.getSelection(true);
            position = selection ? selection.index : quill.getLength();
          }
          
          // Verificar se a posição é válida
          const maxLength = quill.getLength();
          if (position > maxLength) {
            position = maxLength;
          }
          
          // Inserir imagem na posição do cursor
          quill.insertEmbed(position, 'image', result.media.url);
          
          // Mover cursor para após a imagem
          quill.setSelection(position + 1);
          
          // Atualizar conteúdo
          const newContent = quill.root.innerHTML;
          setEditorValue(newContent);
          currentContentRef.current = newContent;
          
          if (onChange) {
            onChange(newContent);
          }
          
        } else {
          // Fallback HTML se Quill não estiver disponível
          const currentContent = currentContentRef.current || '';
          const imageHtml = `<p><img src="${result.media.url}" style="max-width: 100%; height: auto;" /></p>`;
          const newContent = currentContent + imageHtml;
          
          setEditorValue(newContent);
          currentContentRef.current = newContent;
          
          if (onChange) {
            onChange(newContent);
          }
        }
      } else {
        throw new Error(result.error || 'Erro no upload da imagem');
      }
      
    } catch (error) {
      console.error('Erro no upload:', error);
      alert(t('editor.uploadError') + ': ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Gerencia entrada de drag sobre o editor
   * Ativa estado visual de drag quando arquivo entra na área do editor
   * @function handleDragEnter
   * @param {DragEvent} e - Evento de drag
   * @returns {void} Não retorna valor, atualiza estado isDragging
   * @description Previne comportamento padrão e ativa feedback visual de drag
   */
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /**
   * Gerencia saída de drag do editor
   * Desativa estado visual apenas quando realmente sai do componente
   * @function handleDragLeave
   * @param {DragEvent} e - Evento de drag
   * @returns {void} Não retorna valor, pode atualizar estado isDragging
   * @description Verifica se realmente saiu do componente antes de desativar feedback visual
   */
  const handleDragLeave = (e) => {
    e.preventDefault();
    // Só remover o estado de dragging se sair do componente principal
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  /**
   * Gerencia movimento de drag sobre o editor
   * Previne comportamento padrão do navegador para permitir drop
   * @function handleDragOver
   * @param {DragEvent} e - Evento de drag
   * @returns {void} Não retorna valor
   * @description Necessário para permitir que o drop funcione corretamente
   */
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  /**
   * Gerencia drop de arquivos no editor
   * Filtra apenas arquivos de imagem e chama função de upload
   * @async
   * @function handleDrop
   * @param {DragEvent} e - Evento de drop
   * @returns {Promise<void>} Não retorna valor, pode chamar handleImageUpload
   * @description Processa arquivos dropados, filtra imagens e inicia upload
   */
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      // Para drag & drop, inserir na posição atual do cursor
      await handleImageUpload(imageFiles[0]);
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

  /**
   * Gerencia mudanças no conteúdo do editor
   * Atualiza estados locais e chama callback de mudança
   * @function handleChange
   * @param {string} content - Novo conteúdo HTML do editor
   * @returns {void} Não retorna valor, atualiza estados e chama onChange
   * @description Sincroniza conteúdo local com componente pai quando editor muda
   */
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
    <div 
      className={`rich-text-editor relative ${isDragging ? 'border-2 border-dashed border-blue-500 bg-blue-50' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {/* Estilos inline para o Quill */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .rich-text-editor .ql-editor.ql-blank::before {
            color: #9ca3af !important;
            font-style: normal !important;
          }
          .rich-text-editor .ql-picker-options {
            background-color: #374151 !important;
            border: 1px solid #4b5563 !important;
          }
          .rich-text-editor .ql-picker-item {
            color: #e5e7eb !important;
          }
          .rich-text-editor .ql-picker-item:hover {
            background-color: #4b5563 !important;
            color: #ffffff !important;
          }
          .rich-text-editor .ql-picker-label {
            color: #e5e7eb !important;
          }
        `
      }} />
      
      {/* Overlay para drag & drop */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center z-10 rounded">
          <div className="bg-white bg-opacity-90 p-4 rounded-lg shadow-lg border-2 border-blue-500 border-dashed">
            <div className="text-blue-600 text-lg font-medium flex items-center">
              🖼️ {t('editor.dropImageHere')}
            </div>
          </div>
        </div>
      )}
      
      {isUploading && (
        <div className="mb-2 text-blue-600 text-sm flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          📤 {t('editor.uploadingImage')}
        </div>
      )}
      
      <div className="relative">
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
    </div>
  );
};

export default RichTextEditor;
