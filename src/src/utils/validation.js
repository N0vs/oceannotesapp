/**
 * Funções de validação seguindo o Single Responsibility Principle
 * Cada função tem uma responsabilidade específica de validação
 */

// Validação de email
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'E-mail é obrigatório' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'E-mail inválido' };
  }
  
  return { isValid: true };
};

// Validação de senha
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Senha é obrigatória' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'Senha deve ter pelo menos 6 caracteres' };
  }
  
  return { isValid: true };
};

// Validação de nome
export const validateName = (name) => {
  if (!name) {
    return { isValid: false, error: 'Nome é obrigatório' };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
  }
  
  return { isValid: true };
};

// Validação completa de login
export const validateLoginForm = (email, password) => {
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }
  
  return { isValid: true };
};

// Validação completa de registro
export const validateRegisterForm = (name, email, password) => {
  const nameValidation = validateName(name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }
  
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }
  
  return { isValid: true };
};
