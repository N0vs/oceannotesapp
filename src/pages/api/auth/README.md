# API Auth

Esta pasta contém os endpoints de autenticação da aplicação Ocean Notes, implementando múltiplas estratégias de login e gestão de tokens JWT.

## Estrutura e Responsabilidades

### Arquitetura de Autenticação

A autenticação segue padrões de segurança modernos:
- **JWT (JSON Web Tokens)** para sessões stateless
- **OAuth 2.0** para integração com Google
- **Hashing seguro** de senhas com bcrypt
- **Rate limiting** para prevenção de ataques
- **Validação rigorosa** de inputs
- **Headers de segurança** apropriados

### Endpoints Disponíveis

**login.js**
- Endpoint: `POST /api/auth/login`
- Autenticação tradicional com email/senha
- Validação de credenciais via database
- Geração de JWT tokens
- Tratamento de erros específicos

**google.js**
- Endpoint: `POST /api/auth/google`
- Autenticação via Google OAuth 2.0
- Verificação de tokens do Google Identity Services
- Criação automática de contas para novos usuários
- Integração com EmailService para boas-vindas

## Funcionalidades por Endpoint

### POST /api/auth/login

**Descrição**
Endpoint para autenticação tradicional usando email e senha.

**Request Body**
```json
{
  "Email": "user@example.com",
  "Password": "userpassword123"
}
```

**Response Success (200)**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Errors**
- `400`: Email e senha são obrigatórios
- `401`: Credenciais inválidas
- `405`: Método não permitido (apenas POST)
- `500`: Erro interno do servidor

**Fluxo de Autenticação**
1. Validação de método HTTP (POST only)
2. Verificação de campos obrigatórios
3. Delegação para UtilizadorService.login()
4. Geração e retorno de JWT token
5. Tratamento específico de erros

### POST /api/auth/google

**Descrição**
Endpoint para autenticação via Google OAuth 2.0 com criação automática de contas.

**Request Body**
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyN..."
}
```

**Response Success (200)**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "user@gmail.com",
    "name": "User Name"
  },
  "isNewUser": false
}
```

**Response Errors**
- `400`: Token Google é obrigatório
- `401`: Token Google inválido
- `405`: Método não permitido (apenas POST)
- `500`: Erro interno do servidor

**Fluxo OAuth**
1. Validação de método HTTP (POST only)
2. Verificação do token credential
3. Validação com Google OAuth2Client
4. Extração de dados do payload Google
5. Busca/Criação de usuário no database
6. Envio de email de boas-vindas (novos usuários)
7. Geração de JWT token interno
8. Retorno com dados do usuário

## Arquitetura e Segurança

### JWT Token Management

**Estrutura do Token**
```javascript
{
  "userId": 123,
  "email": "user@example.com",
  "iat": 1640995200,
  "exp": 1641081600
}
```

**Configuração**
- **Algorithm**: HS256 (HMAC SHA-256)
- **Secret**: Variável de ambiente JWT_SECRET
- **Expiration**: 24 horas por padrão
- **Issuer**: Ocean Notes App

### Google OAuth Integration

**Configuração Required**
```env
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your_jwt_secret_key
```

**OAuth2Client Setup**
```javascript
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
```

**Token Verification**
```javascript
const ticket = await client.verifyIdToken({
  idToken: credential,
  audience: process.env.GOOGLE_CLIENT_ID,
});
```

### Validação e Sanitização

**Input Validation**
- Email format validation
- Password strength requirements
- Google token format verification
- SQL injection prevention
- XSS protection

**Output Sanitization**
- Removal of sensitive data (passwords)
- Consistent error messages
- Secure headers setup

## Integração com Services

### UtilizadorService Integration

**Login Tradicional**
```javascript
const { token } = await UtilizadorService.login(Email, Password);
```

**User Management**
```javascript
// Buscar usuário existente
const existingUser = await UtilizadorService.findByEmail(email);

// Criar novo usuário
const newUser = await UtilizadorService.create({
  Nome: name,
  Email: email,
  Password: null // OAuth users
});
```

