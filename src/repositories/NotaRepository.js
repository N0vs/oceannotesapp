const pool = require('../config/database.js');

class NotaRepository {
  async create(nota) {
    const { nomeID, titulo, conteudo, UtilizadorID, topicoID = null } = nota;
    const [result] = await pool.query(
      'INSERT INTO Nota (nomeID, titulo, conteudo, UtilizadorID, topicoID) VALUES (?, ?, ?, ?, ?)',
      [nomeID, titulo, conteudo, UtilizadorID, topicoID]
    );
    const [newNota] = await pool.query('SELECT * FROM Nota WHERE id = ?', [result.insertId]);
    return newNota[0];
  }

  async findAll() {
    const [rows] = await pool.query('SELECT * FROM Nota');
    return rows;
  }

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM Nota WHERE id = ?', [id]);
    return rows[0];
  }

  async findByTopicId(topicId, utilizadorId) {
    // Esta query busca todas as notas (n.*) que pertencem a um tópico específico (n.topicoID = ?)
    // e garante que o tópico pertence ao usuário logado (t.UtilizadorID = ?)
    const query = `
      SELECT n.* 
      FROM Nota n
      JOIN Topico t ON n.topicoID = t.ID
      WHERE n.topicoID = ? AND t.UtilizadorID = ?
      ORDER BY n.data_criacao DESC
    `;
    const [rows] = await pool.query(query, [topicId, utilizadorId]);
    return rows;
  }

  async update(id, nota) {
    const { nomeID, titulo, conteudo, AtualizadoPorUtilizador = null, topicoID = null } = nota;
    const [result] = await pool.query(
      'UPDATE Nota SET nomeID = ?, titulo = ?, conteudo = ?, dataAtualizacao = CURRENT_DATE, AtualizadoPorUtilizador = ?, topicoID = ? WHERE id = ?',
      [nomeID, titulo, conteudo, AtualizadoPorUtilizador, topicoID, id]
    );
    return result.affectedRows > 0;
  }

  async delete(id, utilizadorId) {
    // Para deletar uma nota, precisamos garantir que o usuário que a deleta
    // é o mesmo que criou o tópico ao qual a nota pertence.
    const query = `
      DELETE n FROM Nota n
      JOIN Topico t ON n.topicoID = t.ID
      WHERE n.ID = ? AND t.UtilizadorID = ?
    `;
    const [result] = await pool.query(query, [id, utilizadorId]);
    return result.affectedRows > 0;
  }
}

export default new NotaRepository();
