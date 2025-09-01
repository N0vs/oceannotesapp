-- Tabela para associação muitos-para-muitos entre Notas e Tópicos
CREATE TABLE IF NOT EXISTS NotaTopico (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    NotaID INT NOT NULL,
    TopicoID INT NOT NULL,
    DataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (NotaID) REFERENCES Nota(ID) ON DELETE CASCADE,
    FOREIGN KEY (TopicoID) REFERENCES Topico(ID) ON DELETE CASCADE,
    UNIQUE KEY unique_nota_topico (NotaID, TopicoID)
);

-- Índices para melhor performance
CREATE INDEX idx_nota_topico_nota ON NotaTopico(NotaID);
CREATE INDEX idx_nota_topico_topico ON NotaTopico(TopicoID);
