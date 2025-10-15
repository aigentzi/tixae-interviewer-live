import type { Translations } from "@root/types/translations";

// Supported locales
export const SUPPORTED_LOCALES = [
  "inen", "inde", "ines", "inpt", "inja", "inch", "inar", "intr", "infr"
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  inen: "English",
  inde: "Deutsch", 
  ines: "Español",
  inpt: "Português",
  inja: "日本語",
  inch: "中文",
  inar: "العربية",
  intr: "Türkçe",
  infr: "Français",
};

// Client-side locale management
const LOCALE_STORAGE_KEY = "app_locale";

export function getClientLocale(): SupportedLocale {
  if (typeof window === "undefined") return "inen";

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale;
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn("Failed to get stored locale:", error);
  }

  // Fallback to browser language detection
  const browserLang = navigator.language.split("-")[0] as SupportedLocale;
  return SUPPORTED_LOCALES.includes(browserLang) ? browserLang : "inen";
}

export function setClientLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (error) {
    console.warn("Failed to store locale:", error);
  }
}

export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

// Translation loading
const translationCache = new Map<string, Translations>();

export async function loadTranslations(locale: SupportedLocale): Promise<Translations> {
  // Check cache first
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }

  try {
    const response = await fetch(`/messages/${locale}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load translations for ${locale}`);
    }

    const translations: Translations = await response.json();
    translationCache.set(locale, translations);
    return translations;
  } catch (error) {
    console.error(`Error loading translations for ${locale}:`, error);
    // Fallback to English if available
    if (locale !== "inen") {
      return loadTranslations("inen");
    }
    throw error;
  }
}

export function clearTranslationCache(): void {
  translationCache.clear();
}