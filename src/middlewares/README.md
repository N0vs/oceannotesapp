# Middlewares

Esta pasta contém os middlewares da aplicação Ocean Notes, implementando camadas de segurança, validação e processamento de requisições para todos os endpoints da API.

## Estrutura e Responsabilidades

### Arquitetura de Middlewares

O sistema de middlewares implementa padrão de interceptação:
- **Higher-Order Functions** - Middlewares como funções que retornam funções
- **Chain of Responsibility** - Processamento sequencial de requisições
- **Injeção de dependências** - Dados do usuário disponibilizados na requisição
- **Early termination** - Bloqueio de acesso em casos de falha
- **Transparência** - Middlewares invisíveis aos handlers finais

### Middleware Disponível

**authMiddleware.js**
- Autenticação JWT para endpoints protegidos
- Extração de tokens via Authorization header ou cookies
- Validação de assinatura e expiração automática
- Injeção de dados do usuário na requisição
- Error handling uniforme para falhas de autenticação

## Funcionalidades Detalhadas

### authMiddleware

**Descrição**
Middleware de autenticação JWT que protege endpoints da API, validando tokens e injetando dados do usuário autenticado.

**Uso Básico**
```javascript
import authMiddleware from '../../../middlewares/authMiddleware';

const handler = async (req, res) => {
  // Dados do usuário disponíveis automaticamente
  const userId = req.userId;        // ID extraído do token
  const userPayload = req.user;     // Payload completo do JWT
  
  // Lógica do endpoint...
};

export default authMiddleware(handler);
```

**Fontes de Token Suportadas**

**1. Authorization Header (Preferencial)**
```javascript
// Request header
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Cliente
fetch('/api/notas', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**2. Cookies (Fallback)**
```javascript
// Cookie automático do browser
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Cliente (automático se cookie httpOnly definido)
// Útil para SPAs com cookies seguros
```

**Dados Injetados na Requisição**

**req.userId**
- ID do usuário extraído do token JWT
- Shortcut conveniente para uso direto
- Tipo: `string` ou `number`

**req.user**
- Payload completo do token JWT
- Contém todos os claims do token
- Estrutura típica:
```javascript
{
  id: "123",
  email: "user@example.com",
  iat: 1634567890,     // Issued at
  exp: 1634654290      // Expiration
}
```

## Segurança e Validação

### JWT Security

**Validação Automática**
```javascript
// jwt.verify() automaticamente valida:
// 1. Assinatura com chave secreta
// 2. Estrutura do token
// 3. Expiração (exp claim)
// 4. Formato JSON válido
const decoded = jwt.verify(token, secretKey);
```

**Chave Secreta**
```javascript
// Desenvolvimento (atual)
const secretKey = 'sua_chave_secreta_super_segura';

// Produção (recomendado)
const secretKey = process.env.JWT_SECRET;
```

**Configuração Segura de Produção**
```env
# .env.production
JWT_SECRET=chave_super_complexa_256_bits_minimo
JWT_EXPIRES_IN=24h
```

### Error Handling

**Casos de Falha**
- **Token ausente**: 401 + "Acesso negado. Nenhum token fornecido."
- **Token inválido**: 401 + "Token inválido ou expirado."
- **Token expirado**: 401 + "Token inválido ou expirado."
- **Formato inválido**: 401 + "Token inválido ou expirado."

**Resposta Padrão de Erro**
```json
{
  "message": "Token inválido ou expirado."
}
```

**Security by Design**
- Não vaza detalhes específicos do erro
- Mensagem genérica para todos os casos
- Previne information leakage
- Status code consistente (401)

## Padrões de Uso

### Endpoint Protegido Básico

```javascript
import authMiddleware from '../../../middlewares/authMiddleware';

const handler = async (req, res) => {
  const userId = req.userId;
  
  // Lógica que requer autenticação
  const userNotes = await NotaService.getByUserId(userId);
  res.json(userNotes);
};

export default authMiddleware(handler);
```

### Endpoint com Validação de Propriedade

```javascript
import authMiddleware from '../../../middlewares/authMiddleware';

const handler = async (req, res) => {
  const userId = req.userId;
  const { noteId } = req.query;
  
  // Verificar se usuário pode acessar a nota
  const note = await NotaService.getByIdAndUserId(noteId, userId);
  
  if (!note) {
    return res.status(403).json({ 
      message: 'Sem permissão para acessar esta nota' 
    });
  }
  
  res.json(note);
};

