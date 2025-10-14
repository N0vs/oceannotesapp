import translations from '../locales/pt.json';

export const useTranslation = () => {
  const t = (key) => {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Retorna a chave se não encontrar tradução
      }
    }
    
    return value;
  };

  return { t };
};

export default useTranslation;
