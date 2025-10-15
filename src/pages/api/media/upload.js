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

/**
 * API endpoint para upload de arquivos de mídia
 * Processa upload de imagens e associa à nota ou usuário
 * 
 * @api {POST} /api/media/upload Upload de arquivo de mídia
 * @apiName UploadMedia
 * @apiGroup Media
 * @apiVersion 1.0.0
 * 
 * @apiParam {File} image Arquivo de imagem a ser enviado (multipart/form-data)
 * @apiParam {string} [notaId] ID da nota para associar a imagem (opcional)
 * 
 * @apiSuccess {boolean} success Indica sucesso da operação
 * @apiSuccess {Object} media Dados do arquivo enviado
 * @apiSuccess {string} media.id ID único gerado para o arquivo
 * @apiSuccess {string} media.caminho Caminho relativo do arquivo
 * @apiSuccess {string} media.url URL acessível do arquivo
 * @apiSuccess {string|null} media.notaId ID da nota associada
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "success": true,
 *       "media": {
 *         "id": "550e8400-e29b-41d4-a716-446655440000",
 *         "caminho": "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
 *         "url": "/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
 *         "notaId": "nota123"
 *       }
 *     }
 * 
 * @apiError (400) NoImageProvided Nenhuma imagem foi enviada
 * @apiError (401) Unauthorized Token de autenticação inválido
 * @apiError (405) MethodNotAllowed Método HTTP não permitido
 * @apiError (413) FileTooLarge Arquivo excede limite de 10MB
 * @apiError (500) InternalError Erro interno do servidor
 * 
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "Nenhuma imagem foi enviada"
 *     }
 * 
 * @description Endpoint protegido para upload de arquivos com limite de 10MB
 * @requires authMiddleware Token JWT válido
 * @note Desabilita bodyParser padrão para processar multipart/form-data
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Extração do ID do usuário autenticado via middleware
    const utilizadorId = req.userId;
    
    // Configuração do diretório de uploads: garante existência da pasta
    // Usa public/uploads para servir arquivos estaticamente via Next.js
    const uploadsDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true }); // Cria pasta e subpastas se necessário
    }

    // Configuração do parser de formulários multipart
    // Formidable processa uploads de arquivo de forma segura
    const form = formidable({
      keepExtensions: true, // Preserva extensão original do arquivo
      maxFileSize: 10 * 1024 * 1024, // Limite de 10MB para prevenir abuse
      uploadDir: uploadsDir, // Diretório temporário para processamento
      multiples: false // Apenas um arquivo por vez
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
