import pool from '../config/database.js';

class NotaTopicoRepository {
  async associateTopicosToNota(notaId, topicoIds) {
    // Primeiro, remove todas as associações existentes
    await pool.query('DELETE FROM NotaTopico WHERE NotaID = ?', [notaId]);
    
    // Depois, adiciona as novas associações
    if (topicoIds && topicoIds.length > 0) {
      const values = topicoIds.map(topicoId => [notaId, topicoId]);
      const placeholders = topicoIds.map(() => '(?, ?)').join(', ');
      const flatValues = values.flat();
      
      await pool.query(
        `INSERT INTO NotaTopico (NotaID, TopicoID) VALUES ${placeholders}`,
        flatValues
      );
    }
  }

  async getTopicosByNotaId(notaId) {
    const [rows] = await pool.query(`
      SELECT t.* 
      FROM Topico t
      JOIN NotaTopico nt ON t.ID = nt.TopicoID
      WHERE nt.NotaID = ?
    `, [notaId]);
    return rows;
  }

  async getNotasByTopicoId(topicoId) {
    const [rows] = await pool.query(`
      SELECT n.* 
      FROM Nota n
      JOIN NotaTopico nt ON n.ID = nt.NotaID
      WHERE nt.TopicoID = ?
    `, [topicoId]);
    return rows;
  }

  async removeAssociation(notaId, topicoId) {
    const [result] = await pool.query(
      'DELETE FROM NotaTopico WHERE NotaID = ? AND TopicoID = ?',
      [notaId, topicoId]
    );
    return result.affectedRows > 0;
  }
}

export default new NotaTopicoRepository();
