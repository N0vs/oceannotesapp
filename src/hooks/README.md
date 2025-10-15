# Hooks

Esta pasta contém todos os hooks personalizados da aplicação Ocean Notes. Os hooks seguem os princípios SOLID e encapsulam lógica de negócio reutilizável específica do domínio da aplicação.

## Estrutura e Responsabilidades

### Hooks de Autenticação e Sessão

**useAuth.js**
- Gerenciamento completo de autenticação de usuários
- Operações de login, registro e logout
- Verificação de sessão e tokens JWT
- Navegação baseada em estado de autenticação
- Segue Single Responsibility Principle - responsável apenas por autenticação
- Abstrai dependências de cookies e navegação (Dependency Inversion Principle)

### Hooks de Internacionalização

**useTranslation.js**
- Sistema de internacionalização baseado em chaves hierárquicas
- Navegação em objeto de traduções usando dot-notation
- Fallback automático para chaves não encontradas
- Logging de chaves missing para debugging
- Suporte ao sistema de traduções em português brasileiro

### Hooks de Compartilhamento e Colaboração

**useNoteSharing.js**
- Gerenciamento de compartilhamento de notas entre usuários
- Operações de compartilhar, remover acesso e atualizar permissões
- Sistema de permissões (visualizar, editar, admin, proprietário)
- Gestão de convites por email e expiração de acessos
- Sincronização de estado de usuários compartilhados

**useConflictNotifications.js**
- Monitoramento de conflitos de edição em tempo real
- Integração com WebSocket para notificações instantâneas
- Sistema de resolução de conflitos com aceitação/rejeição
- Gestão de estado de conflitos pendentes
- Interface para comparação de versões conflitantes

### Hooks de Visualização em Grafo

**useGraphData.js**
- Centralização de dados para visualização em grafo
- Fetch e cache de notas e tópicos
- Sincronização de estado entre API e componentes
- Funções de atualização otimizadas para performance
- Separação clara entre dados e apresentação

**useGraphConnections.js**
- Cálculo de conexões entre notas baseado em tags compartilhadas
- Algoritmo otimizado para geração de links do grafo
- Processamento de nós para visualização
- Utilização de useMemo para performance
- Estratégias de conexão baseadas em tópicos

**useGraphFilters.js**
- Sistema de filtros para visualização do grafo
- Filtros por tags, nós órfãos e exibição de labels
- Estados de busca e sugestões de tags
- Lógica de aplicação de filtros em tempo real
- Reset e persistência de configurações de filtro

**useGraphDragDrop.js**
- Funcionalidade de drag and drop para nós do grafo
- Gestão de estados de arrastar e posicionamento
- Handlers otimizados para eventos de mouse
- Cálculo de posições e offsets relativos
- Inicialização automática de posições em layout circular

## Arquitetura e Padrões

### Princípios SOLID Aplicados

**Single Responsibility Principle (SRP)**
- Cada hook tem uma responsabilidade específica e bem definida
- useAuth: apenas autenticação
- useTranslation: apenas internacionalização
- useNoteSharing: apenas compartilhamento
- useGraphData: apenas dados do grafo

**Open/Closed Principle (OCP)**
- Hooks são extensíveis através de parâmetros e callbacks
- Funcionalidade pode ser estendida sem modificar código existente
- Interface estável com implementação flexível

**Dependency Inversion Principle (DIP)**
- Hooks abstraem dependências externas (cookies, localStorage, APIs)
- Componentes dependem de abstrações, não de implementações concretas
- Facilita testes e manutenção

### Padrões de Design

**Hook Pattern**
- Encapsulamento de lógica stateful em funções reutilizáveis
- Composição de comportamentos através de hooks personalizados
- Separação entre lógica de negócio e apresentação

**Observer Pattern**
- useConflictNotifications monitora mudanças via WebSocket
- Callbacks para notificar componentes sobre mudanças de estado
- Desacoplamento entre produtor e consumidor de eventos

**Strategy Pattern**
- useGraphConnections implementa diferentes estratégias de conexão
- Algoritmos intercambiáveis para cálculo de relações entre notas
- Flexibilidade na definição de critérios de conexão

### Otimização de Performance

**Memoização**
- useMemo em useGraphConnections para cálculos pesados
- useCallback em funções que são dependências de outros hooks
- Evita recálculos desnecessários em re-renders

