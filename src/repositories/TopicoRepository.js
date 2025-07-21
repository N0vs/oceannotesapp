const pool = require('../config/database.js');

class TopicoRepository {
  async create(topico) {
    const { nome, cor, UtilizadorID } = topico;
    const [result] = await pool.query(
      'INSERT INTO Topico (nome, cor, UtilizadorID) VALUES (?, ?, ?)',
      [nome, cor, UtilizadorID]
    );
    return { id: result.insertId, ...topico };
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

module.exports = new TopicoRepository();
