import pool from '../config/database.js';

class NotaRepository {
  /**
   * @deprecated Esta função está obsoleta devido a inconsistências nos nomes de campos.
   * Use createWithConsistentFields() que usa campos padronizados (ID maiúsculo).
   * Substituída por: createWithConsistentFields()
   */
  async create(nota) {
    const { titulo, conteudo, UtilizadorID } = nota;
    const [result] = await pool.query(
      'INSERT INTO Nota (titulo, conteudo, UtilizadorID) VALUES (?, ?, ?)',
      [titulo, conteudo, UtilizadorID]
    );
    const [newNota] = await pool.query('SELECT * FROM Nota WHERE ID = ?', [result.insertId]);
    return newNota[0];
  }

  /**
   * Cria nova nota com campos padronizados (SOLID - Single Responsibility)
   * Garante consistência nos nomes de campos e preenchimento correto do proprietário
   */
  async createWithConsistentFields(nota) {
    const { titulo, conteudo, UtilizadorID } = nota;
    
    console.log('Debug - createWithConsistentFields - Dados recebidos:');
    console.log('- titulo:', titulo);
    console.log('- conteudo:', conteudo ? 'presente' : 'vazio');
    console.log('- UtilizadorID:', UtilizadorID, 'type:', typeof UtilizadorID);
    
    if (!UtilizadorID) {
      throw new Error('UtilizadorID é obrigatório para criar uma nota');
    }
    
    const [result] = await pool.query(
      'INSERT INTO Nota (titulo, conteudo, UtilizadorID) VALUES (?, ?, ?)',
      [titulo, conteudo, parseInt(UtilizadorID)]
    );
    
    console.log('Debug - Nota criada com ID:', result.insertId);
    
    const [newNota] = await pool.query('SELECT * FROM Nota WHERE ID = ?', [result.insertId]);
    
    console.log('Debug - Nota recuperada após criação:', newNota[0]);
    
    return newNota[0];
  }

  async findAll() {
    const [rows] = await pool.query('SELECT * FROM Nota');
    return rows;
  }

  /**
   * @deprecated Esta função está obsoleta devido a inconsistências nos nomes de campos.
   * Use findByIdWithConsistentFields() que usa campos padronizados (ID maiúsculo).
   * Substituída por: findByIdWithConsistentFields()
   */
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM Nota WHERE ID = ?', [id]);
    return rows[0];
  }

  /**
   * Busca nota por ID com campos padronizados (SOLID - Single Responsibility)
   */
  async findByIdWithConsistentFields(id) {
    const [rows] = await pool.query('SELECT * FROM Nota WHERE ID = ?', [id]);
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

  /**
   * @deprecated Esta função está obsoleta devido a inconsistências nos nomes de campos.
   * Use updateWithConsistentFields() que usa campos padronizados (ID maiúsculo).
   * Substituída por: updateWithConsistentFields()
   */
  async update(id, nota, utilizadorId) {
    const { titulo, conteudo } = nota;
    const [result] = await pool.query(
      'UPDATE Nota SET titulo = ?, conteudo = ? WHERE id = ? AND UtilizadorID = ?',
      [titulo, conteudo, id, utilizadorId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Atualiza nota com campos padronizados e verificação robusta de propriedade
   * Segue SOLID - Single Responsibility Principle
   */
/*   async updateWithConsistentFields(id, nota, utilizadorId) {
    const { titulo, conteudo } = nota;
    
    // Conversão explícita para garantir comparação correta
    const noteId = parseInt(id);
    const ownerId = parseInt(utilizadorId);
    
    const [result] = await pool.query(
      'UPDATE Nota SET Titulo = ?, Conteudo = ? WHERE ID = ? AND UtilizadorID = ?',
      [titulo, conteudo, noteId, ownerId]
    );
    return result.affectedRows > 0;
  } */
 async updateWithConsistentFields(id, nota, utilizadorId) {
  const { titulo, conteudo } = nota;
  
  // Conversão explícita para garantir comparação correta
  const noteId = parseInt(id);
  const ownerId = parseInt(utilizadorId);
  
  // Verificar se o usuário tem permissão para editar (proprietário ou com permissão editar/admin)
  const [permissionCheck] = await pool.query(`
    SELECT 
      CASE 
        WHEN n.UtilizadorID = ? THEN 'owner'
        WHEN nc.TipoPermissao IN ('editar', 'admin') AND nc.Ativo = TRUE THEN nc.TipoPermissao
        ELSE 'none'
      END as permission
    FROM Nota n
    LEFT JOIN NotaCompartilhamento nc ON n.ID = nc.NotaID AND nc.UsuarioCompartilhadoID = ?
    WHERE n.ID = ?
  `, [ownerId, ownerId, noteId]);
  
  if (!permissionCheck.length || permissionCheck[0].permission === 'none') {
    return false; // Sem permissão para editar
  }
  
  const [result] = await pool.query(
    'UPDATE Nota SET Titulo = ?, Conteudo = ? WHERE ID = ?',
    [titulo, conteudo, noteId]
  );
  return result.affectedRows > 0;
}

  async getByUtilizadorId(utilizadorId) {
    const [rows] = await pool.query('SELECT * FROM Nota WHERE UtilizadorID = ? ORDER BY dataCriacao DESC', [utilizadorId]);
    return rows;
  }

  /**
   * @deprecated Esta função está obsoleta devido a inconsistências nos nomes de campos.
   * Use deleteWithConsistentFields() que usa campos padronizados (ID maiúsculo).
   * Substituída por: deleteWithConsistentFields()
   */
  async delete(id, utilizadorId) {
    // Deletar nota que pertence ao usuário
    const [result] = await pool.query('DELETE FROM Nota WHERE id = ? AND UtilizadorID = ?', [id, utilizadorId]);
    return result.affectedRows > 0;
  }

  /**
   * Deleta nota com campos padronizados e verificação robusta de propriedade
   * Segue SOLID - Single Responsibility Principle
   */
  async deleteWithConsistentFields(id, utilizadorId) {
    // Conversão explícita para garantir comparação correta
    const noteId = parseInt(id);
    const ownerId = parseInt(utilizadorId);
    
    const [result] = await pool.query('DELETE FROM Nota WHERE ID = ? AND UtilizadorID = ?', [noteId, ownerId]);
    return result.affectedRows > 0;
  }
}

export default new NotaRepository();
