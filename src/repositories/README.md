# Repositories

Esta pasta contém todos os repositories da aplicação Ocean Notes, implementando o padrão Repository para abstração da camada de acesso a dados. Os repositories encapsulam toda a lógica de persistência e consultas ao banco de dados MySQL.

## Estrutura e Responsabilidades

### Padrão Repository Implementado

Os repositories seguem os princípios do padrão Repository Pattern:
- **Abstração da camada de dados**: Componentes não conhecem detalhes do banco
- **Centralização de queries**: Todas as consultas SQL ficam nos repositories
- **Testabilidade**: Facilita mocking para testes unitários
- **Manutenibilidade**: Mudanças no schema ficam isoladas nos repositories

### Repositories Principais

**NotaRepository.js**
- Repository principal para operações de notas
- Operações CRUD completas com validação de propriedade
- Suporte a compartilhamento entre usuários
- Gerenciamento de tópicos associados às notas
- Queries otimizadas com JOINs para buscar dados relacionados
- Métodos para buscar notas compartilhadas e próprias
- Versionamento e controle de conflitos

**TopicoRepository.js**
- Repository para gestão de tópicos/tags do sistema
- Operações CRUD com validação de usuário proprietário
- Busca por usuário e validação de permissões
- Queries simples e eficientes
- Suporte a cores personalizadas para categorização

**UtilizadorRepository.js**
- Repository para operações de usuários
- Criação de contas e autenticação
- Busca por email e ID
- Exclusão de informações sensíveis nas consultas
- Suporte a Google OAuth e login tradicional

**NotaTopicoRepository.js**
- Repository para relacionamentos many-to-many
- Associação entre notas e tópicos
- Operações de bulk insert/delete
- Sincronização de relacionamentos
- Queries otimizadas para evitar N+1 problems

## Arquitetura e Padrões

### Princípios SOLID Aplicados

**Single Responsibility Principle (SRP)**
- Cada repository é responsável por uma única entidade
- Separação clara entre domínios de dados
- NotaRepository: apenas notas
- TopicoRepository: apenas tópicos
- UtilizadorRepository: apenas usuários

**Open/Closed Principle (OCP)**
- Repositories são extensíveis sem modificar código existente
- Métodos podem ser sobrescritos ou especializados
- Interface consistente independente da implementação

**Dependency Inversion Principle (DIP)**
- Dependem de abstrações (pool de conexão)
- Services dependem de interfaces de repositories
- Facilita substituição de implementações

### Padrões de Design

**Repository Pattern**
- Encapsulamento de lógica de acesso a dados
- Interface uniforme para operações de persistência
- Abstração do mecanismo de armazenamento

**Active Record vs Data Mapper**
- Implementação híbrida com características de ambos
- Métodos estáticos para consultas simples
- Instâncias para operações complexas

**Query Object Pattern**
- Queries complexas encapsuladas em métodos específicos
- Reutilização de consultas comuns
- Parametrização segura contra SQL injection

### Otimizações de Performance

**Connection Pooling**
- Pool de conexões MySQL compartilhado
- Reutilização de conexões ativas
- Limite de conexões simultâneas

**Prepared Statements**
- Todas as queries utilizam prepared statements
- Proteção contra SQL injection
- Cache de planos de execução

**Query Optimization**
- JOINs otimizados para buscar dados relacionados
- Índices apropriados nas tabelas
- Evita N+1 problems com batch queries

## Estrutura de Dados

### Entidades Principais

**Nota**
- ID (primary key)
- titulo (VARCHAR)
- conteudo (TEXT)
- UtilizadorID (foreign key)
- dataAtualizacao (TIMESTAMP)
- dataCriacao (TIMESTAMP)

**Topico**
- ID (primary key)
- nome (VARCHAR)
- cor (VARCHAR) - hexadecimal
- UtilizadorID (foreign key)

**Utilizador**
- Id (primary key)
- Nome (VARCHAR)
- Email (VARCHAR UNIQUE)
- Password (VARCHAR hashed)

**NotaTopico** (Relacionamento)
- NotaID (foreign key)
- TopicoID (foreign key)
- Primary key composta

### Relacionamentos

**Um para Muitos**
- Utilizador → Notas (1:N)
- Utilizador → Topicos (1:N)

