"use client";

import type React from "react";
import { useState } from "react";
import {
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  type SupportedLocale,
  setClientLocale,
  clearTranslationCache,
} from "@root/lib/translations";
import {
  useTranslations,
  useTranslationContext,
} from "../providers/TranslationContext";
import { useLocale } from "../providers/LocaleContext";
import { cn } from "@heroui/react";

interface LanguageSwitcherProps {
  onLocaleChange?: (locale: SupportedLocale) => void;
  fullWidth?: boolean;
}

export default function LanguageSwitcher({
  onLocaleChange,
  fullWidth = false,
}: LanguageSwitcherProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("language");
  const { locale: contextLocale } = useTranslationContext();
  const { locale, setLocale } = useLocale();

  const handleLanguageChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const newLocale = event.target.value as SupportedLocale;

    if (newLocale === locale) return;

    setIsChanging(true);
    setError(null);

    try {
      console.log(`🌍 Switching language from ${locale} to ${newLocale}`);

      // Clear translation cache
      clearTranslationCache();
      console.log("🗑️ Cleared translation cache");

      // Update client storage
      setClientLocale(newLocale);

      // Update locale context (this will trigger useTranslations to refetch)
      setLocale(newLocale);

      // Call callback if provided
      if (onLocaleChange) {
        onLocaleChange(newLocale);
      }
    } catch (error) {
      console.error("Failed to change language:", error);
      setError(t("languageChangeError", "Failed to change language"));
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className={cn("relative", fullWidth && "w-full")}>
      <select
        value={locale}
        onChange={handleLanguageChange}
        disabled={isChanging}
        className={`text-sm font-bold tracking-[5px] font-nanum-myeongjo text-foreground uppercase py-3 bg-transparent border-none outline-none cursor-pointer hover:underline hover:underline-offset-2 [&>option]:bg-background [&>option]:text-foreground [&>option:checked]:bg-secondary/10 [&>option:checked]:text-secondary [&>option:hover]:bg-secondary/5 ${
          isChanging
            ? "opacity-50 cursor-not-allowed"
            : "" + " " + (fullWidth && "w-full")
        } ${error ? "border-red-500" : ""}`}
        aria-label={t("selectLanguage", "Select Language")}
      >
        {SUPPORTED_LOCALES.map((localeOption) => (
          <option
            key={localeOption}
            value={localeOption}
            className="bg-background text-foreground py-2 px-3"
          >
            {LOCALE_NAMES[localeOption]}
          </option>
        ))}
      </select>

      {isChanging && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Inline error message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 z-10">
          <div className="p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex items-center gap-2">
            <span className="font-medium">✕</span>
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-current hover:opacity-70 font-bold text-lg leading-none"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

    </div>
  );
}