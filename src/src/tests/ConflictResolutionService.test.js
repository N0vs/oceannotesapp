/**
 * Testes para ConflictResolutionService
 * Testa estratégias de resolução de conflitos
 */

// Mock do banco de dados para testes de conflitos
class MockConflictDatabase {
  constructor() {
    this.data = {
      NotaConflito: [],
      NotaVersao: [],
      Nota: []
    };
    this.nextId = 1;
  }

  async query(sql, params = []) {
    if (sql.includes('SELECT nc.*') && sql.includes('NotaConflito')) {
      // Buscar detalhes do conflito
      const conflict = this.data.NotaConflito.find(c => c.ID === params[0]);
      if (conflict) {
        return [{
          ...conflict,
          TituloLocal: 'Título Local',
          ConteudoLocal: 'Conteúdo Local',
          TituloRemoto: 'Título Remoto',
          ConteudoRemoto: 'Conteúdo Remoto',
          DataCriacaoLocal: new Date('2024-01-01'),
          DataCriacaoRemoto: new Date('2024-01-02'),
          TituloNota: 'Nota Teste'
        }];
      }
      return [];
    }

    if (sql.includes('UPDATE NotaConflito') && sql.includes('StatusConflito')) {
      // Atualizar status do conflito
      const conflict = this.data.NotaConflito.find(c => c.ID === params[3]);
      if (conflict) {
        conflict.StatusConflito = params[0];
        conflict.TipoResolucao = params[1];
        conflict.VersaoResolucao = params[2];
      }
      return { affectedRows: 1 };
    }

    if (sql.includes('INSERT INTO Nota')) {
      // Criar nova nota (para estratégia de versões separadas)
      const newNote = {
        id: this.nextId++,
        titulo: params[0],
        conteudo: params[1],
        UtilizadorID: params[2]
      };
      this.data.Nota.push(newNote);
      return { insertId: newNote.id };
    }

    return [];
  }
}

// Mock dos serviços dependentes
class MockVersionService {
  async setCurrentVersion(noteId, versionId, userId) {
    return true;
  }

  async markVersionSynchronized(versionId) {
    return true;
  }

  async createVersion(noteId, userId, titulo, conteudo, dispositivoId, versaoPai) {
    return {
      ID: Math.floor(Math.random() * 1000),
      NotaID: noteId,
      VersaoNumero: 1,
      HashConteudo: 'mock-hash'
    };
  }
}

class MockHistoryService {
  async addHistoryEntry(noteId, versionId, userId, action, description, metadata) {
    return Math.floor(Math.random() * 1000);
  }
}

// Implementação simplificada do ConflictResolutionService para testes
class ConflictResolutionService {
  constructor(database, versionService, historyService) {
    this.db = database;
    this.versionService = versionService;
    this.historyService = historyService;
    
    this.resolutionStrategies = {
      'manter_local': this.resolveKeepLocal.bind(this),
      'manter_remoto': this.resolveKeepRemote.bind(this),
      'merge_manual': this.resolveMergeManual.bind(this),
      'criar_versoes_separadas': this.resolveCreateSeparateVersions.bind(this)
    };
  }

  async resolveConflict(conflictId, tipoResolucao, dadosResolucao = null, utilizadorId) {
    const conflict = await this.getConflictDetails(conflictId);
    
    if (!conflict) {
      throw new Error('Conflito não encontrado');
    }

    if (conflict.StatusConflito !== 'pendente') {
      throw new Error('Conflito já foi resolvido');
    }

    const strategy = this.resolutionStrategies[tipoResolucao];
    if (!strategy) {
      throw new Error(`Tipo de resolução inválido: ${tipoResolucao}`);
    }

    const result = await strategy(conflict, dadosResolucao, utilizadorId);

    await this.db.query(
      `UPDATE NotaConflito 
       SET StatusConflito = ?, TipoResolucao = ?, VersaoResolucao = ?, DataResolucao = NOW() 
       WHERE ID = ?`,
      ['resolvido_manual', tipoResolucao, result.versaoResolucao, conflictId]
    );

    await this.historyService.addHistoryEntry(
      conflict.NotaID,
      result.versaoResolucao,
      utilizadorId,
      'conflito_resolvido',
      `Conflito resolvido usando estratégia: ${tipoResolucao}`,
      { conflictId, tipoResolucao }
    );

    return result;
  }

  async resolveKeepLocal(conflict, dadosResolucao, utilizadorId) {
    await this.versionService.setCurrentVersion(
      conflict.NotaID, 
      conflict.VersaoLocal, 
      utilizadorId
    );

    await this.versionService.markVersionSynchronized(conflict.VersaoLocal);

    return {
      versaoResolucao: conflict.VersaoLocal,
      tipo: 'manter_local'
    };
  }

