import NotaService from '../../../services/NotaService.js';
import NoteSharingService from '../../../services/NoteSharingService.js';
import NoteHistoryService from '../../../services/NoteHistoryService.js';
import { connectToDatabase } from '../../../lib/db.js';
import authMiddleware from '../../../middlewares/authMiddleware.js';

/**
 * API endpoint principal para operações de notas
 * Gerencia listagem e criação de notas com informações de compartilhamento
 * 
 * @api {GET,POST} /api/notas Operações principais de notas
 * @apiName NotesMain
 * @apiGroup Notes
 * @apiVersion 1.0.0
 * 
 * @apiHeader {string} Authorization Bearer token JWT
 * 
 * @apiSuccess (GET 200) {Array} notes Lista completa de notas do usuário
 * @apiSuccess (GET 200) {Object} notes.note Dados da nota individual
 * @apiSuccess (GET 200) {boolean} notes.note.isOwned Indica se é proprietário da nota
 * @apiSuccess (GET 200) {boolean} notes.note.isShared Indica se é nota compartilhada
 * @apiSuccess (GET 200) {Array} notes.note.sharedWith Lista de usuários com acesso
 * @apiSuccess (GET 200) {number} notes.note.sharedCount Número de pessoas com acesso
 * @apiSuccess (GET 200) {string} notes.note.permission Tipo de permissão na nota
 * @apiSuccess (GET 200) {string} notes.note.lastModifiedBy Nome do último modificador
 * 
 * @apiParam (POST) {string} titulo Título da nota
 * @apiParam (POST) {string} conteudo Conteúdo da nota em HTML
 * @apiParam (POST) {Array} [topicos] Array de IDs de tópicos associados
 * 
 * @apiSuccess (POST 201) {Object} note Nota criada
 * @apiSuccess (POST 201) {string} note.id ID da nova nota
 * @apiSuccess (POST 201) {string} note.titulo Título da nota
 * @apiSuccess (POST 201) {string} note.conteudo Conteúdo da nota
 * 
 * @apiSuccessExample {json} GET Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "id": "123",
 *         "titulo": "Minha Nota",
 *         "isOwned": true,
 *         "isShared": false,
 *         "sharedWith": [],
 *         "sharedCount": 0,
 *         "lastModifiedBy": "João Silva"
 *       }
 *     ]
 * 
 * @apiError (400) ValidationError Dados inválidos para criação
 * @apiError (401) Unauthorized Token de autenticação inválido
 * @apiError (405) MethodNotAllowed Método HTTP não permitido
 * @apiError (500) InternalError Erro interno do servidor
 * 
 * @description Endpoint central para CRUD de notas com enriquecimento de dados de compartilhamento
 * @requires authMiddleware Token JWT válido
 */
async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      const utilizadorId = req.userId;

      try {
        // Buscar notas próprias
        const minhasNotas = await NotaService.getByUtilizadorId(utilizadorId);
        
        // Buscar notas compartilhadas comigo
        const db = await connectToDatabase();
        const historyService = new NoteHistoryService(db);
        const sharingService = new NoteSharingService(db, historyService);
        const notasCompartilhadas = await sharingService.getSharedNotes(utilizadorId);
        
        // Enriquecer notas próprias com informações de compartilhamento e histórico
        const minhasNotasEnriquecidas = await Promise.all(
          minhasNotas.map(async (nota) => {
            // Buscar usuários com quem a nota foi compartilhada
            const usuariosCompartilhados = await sharingService.getNoteSharedUsers(nota.id);
            
            // Buscar informações do último modificador
            let ultimoModificador = null;
            if (nota.UltimoModificadorID) {
              const [modificadorData] = await db.query(
                'SELECT Nome FROM Utilizador WHERE Id = ?',
                [nota.UltimoModificadorID]
              );
              ultimoModificador = modificadorData[0]?.Nome || null;
            }
            
            return {
              ...nota,
              isOwned: true,
              sharedWith: usuariosCompartilhados,
              sharedCount: usuariosCompartilhados.length,
              lastModifiedBy: ultimoModificador,
              lastModifiedDate: nota.UltimaModificacao
            };
          })
        );
        
        // Marcar notas compartilhadas para diferenciá-las na interface
        const notasCompartilhadasMarcadas = notasCompartilhadas.map(nota => ({
          ...nota,
          isShared: true,
          isOwned: false,
          sharedBy: nota.ProprietarioNome,
          permission: nota.TipoPermissao,
          sharedWith: [], // Usuário não pode ver com quem mais foi compartilhada
          sharedCount: 0,
          lastModifiedBy: nota.UltimoModificadorID ? 'Desconhecido' : null,
          lastModifiedDate: nota.UltimaModificacao
        }));
        
        // Combinar todas as notas
        const todasAsNotas = [...minhasNotasEnriquecidas, ...notasCompartilhadasMarcadas];
        
        res.status(200).json(todasAsNotas);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar as notas.', error: error.message });
      }
      break;
    case 'POST':
      try {
        // O ID do usuário vem do token JWT, decodificado pelo middleware
        const utilizadorId = req.userId;
        
        
        if (!utilizadorId) {
          return res.status(400).json({ message: 'ID do usuário não encontrado no token' });
        }
        
        const novaNota = await NotaService.createWithConsistentFields(req.body, utilizadorId);
        res.status(201).json(novaNota);
      } catch (error) {
        console.error('Erro ao criar nota:', error);
        res.status(400).json({ message: 'Erro ao criar nota', error: error.message });
      }
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default authMiddleware(handler);
