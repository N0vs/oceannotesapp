import NotaRepository from '../repositories/NotaRepository.js';
import NotaTopicoRepository from '../repositories/NotaTopicoRepository.js';

class NotaService {
  /**
   * @deprecated Esta função está obsoleta devido a problemas de consistência de campos.
   * Use createWithConsistentFields() que usa repositório com campos padronizados.
   * Substituída por: createWithConsistentFields()
   */
  async create(notaData, utilizadorId) {
    const { topicos, ...notaInfo } = notaData;
    const dadosCompletos = { ...notaInfo, UtilizadorID: utilizadorId };
    const novaNota = await NotaRepository.create(dadosCompletos);
    
    // Associar tópicos se fornecidos
    try {
      if (topicos && topicos.length > 0) {
        await NotaTopicoRepository.associateTopicosToNota(novaNota.id, topicos);
        console.log(`Associando tópicos ${topicos} à nota ${novaNota.id}`);
      }
    } catch (error) {
      console.log('Erro ao associar tópicos:', error);
    }
    
    return novaNota;
  }

  /**
   * Cria nota com campos padronizados e verificação robusta
   * Segue SOLID - Single Responsibility Principle
   */
  async createWithConsistentFields(notaData, utilizadorId) {
    console.log('Debug - NotaService.createWithConsistentFields - Dados recebidos:');
    console.log('- notaData:', notaData);
    console.log('- utilizadorId:', utilizadorId, 'type:', typeof utilizadorId);
    
    if (!utilizadorId) {
      throw new Error('utilizadorId é obrigatório para criar uma nota');
    }
    
    const { topicos, ...notaInfo } = notaData;
    const dadosCompletos = { 
      ...notaInfo, 
      UtilizadorID: parseInt(utilizadorId)
    };
    
    console.log('Debug - Dados completos para criação:', dadosCompletos);
    
    const novaNota = await NotaRepository.createWithConsistentFields(dadosCompletos);
    
    // Associar tópicos se fornecidos
    try {
      if (topicos && topicos.length > 0) {
        const notaId = novaNota.id || novaNota.ID;
        await NotaTopicoRepository.associateTopicosToNota(notaId, topicos);
        console.log(`Associando tópicos ${topicos} à nota ${notaId}`);
      }
    } catch (error) {
      console.log('Erro ao associar tópicos:', error);
    }
    
    return novaNota;
  }

  async findAll() {
    return await NotaRepository.findAll();
  }

  /**
   * @deprecated Esta função está obsoleta devido a problemas de consistência de campos.
   * Use findByIdWithConsistentFields() que usa repositório com campos padronizados.
   * Substituída por: findByIdWithConsistentFields()
   */
  async findById(id) {
    return await NotaRepository.findById(id);
  }

  /**
   * Busca nota por ID com campos padronizados
   * Segue SOLID - Single Responsibility Principle
   */
  async findByIdWithConsistentFields(id) {
    return await NotaRepository.findByIdWithConsistentFields(id);
  }

  async findByTopicId(topicId, utilizadorId) {
    return await NotaRepository.findByTopicId(topicId, utilizadorId);
  }

  async getByUtilizadorId(utilizadorId) {
    const notas = await NotaRepository.getByUtilizadorId(utilizadorId);
    
    // Buscar tópicos para cada nota
    try {
      for (let nota of notas) {
        nota.topicos = await NotaTopicoRepository.getTopicosByNotaId(nota.id);
        console.log(`Tópicos para nota ${nota.id}:`, nota.topicos);
      }
    } catch (error) {
      console.log('Erro ao buscar tópicos das notas:', error);
      // Se houver erro, define tópicos como array vazio
      for (let nota of notas) {
        nota.topicos = [];
      }
    }
    
    return notas;
  }

  /**
   * @deprecated Esta função está obsoleta devido a problemas de consistência de campos.
   * Use updateWithConsistentFields() que usa repositório com campos padronizados.
   * Substituída por: updateWithConsistentFields()
   */
  async update(id, notaData, utilizadorId) {
    const { topicos, ...notaInfo } = notaData;
    const resultado = await NotaRepository.update(id, notaInfo, utilizadorId);
    
    // Atualizar associações de tópicos
    try {
      if (topicos !== undefined) {
        await NotaTopicoRepository.associateTopicosToNota(id, topicos);
        console.log(`Atualizando tópicos da nota ${id}:`, topicos);
      }
    } catch (error) {
      console.log('Erro ao atualizar tópicos:', error);
    }
    
    return resultado;
  }

  /**
   * Atualiza nota com campos padronizados e verificação robusta
   * Segue SOLID - Single Responsibility Principle
   */
  async updateWithConsistentFields(id, notaData, utilizadorId) {
    const { topicos, ...notaInfo } = notaData;
    const resultado = await NotaRepository.updateWithConsistentFields(id, notaInfo, utilizadorId);
    
    // Atualizar associações de tópicos
    try {
      if (topicos !== undefined) {
        await NotaTopicoRepository.associateTopicosToNota(id, topicos);
        console.log(`Atualizando tópicos da nota ${id}:`, topicos);
      }
    } catch (error) {
      console.log('Erro ao atualizar tópicos:', error);
    }
    
    return resultado;
  }

  /**
   * @deprecated Esta função está obsoleta devido a problemas de consistência de campos.
   * Use deleteWithConsistentFields() que usa repositório com campos padronizados.
   * Substituída por: deleteWithConsistentFields()
   */
  async delete(id, utilizadorId) {
    return await NotaRepository.delete(id, utilizadorId);
  }

  /**
   * Deleta nota com campos padronizados e verificação robusta
   * Segue SOLID - Single Responsibility Principle
   */
  async deleteWithConsistentFields(id, utilizadorId) {
    return await NotaRepository.deleteWithConsistentFields(id, utilizadorId);
  }
}

export default new NotaService();
