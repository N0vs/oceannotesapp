# API Notas

Esta pasta contém todos os endpoints para operações de notas da aplicação Ocean Notes, implementando CRUD completo, compartilhamento colaborativo e sistema de permissões granular.

## Estrutura e Responsabilidades

### Arquitetura de Notas

O sistema de notas implementa funcionalidades avançadas:
- **CRUD completo** com validações e controle de acesso
- **Compartilhamento colaborativo** com níveis de permissão
- **Sistema de convites** baseado em tokens seguros
- **Histórico de modificações** e auditoria
- **Filtros avançados** por conteúdo, tags e datas
- **Permissões granulares** (visualizar, editar, admin, proprietário)
- **Sincronização em tempo real** entre colaboradores

### Endpoints Principais

#### Operações Básicas

**index.js**
- `GET /api/notas` - Lista todas as notas do usuário (próprias + compartilhadas)
- `POST /api/notas` - Cria nova nota com tópicos associados
- Enriquece dados com informações de compartilhamento
- Diferencia notas próprias de compartilhadas

**[id].js**
- `GET /api/notas/:id` - Busca nota específica com validação de acesso
- `PUT /api/notas/:id` - Atualiza nota existente
- `DELETE /api/notas/:id` - Remove nota (apenas proprietários)
- Controle rigoroso de permissões

#### Sistema de Compartilhamento

**share.js**
- `POST /api/notas/share` - Compartilha nota com usuário via email
- Geração de tokens de convite seguros
- Suporte a diferentes níveis de permissão
- Integração com sistema de notificações

**unshare.js**
- `POST /api/notas/unshare` - Remove acesso de usuário à nota
- Validação de permissões do solicitante
- Auditoria de remoções de acesso

**permissions.js**
- `GET /api/notas/permissions` - Lista permissões detalhadas
- `POST /api/notas/permissions` - Gerencia permissões em massa
- Sistema hierárquico de permissões

**update-permission.js**
- `PUT /api/notas/update-permission` - Atualiza nível de acesso
- Validação de hierarquia de permissões
- Prevenção de auto-remoção de proprietários

#### Listagem e Filtros

**filtered.js**
- `POST /api/notas/filtered` - Busca avançada com múltiplos filtros
- Filtros por título, conteúdo, tags, data
- Suporte a busca full-text
- Ordenação customizável

**shared.js**
- `GET /api/notas/shared` - Lista notas que o usuário compartilhou
- Informações de usuários com acesso
- Status de convites pendentes

**shared-with-me.js**
- `GET /api/notas/shared-with-me` - Lista notas compartilhadas com o usuário
- Informações do proprietário
- Níveis de permissão do usuário

**my-shared.js**
- `GET /api/notas/my-shared` - Lista detalhada de compartilhamentos próprios
- Estatísticas de colaboração
- Gestão de acessos ativos

#### Endpoints de Detalhes por Nota

**[id]/permission.js**
- `GET /api/notas/:id/permission` - Verifica permissão específica na nota
- Validação rápida para interface

**[id]/shared-users.js**
- `GET /api/notas/:id/shared-users` - Lista usuários com acesso à nota
- Detalhes de permissões por usuário
- Histórico de convites

**[id]/sharing-details.js**
- `GET /api/notas/:id/sharing-details` - Detalhes completos de compartilhamento
- Estatísticas de colaboração
- Logs de atividade

**[id]/quick-share-info.js**
- `GET /api/notas/:id/quick-share-info` - Informações rápidas para compartilhamento
- Interface otimizada para modais
- Dados mínimos necessários

#### Endpoints de Teste e Debug

**test-shared.js**
- `GET /api/notas/test-shared` - Endpoint para testes de compartilhamento
- Validação de integridade do sistema
- Debug de permissões

## Funcionalidades Detalhadas

### Sistema de Permissões

**Hierarquia de Permissões**
```
proprietário > admin > editar > visualizar
```

**Capacidades por Nível**
- **visualizar**: Apenas leitura da nota
- **editar**: Leitura e modificação de conteúdo
- **admin**: Edição + gerenciamento de compartilhamentos
- **proprietário**: Controle total + exclusão

**Validação de Permissões**
```javascript
const validatePermission = async (userId, noteId, requiredLevel) => {
  const userPermission = await getUserNotePermission(userId, noteId);
  return isPermissionSufficient(userPermission, requiredLevel);
};
```

### Sistema de Compartilhamento

