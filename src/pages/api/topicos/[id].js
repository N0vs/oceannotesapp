import TopicoService from '../../../services/TopicoService.js';
import NotaService from '../../../services/NotaService.js';
import authMiddleware from '../../../middlewares/authMiddleware.js';

/**
 * API endpoint para operações específicas de tópicos por ID
 * Gerencia busca, atualização e exclusão de tópicos individuais
 * 
 * @api {GET,PUT,DELETE} /api/topicos/:id Operações por ID de tópico
 * @apiName TopicById
 * @apiGroup Topics
 * @apiVersion 1.0.0
 * 
 * @apiHeader {string} Authorization Bearer token JWT
 * @apiParam {string} id ID do tópico
 * 
 * @apiSuccess (GET 200) {Object} response Dados completos do tópico
 * @apiSuccess (GET 200) {Object} response.topico Dados do tópico
 * @apiSuccess (GET 200) {string} response.topico.id ID do tópico
 * @apiSuccess (GET 200) {string} response.topico.nome Nome do tópico
 * @apiSuccess (GET 200) {string} response.topico.cor Cor em hexadecimal
 * @apiSuccess (GET 200) {Array} response.notas Notas associadas ao tópico
 * 
 * @apiParam (PUT) {string} [nome] Novo nome do tópico
 * @apiParam (PUT) {string} [cor] Nova cor em hexadecimal
 * 
 * @apiSuccess (PUT 200) {Object} topic Tópico atualizado
 * @apiSuccess (DELETE 200) {Object} response Confirmação de exclusão
 * @apiSuccess (DELETE 200) {string} response.message Mensagem de sucesso
 * 
 * @apiSuccessExample {json} GET Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "topico": {
 *         "id": "1",
 *         "nome": "Trabalho",
 *         "cor": "#FF5733"
 *       },
 *       "notas": [
 *         {
 *           "id": "123",
 *           "titulo": "Reunião importante"
 *         }
 *       ]
 *     }
 * 
 * @apiError (401) Unauthorized Token de autenticação inválido
 * @apiError (403) Forbidden Sem permissão para acessar este tópico
 * @apiError (404) NotFound Tópico não encontrado
 * @apiError (405) MethodNotAllowed Método HTTP não permitido
 * @apiError (500) InternalError Erro interno do servidor
 * 
 * @description Endpoint para operações individuais com validação de propriedade
 * @requires authMiddleware Token JWT válido
 */
const handler = async (req, res) => {
  // Extração de parâmetros: ID do usuário (auth) e ID do tópico (URL)
  const utilizadorId = req.userId;
  const { id } = req.query; // ID vem da URL dinâmica [id]

  if (req.method === 'GET') {
    try {
      // Busca com validação de propriedade: usuário só vê seus próprios tópicos
      const topico = await TopicoService.getByIdAndUtilizadorId(id, utilizadorId);
      
      // Verificação de existência: 404 se tópico não encontrado ou não pertence ao usuário
      if (!topico) {
        return res.status(404).json({ message: 'Tópico não encontrado' });
      }

      // Busca de notas relacionadas: mostra todas as notas que usam este tópico
      // Útil para interface mostrar quantas/quais notas serão afetadas
      const notas = await NotaService.getByTopicoId(id);
      
      // Response enriquecido: tópico + notas relacionadas
      res.status(200).json({ topico, notas });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      // Extração de campos editáveis: nome e cor podem ser atualizados
      const { nome, cor } = req.body;
      
      // Update com validação de propriedade automática
      // Service garante que só proprietário pode editar
      const topicoAtualizado = await TopicoService.update(id, { nome, cor }, utilizadorId);
      
      res.status(200).json(topicoAtualizado);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Exclusão com validação de propriedade
      // Service verifica se usuário é dono antes de deletar
      await TopicoService.delete(id, utilizadorId);
      
      // Confirmação de exclusão: importante para feedback ao usuário
      res.status(200).json({ message: 'Tópico deletado com sucesso' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else {
    // Method not allowed: lista métodos suportados
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default authMiddleware(handler);
