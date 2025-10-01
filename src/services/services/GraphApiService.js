import Cookies from 'js-cookie';

/**
 * Serviço para centralizar todas as operações de API relacionadas ao grafo
 * Segue o Dependency Inversion Principle - abstrai dependências de API
 * Segue o Single Responsibility Principle - responsável apenas por chamadas de API
 */
class GraphApiService {
  constructor() {
    this.baseUrl = '';
  }

  // Método privado para obter token de autenticação
  #getAuthToken() {
    return Cookies.get('token');
  }

  // Método privado para criar headers padrão
  #getHeaders() {
    const token = this.#getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // Buscar todas as notas
  async fetchNotes() {
    const response = await fetch('/api/notas', {
      headers: { 'Authorization': `Bearer ${this.#getAuthToken()}` },
    });
    
    if (!response.ok) {
      throw new Error('Erro ao buscar notas');
    }
    
    return response.json();
  }

  // Buscar todos os tópicos
  async fetchTopics() {
    const response = await fetch('/api/topicos', {
      headers: { 'Authorization': `Bearer ${this.#getAuthToken()}` },
    });
    
    if (!response.ok) {
      throw new Error('Erro ao buscar tópicos');
    }
    
    return response.json();
  }

  // Criar novo tópico
  async createTopic(topicData) {
    const response = await fetch('/api/topicos', {
      method: 'POST',
      headers: this.#getHeaders(),
      body: JSON.stringify(topicData),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar tópico');
    }

    return response.json();
  }

  // Atualizar nota (incluindo tópicos associados)
  async updateNote(noteId, noteData) {
    const response = await fetch(`/api/notas/${noteId}`, {
      method: 'PUT',
      headers: this.#getHeaders(),
      body: JSON.stringify(noteData),
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar nota');
    }

    return response.json();
  }

  // Associar tópicos a uma nota
  async associateTopicsToNote(noteId, noteData, topicIds) {
    const updatedData = {
      ...noteData,
      topicos: topicIds
    };

    return this.updateNote(noteId, updatedData);
  }

  // Remover tópico específico de uma nota
  async removeTopicFromNote(noteId, noteData, topicIdToRemove) {
    const currentTopicIds = noteData.topicos?.map(t => t.ID || t.id) || [];
    const updatedTopicIds = currentTopicIds.filter(id => id !== topicIdToRemove);
    
    const updatedData = {
      titulo: noteData.titulo,
      conteudo: noteData.conteudo,
      topicos: updatedTopicIds
    };

    return this.updateNote(noteId, updatedData);
  }

  // Remover todos os tópicos de uma nota
  async removeAllTopicsFromNote(noteId, noteData) {
    const updatedData = {
      titulo: noteData.titulo,
      conteudo: noteData.conteudo,
      topicos: []
    };

    return this.updateNote(noteId, updatedData);
  }

  // Criar tópico e associar a uma nota em uma operação
  async createTopicAndAssociate(noteId, noteData, topicData) {
    // Primeiro criar o tópico
    const newTopic = await this.createTopic(topicData);
    
    // Depois associar à nota
    const currentTopicIds = noteData.topicos?.map(t => t.ID || t.id) || [];
    const updatedTopicIds = [...currentTopicIds, newTopic.ID || newTopic.id];
    
    await this.associateTopicsToNote(noteId, noteData, updatedTopicIds);
    
    return newTopic;
  }
}

// Singleton pattern para garantir uma única instância
const graphApiService = new GraphApiService();

export default graphApiService;
