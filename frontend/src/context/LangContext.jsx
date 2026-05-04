import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { translations } from '../i18n/translations';

const LangContext = createContext(null);
export const useLang = () => useContext(LangContext);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en');

  const setLang = useCallback((code) => {
    setLangState(code);
    localStorage.setItem('lang', code);
    // Apply Bengali font class to html element
    if (code === 'bn') {
      document.documentElement.classList.add('lang-bn');
    } else {
      document.documentElement.classList.remove('lang-bn');
    }
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
  }, [lang]);

  // Apply font class on initial load
  useMemo(() => {
    if (lang === 'bn') document.documentElement.classList.add('lang-bn');
  }, []);

  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