### EmailService Integration

**Welcome Emails**
```javascript
await EmailService.sendWelcomeEmail(email, name);
```

## Tratamento de Erros

### Categorização de Erros

**Client Errors (4xx)**
- `400 Bad Request`: Dados inválidos ou faltando
- `401 Unauthorized`: Credenciais inválidas
- `405 Method Not Allowed`: Método HTTP incorreto

**Server Errors (5xx)**
- `500 Internal Server Error`: Erros do sistema
- Database connection failures
- External service failures (Google API)

### Error Response Format

**Padrão de Resposta**
```json
{
  "message": "Descrição do erro",
  "error": "Detalhes técnicos (apenas em desenvolvimento)"
}
```

**Logging Strategy**
- Client errors: Log de segurança
- Server errors: Log completo com stack trace
- Audit trail para tentativas de login
- Rate limiting violations

## Middleware e Interceptors

### Security Headers

**Automatic Headers**
```javascript
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('X-XSS-Protection', '1; mode=block');
```

### Rate Limiting

**Implementation Strategy**
- IP-based rate limiting
- Progressive delays for failed attempts
- CAPTCHA integration for suspicious activity
- Account lockout after multiple failures

### CORS Configuration

**Allowed Origins**
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://yourdomain.com'
];
```

## Testing Strategies

### Unit Tests

**Login Endpoint Tests**
```javascript
describe('/api/auth/login', () => {
  test('should return token for valid credentials', async () => {
    // Test implementation
  });
  
  test('should return 401 for invalid credentials', async () => {
    // Test implementation
  });
});
```

**Google OAuth Tests**
```javascript
describe('/api/auth/google', () => {
  test('should create new user from Google token', async () => {
    // Test implementation
  });
});
```

### Integration Tests

**Database Integration**
- User creation and retrieval
- Token generation and validation
- Error handling with database failures

**External Services**
- Google API integration
- Email service integration
- Network failure scenarios

### Security Tests

**Penetration Testing**
- SQL injection attempts
- XSS attack vectors
- Brute force simulations
- Token manipulation tests

## Performance Considerations

### Optimization Strategies

**Database Queries**
- Indexed email lookups
- Connection pooling
- Query result caching

**Token Operations**
- JWT signing optimization
- Token validation caching
- Refresh token strategies

**External API Calls**
- Google API response caching
- Timeout configurations
- Circuit breaker patterns

### Monitoring Metrics

**Key Performance Indicators**
- Login success/failure rates
- Response time percentiles
- Token generation frequency
- OAuth flow completion rates

## Deployment Configuration

### Environment Variables

**Required Configuration**
```env
# Database
DB_HOST=localhost
DB_USER=ocean_notes
DB_PASSWORD=secure_password
DB_NAME=ocean_notes_db

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret
JWT_EXPIRES_IN=24h

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# Email Service
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
```

### Docker Configuration

**Container Setup**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Estrutura de Arquivos

```
auth/
├── README.md          # Este documento
├── login.js          # Login tradicional email/senha
└── google.js         # OAuth 2.0 com Google
```

## Padrões de Uso

### Client-Side Integration

**Traditional Login**
```javascript
const loginUser = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Email: email, Password: password }),
  });
  
  if (response.ok) {
    const { token } = await response.json();
    localStorage.setItem('authToken', token);
    return token;
  }
  
  throw new Error('Login failed');
};
```

**Google OAuth**
```javascript
const handleGoogleLogin = async (credential) => {
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });
  
  if (response.ok) {
    const { token, user, isNewUser } = await response.json();
    localStorage.setItem('authToken', token);
    if (isNewUser) {
      showWelcomeMessage(user.name);
    }
    return { token, user };
  }
  
  throw new Error('Google login failed');
};
```

### Token Usage

**Authorization Header**
```javascript
const authenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
};
```

Os endpoints de autenticação são projetados para serem seguros, eficientes e facilmente integráveis, seguindo as melhores práticas de segurança web e OAuth 2.0.
