import authMiddleware from '../../../middlewares/authMiddleware';
import { connectToDatabase } from '../../../lib/db';

/**
 * API endpoint para buscar notas com filtros avançados
 * GET /api/notas/filtered
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const userId = req.userId;
    const {
      searchText,
      dateType,
      specificDate,
      startDate,
      endDate,
      month,
      year,
      selectedTopics
    } = req.query;

    console.log('Filtros recebidos:', req.query);

    const db = await connectToDatabase();

    // Query simplificada baseada no endpoint /api/notas que funciona
    let baseQuery = `
      SELECT n.* 
      FROM Nota n
      WHERE n.UtilizadorID = ?
    `;

    const queryParams = [userId];

    // Filtro por texto (apenas nome do ficheiro por enquanto)
    if (searchText && searchText.trim()) {
      baseQuery += ` AND n.titulo LIKE ?`;
      const searchPattern = `%${searchText.trim()}%`;
      queryParams.push(searchPattern);
    }

    // Filtros de data
    if (dateType && dateType !== 'all') {
      switch (dateType) {
        case 'specific-day':
          if (specificDate) {
            baseQuery += ` AND DATE(n.dataCriacao) = ?`;
            queryParams.push(specificDate);
          }
          break;
        
        case 'date-range':
          if (startDate && endDate) {
            baseQuery += ` AND DATE(n.dataCriacao) BETWEEN ? AND ?`;
            queryParams.push(startDate, endDate);
          } else if (startDate) {
            baseQuery += ` AND DATE(n.dataCriacao) >= ?`;
            queryParams.push(startDate);
          } else if (endDate) {
            baseQuery += ` AND DATE(n.dataCriacao) <= ?`;
            queryParams.push(endDate);
          }
          break;
        
        case 'month-year':
          if (month && year) {
            baseQuery += ` AND YEAR(n.dataCriacao) = ? AND MONTH(n.dataCriacao) = ?`;
            queryParams.push(parseInt(year), parseInt(month));
          } else if (year) {
            baseQuery += ` AND YEAR(n.dataCriacao) = ?`;
            queryParams.push(parseInt(year));
          }
          break;
      }
    }

    // Filtro por tópicos
    if (selectedTopics && selectedTopics.length > 0) {
      const topicIds = Array.isArray(selectedTopics) ? selectedTopics : [selectedTopics];
      const topicPlaceholders = topicIds.map(() => '?').join(',');
      
      baseQuery += ` AND n.ID IN (
        SELECT DISTINCT nt.NotaID 
        FROM NotaTopico nt 
        WHERE nt.TopicoID IN (${topicPlaceholders}) 
        AND nt.UtilizadorID = ?
      )`;
      
      queryParams.push(...topicIds.map(id => parseInt(id)), userId);
    }

    // Ordenar por data de criação mais recente (igual ao endpoint /api/notas)
    baseQuery += ` ORDER BY n.dataCriacao DESC`;

    console.log('Query final:', baseQuery);
    console.log('Parâmetros:', queryParams);

    const [notesData] = await db.query(baseQuery, queryParams);

    // Buscar tópicos para cada nota (igual ao NotaService)
    for (let nota of notesData) {
      const [topicos] = await db.query(`
        SELECT t.* 
        FROM Topico t
        JOIN NotaTopico nt ON t.ID = nt.TopicoID
        WHERE nt.NotaID = ? AND nt.UtilizadorID = ?
      `, [nota.id || nota.ID, userId]);
      
      nota.topicos = topicos;
    }

    console.log(`Encontradas ${notesData.length} notas com os filtros aplicados`);

    res.status(200).json(notesData);

  } catch (error) {
    console.error('Erro ao buscar notas filtradas:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
}

export default authMiddleware(handler);
