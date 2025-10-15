# Services

Esta pasta contém todos os services da aplicação Ocean Notes, implementando a camada de lógica de negócio. Os services orquestram operações entre repositories, aplicam regras de negócio e gerenciam integrações externas.

## Estrutura e Responsabilidades

### Arquitetura de Services

Os services seguem o padrão de arquitetura em camadas:
- **Controllers** → **Services** → **Repositories**
- Services implementam lógica de negócio complexa
- Orquestração entre múltiplos repositories
- Integração com APIs externas e serviços terceiros
- Validações de regras de negócio
- Transformação e processamento de dados

### Services Principais

**NotaService.js**
- Service principal para operações de notas
- Orquestra NotaRepository e NotaTopicoRepository
- Gerencia relacionamentos entre notas e tópicos
- Implementa regras de compartilhamento e permissões
- Validações de propriedade e acesso
- Integração com sistema de versionamento

**NoteSharingService.js**
- Service especializado em compartilhamento de notas
- Gerencia convites e permissões entre usuários
- Sistema de notificações de compartilhamento
- Validações de níveis de acesso
- Integração com EmailService para convites
- Auditoria de ações de compartilhamento

**TopicoService.js**
- Service para operações de tópicos/tags
- Validações de duplicatas e consistência
- Regras de propriedade e acesso
- Integração com sistema de cores
- Operações CRUD com validações

### Services de Colaboração

**ConflictDetectionService.js**
- Detecção automática de conflitos de edição
- Algoritmos de comparação de versões
- Identificação de mudanças concorrentes
- Classificação de tipos de conflito
- Integração com versionamento

**ConflictResolutionService.js**
- Resolução automática e manual de conflitos
- Estratégias de merge inteligente
- Interface para resolução manual
- Preservação de histórico de conflitos
- Rollback de resoluções incorretas

**RealTimeUpdateService.js**
- Sincronização em tempo real via WebSocket
- Broadcast de mudanças para usuários conectados
- Gerenciamento de sessões ativas
- Throttling de updates para performance
- Handling de conexões instáveis

**SynchronizationService.js**
- Sincronização offline/online
- Queue de operações pendentes
- Retry logic para falhas de rede
- Merge de dados locais e remotos
- Controle de conectividade

### Services de Versionamento

**NoteVersionService.js**
- Sistema de versionamento de notas
- Criação e gestão de snapshots
- Comparação entre versões
- Rollback para versões anteriores
- Otimização de armazenamento

**NoteHistoryService.js**
- Histórico completo de mudanças
- Tracking de ações de usuários
- Auditoria de modificações
- Timeline de eventos
- Filtros e busca no histórico

### Services de Integração

**EmailService.js**
- Envio de emails transacionais
- Templates personalizáveis
- Notificações de compartilhamento
- Emails de boas-vindas
- Sistema de retry para falhas

**GraphApiService.js**
- API especializada para dados do grafo
- Cálculo de conexões entre notas
- Métricas e estatísticas
- Filtros avançados
- Otimizações de performance

**UtilizadorService.js**
- Lógica de negócio de usuários
- Validações de registro
- Integração com autenticação
- Gestão de perfis
- Operações de conta

## Arquitetura e Padrões

### Princípios SOLID Aplicados

**Single Responsibility Principle (SRP)**
- Cada service tem responsabilidade específica
- NotaService: apenas lógica de notas
- EmailService: apenas comunicação por email
- ConflictDetectionService: apenas detecção de conflitos

**Open/Closed Principle (OCP)**
- Services extensíveis através de composição
- Novos behaviors através de dependency injection
- Interfaces estáveis com implementações flexíveis

**Liskov Substitution Principle (LSP)**
- Services implementam contratos bem definidos
- Substituição transparente de implementações
- Polymorphism através de interfaces

**Interface Segregation Principle (ISP)**
- Interfaces específicas para cada necessidade
- Evita dependências desnecessárias
- Contratos minimalistas e focados

**Dependency Inversion Principle (DIP)**
- Services dependem de abstrações (repositories)
- Injeção de dependências para testabilidade
- Baixo acoplamento entre camadas

### Padrões de Design

**Service Layer Pattern**
- Encapsulamento de lógica de negócio
- Orquestração entre múltiplas entidades
- Transações que atravessam boundaries

**Observer Pattern**
- RealTimeUpdateService usa EventEmitter
- Notificações assíncronas
- Desacoplamento entre componentes

**Strategy Pattern**
- ConflictResolutionService implementa múltiplas estratégias
- Algoritmos intercambiáveis
- Seleção dinâmica baseada em contexto

**Command Pattern**
- SynchronizationService usa queue de comandos
- Operações como objetos
- Undo/redo capabilities

**Factory Pattern**
- Criação de objetos complexos
- Encapsulamento de lógica de construção
- Configuração baseada em contexto

## Funcionalidades por Service

### NotaService

**Operações Principais**
```javascript
// Criar nota com tópicos
await NotaService.create({ titulo, conteudo, topicos }, userId);

// Buscar notas do usuário
await NotaService.findByUtilizadorId(userId);

// Atualizar com versionamento
await NotaService.update(id, { titulo, conteudo }, userId);

// Buscar notas compartilhadas
await NotaService.findSharedNotes(userId);
```

