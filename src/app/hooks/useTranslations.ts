"use client";

import { useState, useEffect } from "react";
import { loadTranslations, type SupportedLocale } from "@root/lib/translations";
import type {
  Translations,
  TranslationGroup,
  NestedTranslation,
} from "@root/types/translations";

export function useTranslationLoader(locale: SupportedLocale) {
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTranslations() {
      try {
        setLoading(true);
        setError(null);

        const loadedTranslations = await loadTranslations(locale);
        setTranslations(loadedTranslations);
      } catch (err: any) {
        console.error("Translation fetch error:", err);
        setError(err.message || "Failed to load translations");
        setTranslations({});
      } finally {
        setLoading(false);
      }
    }

    fetchTranslations();
  }, [locale]);

  const t = (key: string, fallback?: string): string => {
    const keyParts = key.split(".");
    if (keyParts.length < 2) {
      return fallback || key;
    }

    const [groupKey, ...itemKeyParts] = keyParts;
    const itemKey = itemKeyParts.join(".");

    const groupTranslations = translations[groupKey];
    if (!groupTranslations) {
      return fallback || itemKey || key;
    }

    // TypeScript now knows groupTranslations is defined
    const safeGroupTranslations: TranslationGroup = groupTranslations;
    let translation: string | NestedTranslation | undefined =
      safeGroupTranslations[itemKey];

    // Handle nested keys
    if (!translation && itemKeyParts.length > 1) {
      let current: TranslationGroup | NestedTranslation | undefined =
        safeGroupTranslations;
      for (const part of itemKeyParts) {
        if (current && typeof current === "object" && part in current) {
          current = current[part] as any;
        } else {
          current = undefined;
          break;
        }
      }
      translation = current;
    }

    if (translation === undefined || translation === null) {
      return fallback || itemKey || key;
    }

    if (typeof translation === "object") {
      return fallback || itemKey || key;
    }

    return translation;
  };

  return { translations, t, loading, error };
}
