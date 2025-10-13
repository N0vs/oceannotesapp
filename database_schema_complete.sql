-- Esquema completo da base de dados OceanNotes com correções
CREATE DATABASE IF NOT EXISTS oceannotes;
USE oceannotes;

CREATE TABLE Utilizador (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Password VARCHAR(255) NULL, -- NULL permitido para usuários Google
    Email VARCHAR(100) UNIQUE NOT NULL,
    GoogleId VARCHAR(255) NULL, -- ID do Google OAuth
    Avatar TEXT NULL -- URL do avatar do Google
);


CREATE TABLE Topico (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cor VARCHAR(20),
    UtilizadorID INT,
    FOREIGN KEY (UtilizadorID) REFERENCES Utilizador(Id) ON DELETE CASCADE
);

CREATE TABLE Nota (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200),
    conteudo TEXT,
    dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dataAtualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UtilizadorID INT,
    AtualizadoPorUtilizador INT,
    topicoID INT,
    FOREIGN KEY (UtilizadorID) REFERENCES Utilizador(Id) ON DELETE SET NULL,
    FOREIGN KEY (AtualizadoPorUtilizador) REFERENCES Utilizador(Id) ON DELETE SET NULL,
    FOREIGN KEY (topicoID) REFERENCES Topico(ID) ON DELETE SET NULL
);

-- Tabela para associação muitos-para-muitos entre Notas e Tópicos
CREATE TABLE NotaTopico (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    NotaID INT NOT NULL,
    TopicoID INT NOT NULL,
    UtilizadorID INT NOT NULL, -- NOVA COLUNA
    DataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (NotaID) REFERENCES Nota(id) ON DELETE CASCADE,
    FOREIGN KEY (TopicoID) REFERENCES Topico(ID) ON DELETE CASCADE,
    FOREIGN KEY (UtilizadorID) REFERENCES Utilizador(Id) ON DELETE CASCADE, -- NOVA FK
    UNIQUE KEY unique_nota_topico_usuario (NotaID, TopicoID, UtilizadorID) -- UNIQUE ATUALIZADA
);

CREATE TABLE Midia (
    Id VARCHAR(50) PRIMARY KEY,
    utilizadorId INT,
    caminho VARCHAR(255),
    notaId INT,
    FOREIGN KEY (utilizadorId) REFERENCES Utilizador(Id) ON DELETE CASCADE,
    FOREIGN KEY (notaId) REFERENCES Nota(id) ON DELETE CASCADE
);

