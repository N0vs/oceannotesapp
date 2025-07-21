const pool = require('../config/database.js');

class UtilizadorRepository {
  async create(utilizador) {
    const { Nome, Password, Email } = utilizador;
    const [result] = await pool.query(
      'INSERT INTO Utilizador (Nome, Password, Email) VALUES (?, ?, ?)',
      [Nome, Password, Email]
    );
    const [newUtilizador] = await pool.query('SELECT Id, Nome, Email FROM Utilizador WHERE Id = ?', [result.insertId]);
    return newUtilizador[0];
  }

  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM Utilizador WHERE Email = ?', [email]);
    return rows[0];
  }

  async findById(id) {
    const [rows] = await pool.query('SELECT Id, Nome, Email FROM Utilizador WHERE Id = ?', [id]);
    return rows[0];
  }

  // Métodos de update e delete podem ser adicionados aqui no futuro
}

module.exports = new UtilizadorRepository();