export default authMiddleware(handler);
```

### Endpoint Público (Sem Middleware)

```javascript
// Registro de usuário - não precisa de autenticação
const handler = async (req, res) => {
  const newUser = await UtilizadorService.create(req.body);
  res.status(201).json(newUser);
};

export default handler; // Sem middleware
```

## Client-Side Integration

### Configuração de Token

**Armazenamento Local**
```javascript
// Após login bem-sucedido
const { token } = await loginUser(email, password);
localStorage.setItem('authToken', token);
```

**Requests Autenticados**
```javascript
const authenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
```

**Interceptador Global (Axios)**
```javascript
import axios from 'axios';

// Interceptador de requisição
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptador de resposta
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado - redirect para login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## Testing Strategies

### Unit Testing

**Middleware Testing**
```javascript
describe('authMiddleware', () => {
  test('should allow access with valid token', async () => {
    const req = {
      headers: {
        authorization: 'Bearer valid_token_here'
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const handler = jest.fn();
    
    jwt.verify = jest.fn().mockReturnValue({ id: '123', email: 'test@example.com' });
    
    await authMiddleware(handler)(req, res);
    
    expect(handler).toHaveBeenCalled();
    expect(req.userId).toBe('123');
  });
  
  test('should deny access without token', async () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const handler = jest.fn();
    
    await authMiddleware(handler)(req, res);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(handler).not.toHaveBeenCalled();
  });
});
```

### Integration Testing

**API Endpoint Testing**
```javascript
describe('/api/notas', () => {
  test('should return user notes with valid token', async () => {
    const token = generateValidToken({ id: '123' });
    
    const response = await request(app)
      .get('/api/notas')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
      
    expect(response.body).toHaveLength(expect.any(Number));
  });
  
  test('should return 401 without token', async () => {
    await request(app)
      .get('/api/notas')
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Acesso negado. Nenhum token fornecido.');
      });
  });
});
```

## Performance Considerations

### JWT Verification Overhead

**Caching Strategies**
```javascript
// Cache de validação de token (cuidado com security)
const tokenCache = new Map();

const authMiddlewareWithCache = (handler) => async (req, res) => {
  const token = extractToken(req);
  
  // Cache hit - skip verification for recently validated tokens
  if (tokenCache.has(token)) {
    const cached = tokenCache.get(token);
    if (Date.now() < cached.expiry) {
      req.user = cached.payload;
      req.userId = cached.payload.id;
      return handler(req, res);
    }
  }
  
  // Normal verification flow...
};
```

### Token Size Optimization

**Minimal JWT Payload**
```javascript
// Payload otimizado - apenas dados essenciais
const tokenPayload = {
  id: user.id,           // ID mínimo necessário
  // email: user.email,  // Remover se não essencial
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24h
};

const token = jwt.sign(tokenPayload, secretKey);
```

## Extensibilidade

### Múltiplos Middlewares

**Composição de Middlewares**
```javascript
const withAuth = authMiddleware;
const withRateLimit = rateLimitMiddleware;
const withLogging = loggingMiddleware;

// Composição manual
export default withAuth(withRateLimit(withLogging(handler)));

// Ou usando utilitário
const compose = (...middlewares) => (handler) => 
  middlewares.reduceRight((acc, middleware) => middleware(acc), handler);

export default compose(withAuth, withRateLimit, withLogging)(handler);
```

### Middleware Customizado

**Template para Novo Middleware**
```javascript
const customMiddleware = (options = {}) => (handler) => async (req, res) => {
  try {
    // Pre-processing
    const result = await processRequest(req, options);
    
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    
    // Inject data into request
    req.customData = result.data;
    
    // Continue to next handler
    return handler(req, res);
  } catch (error) {
    return res.status(500).json({ message: 'Internal error' });
  }
};
```

## Estrutura de Arquivos

```
middlewares/
├── README.md           # Este documento
└── authMiddleware.js   # Autenticação JWT
```

## Deployment Configuration

### Environment Variables

**Production Setup**
```env
JWT_SECRET=sua_chave_secreta_complexa_256_bits
JWT_EXPIRES_IN=24h
NODE_ENV=production
```

**Docker Configuration**
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Set secure JWT secret via build arg
ARG JWT_SECRET
ENV JWT_SECRET=${JWT_SECRET}

EXPOSE 3000
CMD ["npm", "start"]
```

Os middlewares fornecem uma camada de segurança essencial para a aplicação, garantindo autenticação robusta e acesso controlado a todos os endpoints protegidos.
