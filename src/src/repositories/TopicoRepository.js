import pool from '../config/database.js';

class TopicoRepository {
  async create(topico) {
    const { nome, cor, utilizadorId } = topico;
    const [result] = await pool.query(
      'INSERT INTO Topico (nome, cor, UtilizadorID) VALUES (?, ?, ?)',
      [nome, cor, utilizadorId]
    );
    const [newTopico] = await pool.query('SELECT * FROM Topico WHERE ID = ?', [result.insertId]);
    return newTopico[0];
  }

  async getByUtilizadorId(utilizadorId) {
    const [rows] = await pool.query('SELECT * FROM Topico WHERE UtilizadorID = ?', [utilizadorId]);
    return rows;
  }

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

  async update(id, topico, utilizadorId) {
    const { nome, cor } = topico;
    const [result] = await pool.query(
      'UPDATE Topico SET nome = ?, cor = ? WHERE ID = ? AND UtilizadorID = ?',
      [nome, cor, id, utilizadorId]
    );
    return result.affectedRows > 0;
  }

  async delete(id, utilizadorId) {
    const [result] = await pool.query('DELETE FROM Topico WHERE ID = ? AND UtilizadorID = ?', [id, utilizadorId]);
    return result.affectedRows > 0;
  }
}

export default new TopicoRepository();