**Regras de Negócio**
- Validação de propriedade antes de operações
- Associação automática de tópicos
- Criação de versões em atualizações
- Notificação de mudanças em tempo real

### NoteSharingService

**Compartilhamento**
```javascript
// Compartilhar nota
await NoteSharingService.shareNote(noteId, userEmail, permission);

// Remover acesso
await NoteSharingService.removeAccess(noteId, userId);

// Atualizar permissão
await NoteSharingService.updatePermission(noteId, userId, newPermission);
```

**Tipos de Permissão**
- **visualizar**: Apenas leitura
- **editar**: Leitura e escrita
- **admin**: Gerenciar compartilhamentos
- **proprietário**: Controle total

### Conflict Services

**Detecção de Conflitos**
```javascript
// Detectar conflitos automáticos
const conflicts = await ConflictDetectionService.detectConflicts(noteId);

// Resolver conflito
await ConflictResolutionService.resolveConflict(conflictId, resolution);
```

**Tipos de Conflito**
- **Concurrent Edit**: Edições simultâneas
- **Delete vs Modify**: Remoção vs modificação
- **Permission Change**: Mudança de permissões
- **Schema Conflict**: Incompatibilidade de estrutura

### Real-Time Services

**Sincronização**
```javascript
// Broadcast de mudança
RealTimeUpdateService.broadcastUpdate(noteId, changes);

// Sincronizar mudanças
await SynchronizationService.syncChanges(userId);
```

**Recursos**
- WebSocket connections
- Presença de usuários online
- Collaborative cursors
- Live typing indicators

## Integração e Comunicação

### Comunicação entre Services
- Dependency injection para composição
- Event-driven architecture para desacoplamento
- Pub/sub pattern para notificações
- Queue-based processing para operações assíncronas

### Integração com Repositories
- Services orquestram múltiplos repositories
- Transações distribuídas quando necessário
- Consistency checks e validações
- Error handling e rollback

### APIs Externas
- EmailService integra com SMTP providers
- Possível integração com Google Drive
- Webhooks para sistemas terceiros
- Rate limiting e retry logic

## Tratamento de Erros

### Estratégias por Tipo
- **Business Logic Errors**: Validação e mensagens específicas
- **Integration Errors**: Retry automático e fallback
- **Concurrency Errors**: Queue e eventual consistency
- **System Errors**: Logging e alertas

### Error Recovery
- Circuit breaker para serviços externos
- Graceful degradation
- Compensating transactions
- User-friendly error messages

## Performance e Otimização

### Caching
- In-memory cache para dados frequentes
- Redis para cache distribuído
- Cache invalidation strategies
- TTL baseada em padrões de uso

### Async Processing
- Queue-based operations
- Background jobs
- Event sourcing
- Stream processing

### Database Optimization
- Connection pooling
- Query optimization
- Batch operations
- Read replicas para queries

## Testes e Monitoramento

### Estratégias de Teste
- Unit tests com mocks para repositories
- Integration tests com database de teste
- E2E tests para fluxos críticos
- Performance tests para operações pesadas

### Monitoramento
- APM para tracking de performance
- Business metrics e KPIs
- Error tracking e alertas
- Health checks para dependencies

## Estrutura de Arquivos

```
services/
├── README.md                    # Este documento
├── NotaService.js              # Service principal de notas
├── TopicoService.js            # Service de tópicos
├── UtilizadorService.js        # Service de usuários
├── NoteSharingService.js       # Service de compartilhamento
├── ConflictDetectionService.js # Detecção de conflitos
├── ConflictResolutionService.js # Resolução de conflitos
├── RealTimeUpdateService.js    # Updates em tempo real
├── SynchronizationService.js   # Sincronização offline/online
├── NoteVersionService.js       # Versionamento de notas
├── NoteHistoryService.js       # Histórico de mudanças
├── EmailService.js             # Envio de emails
└── GraphApiService.js          # API do grafo
```

## Padrões de Uso

### Service Composition
```javascript
class NotaService {
  constructor(
    notaRepository,
    topicoRepository,
    versionService,
    sharingService
  ) {
    this.notaRepo = notaRepository;
    this.topicoRepo = topicoRepository;
    this.versionService = versionService;
    this.sharingService = sharingService;
  }
}
```

### Transaction Management
```javascript
async updateNoteWithTopics(noteId, data, userId) {
  const transaction = await db.beginTransaction();
  try {
    await this.notaRepo.update(noteId, data, { transaction });
    await this.topicoRepo.sync(noteId, data.topicos, { transaction });
    await this.versionService.createSnapshot(noteId, { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

### Event-Driven Communication
```javascript
class RealTimeUpdateService extends EventEmitter {
  async broadcastUpdate(noteId, changes) {
    this.emit('note:updated', { noteId, changes });
    await this.notifyCollaborators(noteId, changes);
  }
}
```

Cada service é projetado para ser independente, testável e facilmente integrável, seguindo as melhores práticas de arquitetura de software e design patterns estabelecidos.
