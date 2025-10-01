import TopicoRepository from '../repositories/TopicoRepository.js';

class TopicoService {
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

  async update(id, topico, utilizadorId) {
    return await TopicoRepository.update(id, topico, utilizadorId);
  }

  async delete(id, utilizadorId) {
    return await TopicoRepository.delete(id, utilizadorId);
  }
}

export default new TopicoService();
