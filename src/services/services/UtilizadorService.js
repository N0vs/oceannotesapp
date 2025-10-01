import UtilizadorRepository from '../repositories/UtilizadorRepository.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

class UtilizadorService {
  async create(utilizadorData) {
    const { Nome, Password, Email } = utilizadorData;

    // Validar senha (mínimo 8 caracteres)
    if (!Password || Password.length < 8) {
      throw new Error('A senha deve ter pelo menos 8 caracteres.');
    }

    // Verificar se o e-mail já existe
    const existingUser = await UtilizadorRepository.findByEmail(Email);
    if (existingUser) {
      throw new Error('O e-mail fornecido já está em uso.');
    }

    // Gerar o hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    // Criar o utilizador com a senha hasheada
    const novoUtilizador = await UtilizadorRepository.create({
      Nome,
      Password: hashedPassword,
      Email,
    });

    return novoUtilizador;
  }

  /**
   * Criar usuário via Google OAuth
   */
  async createGoogleUser(userData) {
    const { Nome, Email, GoogleId, Avatar } = userData;

    // Verificar se o e-mail já existe
    const existingUser = await UtilizadorRepository.findByEmail(Email);
    if (existingUser) {
      // Se já existe, apenas adicionar GoogleId se não tiver
      if (!existingUser.GoogleId) {
        await UtilizadorRepository.updateGoogleId(existingUser.Id || existingUser.id, GoogleId, Avatar);
      }
      return existingUser;
    }

    // Criar novo usuário Google (sem senha)
    const novoUtilizador = await UtilizadorRepository.createGoogleUser({
      Nome,
      Email,
      GoogleId,
      Avatar
    });

    return novoUtilizador;
  }

  /**
   * Buscar usuário por email (usado pelo Google OAuth)
   */
  async findByEmail(email) {
    return await UtilizadorRepository.findByEmail(email);
  }

  async login(email, password) {
    const utilizador = await UtilizadorRepository.findByEmail(email);
    
    if (!utilizador) {
      throw new Error('Credenciais inválidas.'); // Mensagem genérica por segurança
    }

    const isMatch = await bcrypt.compare(password, utilizador.Password);
    if (!isMatch) {
      throw new Error('Credenciais inválidas.');
    }

    // Usuário autenticado, gerar token JWT
    const payload = {
      id: utilizador.id, // Agora sempre disponível via normalização no repositório
      nome: utilizador.Nome,
    };

    // Em um projeto real, a chave secreta deve vir de variáveis de ambiente
    const secretKey = 'sua_chave_secreta_super_segura';

    const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

    return { token };
  }
}

export default new UtilizadorService();
