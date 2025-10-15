import translations from '../locales/pt.json';

/**
 * Hook personalizado para sistema de internacionalização
 * Fornece função de tradução baseada em chaves hierárquicas
 * 
 * @hook useTranslation
 * @returns {Object} Objeto contendo função de tradução
 * @returns {Function} returns.t - Função de tradução que aceita chaves dot-notation
 * @description Sistema de i18n com fallback para chaves não encontradas
 */
export const useTranslation = () => {
  /**
   * Função de tradução que busca textos baseado em chaves hierárquicas
   * Utiliza dot-notation para navegar na estrutura de traduções
   * @function t
   * @param {string} key - Chave da tradução em formato dot-notation (ex: 'notes.title')
   * @returns {string} Texto traduzido ou chave original se não encontrada
   * @description Navega recursivamente no objeto de traduções e retorna fallback se não encontrar
   */
  const t = (key) => {
    // Divisão da chave: converte 'notes.title' em ['notes', 'title']
    const keys = key.split('.');
    let value = translations; // Inicia com objeto raiz de traduções
    
    // Navegação hierárquica: percorre cada nível da chave
    for (const k of keys) {
      if (value && value[k]) {
        // Desce um nível na hierarquia se chave existe
        value = value[k];
      } else {
        // Fallback: loga aviso e retorna chave original
        console.warn(`Translation key not found: ${key}`);
        return key; // Permite identificar chaves missing na interface
      }
    }
    
    // Retorna valor final encontrado na navegação
    return value;
  };

  return { t };
};

export default useTranslation;
