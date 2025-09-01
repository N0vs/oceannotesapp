import mysql from 'mysql2/promise';

let pool;

export async function connectToDatabase() {
  if (pool) {
    try {
      // Testar se o pool ainda está funcionando
      const connection = await pool.getConnection();
      connection.release();
      return pool;
    } catch (error) {
      console.log('Pool existente com problema, recriando...');
      await closeConnection();
    }
  }

  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'oceannotes',
      charset: 'utf8mb4',
      connectionLimit: 5, // Reduzido para 5
      acquireTimeout: 30000, // Reduzido para 30s
      timeout: 30000,
      reconnect: true,
      idleTimeout: 300000, // 5 minutos
      maxIdle: 2 // Máximo de 2 conexões idle
    });

    console.log('Pool de conexões com banco de dados criado');
    return pool;
  } catch (error) {
    console.error('Erro ao criar pool de conexões:', error);
    throw error;
  }
}

export async function closeConnection() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Pool de conexões fechado');
  }
}

// Wrapper para executar queries com tratamento de erro e retry
export async function executeQuery(query, params = []) {
  const pool = await connectToDatabase();
  let connection;
  
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute(query, params);
    return results;
  } catch (error) {
    console.error('Erro ao executar query:', error);
    
    // Se for erro de conexão, tentar recriar o pool
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
      console.log('Recriando pool de conexões...');
      await closeConnection();
      const newPool = await connectToDatabase();
      connection = await newPool.getConnection();
      const [results] = await connection.execute(query, params);
      return results;
    }
    
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export default { connectToDatabase, closeConnection, executeQuery };
