# API Media

Esta pasta contém os endpoints de gerenciamento de arquivos de mídia da aplicação Ocean Notes, implementando upload seguro e recuperação de imagens associadas às notas.

## Estrutura e Responsabilidades

### Arquitetura de Mídia

O sistema de mídia segue padrões de segurança e performance:
- **Upload seguro** com validação de tipo e tamanho
- **Armazenamento local** em sistema de arquivos
- **Associação com notas** via relacionamento database
- **Controle de permissões** baseado em acesso às notas
- **URLs públicas** para servir arquivos estaticamente
- **Identificadores únicos** UUID para cada arquivo

### Endpoints Disponíveis

**upload.js**
- Endpoint: `POST /api/media/upload`
- Upload de arquivos de imagem (multipart/form-data)
- Limite de 10MB por arquivo
- Geração automática de nomes únicos
- Associação opcional com notas

**[notaId].js**
- Endpoint: `GET /api/media/:notaId`
- Recuperação de imagens de nota específica
- Validação de permissões de acesso
- Lista ordenada por data de upload

## Funcionalidades por Endpoint

### POST /api/media/upload

**Descrição**
Endpoint para upload de arquivos de imagem com processamento seguro e armazenamento local.

**Request (multipart/form-data)**
```
Content-Type: multipart/form-data

Fields:
- image: [File] Arquivo de imagem (obrigatório)
- notaId: [string] ID da nota para associar (opcional)
```

**Response Success (201)**
```json
{
  "success": true,
  "media": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "caminho": "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
    "url": "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
    "notaId": "nota123"
  }
}
```

**Response Errors**
- `400`: Nenhuma imagem foi enviada
- `401`: Token de autenticação inválido
- `405`: Método não permitido (apenas POST)
- `413`: Arquivo excede limite de 10MB
- `500`: Erro interno do servidor

**Fluxo de Upload**
1. Validação de método HTTP (POST only)
2. Autenticação via authMiddleware
3. Criação de diretório de uploads se necessário
4. Configuração do parser multipart (formidable)
5. Validação de arquivo enviado
6. Geração de UUID único para o arquivo
7. Movimentação do arquivo para destino final
8. Inserção de registro na tabela Midia
9. Retorno com dados do arquivo

### GET /api/media/:notaId

**Descrição**
Endpoint para recuperar todas as imagens associadas a uma nota específica.

**Request Parameters**
```
URL: /api/media/{notaId}
Method: GET
Headers: Authorization: Bearer {token}
```

**Response Success (200)**
```json
{
  "success": true,
  "images": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "url": "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
      "uploadedBy": "user123"
    }
  ]
}
```

**Response Errors**
- `400`: ID da nota é obrigatório
- `401`: Token de autenticação inválido
- `403`: Sem permissão para aceder a esta nota
- `405`: Método não permitido (apenas GET)
- `500`: Erro interno do servidor

**Fluxo de Recuperação**
1. Validação de método HTTP (GET only)
2. Autenticação via authMiddleware
3. Extração do notaId da URL
4. Verificação de permissões na nota
5. Query JOIN para validar acesso (proprietário ou compartilhado)
6. Busca de imagens associadas à nota
7. Retorno com lista ordenada por data

## Arquitetura e Segurança

### Sistema de Arquivos

**Estrutura de Diretórios**
```
public/
└── uploads/
    ├── 550e8400-e29b-41d4-a716-446655440000.jpg
    ├── 660f9511-f39c-52e5-b827-557766551111.png
    └── ...outros arquivos...
```

**Configuração de Servir Arquivos**
- Next.js serve automaticamente arquivos em `/public`
- URLs acessíveis como `/uploads/filename.ext`
- Sem necessidade de endpoint dedicado para servir

### Validação e Segurança

**Upload Security**
```javascript
const form = formidable({
  keepExtensions: true,           // Preserva extensão original
  maxFileSize: 10 * 1024 * 1024, // Limite de 10MB
  uploadDir: uploadsDir,          // Diretório controlado
  multiples: false                // Um arquivo por vez
});
```

**File Naming**
- UUID v4 para nomes únicos
- Preservação de extensão original
- Prevenção de conflitos de nome
- Impossibilidade de path traversal

**Permission Validation**
```sql
SELECT n.id 
FROM Nota n
LEFT JOIN NotaCompartilhamento nc ON n.id = nc.NotaID 
WHERE n.id = ? AND (
  n.UtilizadorID = ? OR 
  (nc.UsuarioCompartilhadoID = ? AND nc.Ativo = true)
)
```

### Estrutura de Database

**Tabela Midia**
```sql
CREATE TABLE Midia (
  Id VARCHAR(36) PRIMARY KEY,  -- UUID único
  utilizadorId INT NOT NULL,   -- Usuário que fez upload
  caminho VARCHAR(255),        -- Caminho relativo do arquivo
  notaId INT NULL,             -- Nota associada (opcional)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilizadorId) REFERENCES Utilizador(Id),
  FOREIGN KEY (notaId) REFERENCES Nota(id) ON DELETE CASCADE
);
```

