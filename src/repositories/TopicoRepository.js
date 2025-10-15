import pool from '../config/database.js';

/**
 * Repository para operações de dados da entidade Topico
 * Implementa padrão Repository para abstração da camada de dados
 * Gerencia CRUD operations para tópicos/tags do sistema
 * 
 * @class TopicoRepository
 * @description Repository responsável por operações de persistência de tópicos
 */
class TopicoRepository {
  /**
   * Cria um novo tópico no banco de dados
   * @async
   * @method create
   * @param {Object} topico - Dados do tópico a ser criado
   * @param {string} topico.nome - Nome do tópico
   * @param {string} topico.cor - Cor do tópico em hexadecimal
   * @param {number} topico.utilizadorId - ID do usuário proprietário
   * @returns {Promise<Object>} Tópico criado com ID gerado
   * @description Insere novo tópico e retorna o registro completo
   */
  async create(topico) {
    const { nome, cor, utilizadorId } = topico;
    const [result] = await pool.query(
      'INSERT INTO Topico (nome, cor, UtilizadorID) VALUES (?, ?, ?)',
      [nome, cor, utilizadorId]
    );
    const [newTopico] = await pool.query('SELECT * FROM Topico WHERE ID = ?', [result.insertId]);
    return newTopico[0];
  }

  /**
   * Busca todos os tópicos de um usuário específico
   * @async
   * @method getByUtilizadorId
   * @param {number} utilizadorId - ID do usuário
   * @returns {Promise<Array>} Array de tópicos do usuário
   * @description Recupera todos os tópicos criados por um usuário
   */
  async getByUtilizadorId(utilizadorId) {
    const [rows] = await pool.query('SELECT * FROM Topico WHERE UtilizadorID = ?', [utilizadorId]);
    return rows;
  }

  /**
   * Busca tópico específico por ID e usuário
   * @async
   * @method getByIdAndUtilizadorId
   * @param {number} id - ID do tópico
   * @param {number} utilizadorId - ID do usuário proprietário
   * @returns {Promise<Object|undefined>} Tópico encontrado ou undefined
   * @description Recupera tópico com validação de propriedade
   */
  async getByIdAndUtilizadorId(id, utilizadorId) {
    const [rows] = await pool.query('SELECT * FROM Topico WHERE ID = ? AND UtilizadorID = ?', [id, utilizadorId]);
    return rows[0];
  }

  async findAll() {
    const [rows] = await pool.query('SELECT * FROM Topico');
    return rows;
  }

  async findById(id, utilizadorId) {
    const [rows] = await pool.query('SELECT * FROM Topico WHERE ID = ? AND UtilizadorID = ?', [id, utilizadorId]);
    return rows[0];
  }

  /**
   * Atualiza dados de um tópico existente
   * @async
   * @method update
   * @param {number} id - ID do tópico
   * @param {Object} topico - Novos dados do tópico
   * @param {string} topico.nome - Novo nome
   * @param {string} topico.cor - Nova cor
   * @param {number} utilizadorId - ID do usuário proprietário
   * @returns {Promise<boolean>} True se atualizou, false caso contrário
   * @description Atualiza tópico com validação de propriedade
   */
  async update(id, topico, utilizadorId) {
    const { nome, cor } = topico;
    const [result] = await pool.query(
      'UPDATE Topico SET nome = ?, cor = ? WHERE ID = ? AND UtilizadorID = ?',
      [nome, cor, id, utilizadorId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Remove um tópico do banco de dados
   * @async
   * @method delete
   * @param {number} id - ID do tópico
   * @param {number} utilizadorId - ID do usuário proprietário
   * @returns {Promise<boolean>} True se removeu, false caso contrário
   * @description Remove tópico com validação de propriedade
   */
  async delete(id, utilizadorId) {
    const [result] = await pool.query('DELETE FROM Topico WHERE ID = ? AND UtilizadorID = ?', [id, utilizadorId]);
    return result.affectedRows > 0;
  }
}

export default new TopicoRepository();
