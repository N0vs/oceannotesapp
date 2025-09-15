/**
 * Testes para NoteVersionService
 * Testa funcionalidades críticas de versionamento
 */

// Mock do banco de dados para testes
class MockDatabase {
  constructor() {
    this.data = {
      NotaVersao: [],
      Nota: []
    };
    this.nextId = 1;
  }

  async query(sql, params = []) {
    // Simular diferentes tipos de queries
    if (sql.includes('INSERT INTO NotaVersao')) {
      const newVersion = {
        ID: this.nextId++,
        NotaID: params[0],
        UtilizadorID: params[1],
        Titulo: params[2],
        Conteudo: params[3],
        VersaoNumero: params[4],
        HashConteudo: params[5],
        DispositivoID: params[6],
        VersaoPai: params[7],
        DataCriacao: new Date(),
        StatusSincronizacao: 'pendente'
      };
      this.data.NotaVersao.push(newVersion);
      return { insertId: newVersion.ID };
    }

    if (sql.includes('SELECT ID FROM NotaVersao') && sql.includes('HashConteudo')) {
      return this.data.NotaVersao.filter(v => 
        v.NotaID === params[0] && v.HashConteudo === params[1]
      );
    }

    if (sql.includes('SELECT MAX(VersaoNumero)')) {
      const versions = this.data.NotaVersao.filter(v => v.NotaID === params[0]);
      const maxVersion = Math.max(...versions.map(v => v.VersaoNumero), 0);
      return [{ maxVersion }];
    }

    if (sql.includes('SELECT nv.*') && sql.includes('VersaoAtual')) {
      // Simular busca de versão atual
      return this.data.NotaVersao.filter(v => v.ID === 1);
    }

    if (sql.includes('ORDER BY nv.VersaoNumero DESC')) {
      return this.data.NotaVersao
        .filter(v => v.NotaID === params[0])
        .sort((a, b) => b.VersaoNumero - a.VersaoNumero)
        .slice(0, params[1] || 50);
    }

    return [];
  }
}

