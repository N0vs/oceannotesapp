import pool from '../config/database.js';

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
    const user = rows[0];
    
    // Normalizar o campo ID para garantir consistência
    if (user && (user.Id || user.ID)) {
      user.id = user.Id || user.ID; // Garantir que sempre temos 'id' minúsculo
    }
    
    return user;
  }

  async findById(id) {
    const [rows] = await pool.query('SELECT Id, Nome, Email FROM Utilizador WHERE Id = ?', [id]);
    return rows[0];
  }

  /**
   * Criar usuário via Google OAuth
   */
  async createGoogleUser(userData) {
    const { Nome, Email, GoogleId, Avatar } = userData;
    const [result] = await pool.query(
      'INSERT INTO Utilizador (Nome, Email, GoogleId, Avatar, Password) VALUES (?, ?, ?, ?, ?)',
      [Nome, Email, GoogleId, Avatar, null] // Password é null para usuários Google
    );
    const [newUtilizador] = await pool.query('SELECT Id, Nome, Email, GoogleId, Avatar FROM Utilizador WHERE Id = ?', [result.insertId]);
    return newUtilizador[0];
  }

  /**
   * Atualizar GoogleId de um usuário existente
   */
  async updateGoogleId(userId, googleId, avatar) {
    await pool.query(
      'UPDATE Utilizador SET GoogleId = ?, Avatar = ? WHERE Id = ?',
      [googleId, avatar, userId]
    );
  }

  // Métodos de update e delete podem ser adicionados aqui no futuro
}

export default new UtilizadorRepository();
