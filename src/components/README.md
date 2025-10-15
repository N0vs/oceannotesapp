# Components

Esta pasta contém todos os componentes React reutilizáveis da aplicação Ocean Notes. Os componentes são organizados por funcionalidade e responsabilidade específica.

## Estrutura e Responsabilidades

### Componentes Principais de Interface

**ObsidianLayout.js**
- Layout base da aplicação com sistema de painéis
- Gerencia sidebar esquerda, área principal e painel direito
- Controla visibilidade e transições dos painéis laterais
- Layout responsivo com estado persistente dos painéis

**ObsidianSidebar.js**
- Navegação principal e filtros da aplicação
- Sistema de seções expansíveis (notas recentes, todas as notas, filtros)
- Filtros avançados por texto, data, período personalizado e tags
- Busca de notas com sugestões em tempo real
- Gestão de criação de novas notas e logout

**ObsidianEditor.js**
- Editor principal para criação e edição de notas
- Gestão de título, conteúdo rico e sistema de tags
- Controle de permissões baseado no tipo de usuário
- Funcionalidades de salvamento manual e validação
- Sistema completo de edição de tags (nome e cor) com validação de duplicatas
- Modal de confirmação para exclusão com controle de acesso

### Componentes de Visualização e Mídia

**RichTextEditor.js**
- Editor de texto rico baseado em Quill.js
- Upload de imagens com drag and drop
- Syntax highlighting para código
- Inserção inteligente de mídia na posição do cursor
- Controle de SSR e hidratação segura

**ObsidianGraph.js**
- Visualização de notas em formato de grafo interativo
- Nós representam notas conectadas por tags compartilhadas
- Sistema de drag and drop para reposicionamento de nós
- Filtros visuais por tags e nós órfãos
- Detecção de duplo clique para abertura de notas

**RichTextViewer.js**
- Componente de visualização de conteúdo HTML
- Renderização segura de conteúdo rico
- Suporte a imagens e formatação avançada

### Componentes de Colaboração

**ShareNoteModal.js**
- Modal para compartilhamento de notas entre usuários
- Sistema de permissões (visualizar, editar, admin, proprietário)
- Gestão de usuários compartilhados
- Adição e remoção de acessos
- Interface de convite por email

### Componentes de Sincronização e Estado

**SyncStatusIndicator.js**
- Indicador visual do status de sincronização
- Estados: conectado, desconectado, sincronizando, erro
- Feedback em tempo real sobre conectividade
- Integração com WebSocket para atualizações

**ConflictNotification.js**
- Notificações de conflitos de edição simultânea
- Interface para resolução de conflitos
- Comparação visual de versões conflitantes
- Botões para aceitar/rejeitar mudanças

**ConflictTab.js**
- Aba dedicada para gestão de conflitos
- Lista de conflitos pendentes
- Navegação entre conflitos múltiplos
- Integração com sistema de versionamento

### Componentes de Filtros e Busca

**NotesFilters.js**
- Filtros avançados para notas
- Filtros por data (dia específico, intervalo, mês/ano)
- Filtros por tags múltiplas
- Busca por texto no título e conteúdo
- Estado expansível para filtros avançados

### Componentes de Autenticação

**LoginForm.js**
- Formulário de login tradicional
- Validação de campos e tratamento de erros
- Integração com sistema de autenticação
- Suporte a redirecionamento pós-login

**GoogleSignIn.js**
- Componente para autenticação via Google OAuth
- Integração com Google Identity Services
- Tratamento de tokens e sessões
- Fallback para login tradicional

## Arquitetura e Padrões

### Padrões de Design
- Todos os componentes utilizam hooks funcionais do React
- Documentação JSDoc completa para funções e componentes
- Separação clara entre lógica de apresentação e estado
- Props tipadas com validação e valores padrão

### Sistema de Internacionalização
- Todos os componentes utilizam o hook `useTranslation`
- Textos externalizados em arquivos de localização
- Suporte completo ao português brasileiro
- Estrutura preparada para múltiplos idiomas

### Gestão de Estado
- Estado local com useState para dados específicos do componente
- useRef para referências diretas de DOM e cache
- useEffect para sincronização e efeitos colaterais
- useMemo para otimização de cálculos pesados

### Comunicação entre Componentes
- Props drilling para dados diretos pai-filho
- Callbacks para comunicação filho-pai
- Contexto implícito via hooks compartilhados
- Estados elevados para dados compartilhados

## Funcionalidades Transversais

### Upload e Mídia
- Sistema unificado de upload de imagens
- Validação de tamanho e tipo de arquivo
- Integração com API de mídia
- Drag and drop em múltiplos componentes

### Validação e Feedback
- Validação em tempo real de formulários
- Mensagens de erro contextualizadas
- Feedback visual para ações do usuário
- Estados de carregamento consistentes

### Responsividade
- Design mobile-first em todos os componentes
- Breakpoints consistentes com Tailwind CSS
- Adaptação de layout para diferentes telas
- Otimização para touch e desktop

### Performance
- Importação dinâmica para componentes pesados
- Lazy loading de dependências externas
- Otimização de re-renders com React.memo onde necessário
- Debounce em operações de busca e filtros

## Dependências Principais

- **React 18+**: Framework base com hooks
- **Next.js**: SSR, roteamento e otimizações
- **Tailwind CSS**: Estilização utilitária
- **React Quill**: Editor de texto rico
- **Highlight.js**: Syntax highlighting
- **js-cookie**: Gestão de cookies de sessão
- **Dynamic imports**: Carregamento assíncrono de componentes

## Estrutura de Arquivos

```
components/
├── README.md                     # Este documento
├── ObsidianLayout.js            # Layout principal
├── ObsidianSidebar.js           # Navegação e filtros
├── ObsidianEditor.js            # Editor principal
├── ObsidianGraph.js             # Visualização em grafo
├── RichTextEditor.js            # Editor de texto rico
├── RichTextViewer.js            # Visualizador de conteúdo
├── ShareNoteModal.js            # Modal de compartilhamento
├── NotesFilters.js              # Filtros avançados
├── SyncStatusIndicator.js       # Status de sincronização
├── ConflictNotification.js      # Notificações de conflito
├── ConflictTab.js              # Gestão de conflitos
├── LoginForm.js                # Formulário de login
├── GoogleSignIn.js             # Login com Google
└── *.module.css                # Estilos específicos de componentes
```

Cada componente é auto-contido com sua lógica, estado e estilização, seguindo os princípios de componentização do React e mantendo baixo acoplamento entre módulos.