**Fluxo de Convite**
1. Usuário solicita compartilhamento via email
2. Sistema verifica se destinatário existe
3. Gera token seguro de convite
4. Envia email com link de aceitação
5. Destinatário aceita e ganha acesso
6. Auditoria registra toda a transação

**Tokens de Convite**
```javascript
const inviteToken = crypto.randomBytes(32).toString('hex');
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
```

### Filtros Avançados

**Tipos de Filtro Suportados**
- **Texto**: Busca em título e conteúdo
- **Tags**: Filtro por tópicos associados
- **Data**: Criação, modificação, período customizado
- **Usuário**: Notas de colaboradores específicos
- **Permissão**: Nível de acesso do usuário
- **Status**: Ativa, arquivada, compartilhada

**Query de Filtro Complexo**
```sql
SELECT n.*, u.Nome as ProprietarioNome
FROM Nota n
LEFT JOIN Utilizador u ON n.UtilizadorID = u.Id
LEFT JOIN NotaCompartilhamento nc ON n.id = nc.NotaID
LEFT JOIN NotaTopico nt ON n.id = nt.NotaID
WHERE (n.titulo LIKE ? OR n.conteudo LIKE ?)
  AND (? IS NULL OR nt.TopicoID IN (?))
  AND n.dataCriacao BETWEEN ? AND ?
  AND (n.UtilizadorID = ? OR nc.UsuarioCompartilhadoID = ?)
GROUP BY n.id
ORDER BY n.UltimaModificacao DESC
```

## Integração com Services

### NotaService Integration

**Operações Básicas**
```javascript
// Criar nota com tópicos
const nota = await NotaService.createWithConsistentFields({
  titulo: 'Nova Nota',
  conteudo: '<p>Conteúdo HTML</p>',
  topicos: [1, 2, 3]
}, userId);

// Buscar com enriquecimento
const notas = await NotaService.getEnrichedNotes(userId);
```

### NoteSharingService Integration

**Compartilhamento Seguro**
```javascript
const sharing = await NoteSharingService.shareNote({
  noteId: '123',
  userEmail: 'user@example.com',
  permission: 'editar',
  message: 'Mensagem opcional'
});
```

### Auditoria e Histórico

**Registro de Atividades**
```javascript
await NoteHistoryService.logActivity({
  noteId: '123',
  userId: 'user456',
  action: 'share',
  details: { 
    targetUser: 'shared@example.com',
    permission: 'editar'
  }
});
```

## Segurança e Validações

### Controle de Acesso

**Middleware de Autenticação**
- Todos os endpoints protegidos por authMiddleware
- Validação de JWT tokens
- Extração de userId dos claims

**Validação de Propriedade**
```javascript
const isOwner = await validateNoteOwnership(userId, noteId);
if (!isOwner && requiredPermission === 'delete') {
  return res.status(403).json({ message: 'Apenas proprietários podem excluir' });
}
```

### Sanitização de Dados

**Input Validation**
```javascript
const validateNoteData = (data) => {
  const { titulo, conteudo } = data;
  
  if (!titulo?.trim()) {
    throw new Error('Título é obrigatório');
  }
  
  if (titulo.length > 255) {
    throw new Error('Título muito longo');
  }
  
  // Sanitizar HTML do conteúdo
  const sanitizedContent = sanitizeHtml(conteudo);
  
  return { titulo: titulo.trim(), conteudo: sanitizedContent };
};
```

### Prevenção de Ataques

**SQL Injection Prevention**
- Prepared statements em todas as queries
- Parametrização de consultas dinâmicas
- Validação de tipos de dados

**XSS Protection**
- Sanitização de conteúdo HTML
- Escape de caracteres especiais
- Validação de entrada no frontend

## Performance e Otimização

### Database Optimization

**Índices Estratégicos**
```sql
-- Otimização para listagem de notas
CREATE INDEX idx_nota_usuario_data ON Nota(UtilizadorID, UltimaModificacao DESC);

-- Otimização para compartilhamentos
CREATE INDEX idx_compartilhamento_ativo ON NotaCompartilhamento(UsuarioCompartilhadoID, Ativo);

-- Otimização para busca por tópicos
CREATE INDEX idx_nota_topico ON NotaTopico(TopicoID, NotaID);
```

**Query Optimization**
- JOINs otimizados para busca de dados relacionados
- LIMIT e OFFSET para paginação
- Agregações eficientes para contadores

### Caching Strategy

**Application-Level Cache**
```javascript
const getCachedNotePermission = async (userId, noteId) => {
  const cacheKey = `permission:${userId}:${noteId}`;
  let permission = cache.get(cacheKey);
  
  if (!permission) {
    permission = await calculatePermission(userId, noteId);
    cache.set(cacheKey, permission, 300); // 5 minutos
  }
  
  return permission;
};
```

