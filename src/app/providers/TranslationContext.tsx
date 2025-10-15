"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { useTranslationLoader } from "../hooks/useTranslations";
import type { TranslationContextType } from "@root/types/translations";
import { useLocale } from "./LocaleContext";

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined,
);

interface TranslationProviderProps {
  children: ReactNode;
}

export function TranslationProvider({ children }: TranslationProviderProps) {
  const { locale } = useLocale();
  const { t, loading, error, translations } = useTranslationLoader(locale);

  return (
    <TranslationContext.Provider
      value={{ t, loading, error, locale, translations }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslations(namespace?: string) {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error(
      "useTranslations must be used within a TranslationProvider",
    );
  }

  return (key: string, fallback?: string) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    // console.log(`🎯 useTranslations called:`);
    // console.log(`   Namespace: "${namespace}"`);
    // console.log(`   Key: "${key}"`);
    // console.log(`   Full key: "${fullKey}"`);
    // console.log(`   Fallback: "${fallback}"`);
    // console.log(`   Current locale: "${context.locale}"`)

    const result = context.t(fullKey, fallback);
    // console.log(`📤 useTranslations returning: "${result}"`);

    return result;
  };
}

export function useTranslationContext() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error(
      "useTranslationContext must be used within a TranslationProvider",
    );
  }
  return context;
}
