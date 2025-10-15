import { AdminTranscriptionType, AdminVoiceType } from "./zod-schemas";

export const defaultVoiceSettings: AdminVoiceType = {
  provider: "elevenlabs",
  selectedVoice: "XA2bIQ92TabjGbpO2xRr",
  searchQuery: "",
  longMessageBackchanneling: true,
  speed: [1],
  stability: [0.4],
  similarityBoost: [0.7],
  styleExaggeration: [0],
  speakerBoost: false,
  googleLiveVoice: "Puck",
  startOfSpeechSensitivity: "START_SENSITIVITY_MEDIUM",
  endOfSpeechSensitivity: "END_SENSITIVITY_MEDIUM",
  prefixPaddingMs: 20,
  silenceDurationMs: 100,
  outputAudioTranscription: true,
  inputAudioTranscription: true,
  enableVAD: true,
  backgroundNoise: "none",
  punctuationBreaks: [] as string[],
  minWordsToStop: [0],
  minCharsToStart: [140],
  maxLengthWithoutPunctuation: [250],
  wordReplacements: [] as Array<{ original: string; replacement: string }>,
};

export const defaultTranscriptionSettings: AdminTranscriptionType = {
  language: "en-US",
  utteranceThreshold: [150],
  inputVoiceEnhancer: true,
  silenceDetection: true,
  timeoutSeconds: [10],
  endCallAfterFillerPhrases: [1],
  keywords: [] as string[],
};

export const languageMap: Record<
  string,
  { name: string; countryCode: string }
> = {
  "en-GB": { name: "English (UK)", countryCode: "gb" },
  "en-US": { name: "English (US)", countryCode: "us" },
  "en-AU": { name: "English (Australia)", countryCode: "au" },
  fr: { name: "French", countryCode: "fr" },
  hi: { name: "Hindi", countryCode: "in" },
  ru: { name: "Russian", countryCode: "ru" },
  ja: { name: "Japanese", countryCode: "jp" },
  es: { name: "Spanish", countryCode: "es" },
  sv: { name: "Swedish", countryCode: "se" },
  de: { name: "German", countryCode: "de" },
  it: { name: "Italian", countryCode: "it" },
  pt: { name: "Portuguese", countryCode: "pt" },
  zh: { name: "Chinese", countryCode: "cn" },
  ko: { name: "Korean", countryCode: "kr" },
  ar: { name: "Arabic", countryCode: "sa" },
  tr: { name: "Turkish", countryCode: "tr" },
  pl: { name: "Polish", countryCode: "pl" },
  nl: { name: "Dutch", countryCode: "nl" },
};
