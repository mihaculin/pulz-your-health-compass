import { createContext, useContext, useState } from "react";
import { translations } from "@/translations";
import type { LangCode } from "@/translations";

interface LanguageContextType {
  language: LangCode;
  setLanguage: (lang: LangCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LangCode>(() => {
    return (localStorage.getItem("pulz_language") as LangCode) || "en";
  });

  const setLanguage = (lang: LangCode) => {
    console.log("[LanguageContext] language changed to:", lang);
    setLanguageState(lang);
    localStorage.setItem("pulz_language", lang);
  };

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: unknown = translations[language];
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return (value as string) ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
};
