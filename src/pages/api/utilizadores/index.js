import UtilizadorService from '../../../services/UtilizadorService.js';

/**
 * API endpoint para registro de novos usuários
 * Processa criação de contas com validação e tratamento de duplicatas
 * 
 * @api {POST} /api/utilizadores Registrar novo usuário
 * @apiName RegisterUser
 * @apiGroup Users
 * @apiVersion 1.0.0
 * 
 * @apiParam {string} Nome Nome completo do usuário
 * @apiParam {string} Email Email único para login
 * @apiParam {string} Password Senha em texto plano (será criptografada)
 * @apiParam {string} [telefone] Telefone do usuário (opcional)
 * @apiParam {string} [endereco] Endereço do usuário (opcional)
 * 
 * @apiSuccess {Object} user Usuário criado
 * @apiSuccess {string} user.id ID único do usuário
 * @apiSuccess {string} user.Nome Nome do usuário
 * @apiSuccess {string} user.Email Email do usuário
 * @apiSuccess {string} user.dataCriacao Data de criação da conta
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "id": "123",
 *       "Nome": "João Silva",
 *       "Email": "joao@example.com",
 *       "dataCriacao": "2023-10-15T11:19:00Z"
 *     }
 * 
 * @apiError (400) ValidationError Dados inválidos fornecidos
 * @apiError (409) EmailExists E-mail fornecido já está em uso
 * @apiError (405) MethodNotAllowed Método HTTP não permitido
 * @apiError (500) InternalError Erro interno do servidor
 * 
 * @apiErrorExample {json} Email Exists:
 *     HTTP/1.1 409 Conflict
 *     {
 *       "message": "E-mail fornecido já está em uso"
 *     }
 * 
 * @apiErrorExample {json} Validation Error:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "message": "Erro ao criar utilizador",
 *       "error": "Nome é obrigatório"
 *     }
 * 
 * @description Endpoint público para registro de novos usuários com hash seguro de senhas
 * @note Não requer autenticação (endpoint público para registro)
 */
export default async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      try {
        // Debug logging: registra dados recebidos para auditoria e debug
        // Importante para rastreamento de problemas de registro
        console.log('Dados recebidos para registro:', req.body);
        
        // Delegação para UtilizadorService: service handle validações e hash de senha
        // Service layer garante business rules e data integrity
        const novoUtilizador = await UtilizadorService.create(req.body);
        
        // Success logging: confirma criação bem-sucedida
        console.log('Utilizador criado com sucesso:', novoUtilizador);
        
        // Response 201 Created: status correto para nova entidade criada
        res.status(201).json(novoUtilizador);
      } catch (error) {
        // Error logging: captura todos os erros para debugging
        console.log('Erro no registro:', error);
        
        // Tratamento específico para email duplicado: 409 Conflict
        // Business rule importante: emails devem ser únicos no sistema
        if (error.message.includes('e-mail fornecido já está em uso')) {
          return res.status(409).json({ message: error.message });
        }
        
        // Erro genérico de validação: 400 Bad Request
        // Inclui detalhes do erro para debug do cliente
        res.status(400).json({ 
          message: 'Erro ao criar utilizador', 
          error: error.message 
        });
      }
      break;
    default:
      // Method not allowed: endpoint só aceita POST para registro
      // GET não implementado por questões de privacidade (não listar usuários)
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