**Muitos para Muitos**
- Notas ↔ Topicos (N:M via NotaTopico)

**Compartilhamento**
- NotaCompartilhada (Nota N:M Utilizador)
- Permissões: visualizar, editar, admin, proprietário

## Operações por Repository

### NotaRepository

**CRUD Básico**
```javascript
// Criar nota
await NotaRepository.create({ titulo, conteudo, UtilizadorID });

// Buscar por usuário
await NotaRepository.findByUtilizadorId(userId);

// Atualizar nota
await NotaRepository.update(id, { titulo, conteudo }, userId);

// Deletar nota
await NotaRepository.delete(id, userId);
```

**Operações Avançadas**
```javascript
// Buscar com tópicos
await NotaRepository.findByIdWithTopicos(id, userId);

// Notas compartilhadas
await NotaRepository.findSharedWithUser(userId);

// Busca com filtros
await NotaRepository.findWithFilters(userId, filters);
```

### TopicoRepository

**Operações Principais**
```javascript
// Criar tópico
await TopicoRepository.create({ nome, cor, utilizadorId });

// Buscar por usuário
await TopicoRepository.getByUtilizadorId(userId);

// Atualizar tópico
await TopicoRepository.update(id, { nome, cor }, userId);
```

### UtilizadorRepository

**Autenticação**
```javascript
// Registrar usuário
await UtilizadorRepository.create({ Nome, Email, Password });

// Buscar por email
await UtilizadorRepository.findByEmail(email);

// Buscar por ID
await UtilizadorRepository.findById(id);
```

### NotaTopicoRepository

**Relacionamentos**
```javascript
// Associar tópicos
await NotaTopicoRepository.associateTopicosToNota(notaId, topicoIds);

// Remover associações
await NotaTopicoRepository.removeTopicoFromNota(notaId, topicoId);

// Buscar tópicos da nota
await NotaTopicoRepository.getTopicosByNotaId(notaId);
```

## Segurança e Validações

### Prepared Statements
- Todos os repositories utilizam prepared statements
- Proteção automática contra SQL injection
- Tipagem segura de parâmetros

### Validação de Propriedade
- Queries sempre incluem validação de usuário proprietário
- Prevenção de acesso não autorizado a dados
- Compartilhamento controlado por permissões

### Sanitização de Dados
- Remoção de campos sensíveis (passwords)
- Validação de tipos de dados
- Escape de caracteres especiais

## Tratamento de Erros

### Tipos de Erro
- **ConnectionError**: Problemas de conexão com DB
- **QueryError**: Erros de sintaxe SQL
- **ConstraintError**: Violações de integridade
- **NotFoundError**: Registros não encontrados

### Estratégias de Recovery
- Retry automático para falhas temporárias
- Logging estruturado de erros
- Rollback de transações em caso de falha
- Fallback graceful para operações críticas

## Testes e Manutenção

### Estratégias de Teste
- Testes unitários com mocks de database
- Testes de integração com DB de teste
- Testes de performance para queries complexas
- Testes de segurança para validar proteções

### Monitoramento
- Logging de queries lentas
- Métricas de performance
- Alertas para erros críticos
- Dashboard de saúde do sistema

## Dependências

### Principais
- **mysql2**: Driver MySQL com suporte a prepared statements
- **pool**: Sistema de pooling de conexões
- **config/database.js**: Configuração de conexão

### Configuração
```javascript
// Database pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

## Estrutura de Arquivos

```
repositories/
├── README.md                # Este documento
├── NotaRepository.js        # Repository principal de notas
├── TopicoRepository.js      # Repository de tópicos/tags
├── UtilizadorRepository.js  # Repository de usuários
└── NotaTopicoRepository.js  # Repository de relacionamentos
```

## Padrões de Uso

### Singleton Pattern
- Repositories são exportados como instâncias únicas
- Compartilhamento de pool de conexões
- Estado consistente em toda aplicação

### Transaction Management
- Operações complexas utilizam transações
- Rollback automático em caso de erro
- Isolation level apropriado para cada operação

### Lazy Loading vs Eager Loading
- Dados relacionados carregados sob demanda
- Métodos específicos para eager loading quando necessário
- Otimização baseada no caso de uso

Cada repository é projetado para ser eficiente, seguro e manutenível, seguindo as melhores práticas de acesso a dados e design patterns estabelecidos.