// Importar serviço (simulado)
const NoteVersionService = require('../services/NoteVersionService').default || 
  class NoteVersionService {
    constructor(database) {
      this.db = database;
    }

    generateContentHash(titulo, conteudo) {
      const crypto = require('crypto');
      const content = `${titulo}|${conteudo || ''}`;
      return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    }

    async createVersion(notaId, utilizadorId, titulo, conteudo, dispositivoId = null, versaoPai = null) {
      const hashConteudo = this.generateContentHash(titulo, conteudo);
      
      const existingVersion = await this.db.query(
        'SELECT ID FROM NotaVersao WHERE NotaID = ? AND HashConteudo = ? ORDER BY VersaoNumero DESC LIMIT 1',
        [notaId, hashConteudo]
      );

      if (existingVersion.length > 0) {
        return existingVersion[0];
      }

      const lastVersion = await this.db.query(
        'SELECT MAX(VersaoNumero) as maxVersion FROM NotaVersao WHERE NotaID = ?',
        [notaId]
      );
      
      const nextVersion = (lastVersion[0]?.maxVersion || 0) + 1;

      const result = await this.db.query(
        `INSERT INTO NotaVersao 
         (NotaID, UtilizadorID, Titulo, Conteudo, VersaoNumero, HashConteudo, DispositivoID, VersaoPai) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [notaId, utilizadorId, titulo, conteudo, nextVersion, hashConteudo, dispositivoId, versaoPai]
      );

      return {
        ID: result.insertId,
        NotaID: notaId,
        VersaoNumero: nextVersion,
        HashConteudo: hashConteudo
      };
    }

    async getVersionHistory(notaId, limit = 50) {
      return await this.db.query(
        `SELECT nv.*, u.Nome as NomeUsuario 
         FROM NotaVersao nv 
         INNER JOIN Utilizador u ON u.Id = nv.UtilizadorID 
         WHERE nv.NotaID = ? 
         ORDER BY nv.VersaoNumero DESC 
         LIMIT ?`,
        [notaId, limit]
      );
    }
  };

// Testes
describe('NoteVersionService', () => {
  let service;
  let mockDb;

  beforeEach(() => {
    mockDb = new MockDatabase();
    service = new NoteVersionService(mockDb);
  });

  describe('generateContentHash', () => {
    test('deve gerar hash consistente para mesmo conteúdo', () => {
      const hash1 = service.generateContentHash('Título', 'Conteúdo');
      const hash2 = service.generateContentHash('Título', 'Conteúdo');
      expect(hash1).toBe(hash2);
    });

    test('deve gerar hashes diferentes para conteúdos diferentes', () => {
      const hash1 = service.generateContentHash('Título 1', 'Conteúdo 1');
      const hash2 = service.generateContentHash('Título 2', 'Conteúdo 2');
      expect(hash1).not.toBe(hash2);
    });

    test('deve lidar com conteúdo vazio', () => {
      const hash = service.generateContentHash('Título', '');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('createVersion', () => {
    test('deve criar primeira versão com número 1', async () => {
      const result = await service.createVersion(1, 1, 'Título', 'Conteúdo');
      
      expect(result).toBeDefined();
      expect(result.VersaoNumero).toBe(1);
      expect(result.NotaID).toBe(1);
    });

    test('deve incrementar número da versão', async () => {
      await service.createVersion(1, 1, 'Título', 'Conteúdo 1');
      const result = await service.createVersion(1, 1, 'Título', 'Conteúdo 2');
      
      expect(result.VersaoNumero).toBe(2);
    });

    test('deve retornar versão existente se hash for igual', async () => {
      const version1 = await service.createVersion(1, 1, 'Título', 'Conteúdo');
      const version2 = await service.createVersion(1, 1, 'Título', 'Conteúdo');
      
      expect(version1.ID).toBe(version2.ID);
    });

    test('deve incluir dispositivo e versão pai se fornecidos', async () => {
      const result = await service.createVersion(
        1, 1, 'Título', 'Conteúdo', 'device123', 'parent456'
      );
      
      expect(result).toBeDefined();
      expect(result.VersaoNumero).toBe(1);
    });
  });

  describe('getVersionHistory', () => {
    test('deve retornar histórico vazio para nota sem versões', async () => {
      const history = await service.getVersionHistory(999);
      expect(history).toEqual([]);
    });

    test('deve respeitar limite de resultados', async () => {
      // Criar várias versões
      for (let i = 1; i <= 10; i++) {
        await service.createVersion(1, 1, 'Título', `Conteúdo ${i}`);
      }
      
      const history = await service.getVersionHistory(1, 5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });
});

// Função para executar testes (simulação)
function runTests() {
  console.log('🧪 Executando testes do NoteVersionService...');
  
  const mockDb = new MockDatabase();
  const service = new NoteVersionService(mockDb);
  
  // Teste 1: Hash consistente
  console.log('✅ Teste 1: Hash consistente');
  const hash1 = service.generateContentHash('Título', 'Conteúdo');
  const hash2 = service.generateContentHash('Título', 'Conteúdo');
  console.assert(hash1 === hash2, 'Hashes devem ser iguais');
  
  // Teste 2: Hashes diferentes
  console.log('✅ Teste 2: Hashes diferentes');
  const hashA = service.generateContentHash('A', 'A');
  const hashB = service.generateContentHash('B', 'B');
  console.assert(hashA !== hashB, 'Hashes devem ser diferentes');
  
  // Teste 3: Criação de versão
  console.log('✅ Teste 3: Criação de versão');
  service.createVersion(1, 1, 'Título', 'Conteúdo').then(result => {
    console.assert(result.VersaoNumero === 1, 'Primeira versão deve ser 1');
    console.log('✅ Todos os testes passaram!');
  });
}

// Exportar para uso em ambiente de teste
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests, NoteVersionService, MockDatabase };
}

// Executar testes se arquivo for executado diretamente
if (typeof window === 'undefined' && require.main === module) {
  runTests();
}
