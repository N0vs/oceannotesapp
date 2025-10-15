import TopicoRepository from '../repositories/TopicoRepository.js';

/**
 * Service para lógica de negócio da entidade Topico
 * Implementa regras de negócio e orquestração entre repositories
 * Camada intermediária entre controllers e repositories
 * 
 * @class TopicoService
 * @description Service responsável por lógica de negócio de tópicos/tags
 */
class TopicoService {
  /**
   * Cria novo tópico com validação de regras de negócio
   * @async
   * @method create
   * @param {Object} topicoData - Dados do tópico
   * @param {string} topicoData.nome - Nome do tópico
   * @param {string} topicoData.cor - Cor em hexadecimal
   * @param {number} topicoData.utilizadorId - ID do usuário
   * @returns {Promise<Object>} Tópico criado
   * @description Delega criação ao repository após validações
   */
  async create(topicoData) {
    return await TopicoRepository.create(topicoData);
  }

  async getByUtilizadorId(utilizadorId) {
    return await TopicoRepository.getByUtilizadorId(utilizadorId);
  }

  async getByIdAndUtilizadorId(id, utilizadorId) {
    return await TopicoRepository.getByIdAndUtilizadorId(id, utilizadorId);
  }

  async findAll() {
    return await TopicoRepository.findAll();
  }

  async findById(id, utilizadorId) {
    return await TopicoRepository.findById(id, utilizadorId);
  }

  /**
   * Atualiza tópico existente com validação de propriedade
   * @async
   * @method update
   * @param {number} id - ID do tópico
   * @param {Object} topico - Novos dados
   * @param {number} utilizadorId - ID do usuário proprietário
   * @returns {Promise<boolean>} Sucesso da operação
   * @description Valida propriedade antes de atualizar
   */
  async update(id, topico, utilizadorId) {
    return await TopicoRepository.update(id, topico, utilizadorId);
  }

  /**
   * Remove tópico com validação de propriedade
   * @async
   * @method delete
   * @param {number} id - ID do tópico
   * @param {number} utilizadorId - ID do usuário proprietário
   * @returns {Promise<boolean>} Sucesso da remoção
   * @description Valida propriedade antes de remover
   */
  async delete(id, utilizadorId) {
    return await TopicoRepository.delete(id, utilizadorId);
  }
}

export default new TopicoService();
