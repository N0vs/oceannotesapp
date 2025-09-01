# Guia de Deploy - Sistema de Sincronização OceanNotes

## Pré-requisitos

### Sistema
- Node.js 18+ 
- MySQL 8.0+
- npm ou yarn

### Dependências
```bash
npm install ws
```

## 1. Configuração do Banco de Dados

### Aplicar Schema de Sincronização
```sql
-- Executar o arquivo de schema
SOURCE database_sync_schema.sql;
```

### Verificar Tabelas Criadas
```sql
SHOW TABLES LIKE 'Nota%';
-- Deve mostrar:
-- NotaVersao
-- NotaCompartilhamento  
-- NotaHistorico
-- NotaConflito
-- NotaSessaoEdicao
-- NotaSincronizacaoOffline
-- NotaDispositivo
```

## 2. Configuração de Ambiente

### Variáveis de Ambiente
Criar arquivo `.env.local`:
```env
# Banco de Dados
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=oceannotes

# JWT
JWT_SECRET=sua_chave_secreta_muito_segura

# WebSocket
WS_PORT=3001
```

## 3. Inicialização dos Serviços

### Servidor Principal (Next.js)
```bash
npm run dev
# ou para produção
npm run build
npm start
```

### Servidor WebSocket
```bash
# Em terminal separado
node websocket-server.js
```

## 4. Verificação da Instalação

### Testar Endpoints de API
```bash
# Verificar sincronização
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/sync/status

# Verificar conflitos
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/conflicts/pending

# Verificar compartilhamento
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/notas/shared-with-me
```

### Testar WebSocket
```javascript
// No console do navegador
const ws = new WebSocket('ws://localhost:3001/ws?token=SEU_TOKEN&userId=1&deviceId=test');
ws.onopen = () => console.log('WebSocket conectado');
ws.onmessage = (e) => console.log('Mensagem:', JSON.parse(e.data));
```

## 5. Configuração de Produção

### PM2 para Processos
```bash
npm install -g pm2

# Arquivo ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'oceannotes-web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'oceannotes-ws',
      script: 'websocket-server.js',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 3001
      }
    }
  ]
};

# Iniciar serviços
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx (Proxy Reverso)
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Aplicação Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 6. Monitoramento

### Logs de Sistema
```bash
# Logs do WebSocket
tail -f logs/websocket.log

# Logs do Next.js
pm2 logs oceannotes-web

# Logs de sincronização
tail -f logs/sync.log
```

### Métricas de Performance
```sql
-- Conflitos por dia
SELECT DATE(DataDeteccao) as data, COUNT(*) as conflitos
FROM NotaConflito 
WHERE DataDeteccao >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(DataDeteccao);

-- Sincronizações pendentes
SELECT StatusSincronizacao, COUNT(*) as quantidade
FROM NotaSincronizacaoOffline
GROUP BY StatusSincronizacao;

-- Usuários ativos (últimas 24h)
SELECT COUNT(DISTINCT UtilizadorID) as usuarios_ativos
FROM NotaSessaoEdicao
WHERE DataUltimaAtividade >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

## 7. Backup e Recuperação

### Backup Automático
```bash
#!/bin/bash
# backup-oceannotes.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/oceannotes"

# Backup do banco
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# Backup de arquivos
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /path/to/oceannotes

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### Cron Job
```bash
# Adicionar ao crontab
0 2 * * * /path/to/backup-oceannotes.sh
```

## 8. Troubleshooting

### Problemas Comuns

#### WebSocket não conecta
```bash
# Verificar se porta está aberta
netstat -tlnp | grep 3001

# Verificar logs
tail -f logs/websocket.log

# Testar conectividade
telnet localhost 3001
```

#### Sincronização travada
```sql
-- Verificar itens pendentes
SELECT * FROM NotaSincronizacaoOffline 
WHERE StatusSincronizacao = 'pendente' 
AND Tentativas >= 3;

-- Resetar tentativas
UPDATE NotaSincronizacaoOffline 
SET Tentativas = 0, StatusSincronizacao = 'pendente'
WHERE StatusSincronizacao = 'falha';
```

#### Conflitos não resolvidos
```sql
-- Listar conflitos antigos
SELECT * FROM NotaConflito 
WHERE StatusConflito = 'pendente' 
AND DataDeteccao < DATE_SUB(NOW(), INTERVAL 24 HOUR);

-- Resolver automaticamente conflitos antigos
UPDATE NotaConflito 
SET StatusConflito = 'resolvido_automatico'
WHERE StatusConflito = 'pendente' 
AND DataDeteccao < DATE_SUB(NOW(), INTERVAL 7 DAY);
```

## 9. Segurança

### Configurações Recomendadas
```javascript
// Rate limiting para WebSocket
const rateLimit = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = rateLimit.get(userId) || { count: 0, resetTime: now + 60000 };
  
  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + 60000;
  }
  
  userLimit.count++;
  rateLimit.set(userId, userLimit);
  
  return userLimit.count <= 100; // 100 mensagens por minuto
}
```

### Auditoria
```sql
-- Criar tabela de auditoria
CREATE TABLE AuditoriaAcesso (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  UtilizadorID INT,
  Acao VARCHAR(50),
  RecursoID INT,
  TipoRecurso VARCHAR(20),
  EnderecoIP VARCHAR(45),
  UserAgent TEXT,
  DataAcesso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuario_data (UtilizadorID, DataAcesso)
);
```

## 10. Atualizações

### Deploy de Nova Versão
```bash
#!/bin/bash
# deploy.sh

# Backup antes da atualização
./backup-oceannotes.sh

# Parar serviços
pm2 stop oceannotes-web oceannotes-ws

# Atualizar código
git pull origin main
npm install

# Aplicar migrações de banco se necessário
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < migrations/latest.sql

# Build da aplicação
npm run build

# Reiniciar serviços
pm2 start oceannotes-web oceannotes-ws

# Verificar saúde dos serviços
sleep 10
pm2 status
```

### Rollback
```bash
#!/bin/bash
# rollback.sh

# Parar serviços
pm2 stop oceannotes-web oceannotes-ws

# Voltar para versão anterior
git checkout HEAD~1

# Restaurar banco se necessário
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < /backups/oceannotes/db_backup.sql

# Reinstalar dependências
npm install
npm run build

# Reiniciar serviços
pm2 start oceannotes-web oceannotes-ws
```

## Suporte

Para problemas ou dúvidas:
1. Verificar logs de sistema
2. Consultar métricas de performance
3. Revisar configurações de ambiente
4. Testar conectividade de rede

O sistema foi projetado para ser resiliente e auto-recuperável, mas monitoramento ativo é recomendado para ambientes de produção.
