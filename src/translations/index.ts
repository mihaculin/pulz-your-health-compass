export type LangCode = "en" | "ro" | "fr" | "es";

export const LANGUAGE_NAMES: Record<LangCode, string> = {
  en: "English",
  ro: "Română",
  fr: "Français",
  es: "Español",
};

const translations = {
  en: {
    settings: {
      title: "Settings",
      subtitle: "Profile & preferences",
      personalData: {
        title: "Personal profile",
        age: "Age",
        noConcerns: "No concerns set yet",
        completeProfile: "Complete your profile to add concerns",
        weeksAgo: "weeks into your journey",
        updateProfile: "Update profile",
        height: "Height",
        weight: "Weight",
        conditions: "Conditions",
      },
    },
  },
  ro: {
    settings: {
      title: "Setări",
      subtitle: "Profil și preferințe",
      personalData: {
        title: "Profil personal",
        age: "Vârstă",
        noConcerns: "Nicio preocupare setată",
        completeProfile: "Completează profilul pentru a adăuga preocupări",
        weeksAgo: "săptămâni în călătoria ta",
        updateProfile: "Actualizează profilul",
        height: "Înălțime",
        weight: "Greutate",
        conditions: "Condiții",
      },
    },
  },
  fr: {
    settings: {
      title: "Paramètres",
      subtitle: "Profil et préférences",
      personalData: {
        title: "Profil personnel",
        age: "Âge",
        noConcerns: "Aucune préoccupation définie",
        completeProfile: "Complétez votre profil pour ajouter des préoccupations",
        weeksAgo: "semaines dans votre parcours",
        updateProfile: "Mettre à jour le profil",
        height: "Taille",
        weight: "Poids",
        conditions: "Conditions",
      },
    },
  },
  es: {
    settings: {
      title: "Configuración",
      subtitle: "Perfil y preferencias",
      personalData: {
        title: "Perfil personal",
        age: "Edad",
        noConcerns: "Sin preocupaciones definidas",
        completeProfile: "Completa tu perfil para añadir preocupaciones",
        weeksAgo: "semanas en tu camino",
        updateProfile: "Actualizar perfil",
        height: "Altura",
        weight: "Peso",
        conditions: "Condiciones",
      },
    },
  },
} as const;

export type Translations = typeof translations.en;

// Dot-notation key helper
type DotPaths<T, Prefix extends string = ""> = {
  [K in keyof T]: T[K] extends string
    ? `${Prefix}${K & string}`
    : DotPaths<T[K], `${Prefix}${K & string}.`>;
}[keyof T];

export type TranslationKey = DotPaths<Translations>;

function resolvePath(obj: unknown, path: string): string {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj) as string ?? path;
}

export function getTranslations(lang: LangCode) {
  const dict = translations[lang] ?? translations.en;
  return (key: TranslationKey): string => resolvePath(dict, key);
}

export default translations;