### Pagination

**Efficient Pagination**
```javascript
const getPaginatedNotes = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  
  const [notes, [{ total }]] = await Promise.all([
    db.query('SELECT * FROM Nota WHERE UtilizadorID = ? LIMIT ? OFFSET ?', 
             [userId, limit, offset]),
    db.query('SELECT COUNT(*) as total FROM Nota WHERE UtilizadorID = ?', 
             [userId])
  ]);
  
  return {
    notes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};
```

## Tratamento de Erros

### Tipos de Erro Específicos

**Business Logic Errors**
- Permissões insuficientes
- Nota não encontrada
- Usuário já tem acesso
- Limite de compartilhamentos atingido

**Data Validation Errors**
- Formato de email inválido
- Título muito longo
- Conteúdo vazio
- Tópicos inexistentes

### Error Response Format

**Padrão de Resposta**
```json
{
  "success": false,
  "message": "Descrição do erro",
  "code": "ERROR_CODE",
  "details": {
    "field": "campo com erro",
    "expected": "valor esperado"
  }
}
```

**Error Handling Middleware**
```javascript
const handleNotaErrors = (error, req, res, next) => {
  if (error.name === 'PermissionError') {
    return res.status(403).json({
      success: false,
      message: 'Permissão insuficiente',
      code: 'INSUFFICIENT_PERMISSION'
    });
  }
  
  // Handle other errors...
};
```

## Monitoramento e Métricas

### Key Performance Indicators

**Métricas de Uso**
- Número de notas criadas por dia
- Taxa de compartilhamento
- Tempo médio de resposta por endpoint
- Distribuição de tipos de permissão

**Métricas de Colaboração**
- Notas mais compartilhadas
- Usuários mais ativos em colaboração
- Tempo médio entre criação e compartilhamento
- Taxa de aceitação de convites

### Logging Strategy

**Structured Logging**
```javascript
const logNoteActivity = (activity) => {
  logger.info('Note activity', {
    userId: activity.userId,
    noteId: activity.noteId,
    action: activity.action,
    timestamp: new Date().toISOString(),
    metadata: activity.metadata
  });
};
```

## Estrutura de Arquivos

```
notas/
├── README.md                # Este documento
├── index.js                # CRUD principal (GET/POST)
├── [id].js                 # Operações por ID (GET/PUT/DELETE)
├── filtered.js             # Busca com filtros avançados
├── share.js                # Compartilhar nota
├── unshare.js              # Remover compartilhamento
├── permissions.js          # Gestão de permissões
├── update-permission.js    # Atualizar permissão específica
├── shared.js               # Notas compartilhadas pelo usuário
├── shared-with-me.js       # Notas compartilhadas com o usuário
├── my-shared.js            # Detalhes de compartilhamentos próprios
├── test-shared.js          # Endpoint de teste
└── [id]/
    ├── permission.js       # Verificar permissão específica
    ├── shared-users.js     # Usuários com acesso à nota
    ├── sharing-details.js  # Detalhes completos de compartilhamento
    └── quick-share-info.js # Informações rápidas para UI
```

## Padrões de Uso

### Frontend Integration

**Note CRUD Operations**
```javascript
// Criar nova nota
const createNote = async (noteData) => {
  const response = await fetch('/api/notas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(noteData),
  });
  
  return response.json();
};

// Carregar notas do usuário
const loadUserNotes = async () => {
  const response = await fetch('/api/notas', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

**Sharing Operations**
```javascript
// Compartilhar nota
const shareNote = async (noteId, userEmail, permission) => {
  const response = await fetch('/api/notas/share', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ noteId, userEmail, permission }),
  });
  
  return response.json();
};

// Verificar permissão
const checkPermission = async (noteId) => {
  const response = await fetch(`/api/notas/${noteId}/permission`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

### Real-time Integration

**WebSocket Notifications**
```javascript
// Cliente recebe notificação de compartilhamento
socket.on('note:shared', (data) => {
  showNotification(`Nota "${data.noteTitle}" foi compartilhada com você`);
  refreshNotesList();
});

// Cliente recebe atualização de colaboração
socket.on('note:updated', (data) => {
  if (currentNoteId === data.noteId) {
    handleCollaborativeUpdate(data);
  }
});
```

Os endpoints de notas formam o núcleo da aplicação, implementando um sistema completo de gestão colaborativa de conteúdo com segurança, performance e usabilidade como prioridades principais.
