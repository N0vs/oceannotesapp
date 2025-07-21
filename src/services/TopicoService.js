const TopicoRepository = require('../repositories/TopicoRepository.js');

class TopicoService {
  async create(topicoData, utilizadorId) {
    // Validações futuras aqui
    const dadosCompletos = { ...topicoData, UtilizadorID: utilizadorId };
    return await TopicoRepository.create(dadosCompletos);
  }

  async findAll() {
    return await TopicoRepository.findAll();
  }

  async findById(id, utilizadorId) {
    return await TopicoRepository.findById(id, utilizadorId);
  }

  async update(id, topico, utilizadorId) {
    return await TopicoRepository.update(id, topico, utilizadorId);
  }

  async delete(id, utilizadorId) {
    return await TopicoRepository.delete(id, utilizadorId);
  }
}

module.exports = new TopicoService();
