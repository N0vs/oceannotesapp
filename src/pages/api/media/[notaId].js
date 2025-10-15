import { connectToDatabase } from '../../../lib/db.js';
import authMiddleware from '../../../middlewares/authMiddleware.js';

/**
 * API endpoint para buscar arquivos de mídia de uma nota específica
 * Lista todas as imagens associadas à nota com validação de permissões
 * 
 * @api {GET} /api/media/:notaId Buscar mídia de nota
 * @apiName GetNoteMedia
 * @apiGroup Media
 * @apiVersion 1.0.0
 * 
 * @apiParam {string} notaId ID da nota para buscar arquivos de mídia
 * 
 * @apiSuccess {boolean} success Indica sucesso da operação
 * @apiSuccess {Array} images Lista de imagens da nota
 * @apiSuccess {string} images.id ID único da imagem
 * @apiSuccess {string} images.url URL acessível da imagem
 * @apiSuccess {string} images.uploadedBy ID do usuário que fez upload
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "images": [
 *         {
 *           "id": "550e8400-e29b-41d4-a716-446655440000",
 *           "url": "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
 *           "uploadedBy": "user123"
 *         }
 *       ]
 *     }
 * 
 * @apiError (400) MissingNoteId ID da nota é obrigatório
 * @apiError (401) Unauthorized Token de autenticação inválido
 * @apiError (403) Forbidden Sem permissão para aceder a esta nota
 * @apiError (405) MethodNotAllowed Método HTTP não permitido
 * @apiError (500) InternalError Erro interno do servidor
 * 
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 403 Forbidden
 *     {
 *       "error": "Sem permissão para aceder a esta nota"
 *     }
 * 
 * @description Endpoint protegido que valida permissões de acesso à nota
 * @requires authMiddleware Token JWT válido
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Extração de parâmetros: notaId vem da URL dinâmica [notaId]
    const { notaId } = req.query;
    const utilizadorId = req.userId; // Fornecido pelo authMiddleware
    
    // Validação de entrada: notaId é obrigatório
    if (!notaId) {
      return res.status(400).json({ error: 'ID da nota é obrigatório' });
    }

    const db = await connectToDatabase();
    
    // Verificação de permissões: usuário deve ser proprietário ou ter acesso compartilhado
    // Query JOIN verifica tanto propriedade direta quanto compartilhamento ativo
    const [notaAccess] = await db.query(`
      SELECT n.id 
      FROM Nota n
      LEFT JOIN NotaCompartilhamento nc ON n.id = nc.NotaID 
      WHERE n.id = ? AND (
        n.UtilizadorID = ? OR 
        (nc.UsuarioCompartilhadoID = ? AND nc.Ativo = true)
      )
    `, [notaId, utilizadorId, utilizadorId]);

    // Controle de acesso: bloqueia se usuário não tem permissão
    if (notaAccess.length === 0) {
      return res.status(403).json({ error: 'Sem permissão para aceder a esta nota' });
    }

    // Busca de mídia: recupera todas as imagens associadas à nota
    // ORDER BY Id DESC retorna imagens mais recentes primeiro
    const [images] = await db.query(`
      SELECT Id, caminho, utilizadorId
      FROM Midia 
      WHERE notaId = ?
      ORDER BY Id DESC
    `, [notaId]);

    res.status(200).json({
      success: true,
      images: images.map(img => ({
        id: img.Id,
        url: img.caminho,
        uploadedBy: img.utilizadorId
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

export default authMiddleware(handler);
