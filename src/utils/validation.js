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

// Validação de senha (para novos registros - 8 caracteres)
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Senha é obrigatória' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
  }
  
  return { isValid: true };
};

// Validação de senha para login (compatível com usuários antigos - 6 caracteres)
export const validatePasswordLogin = (password) => {
  if (!password) {
    return { isValid: false, error: 'Senha é obrigatória' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'Senha deve ter pelo menos 6 caracteres' };
  }
  
  return { isValid: true };
};

// Validação de confirmação de senha
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Confirmação de senha é obrigatória' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'As senhas não coincidem' };
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

// Validação completa de login (compatível com senhas antigas de 6 dígitos)
export const validateLoginForm = (email, password) => {
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }
  
  const passwordValidation = validatePasswordLogin(password);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }
  
  return { isValid: true };
};

// Validação completa de registro
export const validateRegisterForm = (name, email, password, confirmPassword = null) => {
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
  
  // Se confirmPassword foi fornecido, validar também
  if (confirmPassword !== null) {
    const confirmPasswordValidation = validatePasswordConfirmation(password, confirmPassword);
    if (!confirmPasswordValidation.isValid) {
      return confirmPasswordValidation;
    }
  }
  
  return { isValid: true };
};
