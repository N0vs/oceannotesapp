import authMiddleware from '../../../middlewares/authMiddleware';

/**
 * API de teste para verificar se o frontend está chamando a API de usuários compartilhados
 * GET /api/notas/test-shared
 */
async function handler(req, res) {
  console.log('=== API TEST-SHARED CHAMADA ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  console.log('userId:', req.userId);

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Retornar dados de teste
  const testData = [
    {
      Id: 2,
      Nome: 'Usuário Teste',
      Email: 'teste@email.com',
      TipoPermissao: 'visualizar',
      DataCompartilhamento: new Date().toISOString()
    }
  ];

  console.log('Retornando dados de teste:', testData);
  
  res.status(200).json(testData);
}

export default authMiddleware(handler);
