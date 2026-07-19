import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import pcm from "./locales/pcm.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "pcm", label: "Pidgin", flag: "🇨🇲" },
] as const;

export const STORAGE_KEY = "claugas.lang";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      pcm: { translation: pcm },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  i18n.on("languageChanged", (lng) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lng;
    }
  });
}

export function loadStoredLanguage() {
  if (typeof window === "undefined") return;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && ["en", "fr", "pcm"].includes(saved) && i18n.language !== saved) {
      i18n.changeLanguage(saved);
    }
  } catch {
    // ignore
  }
}

export function setLanguage(code: string) {
  i18n.changeLanguage(code);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
  }
}

export default i18n;
