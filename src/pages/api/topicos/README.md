# API Tópicos

Esta pasta contém os endpoints para operações de tópicos/tags da aplicação Ocean Notes, implementando um sistema completo de categorização e organização de notas.

## Estrutura e Responsabilidades

### Arquitetura de Tópicos

O sistema de tópicos funciona como um sistema de tags personalizado:
- **Propriedade individual** - Cada usuário gerencia seus próprios tópicos
- **Categorização visual** - Sistema de cores personalizáveis
- **Associação com notas** - Relacionamento many-to-many com notas
- **Validação de duplicatas** - Prevenção de nomes duplicados por usuário
- **Interface intuitiva** - Criação, edição e exclusão simplificadas

### Endpoints Disponíveis

**index.js**
- `GET /api/topicos` - Lista todos os tópicos do usuário autenticado
- `POST /api/topicos` - Cria novo tópico com nome e cor personalizados
- Error handling graceful para UX consistente
- Fallback para array vazio em caso de problemas

**[id].js**
- `GET /api/topicos/:id` - Busca tópico específico com notas relacionadas
- `PUT /api/topicos/:id` - Atualiza nome e/ou cor do tópico
- `DELETE /api/topicos/:id` - Remove tópico (com validação de propriedade)
- Validação rigorosa de propriedade em todas as operações

## Funcionalidades Detalhadas

### GET /api/topicos

**Response Success (200)**
```json
[
  {
    "id": "1",
    "nome": "Trabalho",
    "cor": "#FF5733",
    "UtilizadorID": 123
  }
]
```

**Características**
- Retorna array vazio `[]` em vez de erro quando há problemas
- Isolamento total entre usuários

### POST /api/topicos

**Request Body**
```json
{
  "nome": "Estudos",
  "cor": "#9C27B0"
}
```

**Validações**
- Nome obrigatório e único por usuário
- Cor em formato hexadecimal válido
- UtilizadorID injetado automaticamente

### GET /api/topicos/:id

**Response Success (200)**
```json
{
  "topico": {
    "id": "1",
    "nome": "Trabalho",
    "cor": "#FF5733"
  },
  "notas": [
    {
      "id": "123",
      "titulo": "Reunião importante"
    }
  ]
}
```

**Funcionalidades**
- Mostra notas que usam o tópico
- Validação de propriedade automática

### PUT/DELETE /api/topicos/:id

**PUT**: Atualiza nome e/ou cor
**DELETE**: Remove tópico e associações

## Integração com Sistema

### Database Structure
```sql
CREATE TABLE Topico (
  ID INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(7) NOT NULL,
  UtilizadorID INT NOT NULL,
  UNIQUE KEY unique_topic_per_user (nome, UtilizadorID)
);

CREATE TABLE NotaTopico (
  NotaID INT,
  TopicoID INT,
  PRIMARY KEY (NotaID, TopicoID)
);
```

### Frontend Integration

**Loading Topics**
```javascript
const loadTopics = async () => {
  const response = await fetch('/api/topicos', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Creating Topic**
```javascript
const createTopic = async (nome, cor) => {
  const response = await fetch('/api/topicos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ nome, cor })
  });
  return response.json();
};
```

### Tag Component
```jsx
const TopicTag = ({ topic, removable, onRemove }) => (
  <span
    style={{
      backgroundColor: topic.cor + '20',
      color: topic.cor,
      border: `1px solid ${topic.cor}50`
    }}
  >
    {topic.nome}
    {removable && <button onClick={() => onRemove(topic)}>×</button>}
  </span>
);
```

## Segurança e Validações

### Input Validation
- Nome: obrigatório, único, máximo 100 caracteres
- Cor: formato hexadecimal válido (#RRGGBB)
- Propriedade: verificada em todas as operações

### Error Handling
```javascript
const TopicErrors = {
  DUPLICATE_NAME: 'Já existe um tópico com este nome',
  INVALID_COLOR: 'Cor deve estar em formato hexadecimal válido',
  NOT_FOUND: 'Tópico não encontrado',
  UNAUTHORIZED: 'Sem permissão para acessar este tópico'
};
```

## Performance

### Database Optimization
```sql
CREATE INDEX idx_topico_usuario ON Topico(UtilizadorID);
CREATE INDEX idx_topico_nome_usuario ON Topico(nome, UtilizadorID);
```

### Client-side Caching
```javascript
const TopicCache = {
  data: null,
  ttl: 5 * 60 * 1000, // 5 minutos
  
  async getTopics() {
    if (this.isValid()) return this.data;
    
    this.data = await fetchTopicsFromAPI();
    this.lastFetch = Date.now();
    return this.data;
  }
};
```

## Estrutura de Arquivos

```
topicos/
├── README.md    # Este documento
├── index.js     # Lista e criação de tópicos (GET/POST)
└── [id].js      # Operações por ID (GET/PUT/DELETE)
```

## Padrões de Uso

### Typical Workflow
1. **Load Topics**: `GET /api/topicos` para popular interface
2. **Create Topic**: `POST /api/topicos` quando usuário cria nova tag
3. **Update Topic**: `PUT /api/topicos/:id` para editar nome/cor
4. **Delete Topic**: `DELETE /api/topicos/:id` quando não é mais necessário
5. **View Usage**: `GET /api/topicos/:id` para ver notas relacionadas

### Integration with Notes
- Tópicos são associados às notas via tabela NotaTopico
- Interface permite adicionar/remover tópicos das notas
- Sistema de cores ajuda na organização visual
- Validação garante que apenas tópicos do usuário são utilizados

Os endpoints de tópicos fornecem uma base sólida para organização e categorização de notas, com foco em simplicidade, segurança e performance.
