'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import RichTextEditor from './RichTextEditor';
import Cookies from 'js-cookie';

/**
 * Componente principal para edição e visualização de notas
 * Gerencia título, conteúdo, tags, permissões e ações de uma nota
 * 
 * @component
 * @param {Object} props - Propriedades do componente
 * @param {Object|null} props.note - Objeto da nota a ser editada, null para modo vazio
 * @param {Function} props.onSave - Callback para salvar nota, recebe objeto com titulo, conteudo, topicos
 * @param {Function} props.onClose - Callback para fechar editor
 * @param {boolean} props.isCreating - Indica se está no modo de criação de nova nota
 * @param {Array} props.availableTopics - Array de tags disponíveis para seleção
 * @param {Function} props.onCreateTopic - Callback para criar nova tag, recebe objeto com nome e cor
 * @param {Function} props.onShare - Callback para compartilhar nota
 * @param {Function} props.onDelete - Callback para deletar nota
 * @returns {JSX.Element} Elemento JSX do editor de notas
 * @description Editor completo com funcionalidades de texto rico, gestão de tags, controle de permissões
 */
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
  
  // Estados principais da nota
  const [title, setTitle] = useState(''); // Título da nota
  const [content, setContent] = useState(''); // Conteúdo HTML da nota
  const [selectedTopics, setSelectedTopics] = useState([]); // Tags selecionadas para a nota
  const [availableTopicsState, setAvailableTopicsState] = useState([]); // Cache local de tags disponíveis
  
  // Estados de interface - Dropdown de tags
  const [showTopicDropdown, setShowTopicDropdown] = useState(false); // Controla exibição do dropdown de tags
  
  // Estados de criação de nova tag
  const [newTagName, setNewTagName] = useState(''); // Nome da nova tag sendo criada
  const [newTagColor, setNewTagColor] = useState('#3B82F6'); // Cor da nova tag sendo criada
  const [newTagNameError, setNewTagNameError] = useState(''); // Erro de validação para nome da nova tag
  
  // Estados de edição de tag existente
  const [showEditTagModal, setShowEditTagModal] = useState(false); // Controla exibição do modal de edição
  const [editingTag, setEditingTag] = useState(null); // Tag sendo editada atualmente
  const [editTagName, setEditTagName] = useState(''); // Nome temporário da tag em edição
  const [editTagColor, setEditTagColor] = useState('#3B82F6'); // Cor temporária da tag em edição
  const [editTagNameError, setEditTagNameError] = useState(''); // Erro de validação para edição da tag
  
  // Estados de controle de ações
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Modal de confirmação de exclusão
  const [isSaving, setIsSaving] = useState(false); // Indicador de salvamento em progresso
  const [currentUserPermission, setCurrentUserPermission] = useState(null); // Permissão do usuário na nota (owner, admin, editor, viewer)
  
  // Referência para comparação de mudanças
  const initialNote = useRef(null); // Referência da nota inicial para detectar mudanças

  /**
   * Carrega a permissão do usuário atual para a nota específica
   * Faz uma requisição à API para verificar se o usuário é proprietário ou tem outro nível de acesso
   * @async
   * @function loadUserPermission
   * @returns {Promise<void>} Não retorna valor, atualiza o estado currentUserPermission
   * @description Busca na API os usuários compartilhados da nota e determina o nível de permissão do usuário logado
   */
  const loadUserPermission = async () => {
    if (!note?.id && !note?.ID) return;
    
    try {
      const token = Cookies.get('token');
      const noteId = note.id || note.ID;
      
      const response = await fetch(`/api/notas/${noteId}/shared-users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const currentUser = data.find(user => user.isCurrentUser);
        setCurrentUserPermission(currentUser ? currentUser.TipoPermissao : 'owner');
      }
    } catch (error) {
      console.error('Erro ao carregar permissão do usuário:', error);
      // Assumir que é proprietário se der erro
      setCurrentUserPermission('owner');
    }
  };

  // Efeito para sincronização dos dados da nota com o estado local
  // Executa quando 'note' ou 'isCreating' mudam
  useEffect(() => {
    if (note) {
      // Bloco de carregamento de nota existente
      // Atualiza todos os estados locais com os dados da nota recebida
      console.log('Atualizando editor com nota:', note);
      console.log('Tags da nota:', note.topicos);
      
      setTitle(note.titulo || ''); // Define título ou string vazia como fallback
      setContent(note.conteudo || ''); // Define conteúdo ou string vazia como fallback
      setSelectedTopics(note.topicos || []); // Define tags ou array vazio como fallback
      initialNote.current = note; // Armazena referência para detectar mudanças futuras
      
      // Carrega permissões do usuário para esta nota específica
      loadUserPermission();
      
      console.log('Estado do editor atualizado');
    } else if (isCreating) {
      // Bloco de limpeza para criação de nova nota
      // Reseta todos os campos para estado inicial limpo
      setTitle('');
      setContent('');
      setSelectedTopics([]);
      initialNote.current = null; // Limpa referência pois não há nota inicial
    }
  }, [note, isCreating]);

  // Removido auto-save das tags - agora só salva quando clicar no botão Save

  /**
   * Salva a nota atual com título, conteúdo e tags selecionadas
   * Valida se o título não está vazio e atualiza referência inicial após salvar
   * @async
   * @function handleSave
   * @returns {Promise<void>} Não retorna valor, chama onSave e atualiza initialNote
   * @description Função principal para salvar nota, chamada pelo botão Save
   * @requires title - Estado do título da nota (obrigatório)
   * @requires content - Estado do conteúdo da nota
   * @requires selectedTopics - Array de tags selecionadas
   * @requires onSave - Callback prop para salvar na API
   */
  const handleSave = async () => {
    // Validação obrigatória: nota deve ter título
    if (!title.trim()) return;
    
    setIsSaving(true); // Ativa indicador de carregamento
    try {
      // Chama callback de salvamento com dados formatados para API
      await onSave({
        titulo: title,
        conteudo: content,
        topicos: selectedTopics.map(t => t.ID) // Converte objetos de tag para array de IDs
      });
      
      // Atualiza referência local após salvamento bem-sucedido
      // Isso previne detecção de mudanças falsas em futuras verificações
      if (initialNote.current) {
        initialNote.current = {
          ...initialNote.current,
          titulo: title,
          conteudo: content,
          topicos: selectedTopics
        };
      }
    } finally {
      setIsSaving(false); // Sempre desativa indicador, mesmo em caso de erro
    }
  };

  /**
   * Alterna a seleção de uma tag na nota
   * Remove a tag se já estiver selecionada, adiciona se não estiver
   * @function toggleTopic
   * @param {Object} topic - Objeto da tag contendo ID, nome e cor
   * @param {number} topic.ID - Identificador único da tag
   * @param {string} topic.nome - Nome da tag
   * @param {string} topic.cor - Cor da tag em formato hexadecimal
   * @returns {void} Não retorna valor, atualiza o estado selectedTopics
   * @description Utilizada para adicionar ou remover tags da nota atual
   */
  const toggleTopic = (topic) => {
    setSelectedTopics(prev => {
      // Verifica se a tag já está selecionada
      const exists = prev.find(t => t.ID === topic.ID);
      if (exists) {
        // Remove tag: filtra array removendo tag com mesmo ID
        return prev.filter(t => t.ID !== topic.ID);
      } else {
        // Adiciona tag: cria novo array com tag adicionada ao final
        return [...prev, topic];
      }
    });
  };

  /**
   * Cria uma nova tag e adiciona à nota atual
   * Valida se o nome não é duplicado antes de criar
   * @async
   * @function handleCreateNewTag
   * @returns {Promise<void>} Não retorna valor, atualiza selectedTopics e limpa o formulário
   * @description Utiliza a API para criar uma nova tag ou fallback local, validando duplicatas
   * @requires newTagName - Estado contendo o nome da nova tag
   * @requires newTagColor - Estado contendo a cor da nova tag
   * @requires onCreateTopic - Função callback para criação via API
   */
  const handleCreateNewTag = async () => {
    // Validação inicial: nome deve estar preenchido
    if (!newTagName.trim()) return;
    
    // Validação de duplicatas: previne criação de tags com nomes iguais
    if (isTagNameDuplicate(newTagName)) {
      alert('Já existe uma tag com este nome. Escolha outro nome.');
      return;
    }
    
    try {
      if (onCreateTopic) {
        // Fluxo principal: criação via API
        // Chama callback do componente pai que faz requisição à API
        const newTag = await onCreateTopic({
          nome: newTagName.trim(),
          cor: newTagColor
        });
        
        if (newTag) {
          // Adiciona tag retornada pela API aos tópicos selecionados
          setSelectedTopics(prev => [...prev, newTag]);
        }
      } else {
        // Fluxo alternativo: criação local para desenvolvimento/testes
        // Cria objeto de tag local com ID baseado em timestamp
        const newTag = {
          ID: Date.now(), // ID temporário para ambiente de desenvolvimento
          nome: newTagName.trim(),
          cor: newTagColor
        };
        setSelectedTopics(prev => [...prev, newTag]);
      }
      
      // Limpeza do formulário após criação bem-sucedida
      // Reseta todos os campos para estado inicial
      setNewTagName('');
      setNewTagColor('#8b5cf6');
      setNewTagNameError('');
      setShowTopicDropdown(false); // Fecha dropdown após criação
      
    } catch (error) {
      console.error('Erro ao criar nova tag:', error);
      // Erro é logado mas não interrompe a interface
    }
  };

  /**
   * Gerencia o clique no botão de deletar baseado nas permissões do usuário
   * Proprietários podem deletar, outros usuários recebem mensagem informativa
   * @function handleDeleteClick
   * @returns {void} Não retorna valor, abre modal de confirmação ou mostra alerta
   * @description Controla acesso à funcionalidade de delete baseado em currentUserPermission
   */
  const handleDeleteClick = () => {
    if (currentUserPermission === 'owner') {
      // Proprietário pode excluir
      setShowDeleteConfirm(true);
    } else {
      // Outros usuários recebem mensagem informativa
      alert(t('notes.onlyOwnerCanDelete'));
    }
  };

  /**
   * Confirma e executa a exclusão da nota apenas para proprietários
   * Verifica permissões novamente antes de executar a exclusão
   * @async
   * @function handleDeleteConfirm
   * @returns {Promise<void>} Não retorna valor, chama onDelete e fecha modal
   * @description Chamada pelo botão confirmar no modal de exclusão, dupla verificação de permissões
   * @requires currentUserPermission - Deve ser 'owner' para permitir exclusão
   * @requires onDelete - Callback prop para executar exclusão
   */
  const handleDeleteConfirm = async () => {
    if (!note) return;
    
    // Só permite exclusão se for proprietário
    if (currentUserPermission === 'owner' && onDelete) {
      onDelete(note);
    }
    
    setShowDeleteConfirm(false);
  };

  /**
   * Abre o modal de edição de tag com os dados preenchidos
   * Inicializa os estados do modal com os valores atuais da tag
   * @function handleEditTag
   * @param {Object} tag - Objeto da tag a ser editada
   * @param {number} tag.ID - Identificador único da tag
   * @param {string} tag.nome - Nome atual da tag
   * @param {string} tag.cor - Cor atual da tag
   * @returns {void} Não retorna valor, atualiza estados do modal de edição
   * @description Prepara o modal de edição com os dados da tag selecionada
   */
  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setEditTagName(tag.nome);
    setEditTagColor(tag.cor);
    setShowEditTagModal(true);
  };

  /**
   * Verifica se o nome de uma tag já existe no sistema
   * Compara nomes de forma case-insensitive para evitar duplicatas
   * @function isTagNameDuplicate
   * @param {string} name - Nome da tag a ser verificado
   * @param {number|null} excludeId - ID da tag a ser excluída da verificação (útil para edição)
   * @returns {boolean} True se o nome já existe, false caso contrário
   * @description Utilizada para validação de duplicatas na criação e edição de tags
   */
  const isTagNameDuplicate = (name, excludeId = null) => {
    const trimmedName = name.trim().toLowerCase();
    return availableTopics.some(tag => 
      tag.nome.toLowerCase() === trimmedName && tag.ID !== excludeId
    );
  };

  /**
   * Valida e atualiza o nome da nova tag em tempo real
   * Verifica duplicatas e define mensagens de erro apropriadas
   * @function handleNewTagNameChange
   * @param {string} value - Novo valor do input do nome da tag
   * @returns {void} Não retorna valor, atualiza newTagName e newTagNameError
   * @description Chamada no onChange do input de criação de tag para validação em tempo real
   */
  const handleNewTagNameChange = (value) => {
    setNewTagName(value);
    if (value.trim() && isTagNameDuplicate(value)) {
      setNewTagNameError('Já existe uma tag com este nome');
    } else {
      setNewTagNameError('');
    }
  };

  /**
   * Valida e atualiza o nome da tag em edição em tempo real
   * Verifica duplicatas excluindo a própria tag da verificação
   * @function handleEditTagNameChange
   * @param {string} value - Novo valor do input do nome da tag em edição
   * @returns {void} Não retorna valor, atualiza editTagName e editTagNameError
   * @description Chamada no onChange do input de edição de tag, exclui a própria tag da validação
   */
  const handleEditTagNameChange = (value) => {
    setEditTagName(value);
    if (value.trim() && isTagNameDuplicate(value, editingTag?.ID)) {
      setEditTagNameError('Já existe uma tag com este nome');
    } else {
      setEditTagNameError('');
    }
  };

  /**
   * Salva as alterações de uma tag editada na API e atualiza os estados locais
   * Valida duplicatas antes de enviar e atualiza todas as referências da tag
   * @async
   * @function handleSaveTagEdit
   * @returns {Promise<void>} Não retorna valor, atualiza selectedTopics e fecha modal
   * @description Faz PUT na API de tópicos, atualiza estados locais e fecha modal de edição
   * @requires editingTag - Estado da tag sendo editada
   * @requires editTagName - Nome atualizado da tag
   * @requires editTagColor - Cor atualizada da tag
   */
  const handleSaveTagEdit = async () => {
    // Validações pré-requisito: tag deve estar selecionada e nome preenchido
    if (!editingTag || !editTagName.trim()) return;
    
    // Validação de duplicatas: exclui a própria tag da verificação
    if (isTagNameDuplicate(editTagName, editingTag.ID)) {
      alert('Já existe uma tag com este nome. Escolha outro nome.');
      return;
    }

    try {
      // Preparação da requisição: obtém token de autenticação
      const token = Cookies.get('token');
      
      // Requisição PUT para API de tópicos
      // Envia dados atualizados da tag para o servidor
      const response = await fetch(`/api/topicos/${editingTag.ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: editTagName.trim(),
          cor: editTagColor
        })
      });

      if (response.ok) {
        // Criação do objeto tag atualizado
        const updatedTag = { ...editingTag, nome: editTagName.trim(), cor: editTagColor };
        
        // Atualização em estados locais: sincroniza dados locais com servidor
        // Atualiza tags da nota atual
        setSelectedTopics(prev => 
          prev.map(t => t.ID === editingTag.ID ? updatedTag : t)
        );
        
        // Atualiza cache de tags disponíveis se existir
        setAvailableTopicsState(prev => 
          prev.map(t => t.ID === editingTag.ID ? updatedTag : t)
        );

        // Limpeza e fechamento do modal: reseta todos os estados de edição
        setShowEditTagModal(false);
        setEditingTag(null);
        setEditTagName('');
        setEditTagColor('#3B82F6');
        setEditTagNameError('');
      } else {
        // Tratamento de erro da API: informa usuário sobre falha no servidor
        alert('Erro ao salvar alterações da tag');
      }
    } catch (error) {
      // Tratamento de erro de rede/sistema: loga erro e informa usuário
      console.error('Erro ao editar tag:', error);
      alert('Erro ao salvar alterações da tag');
    }
  };

  /**
   * Formata uma string de data para exibição local
   * Converte para formato de data e hora local do usuário
   * @function formatDate
   * @param {string} dateString - String de data no formato ISO ou padrão JavaScript
   * @returns {string} Data formatada em string local ou string vazia se inválida
   * @description Utilitário para formatar datas de criação e modificação de notas
   */
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

            {/* Botão de Deletar - Apenas proprietário pode excluir */}
            {!isCreating && note && (
              <button
                onClick={handleDeleteClick}
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
            <div
              key={topic.ID}
              className="relative group inline-flex items-center"
            >
              <span
                className="inline-flex items-center px-2 py-1 text-xs rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: `${topic.cor}20`, color: topic.cor, border: `1px solid ${topic.cor}40` }}
                onClick={() => toggleTopic(topic)}
              >
                {topic.nome}
                <svg className="w-3 h-3 ml-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              
              {/* Botão de editar - aparece no hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditTag(topic);
                }}
                className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full p-1 transition-all duration-200 transform scale-90 hover:scale-100"
                title="Editar tag"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
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
                  <div className="mb-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => handleNewTagNameChange(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !newTagNameError && handleCreateNewTag()}
                        placeholder={t('placeholders.tagNamePlaceholder')}
                        className={`flex-1 bg-gray-700 border text-gray-200 text-xs px-2 py-1 rounded focus:outline-none transition-colors ${
                          newTagNameError 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-600 focus:border-purple-500'
                        }`}
                      />
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-6 h-6 rounded border border-gray-600 cursor-pointer bg-gray-700"
                        title={t('tooltips.chooseColor')}
                      />
                    </div>
                    {newTagNameError && (
                      <p className="text-red-400 text-xs mt-1">{newTagNameError}</p>
                    )}
                  </div>
                  <button
                    onClick={handleCreateNewTag}
                    disabled={!newTagName.trim() || newTagNameError}
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

      {/* Modal de edição de tag */}
      {showEditTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">
                  {t('tags.editTag')}
                </h3>
                <p className="text-sm text-gray-400">
                  {t('tags.editTagDescription')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Nome da tag */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('tags.tagName')}
                </label>
                <input
                  type="text"
                  value={editTagName}
                  onChange={(e) => handleEditTagNameChange(e.target.value)}
                  className={`w-full bg-gray-700 border text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 transition-colors ${
                    editTagNameError 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:border-purple-500 focus:ring-purple-500'
                  }`}
                  placeholder={t('tags.tagNamePlaceholder')}
                />
                {editTagNameError && (
                  <p className="text-red-400 text-xs mt-1">{editTagNameError}</p>
                )}
              </div>

              {/* Cor da tag */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('tags.tagColor')}
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={editTagColor}
                    onChange={(e) => setEditTagColor(e.target.value)}
                    className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editTagColor}
                    onChange={(e) => setEditTagColor(e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* Preview da tag */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('tags.preview')}
                </label>
                <span
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-full"
                  style={{ 
                    backgroundColor: `${editTagColor}20`, 
                    color: editTagColor, 
                    border: `1px solid ${editTagColor}40` 
                  }}
                >
                  {editTagName || t('tags.tagPreviewDefault')}
                </span>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditTagModal(false);
                  setEditingTag(null);
                  setEditTagName('');
                  setEditTagColor('#3B82F6');
                  setEditTagNameError('');
                }}
                className="flex-1 bg-gray-700 text-gray-200 py-2.5 px-4 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveTagEdit}
                disabled={!editTagName.trim() || editTagNameError}
                className="flex-1 bg-purple-600 text-white py-2.5 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t('common.save')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                <h3 className="text-lg font-semibold text-gray-100">
                  {t('notes.deleteNote')}
                </h3>
                <p className="text-sm text-gray-400">
                  {t('notes.confirmDelete')}
                </p>
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
