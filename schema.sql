CREATE DATABASE IF NOT EXISTS `oceannotes`;

USE `oceannotes`;

CREATE TABLE IF NOT EXISTS `Utilizador` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `Nome` varchar(255) NOT NULL,
  `Email` varchar(255) NOT NULL,
  `Password` varchar(255) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `Topico` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `Titulo` varchar(255) NOT NULL,
  `Descricao` text DEFAULT NULL,
  `DataCriacao` timestamp NOT NULL DEFAULT current_timestamp(),
  `UtilizadorID` int(11) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `UtilizadorID` (`UtilizadorID`),
  CONSTRAINT `topico_ibfk_1` FOREIGN KEY (`UtilizadorID`) REFERENCES `Utilizador` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `Nota` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `Conteudo` text NOT NULL,
  `DataCriacao` timestamp NOT NULL DEFAULT current_timestamp(),
  `TopicoID` int(11) NOT NULL,
  `UtilizadorID` int(11) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `TopicoID` (`TopicoID`),
  KEY `UtilizadorID` (`UtilizadorID`),
  CONSTRAINT `nota_ibfk_1` FOREIGN KEY (`TopicoID`) REFERENCES `Topico` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `nota_ibfk_2` FOREIGN KEY (`UtilizadorID`) REFERENCES `Utilizador` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
