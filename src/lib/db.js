import mysql from 'mysql2/promise';

let pool;

/**
 * Conecta ao banco de dados MySQL com pool de conexões reutilizável
 * Implementa singleton pattern e health check para conexões existentes
 * 
 * @async
 * @function connectToDatabase
 * @returns {Promise<mysql.Pool>} Pool de conexões MySQL configurado
 * 
 * @description Função principal para conectar ao banco de dados que:
 * - Implementa pattern Singleton para reutilizar pool existente
 * - Realiza health check em pools existentes antes de retornar
 * - Recria automaticamente pools com falha de conexão
 * - Configura pool otimizado com limites e timeouts apropriados
 * - Usa variáveis de ambiente para configuração flexível
 * 
 * @example
 * const db = await connectToDatabase();
 * const [results] = await db.query('SELECT * FROM Nota WHERE id = ?', [123]);
 * 
 * @throws {Error} Erro de conexão com banco de dados
 * 
 * @configuration
 * Environment variables:
 * - DB_HOST: Host do banco (default: localhost)
 * - DB_USER: Usuário do banco (default: root)
 * - DB_PASSWORD: Senha do banco (default: '')
 * - DB_NAME: Nome do banco (default: oceannotes)
 * 
 * Pool settings:
 * - connectionLimit: 10 (máximo de conexões simultâneas)
 * - queueLimit: 0 (sem limite de fila)
 * - idleTimeout: 300000ms (5 minutos)
 * - keepAlive: habilitado para manter conexões vivas
 */
export async function connectToDatabase() {
  // Singleton pattern: reutiliza pool existente se disponível
  // Evita criar múltiplos pools desnecessários na aplicação
  if (pool) {
    try {
      // Health check: testa se pool existente ainda está funcional
      // getConnection() verifica se MySQL ainda está acessível
      const connection = await pool.getConnection();
      connection.release(); // Importante: libera conexão de volta ao pool
      return pool; // Pool saudável - reutiliza
    } catch (error) {
      // Pool com falha: cleanup e recriação necessária
      await closeConnection();
    }
  }

  try {
    // Criação de novo pool com configurações otimizadas
    pool = mysql.createPool({
      // Configuração de conexão via environment variables
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root', 
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'oceannotes',
      
      // Charset UTF8MB4: suporte completo Unicode (emojis, caracteres especiais)
      charset: 'utf8mb4',
      
      // Pool configuration: otimizado para aplicação média
      connectionLimit: 10, // Máximo de 10 conexões simultâneas
      queueLimit: 0, // Sem limite de fila (pode gerar erro se saturado)
      
      // Timeout configuration: evita conexões órfãs
      idleTimeout: 300000, // 5 minutos - fecha conexões idle
      
      // Keep-alive: mantém conexões TCP vivas
      enableKeepAlive: true, // Previne timeouts de rede
      keepAliveInitialDelay: 0 // Sem delay para iniciar keep-alive
    });

    return pool;
  } catch (error) {
    // Re-throw error: permite handling específico na aplicação
    throw error;
  }
}

/**
 * Fecha todas as conexões do pool e limpa recursos
 * Usado para cleanup graceful da aplicação
 * 
 * @async
 * @function closeConnection
 * @returns {Promise<void>}
 * 
 * @description Função para encerramento limpo do pool de conexões:
 * - Fecha todas as conexões ativas e idle no pool
 * - Limpa a referência global do pool (singleton cleanup)
 * - Aguarda finalização completa antes de retornar
 * - Safe para chamar múltiplas vezes (idempotente)
 * 
 * @example
 * // Cleanup durante shutdown da aplicação
 * process.on('SIGTERM', async () => {
 *   await closeConnection();
 *   process.exit(0);
 * });
 */
export async function closeConnection() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Executa queries SQL com tratamento de erro automático e retry
 * Wrapper inteligente com recuperação automática de conexões perdidas
 * 
 * @async
 * @function executeQuery
 * @param {string} query - Query SQL com placeholders (?)
 * @param {Array} [params=[]] - Parâmetros para prepared statement
 * @returns {Promise<Array>} Resultados da query
 * 
 * @description Wrapper de alto nível para execução de queries que:
 * - Obtém conexão automaticamente do pool
 * - Usa prepared statements para segurança (SQL injection prevention)
 * - Implementa retry automático para erros de conexão
 * - Gerencia release de conexões automaticamente
 * - Trata códigos de erro específicos do MySQL
 * 
 * @example
 * // Select com parâmetros
 * const notas = await executeQuery(
 *   'SELECT * FROM Nota WHERE UtilizadorID = ?',
 *   [userId]
 * );
 * 
 * @example
 * // Insert com múltiplos parâmetros
 * const result = await executeQuery(
 *   'INSERT INTO Nota (titulo, conteudo, UtilizadorID) VALUES (?, ?, ?)',
 *   ['Título', 'Conteúdo', 123]
 * );
 * 
 * @throws {Error} Erros de SQL ou conexão (após tentativas de retry)
 * 
 * @recovery Códigos de erro com retry automático:
 * - PROTOCOL_CONNECTION_LOST: Conexão perdida com servidor
 * - ER_TOO_MANY_USER_CONNECTIONS: Limite de conexões atingido
 */
export async function executeQuery(query, params = []) {
  // Garantia de pool ativo: obtém pool válido (ou cria novo)
  const pool = await connectToDatabase();
  let connection;
  
  try {
    // Obtém conexão do pool: pode bloquear se pool saturado
    // Conexão dedicada para esta query específica
    connection = await pool.getConnection();
    
    // Execute com prepared statement: proteção contra SQL injection
    // Destructuring: [results, fields] - só precisamos dos resultados
    const [results] = await connection.execute(query, params);
    return results;
  } catch (error) {
    // Recovery logic: tenta recriar pool para erros específicos de conexão
    // Estes códigos indicam problemas de conectividade, não queries inválidas
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
      
      // Cleanup do pool problemático
      await closeConnection();
      
      // Retry com novo pool: segunda (e última) tentativa
      const newPool = await connectToDatabase();
      connection = await newPool.getConnection();
      const [results] = await connection.execute(query, params);
      return results;
    }
    
    // Error passthrough: erros de SQL/sintaxe não têm recovery
    // Exemplos: syntax error, constraint violation, etc.
    throw error;
  } finally {
    // Cleanup garantido: sempre libera conexão de volta ao pool
    // Crítico para evitar connection leaks
    if (connection) {
      connection.release(); // Retorna conexão ao pool para reuso
    }
  }
}

export default { connectToDatabase, closeConnection, executeQuery };
