# 🌊 OceanNotesApp

Sistema completo de notas com compartilhamento colaborativo e interface moderna.

## 📋 Funcionalidades

- ✅ **Autenticação** - Login/registro seguro com JWT
- ✅ **Notas** - Criar, editar, excluir notas com editor rico
- ✅ **Compartilhamento** - Compartilhar notas com outros usuários
- ✅ **Permissões** - Controle de acesso (visualizar/editar/admin/proprietário)
- ✅ **Tópicos/Tags** - Organização por categorias coloridas
- ✅ **Grafo de Conexões** - Visualização de relacionamentos entre notas
- ✅ **Interface Moderna** - Dashboard responsivo estilo Obsidian
- ✅ **Internacionalização** - Interface completamente em português
- ✅ **Uploads de Mídia** - Suporte a imagens nas notas
- 🔄 **Sincronização Online** - Requer conexão com internet (sem modo offline)

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- MySQL 8.0+
- npm ou yarn

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/oceannotesapp.git
cd oceannotesapp
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar banco de dados
1. Criar banco MySQL chamado `oceannotesapp`
2. Executar o script `database_schema_complete.sql`
3. Configurar variáveis de ambiente

### 4. Configurar variáveis de ambiente
Criar arquivo `.env.local`:
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=oceannotesapp

# JWT
JWT_SECRET=sua_chave_secreta_muito_forte

# Upload de arquivos (opcional)
UPLOAD_DIR=public/uploads
```

### 5. Executar o projeto
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 🔄 Como Funciona a Sincronização

**IMPORTANTE**: Este sistema **não possui sincronização offline** real. Funciona da seguinte forma:

- 📡 **Online First** - Todas as operações requerem conexão com internet
- 💾 **Salvamento Imediato** - Mudanças são salvas diretamente no servidor
- 🔄 **Atualizações Automáticas** - Interface atualiza após operações bem-sucedidas
- 👥 **Colaboração** - Múltiplos usuários podem compartilhar e editar notas
- ⚠️ **Sem Cache Local** - Não há modo offline ou armazenamento local

### Funcionalidades de "Sincronização":
- ✅ **Refresh Automático** - Recarrega dados após salvar
- ✅ **Estados de Loading** - Feedback visual durante operações
- ✅ **Detecção de Conflitos** - Sistema preparado para conflitos (API implementada)
- ❌ **WebSocket Real-time** - Não implementado (código existe mas não é usado)
- ❌ **Modo Offline** - Não suportado

## 🔧 Estrutura do Projeto

```
oceannotesapp/
├── src/
│   ├── app/                 # Páginas Next.js
│   ├── components/          # Componentes React
│   ├── contexts/           # Contextos React
│   ├── lib/                # Configurações
│   ├── middlewares/        # Middlewares de autenticação
│   ├── pages/api/          # APIs backend
│   ├── repositories/       # Acesso a dados
│   └── services/           # Lógica de negócio
├── database_schema_complete.sql
├── websocket-server.js     # Servidor WebSocket
└── package.json
```

## 📱 Como Usar

1. **Registro/Login** - Criar conta ou fazer login
2. **Criar Notas** - Adicionar novas notas com tópicos
3. **Compartilhar** - Clicar no botão compartilhar e adicionar emails
4. **Gerenciar Acesso** - Alterar permissões ou remover usuários
5. **Sincronização** - Mudanças aparecem em tempo real

## 🔒 Segurança

- Autenticação JWT
- Senhas criptografadas com bcrypt
- Validação de permissões em todas as APIs
- Sanitização de dados de entrada

## 🌐 APIs Principais

- `GET /api/notas` - Listar notas do usuário
- `POST /api/notas/share` - Compartilhar nota
- `POST /api/notas/unshare` - Remover acesso
- `POST /api/notas/update-permission` - Alterar permissões
- `GET /api/notas/[id]/shared-users` - Usuários com acesso

## 📦 Portabilidade

**Para copiar para pen drive:**
1. Copiar toda a pasta do projeto
2. Instalar Node.js no computador de destino
3. Executar `npm install` na pasta
4. Configurar banco MySQL e `.env.local`
5. Executar `npm run dev`

**Requisitos no computador de destino:**
- Node.js 18+
- MySQL 8.0+
- Porta 3000 e 8080 disponíveis
