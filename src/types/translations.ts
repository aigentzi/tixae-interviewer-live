// Translation types
export interface TranslationGroup {
  [itemKey: string]: string | NestedTranslation;
}

export interface Translations {
  [groupKey: string]: TranslationGroup | undefined;
}

export interface NestedTranslation {
  [key: string]: string | NestedTranslation;
}

export interface TranslationContextType {
  t: (key: string, fallback?: string) => string;
  loading: boolean;
  error: string | null;
  locale: string;
  translations: Translations;
}