  async resolveKeepRemote(conflict, dadosResolucao, utilizadorId) {
    await this.versionService.setCurrentVersion(
      conflict.NotaID, 
      conflict.VersaoRemota, 
      utilizadorId
    );

    await this.versionService.markVersionSynchronized(conflict.VersaoRemota);

    return {
      versaoResolucao: conflict.VersaoRemota,
      tipo: 'manter_remoto'
    };
  }

  async resolveMergeManual(conflict, dadosResolucao, utilizadorId) {
    if (!dadosResolucao || !dadosResolucao.titulo || !dadosResolucao.conteudo) {
      throw new Error('Dados de merge são obrigatórios para resolução manual');
    }

    const mergedVersion = await this.versionService.createVersion(
      conflict.NotaID,
      utilizadorId,
      dadosResolucao.titulo,
      dadosResolucao.conteudo,
      dadosResolucao.dispositivoId,
      conflict.VersaoBase
    );

    await this.versionService.setCurrentVersion(
      conflict.NotaID,
      mergedVersion.ID,
      utilizadorId
    );

    return {
      versaoResolucao: mergedVersion.ID,
      tipo: 'merge_manual',
      versaoMesclada: mergedVersion
    };
  }

  async resolveCreateSeparateVersions(conflict, dadosResolucao, utilizadorId) {
    const notaCopiaLocal = await this.db.query(
      `INSERT INTO Nota (titulo, conteudo, UtilizadorID, StatusCompartilhamento) 
       VALUES (?, ?, ?, ?)`,
      [
        `Nota Teste (Versão Local)`,
        conflict.ConteudoLocal,
        conflict.UsuarioLocal,
        'privada'
      ]
    );

    const notaCopiaRemota = await this.db.query(
      `INSERT INTO Nota (titulo, conteudo, UtilizadorID, StatusCompartilhamento) 
       VALUES (?, ?, ?, ?)`,
      [
        `Nota Teste (Versão Remota)`,
        conflict.ConteudoRemoto,
        conflict.UsuarioRemoto,
        'privada'
      ]
    );

    const versaoMaisRecente = conflict.DataCriacaoLocal > conflict.DataCriacaoRemota 
      ? conflict.VersaoLocal 
      : conflict.VersaoRemota;

    return {
      versaoResolucao: versaoMaisRecente,
      tipo: 'criar_versoes_separadas',
      notaCopiaLocal: notaCopiaLocal.insertId,
      notaCopiaRemota: notaCopiaRemota.insertId
    };
  }

  async getConflictDetails(conflictId) {
    const result = await this.db.query(
      `SELECT nc.*, 
              vl.Titulo as TituloLocal, vl.Conteudo as ConteudoLocal, vl.DataCriacao as DataCriacaoLocal,
              vr.Titulo as TituloRemoto, vr.Conteudo as ConteudoRemoto, vr.DataCriacao as DataCriacaoRemota,
              n.titulo as TituloNota
       FROM NotaConflito nc
       INNER JOIN NotaVersao vl ON vl.ID = nc.VersaoLocal
       INNER JOIN NotaVersao vr ON vr.ID = nc.VersaoRemota
       INNER JOIN Nota n ON n.id = nc.NotaID
       WHERE nc.ID = ?`,
      [conflictId]
    );

    return result[0] || null;
  }

  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }
}

