const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('A tentar conectar à base de dados...');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'oceannotes',
    });

    console.log('Conexão bem-sucedida!');
    const [rows] = await connection.execute('SELECT 1 + 1 AS solution');
    console.log('Teste de query bem-sucedido. Resultado:', rows[0].solution);

  } catch (error) {
    console.error('Falha na conexão com a base de dados:');
    if (error.code === 'ECONNREFUSED') {
      console.error('ERRO: O servidor MySQL parece estar desligado. Por favor, inicie o seu XAMPP/WAMP.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('ERRO: Acesso negado. Verifique o utilizador e a palavra-passe no ficheiro test_db.js.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('ERRO: A base de dados \'oceannotes\' não foi encontrada. Por favor, crie-a no seu phpMyAdmin.');
    } else {
      console.error(error);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexão fechada.');
    }
  }
}

testConnection();
