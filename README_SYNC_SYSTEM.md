# Sistema de Sincronização e Compartilhamento - OceanNotes

## Visão Geral

Este documento descreve o sistema completo de sincronização, compartilhamento e versionamento implementado no OceanNotes, seguindo rigorosamente os princípios SOLID.

## Arquitetura

### Serviços Principais

1. **NoteVersionService** - Gerencia versionamento de notas
2. **NoteSharingService** - Controla compartilhamento e permissões
3. **ConflictDetectionService** - Detecta conflitos entre versões
4. **ConflictResolutionService** - Resolve conflitos usando diferentes estratégias
5. **SynchronizationService** - Gerencia sincronização offline/online
6. **RealTimeUpdateService** - Atualizações em tempo real via WebSocket
7. **NoteHistoryService** - Mantém histórico de modificações

### Componentes de Interface

1. **ShareNoteModal** - Interface para compartilhar notas
2. **ConflictNotification** - Notificações de conflito
3. **SyncContext** - Context React para sincronização

### Hooks Customizados

1. **useNoteSharing** - Lógica de compartilhamento
2. **useConflictNotifications** - Gerenciamento de notificações de conflito

## Funcionalidades Implementadas

### ✅ Versionamento de Notas
- Criação automática de versões a cada edição
- Hash SHA-256 para detecção de mudanças
- Histórico completo de versões
- Comparação entre versões

### ✅ Compartilhamento de Notas
- Três níveis de permissão: visualizar, editar, admin
- Compartilhamento por email
- Data de expiração opcional
- Gerenciamento de usuários compartilhados

### ✅ Detecção de Conflitos
- Detecção automática de edições paralelas
- Análise de complexidade de conflitos
- Conflitos em tempo real durante edição
- Sugestões de resolução baseadas em IA

### ✅ Resolução de Conflitos
- **Manter Local**: Preserva versão local
- **Manter Remoto**: Aceita versão remota
- **Merge Manual**: Permite edição manual do merge
- **Versões Separadas**: Cria notas separadas para cada versão

### ✅ Sincronização Offline/Online
- Fila de sincronização para edições offline
- Sincronização automática quando online
- Retry automático com backoff exponencial
- Status detalhado de sincronização

### ✅ Atualizações em Tempo Real
- WebSocket server para comunicação bidirecional
- Notificações de usuários editando
- Atualizações instantâneas de conteúdo
- Detecção de conflitos em tempo real

## Endpoints de API

### Compartilhamento
- `POST /api/notas/share` - Compartilhar nota
- `POST /api/notas/unshare` - Remover compartilhamento
- `POST /api/notas/update-permission` - Atualizar permissão
- `GET /api/notas/[id]/shared-users` - Usuários compartilhados
- `GET /api/notas/[id]/permission` - Verificar permissão
- `GET /api/notas/shared-with-me` - Notas compartilhadas comigo

### Conflitos
- `GET /api/conflicts/pending` - Conflitos pendentes
- `POST /api/conflicts/resolve` - Resolver conflito
- `GET /api/conflicts/detect/[id]` - Detectar conflitos
- `GET /api/conflicts/[id]/suggestions` - Sugestões de resolução

### Sincronização
- `GET /api/sync/status` - Status de sincronização
- `POST /api/sync/force/[id]` - Forçar sincronização

## Banco de Dados

### Novas Tabelas Criadas

1. **NotaVersao** - Armazena versões das notas
2. **NotaCompartilhamento** - Controla compartilhamentos
3. **NotaHistorico** - Histórico de modificações
4. **NotaConflito** - Registra conflitos detectados
5. **NotaSessaoEdicao** - Sessões de edição em tempo real
6. **NotaSincronizacaoOffline** - Fila de sincronização offline
7. **NotaDispositivo** - Dispositivos dos usuários

### Tabela Atualizada

- **Nota** - Adicionados campos para versionamento e compartilhamento

## Como Usar

### 1. Inicializar Banco de Dados
```sql
-- Executar o script database_sync_schema.sql
SOURCE database_sync_schema.sql;
```

### 2. Instalar Dependências
```bash
npm install ws
```

### 3. Iniciar WebSocket Server
```bash
node websocket-server.js
```

### 4. Usar Context de Sincronização
```jsx
import { SyncProvider, useSyncContext } from './src/contexts/SyncContext';

function App() {
  return (
    <SyncProvider>
      <YourApp />
    </SyncProvider>
  );
}

function NoteEditor() {
  const { startEditing, stopEditing, notifyNoteUpdate } = useSyncContext();
  
  useEffect(() => {
    startEditing(noteId);
    return () => stopEditing(noteId);
  }, [noteId]);
}
```

### 5. Compartilhar Notas
```jsx
import useNoteSharing from './src/hooks/useNoteSharing';

function ShareButton({ noteId }) {
  const { shareNote } = useNoteSharing();
  
  const handleShare = async () => {
    await shareNote(noteId, 'user@example.com', 'editar');
  };
}
```

### 6. Gerenciar Conflitos
```jsx
import useConflictNotifications from './src/hooks/useConflictNotifications';
import ConflictNotification from './src/components/ConflictNotification';

function App() {
  const { conflicts, resolveConflict, dismissConflict } = useConflictNotifications();
  
  return (
    <>
      <ConflictNotification 
        conflicts={conflicts}
        onResolveConflict={resolveConflict}
        onDismiss={dismissConflict}
      />
      {/* Resto da aplicação */}
    </>
  );
}
```

## Princípios SOLID Aplicados

### Single Responsibility Principle (SRP)
- Cada serviço tem uma responsabilidade específica
- Hooks focados em uma funcionalidade
- Componentes com propósito único

### Open/Closed Principle (OCP)
- Strategy Pattern para resolução de conflitos
- Extensibilidade para novos tipos de sincronização
- Filtros extensíveis no grafo

### Liskov Substitution Principle (LSP)
- Interfaces consistentes entre serviços
- Substituibilidade de implementações

### Interface Segregation Principle (ISP)
- Interfaces específicas para cada funcionalidade
- Hooks especializados

### Dependency Inversion Principle (DIP)
- Serviços dependem de abstrações
- Injeção de dependências
- Inversão de controle

## Próximos Passos

1. **Testes Automatizados** - Implementar testes unitários e de integração
2. **Performance** - Otimizar queries e sincronização
3. **Monitoramento** - Adicionar logs e métricas
4. **Segurança** - Auditoria de segurança completa
5. **Documentação** - Documentação técnica detalhada

## Considerações de Segurança

- Autenticação JWT em todos os endpoints
- Validação de permissões antes de operações
- Sanitização de dados de entrada
- Rate limiting no WebSocket
- Logs de auditoria para ações sensíveis

## Performance

- Índices otimizados no banco de dados
- Paginação em listagens
- Compressão de dados no WebSocket
- Cache de permissões
- Cleanup automático de dados antigos

Este sistema fornece uma base sólida e extensível para colaboração em tempo real, mantendo a integridade dos dados e uma excelente experiência do usuário.