CREATE TABLE CompartilhamentoNota (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    notaId INT,
    usuarioID INT,
    permissao ENUM('leitura', 'escrita') NOT NULL DEFAULT 'leitura',
    dataCompartilhamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    caminho VARCHAR(255),
    FOREIGN KEY (notaId) REFERENCES Nota(id) ON DELETE CASCADE,
    FOREIGN KEY (usuarioID) REFERENCES Utilizador(Id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX idx_nota_topico_nota ON NotaTopico(NotaID);
CREATE INDEX idx_nota_topico_topico ON NotaTopico(TopicoID);
CREATE INDEX idx_nota_utilizador ON Nota(UtilizadorID);
CREATE INDEX idx_topico_utilizador ON Topico(UtilizadorID);


-- Extensão do esquema para suporte a compartilhamento e sincronização de notas
-- Seguindo princípios SOLID para estrutura de dados

-- Tabela para versionamento de notas
CREATE TABLE NotaVersao (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    NotaID INT NOT NULL,
    UtilizadorID INT NOT NULL,
    Titulo VARCHAR(255) NOT NULL,
    Conteudo TEXT,
    VersaoNumero INT NOT NULL,
    HashConteudo VARCHAR(64) NOT NULL, -- SHA-256 do conteúdo para detecção de mudanças
    DataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    DispositivoID VARCHAR(100), -- Identificador do dispositivo que criou a versão
    StatusSincronizacao ENUM('pendente', 'sincronizado', 'conflito') DEFAULT 'pendente',
    VersaoPai INT NULL, -- Referência à versão anterior (para merge)
    
    FOREIGN KEY (NotaID) REFERENCES Nota(id) ON DELETE CASCADE,
    FOREIGN KEY (UtilizadorID) REFERENCES Utilizador(Id) ON DELETE CASCADE,
    FOREIGN KEY (VersaoPai) REFERENCES NotaVersao(ID) ON DELETE SET NULL,
    
    INDEX idx_nota_versao (NotaID, VersaoNumero),
    INDEX idx_hash_conteudo (HashConteudo),
    INDEX idx_status_sync (StatusSincronizacao)
);

-- Tabela para compartilhamento de notas
CREATE TABLE NotaCompartilhamento (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    NotaID INT NOT NULL,
    ProprietarioID INT NOT NULL, -- Criador original da nota
    UsuarioCompartilhadoID INT NOT NULL, -- Usuário com quem foi compartilhado
    TipoPermissao ENUM('visualizar', 'editar', 'admin') NOT NULL DEFAULT 'visualizar',
    DataCompartilhamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    DataExpiracao TIMESTAMP NULL, -- Opcional: compartilhamento temporário
    Ativo BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (NotaID) REFERENCES Nota(id) ON DELETE CASCADE,
    FOREIGN KEY (ProprietarioID) REFERENCES Utilizador(Id) ON DELETE CASCADE,
    FOREIGN KEY (UsuarioCompartilhadoID) REFERENCES Utilizador(Id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_compartilhamento (NotaID, UsuarioCompartilhadoID),
    INDEX idx_usuario_compartilhado (UsuarioCompartilhadoID),
    INDEX idx_proprietario (ProprietarioID)
);

-- Tabela para histórico de modificações
CREATE TABLE NotaHistorico (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    NotaID INT NOT NULL,
    VersaoID INT NOT NULL,
    UtilizadorID INT NOT NULL,
    TipoAcao ENUM('criacao', 'edicao', 'compartilhamento', 'merge', 'conflito_resolvido') NOT NULL,
    DescricaoAcao TEXT,
    DataAcao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    MetadadosAcao JSON, -- Informações adicionais sobre a ação
    
    FOREIGN KEY (NotaID) REFERENCES Nota(id) ON DELETE CASCADE,
    FOREIGN KEY (VersaoID) REFERENCES NotaVersao(ID) ON DELETE CASCADE,
    FOREIGN KEY (UtilizadorID) REFERENCES Utilizador(Id) ON DELETE CASCADE,
    
    INDEX idx_nota_historico (NotaID, DataAcao),
    INDEX idx_usuario_historico (UtilizadorID, DataAcao)
);

-- Tabela para controle de conflitos
CREATE TABLE NotaConflito (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    NotaID INT NOT NULL,
    VersaoBase INT NOT NULL, -- Versão comum antes do conflito
    VersaoLocal INT NOT NULL, -- Versão local do usuário
    VersaoRemota INT NOT NULL, -- Versão remota conflitante
    UsuarioLocal INT NOT NULL,
    UsuarioRemoto INT NOT NULL,
    StatusConflito ENUM('pendente', 'resolvido_automatico', 'resolvido_manual', 'ignorado') DEFAULT 'pendente',
    TipoResolucao ENUM('manter_local', 'manter_remoto', 'merge_manual', 'criar_versoes_separadas') NULL,
    VersaoResolucao INT NULL, -- Versão resultante da resolução
    DataDeteccao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    DataResolucao TIMESTAMP NULL,
    
    FOREIGN KEY (NotaID) REFERENCES Nota(id) ON DELETE CASCADE,
    FOREIGN KEY (VersaoBase) REFERENCES NotaVersao(ID) ON DELETE CASCADE,
    FOREIGN KEY (VersaoLocal) REFERENCES NotaVersao(ID) ON DELETE CASCADE,
    FOREIGN KEY (VersaoRemota) REFERENCES NotaVersao(ID) ON DELETE CASCADE,
    FOREIGN KEY (UsuarioLocal) REFERENCES Utilizador(Id) ON DELETE CASCADE,
    FOREIGN KEY (UsuarioRemoto) REFERENCES Utilizador(Id) ON DELETE CASCADE,
    FOREIGN KEY (VersaoResolucao) REFERENCES NotaVersao(ID) ON DELETE SET NULL,
    
    INDEX idx_conflito_status (StatusConflito),
    INDEX idx_conflito_nota (NotaID, DataDeteccao)
);

-- Tabela para sessões de edição em tempo real
CREATE TABLE NotaSessaoEdicao (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    NotaID INT NOT NULL,
    UtilizadorID INT NOT NULL,
    DispositivoID VARCHAR(100) NOT NULL,
    DataInicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    DataUltimaAtividade TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    StatusSessao ENUM('ativa', 'inativa', 'expirada') DEFAULT 'ativa',
    VersaoAtual INT NULL, -- Versão sendo editada
    
    FOREIGN KEY (NotaID) REFERENCES Nota(id) ON DELETE CASCADE,
    FOREIGN KEY (UtilizadorID) REFERENCES Utilizador(Id) ON DELETE CASCADE,
    FOREIGN KEY (VersaoAtual) REFERENCES NotaVersao(ID) ON DELETE SET NULL,
    
    INDEX idx_sessao_ativa (NotaID, StatusSessao),
    INDEX idx_usuario_sessao (UtilizadorID, StatusSessao)
);

-- Tabela para sincronização offline
CREATE TABLE NotaSincronizacaoOffline (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    NotaID INT NOT NULL,
    UtilizadorID INT NOT NULL,
    DispositivoID VARCHAR(100) NOT NULL,
    VersaoOffline INT NOT NULL,
    DataCriacaoOffline TIMESTAMP NOT NULL,
    DataSincronizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    StatusSincronizacao ENUM('pendente', 'sincronizado', 'conflito', 'erro') DEFAULT 'pendente',
    DadosOffline JSON, -- Dados da versão offline
    
    FOREIGN KEY (NotaID) REFERENCES Nota(id) ON DELETE CASCADE,
    FOREIGN KEY (UtilizadorID) REFERENCES Utilizador(Id) ON DELETE CASCADE,
    FOREIGN KEY (VersaoOffline) REFERENCES NotaVersao(ID) ON DELETE CASCADE,
    
    INDEX idx_sync_offline_status (StatusSincronizacao),
    INDEX idx_sync_offline_dispositivo (DispositivoID, StatusSincronizacao)
);

-- Atualizar tabela Nota existente para suporte a versionamento
ALTER TABLE Nota ADD COLUMN VersaoAtual INT NULL;
ALTER TABLE Nota ADD COLUMN UltimaModificacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE Nota ADD COLUMN UltimoModificadorID INT NULL;
ALTER TABLE Nota ADD COLUMN StatusCompartilhamento ENUM('privada', 'compartilhada') DEFAULT 'privada';
ALTER TABLE Nota ADD COLUMN HashConteudo VARCHAR(64) NULL;

ALTER TABLE Nota ADD FOREIGN KEY (VersaoAtual) REFERENCES NotaVersao(ID) ON DELETE SET NULL;
ALTER TABLE Nota ADD FOREIGN KEY (UltimoModificadorID) REFERENCES Utilizador(Id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX idx_nota_compartilhamento ON Nota(StatusCompartilhamento);
CREATE INDEX idx_nota_ultima_modificacao ON Nota(UltimaModificacao);
CREATE INDEX idx_nota_hash ON Nota(HashConteudo);

