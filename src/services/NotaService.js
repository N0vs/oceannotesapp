const NotaRepository = require('../repositories/NotaRepository.js');

class NotaService {
  async create(notaData, utilizadorId) {
    // Validações futuras aqui
    const dadosCompletos = { ...notaData, UtilizadorID: utilizadorId };
    return await NotaRepository.create(dadosCompletos);
  }

  async findAll() {
    return await NotaRepository.findAll();
  }

  async findById(id) {
    return await NotaRepository.findById(id);
  }

  async findByTopicId(topicId, utilizadorId) {
    return await NotaRepository.findByTopicId(topicId, utilizadorId);
  }

  async update(id, nota) {
    return await NotaRepository.update(id, nota);
  }

  async delete(id, utilizadorId) {
    return await NotaRepository.delete(id, utilizadorId);
  }
}

module.exports = new NotaService();
