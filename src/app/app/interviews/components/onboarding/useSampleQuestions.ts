import { useMemo } from "react";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { SAMPLE_QUESTIONS } from "./constants";

/**
 * Custom hook to get translated sample questions
 * @returns Array of translated sample questions with fallback to English
 */
export function useSampleQuestions() {
  const t = useTranslations("onboarding");

  const translatedQuestions = useMemo(() => {
    return [
      t("sampleQuestion1", SAMPLE_QUESTIONS[0]),
      t("sampleQuestion2", SAMPLE_QUESTIONS[1]),
      t("sampleQuestion3", SAMPLE_QUESTIONS[2]),
      t("sampleQuestion4", SAMPLE_QUESTIONS[3]),
    ];
  }, [t]);

  return translatedQuestions;
}