**Lazy Loading**
- Dados carregados sob demanda quando necessário
- Estados de loading para feedback ao usuário
- Error boundaries para tratamento de falhas

**Debounce e Throttle**
- Implementação implícita em operações de busca e filtros
- Reduz chamadas desnecessárias à API
- Melhora responsividade da interface

## Gestão de Estado

### Estado Local vs Global
- Hooks gerenciam estado local específico do seu domínio
- Estado global é compartilhado através de props e callbacks
- Evita over-engineering com Context API desnecessário

### Sincronização de Dados
- Estratégias de cache local com sincronização remota
- Optimistic updates para melhor UX
- Rollback automático em caso de falhas

### Tratamento de Erros
- Error handling consistente em todos os hooks
- Estados de erro específicos para cada tipo de operação
- Logging estruturado para debugging

## Funcionalidades por Hook

### useAuth
- Login/logout com JWT tokens
- Registro de novos usuários
- Verificação de autenticação
- Navegação condicional baseada em auth
- Gestão segura de tokens em cookies

### useTranslation
- Tradução baseada em chaves dot-notation
- Fallback para chaves não encontradas
- Sistema extensível para múltiplos idiomas
- Logging de chaves missing

### useNoteSharing
- Compartilhar notas por email
- Sistema de permissões granular
- Remoção de acessos
- Atualização de permissões existentes
- Gestão de usuários compartilhados

### useConflictNotifications
- Detecção de conflitos em tempo real
- WebSocket para notificações instantâneas
- Resolução de conflitos interativa
- Comparação de versões
- Estado de conflitos pendentes

### Hooks de Grafo
- Processamento de dados para visualização
- Cálculo de conexões baseado em tags
- Filtros dinâmicos e busca
- Drag and drop interativo
- Layout automático de nós

## Dependências e Integrações

### Dependências Principais
- **React Hooks**: useState, useEffect, useMemo, useCallback
- **Next.js**: useRouter para navegação
- **js-cookie**: Gestão de cookies de sessão
- **WebSocket**: Comunicação em tempo real

### Integrações com APIs
- **REST APIs**: Fetch para operações CRUD
- **Authentication**: JWT tokens para autorização
- **Real-time**: WebSocket para colaboração
- **File Upload**: APIs de mídia para imagens

### Integrações com Componentes
- Props drilling para comunicação pai-filho
- Callbacks para comunicação filho-pai
- Estados elevados quando necessário
- Composição através de custom hooks

## Estrutura de Arquivos

```
hooks/
├── README.md                    # Este documento
├── useAuth.js                   # Autenticação e sessão
├── useTranslation.js           # Sistema de traduções
├── useNoteSharing.js           # Compartilhamento de notas
├── useConflictNotifications.js # Notificações de conflitos
├── useGraphData.js             # Dados do grafo
├── useGraphConnections.js      # Conexões entre nós
├── useGraphFilters.js          # Filtros do grafo
└── useGraphDragDrop.js         # Drag and drop do grafo
```

## Padrões de Uso

### Hook de Autenticação
```javascript
const { login, logout, isAuthenticated, loading, error } = useAuth();

// Uso típico em componente de login
const handleLogin = async (email, password) => {
  const result = await login(email, password);
  if (result.success) {
    navigateToDashboard();
  }
};
```

### Hook de Tradução
```javascript
const { t } = useTranslation();

// Uso em componentes
<h1>{t('notes.title')}</h1>
<p>{t('messages.welcome')}</p>
```

### Hook de Compartilhamento
```javascript
const { shareNote, getSharedUsers, isLoading } = useNoteSharing();

// Compartilhar nota
await shareNote(noteId, userEmail, 'editor');

// Buscar usuários compartilhados
useEffect(() => {
  getSharedUsers(noteId);
}, [noteId]);
```

## Testes e Manutenção

### Estratégias de Teste
- Testes unitários para lógica de negócio
- Mocks para dependências externas (APIs, cookies)
- Testes de integração para fluxos completos
- Testes de performance para operações pesadas

### Manutenibilidade
- Documentação JSDoc completa
- Separação clara de responsabilidades
- Interfaces estáveis e previsíveis
- Logs estruturados para debugging

Cada hook é projetado para ser independente, reutilizável e facilmente testável, seguindo as melhores práticas do React e princípios de arquitetura de software.
