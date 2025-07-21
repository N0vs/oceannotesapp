const UtilizadorRepository = require('../repositories/UtilizadorRepository.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UtilizadorService {
  async create(utilizadorData) {
    const { Nome, Password, Email } = utilizadorData;

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
      id: utilizador.Id,
      nome: utilizador.Nome,
    };

    // Em um projeto real, a chave secreta deve vir de variáveis de ambiente
    const secretKey = 'sua_chave_secreta_super_segura';

    const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });

    return { token };
  }
}

module.exports = new UtilizadorService();
