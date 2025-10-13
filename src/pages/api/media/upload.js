import { connectToDatabase } from '../../../lib/db.js';
import authMiddleware from '../../../middlewares/authMiddleware.js';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const utilizadorId = req.userId;
    
    // Criar pasta de uploads se não existir
    const uploadsDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Parse do form com o arquivo
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB máximo
      uploadDir: uploadsDir,
      multiples: false
    });

    const [fields, files] = await form.parse(req);
    
    const file = files.image?.[0];
    if (!file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    // Gerar ID único para a imagem
    const mediaId = uuidv4();
    const fileExtension = path.extname(file.originalFilename || '.jpg');
    const fileName = `${mediaId}${fileExtension}`;
    const newPath = path.join(uploadsDir, fileName);

    // Mover arquivo para o local final
    fs.renameSync(file.filepath, newPath);

    // Salvar na base de dados
    const db = await connectToDatabase();
    const caminho = `/uploads/${fileName}`;
    const notaId = fields.notaId?.[0] || null;

    const [result] = await db.query(
      'INSERT INTO Midia (Id, utilizadorId, caminho, notaId) VALUES (?, ?, ?, ?)',
      [mediaId, utilizadorId, caminho, notaId]
    );

    res.status(201).json({
      success: true,
      media: {
        id: mediaId,
        caminho: caminho,
        url: caminho,
        notaId: notaId
      }
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

export default authMiddleware(handler);