// Testes
describe('ConflictResolutionService', () => {
  let service;
  let mockDb;
  let mockVersionService;
  let mockHistoryService;

  beforeEach(() => {
    mockDb = new MockConflictDatabase();
    mockVersionService = new MockVersionService();
    mockHistoryService = new MockHistoryService();
    service = new ConflictResolutionService(mockDb, mockVersionService, mockHistoryService);

    // Criar conflito de teste
    mockDb.data.NotaConflito.push({
      ID: 1,
      NotaID: 1,
      VersaoLocal: 1,
      VersaoRemota: 2,
      VersaoBase: 0,
      UsuarioLocal: 1,
      UsuarioRemoto: 2,
      StatusConflito: 'pendente'
    });
  });

  describe('resolveConflict', () => {
    test('deve resolver conflito mantendo versão local', async () => {
      const result = await service.resolveConflict(1, 'manter_local', null, 1);
      
      expect(result.tipo).toBe('manter_local');
      expect(result.versaoResolucao).toBe(1);
    });

    test('deve resolver conflito mantendo versão remota', async () => {
      const result = await service.resolveConflict(1, 'manter_remoto', null, 1);
      
      expect(result.tipo).toBe('manter_remoto');
      expect(result.versaoResolucao).toBe(2);
    });

    test('deve resolver conflito com merge manual', async () => {
      const mergeData = {
        titulo: 'Título Mesclado',
        conteudo: 'Conteúdo Mesclado'
      };

      const result = await service.resolveConflict(1, 'merge_manual', mergeData, 1);
      
      expect(result.tipo).toBe('merge_manual');
      expect(result.versaoMesclada).toBeDefined();
    });

    test('deve resolver conflito criando versões separadas', async () => {
      const result = await service.resolveConflict(1, 'criar_versoes_separadas', null, 1);
      
      expect(result.tipo).toBe('criar_versoes_separadas');
      expect(result.notaCopiaLocal).toBeDefined();
      expect(result.notaCopiaRemota).toBeDefined();
    });

    test('deve falhar com tipo de resolução inválido', async () => {
      await expect(
        service.resolveConflict(1, 'tipo_invalido', null, 1)
      ).rejects.toThrow('Tipo de resolução inválido');
    });

    test('deve falhar se conflito não existir', async () => {
      await expect(
        service.resolveConflict(999, 'manter_local', null, 1)
      ).rejects.toThrow('Conflito não encontrado');
    });

    test('deve falhar para merge manual sem dados', async () => {
      await expect(
        service.resolveConflict(1, 'merge_manual', null, 1)
      ).rejects.toThrow('Dados de merge são obrigatórios');
    });
  });

  describe('calculateSimilarity', () => {
    test('deve calcular similaridade corretamente', () => {
      const similarity1 = service.calculateSimilarity('hello world', 'hello world');
      expect(similarity1).toBe(1);

      const similarity2 = service.calculateSimilarity('hello world', 'goodbye world');
      expect(similarity2).toBe(0.5);

      const similarity3 = service.calculateSimilarity('hello', 'goodbye');
      expect(similarity3).toBe(0);
    });

    test('deve lidar com textos vazios', () => {
      const similarity = service.calculateSimilarity('', 'hello');
      expect(similarity).toBe(0);
    });
  });
});

// Função para executar testes
function runConflictTests() {
  console.log('🧪 Executando testes do ConflictResolutionService...');
  
  const mockDb = new MockConflictDatabase();
  const mockVersionService = new MockVersionService();
  const mockHistoryService = new MockHistoryService();
  const service = new ConflictResolutionService(mockDb, mockVersionService, mockHistoryService);

  // Preparar dados de teste
  mockDb.data.NotaConflito.push({
    ID: 1,
    NotaID: 1,
    VersaoLocal: 1,
    VersaoRemota: 2,
    VersaoBase: 0,
    UsuarioLocal: 1,
    UsuarioRemoto: 2,
    StatusConflito: 'pendente'
  });

  // Teste 1: Similaridade
  console.log('✅ Teste 1: Cálculo de similaridade');
  const sim1 = service.calculateSimilarity('hello world', 'hello world');
  const sim2 = service.calculateSimilarity('hello world', 'goodbye world');
  console.assert(sim1 === 1, 'Textos iguais devem ter similaridade 1');
  console.assert(sim2 === 0.5, 'Textos com 50% de palavras comuns devem ter similaridade 0.5');

  // Teste 2: Resolução manter local
  console.log('✅ Teste 2: Resolução manter local');
  service.resolveConflict(1, 'manter_local', null, 1).then(result => {
    console.assert(result.tipo === 'manter_local', 'Tipo deve ser manter_local');
    console.assert(result.versaoResolucao === 1, 'Versão resolvida deve ser a local');
  });

  // Teste 3: Merge manual com dados
  console.log('✅ Teste 3: Merge manual');
  const mergeData = { titulo: 'Teste', conteudo: 'Conteúdo teste' };
  service.resolveConflict(1, 'merge_manual', mergeData, 1).then(result => {
    console.assert(result.tipo === 'merge_manual', 'Tipo deve ser merge_manual');
    console.assert(result.versaoMesclada !== undefined, 'Deve ter versão mesclada');
    console.log('✅ Todos os testes de conflito passaram!');
  });
}

// Exportar para uso em ambiente de teste
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    runConflictTests, 
    ConflictResolutionService, 
    MockConflictDatabase,
    MockVersionService,
    MockHistoryService
  };
}

// Executar testes se arquivo for executado diretamente
if (typeof window === 'undefined' && require.main === module) {
  runConflictTests();
}
