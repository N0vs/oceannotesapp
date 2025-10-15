import TopicoService from '../../../services/TopicoService.js';
import authMiddleware from '../../../middlewares/authMiddleware.js';

/**
 * API endpoint principal para operações de tópicos/tags
 * Gerencia listagem e criação de tópicos do usuário
 * 
 * @api {GET,POST} /api/topicos Operações principais de tópicos
 * @apiName TopicsMain
 * @apiGroup Topics
 * @apiVersion 1.0.0
 * 
 * @apiHeader {string} Authorization Bearer token JWT
 * 
 * @apiSuccess (GET 200) {Array} topics Lista de tópicos do usuário
 * @apiSuccess (GET 200) {Object} topics.topic Dados do tópico individual
 * @apiSuccess (GET 200) {string} topics.topic.id ID único do tópico
 * @apiSuccess (GET 200) {string} topics.topic.nome Nome do tópico
 * @apiSuccess (GET 200) {string} topics.topic.cor Cor em hexadecimal
 * @apiSuccess (GET 200) {number} topics.topic.UtilizadorID ID do proprietário
 * 
 * @apiParam (POST) {string} nome Nome do tópico (obrigatório)
 * @apiParam (POST) {string} cor Cor em formato hexadecimal (ex: #FF5733)
 * 
 * @apiSuccess (POST 201) {Object} topic Tópico criado
 * @apiSuccess (POST 201) {string} topic.id ID do novo tópico
 * @apiSuccess (POST 201) {string} topic.nome Nome do tópico
 * @apiSuccess (POST 201) {string} topic.cor Cor do tópico
 * 
 * @apiSuccessExample {json} GET Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "id": "1",
 *         "nome": "Trabalho",
 *         "cor": "#FF5733",
 *         "UtilizadorID": 123
 *       }
 *     ]
 * 
 * @apiSuccessExample {json} POST Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "id": "2",
 *       "nome": "Pessoal",
 *       "cor": "#33C3F0"
 *     }
 * 
 * @apiError (400) ValidationError Dados inválidos para criação
 * @apiError (401) Unauthorized Token de autenticação inválido
 * @apiError (405) MethodNotAllowed Método HTTP não permitido
 * @apiError (500) InternalError Erro interno do servidor
 * 
 * @description Endpoint central para CRUD de tópicos com validação de propriedade
 * @requires authMiddleware Token JWT válido
 */
const handler = async (req, res) => {
  // Extração do ID do usuário autenticado via authMiddleware
  const utilizadorId = req.userId;

  if (req.method === 'GET') {
    try {
      // Busca tópicos específicos do usuário autenticado
      // Garante isolamento de dados entre usuários
      const topicos = await TopicoService.getByUtilizadorId(utilizadorId);
      
      // Fallback graceful: retorna array vazio se não há tópicos
      // Evita quebrar interface quando usuário não tem tópicos ainda
      res.status(200).json(topicos || []);
    } catch (error) {
      // Error handling graceful para GET: retorna array vazio
      // Interface continua funcionando mesmo com problemas na API
      console.log('Erro ao buscar tópicos:', error);
      res.status(200).json([]); // UX-friendly: não quebra a interface
    }
  } else if (req.method === 'POST') {
    try {
      // Extração de dados do corpo da requisição
      const { nome, cor } = req.body;
      
      // Criação de tópico com validação automática de propriedade
      // utilizadorId é injetado automaticamente para security
      const novoTopico = await TopicoService.create({ nome, cor, utilizadorId });
      
      // Response com status 201 Created para nova entidade
      res.status(201).json(novoTopico);
    } catch (error) {
      // Error handling rigoroso para POST: retorna erro real
      // Usuário precisa saber se criação falhou
      res.status(500).json({ message: error.message });
    }
  } else {
    // Method not allowed: informa métodos suportados
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default authMiddleware(handler);