**Relacionamentos**
- **Midia N:1 Utilizador**: Cada arquivo tem um uploader
- **Midia N:1 Nota**: Arquivo pode estar associado a nota
- **CASCADE DELETE**: Remover nota remove suas imagens

## Integração com Componentes

### RichTextEditor Integration

**Client-Side Upload**
```javascript
const handleImageUpload = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('notaId', noteId);
  
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (response.ok) {
    const { media } = await response.json();
    insertImageIntoEditor(media.url);
  }
};
```

**Drag & Drop Support**
```javascript
const handleDrop = async (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  for (const file of imageFiles) {
    await handleImageUpload(file);
  }
};
```

### Note Media Gallery

**Loading Note Images**
```javascript
const loadNoteImages = async (noteId) => {
  const response = await fetch(`/api/media/${noteId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.ok) {
    const { images } = await response.json();
    displayImageGallery(images);
  }
};
```

## Tratamento de Erros

### Tipos de Erro

**Upload Errors**
- **File Size**: Arquivo excede 10MB
- **No File**: Nenhum arquivo enviado
- **Disk Space**: Espaço insuficiente
- **Permissions**: Erro de escrita no filesystem

**Access Errors**
- **Invalid Note**: Nota não existe
- **No Permission**: Usuário sem acesso
- **Shared Inactive**: Compartilhamento desativado

### Error Recovery

**Client-Side Retry**
```javascript
const uploadWithRetry = async (file, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadImage(file);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await delay(1000 * attempt); // Exponential backoff
    }
  }
};
```

**Server-Side Cleanup**
```javascript
// Cleanup em caso de erro durante upload
try {
  // Upload logic...
} catch (error) {
  // Remover arquivo temporário se existir
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath);
  }
  throw error;
}
```

## Performance e Otimização

### Upload Optimization

**Streaming Upload**
- Formidable processa arquivos em stream
- Não carrega arquivo inteiro na memória
- Suporte a arquivos grandes (até 10MB)

**Concurrent Uploads**
```javascript
const uploadMultipleImages = async (files) => {
  const uploadPromises = files.map(file => uploadImage(file));
  return await Promise.all(uploadPromises);
};
```

### Storage Optimization

**File Compression**
```javascript
// Possível implementação futura
const compressImage = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
};
```

**CDN Integration**
```javascript
// Configuração para CDN futuro
const getImageUrl = (filename) => {
  const baseUrl = process.env.CDN_URL || '';
  return `${baseUrl}/uploads/${filename}`;
};
```

## Monitoramento e Logs

### Upload Metrics

**Key Performance Indicators**
- Upload success/failure rates
- Average upload time
- File size distribution
- Storage usage by user

**Logging Strategy**
```javascript
console.log(`Upload successful: ${mediaId}`, {
  userId: utilizadorId,
  filename: fileName,
  size: file.size,
  noteId: notaId || 'unassociated'
});
```

### Security Monitoring

**Suspicious Activity**
- Multiple large uploads
- Excessive failed attempts
- Unusual file types
- Access to unauthorized notes

## Configuração e Deployment

### Environment Variables

**Required Configuration**
```env
# Database connection
DB_CONNECTION_STRING=mysql://user:pass@localhost/db

# Upload configuration
MAX_FILE_SIZE=10485760        # 10MB in bytes
UPLOADS_DIR=public/uploads    # Upload directory
```

### File System Permissions

**Directory Setup**
```bash
# Ensure upload directory exists with correct permissions
mkdir -p public/uploads
chmod 755 public/uploads
```

**Docker Volume**
```yaml
# docker-compose.yml
volumes:
  - ./public/uploads:/app/public/uploads
```

## Estrutura de Arquivos

```
media/
├── README.md        # Este documento
├── upload.js        # Upload de arquivos de mídia
└── [notaId].js     # Buscar mídia de nota específica
```

## Padrões de Uso

### Frontend Integration

**Image Upload Component**
```jsx
const ImageUpload = ({ noteId, onUpload }) => {
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const result = await uploadImage(file, noteId);
      onUpload(result.media);
    }
  };
  
  return (
    <input 
      type="file" 
      accept="image/*" 
      onChange={handleFileSelect}
    />
  );
};
```

**Image Gallery Component**
```jsx
const ImageGallery = ({ noteId }) => {
  const [images, setImages] = useState([]);
  
  useEffect(() => {
    loadNoteImages(noteId).then(setImages);
  }, [noteId]);
  
  return (
    <div className="image-gallery">
      {images.map(img => (
        <img key={img.id} src={img.url} alt="Note image" />
      ))}
    </div>
  );
};
```

### Authentication Integration

**Token-based Requests**
```javascript
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  return fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
};
```

Os endpoints de mídia são projetados para serem seguros, eficientes e facilmente integráveis, seguindo as melhores práticas de upload de arquivos e gestão de permissões.
