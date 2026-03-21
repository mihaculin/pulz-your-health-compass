import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { LangCode, TranslationKey, LANGUAGE_NAMES, getTranslations } from "@/translations";

const STORAGE_KEY = "pulz_language";
const DEFAULT_LANG: LangCode = "en";

function readStoredLang(): LangCode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ro" || stored === "fr" || stored === "es") return stored;
  return DEFAULT_LANG;
}

interface LanguageContextType {
  language: LangCode;
  languageName: string;
  setLanguage: (lang: LangCode) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<LangCode>(readStoredLang);

  const setLanguage = useCallback((lang: LangCode) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLangState(lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => getTranslations(language)(key),
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{ language, languageName: LANGUAGE_NAMES[language], setLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
