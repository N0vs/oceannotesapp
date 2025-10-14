'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import RichTextEditor from './RichTextEditor';

const ObsidianEditor = ({ 
  note, 
  onSave, 
  onClose, 
  isCreating = false, 
  availableTopics = [],
  onCreateTopic,
  onShare,
  onDelete
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#8b5cf6');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const initialNote = useRef(null);

  useEffect(() => {
    if (note && !isSaving) {
      console.log('Atualizando editor com nota:', note);
      console.log('Tags da nota:', note.topicos);
      
      setTitle(note.titulo || '');
      setContent(note.conteudo || '');
      setSelectedTopics(note.topicos || []);
      initialNote.current = note;
      
      console.log('Estado do editor atualizado');
    } else if (isCreating) {
      setTitle('');
      setContent('');
      setSelectedTopics([]);
      initialNote.current = null;
    }
  }, [note, isCreating, isSaving]);

  // Removido auto-save das tags - agora só salva quando clicar no botão Save

  const handleSave = async () => {
    if (!title.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave({
        titulo: title,
        conteudo: content,
        topicos: selectedTopics.map(t => t.ID)
      });
      
      // Atualizar a referência inicial após o save bem-sucedido
      if (initialNote.current) {
        initialNote.current = {
          ...initialNote.current,
          titulo: title,
          conteudo: content,
          topicos: selectedTopics
        };
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTopic = (topic) => {
    setSelectedTopics(prev => {
      const exists = prev.find(t => t.ID === topic.ID);
      if (exists) {
        return prev.filter(t => t.ID !== topic.ID);
      } else {
        return [...prev, topic];
      }
    });
  };

  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      if (onCreateTopic) {
        // Usar a API real para criar o tópico
        const newTag = await onCreateTopic({
          nome: newTagName.trim(),
          cor: newTagColor
        });
        
        if (newTag) {
          // Adicionar aos tópicos selecionados
          setSelectedTopics(prev => [...prev, newTag]);
        }
      } else {
        // Fallback - criação local (para desenvolvimento)
        const newTag = {
          ID: Date.now(),
          nome: newTagName.trim(),
          cor: newTagColor
        };
        setSelectedTopics(prev => [...prev, newTag]);
      }
      
      // Limpar o formulário
      setNewTagName('');
      setNewTagColor('#8b5cf6');
      setShowTopicDropdown(false);
      
    } catch (error) {
      console.error('Erro ao criar nova tag:', error);
    }
  };

  const handleDeleteConfirm = () => {
    if (onDelete && note) {
      onDelete(note);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  if (!note && !isCreating) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 text-gray-400">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 opacity-40">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-lg mb-2">{t('messages.noNoteSelected')}</p>
          <p className="text-sm">{t('messages.selectNote')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header da Nota */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          {/* Breadcrumb / Path */}
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>Ocean Notes</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-200">{isCreating ? t('notes.newNote') : note.titulo}</span>
          </div>

          {/* Ações */}
          <div className="flex items-center space-x-2">
            {!isCreating && (
              <div className="text-xs text-gray-400 mr-4">
                {t('messages.modified')} {formatDate(note.dataAtualizacao)}
              </div>
            )}
            
            {/* Botão de Compartilhar */}
            {!isCreating && note && onShare && (
              <button
                onClick={() => onShare(note)}
                className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                title={t('tooltips.shareNote')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
            )}

            {/* Botão de Deletar */}
            {!isCreating && note && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                title={t('notes.deleteNote')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            
            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center space-x-1"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('common.saving')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>{t('common.save')}</span>
                </>
              )}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Título da Nota */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('notes.untitled')}
          className="w-full bg-transparent text-2xl font-bold text-gray-100 placeholder-gray-500 border-none outline-none resize-none"
        />

        {/* Tags/Tópicos */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {selectedTopics.map((topic) => (
            <span
              key={topic.ID}
              className="inline-flex items-center px-2 py-1 text-xs rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: `${topic.cor}20`, color: topic.cor, border: `1px solid ${topic.cor}40` }}
              onClick={() => toggleTopic(topic)}
            >
              {topic.nome}
              <svg className="w-3 h-3 ml-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          ))}
          
          <div className="relative">
            <button
              onClick={() => setShowTopicDropdown(!showTopicDropdown)}
              className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 border border-gray-600 rounded-full hover:border-gray-500 transition-colors"
            >
              + {t('tags.addTag')}
            </button>
            
            {showTopicDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-64">
                {/* Formulário para criar nova tag */}
                <div className="p-3 border-b border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">{t('tags.createTag')}</div>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateNewTag()}
                      placeholder={t('placeholders.tagNamePlaceholder')}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-6 h-6 rounded border border-gray-600 cursor-pointer bg-gray-700"
                      title={t('tooltips.chooseColor')}
                    />
                  </div>
                  <button
                    onClick={handleCreateNewTag}
                    disabled={!newTagName.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs py-1.5 rounded transition-colors"
                  >
                    {t('tags.createTag')}
                  </button>
                </div>

                {/* Lista de tags existentes */}
                <div className="p-2 max-h-48 overflow-y-auto">
                  {availableTopics.length > 0 ? (
                    <>
                      <div className="text-xs text-gray-400 mb-2 px-1">{t('tags.existingTags')}</div>
                      {availableTopics
                        .filter(topic => !selectedTopics.find(t => t.ID === topic.ID))
                        .map((topic) => (
                        <button
                          key={topic.ID}
                          onClick={() => {
                            toggleTopic(topic);
                            setShowTopicDropdown(false);
                          }}
                          className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center space-x-2"
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: topic.cor }}
                          ></div>
                          <span>{topic.nome}</span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 px-1">No existing tags</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor de Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <RichTextEditor
            value={content}
            onChange={setContent}
            notaId={note?.id || note?.ID}
            placeholder={t('placeholders.startWriting')}
          />
        </div>
      </div>

      {/* Modal de Confirmação de Deletar */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">{t('notes.deleteNote')}</h3>
                <p className="text-sm text-gray-400">{t('notes.confirmDelete')}</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium text-gray-200 truncate">{title || t('notes.untitled')}</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-3">
                {t('notes.confirmDeleteMessage')}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-700 text-gray-200 py-2.5 px-4 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{t('common.delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObsidianEditor;
