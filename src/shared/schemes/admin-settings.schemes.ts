import { z } from "zod";

export const AdminVoiceConfigScheme = z.object({
  // Voice Provider Selection
  provider: z
    .enum(["elevenlabs", "google-live"])
    .default("elevenlabs")
    .describe("The voice provider (ElevenLabs or Google Live)."),

  // Voice Selection
  selectedVoice: z
    .string()
    .default("XA2bIQ92TabjGbpO2xRr")
    .optional()
    .describe("The selected voice of the admin."),
  searchQuery: z.string().optional().describe("The search query of the admin."),
  longMessageBackchanneling: z
    .boolean()
    .default(true)
    .optional()
    .describe("The long message backchanneling of the admin."),

  // ElevenLabs Options
  speed: z
    .array(z.number())
    .describe("The speed of the admin.")
    .length(1)
    .default([1])
    .optional(),
  stability: z
    .array(z.number())
    .describe("The stability of the admin.")
    .length(1)
    .default([0.4])
    .optional(),
  similarityBoost: z
    .array(z.number())
    .describe("The similarity boost of the admin.")
    .length(1)
    .default([0.7])
    .optional(),
  styleExaggeration: z
    .array(z.number())
    .describe("The style exaggeration of the admin.")
    .length(1)
    .default([0])
    .optional(),
  speakerBoost: z
    .boolean()
    .describe("The speaker boost of the admin.")
    .default(false)
    .optional(),

  // Google Live Options
  googleLiveVoice: z
    .enum([
      "Zephyr",
      "Puck",
      "Charon",
      "Kore",
      "Fenrir",
      "Leda",
      "Orus",
      "Aoede",
    ])
    .default("Puck")
    .optional()
    .describe("The Google Live voice name."),
  startOfSpeechSensitivity: z
    .enum([
      "START_SENSITIVITY_LOW",
      "START_SENSITIVITY_MEDIUM",
      "START_SENSITIVITY_HIGH",
    ])
    .default("START_SENSITIVITY_MEDIUM")
    .optional()
    .describe("Start of speech sensitivity for Google Live."),
  endOfSpeechSensitivity: z
    .enum([
      "END_SENSITIVITY_LOW",
      "END_SENSITIVITY_MEDIUM",
      "END_SENSITIVITY_HIGH",
    ])
    .default("END_SENSITIVITY_MEDIUM")
    .optional()
    .describe("End of speech sensitivity for Google Live."),
  prefixPaddingMs: z
    .number()
    .default(20)
    .optional()
    .describe("Prefix padding in milliseconds for Google Live."),
  silenceDurationMs: z
    .number()
    .default(100)
    .optional()
    .describe("Silence duration in milliseconds for Google Live."),
  outputAudioTranscription: z
    .boolean()
    .default(true)
    .optional()
    .describe("Enable output audio transcription for Google Live."),
  inputAudioTranscription: z
    .boolean()
    .default(true)
    .optional()
    .describe("Enable input audio transcription for Google Live."),
  enableVAD: z
    .boolean()
    .default(true)
    .optional()
    .describe(
      "Enable Voice Activity Detection (VAD) - automatically detect when user starts and stops speaking.",
    ),

  // Advanced Options
  backgroundNoise: z
    .enum(["none", "restaurant", "street", "office"])
    .describe("The background noise of the admin.")
    .default("none")
    .optional(),
  punctuationBreaks: z
    .array(z.string())
    .describe("The punctuation breaks of the admin.")
    .default([])
    .optional(),
  minWordsToStop: z
    .array(z.number())
    .describe("The min words to stop of the admin.")
    .length(1)
    .default([0])
    .optional(),
  minCharsToStart: z
    .array(z.number())
    .describe("The min chars to start of the admin.")
    .length(1)
    .default([0])
    .optional(),
  maxLengthWithoutPunctuation: z
    .array(z.number())
    .describe("The max length without punctuation of the admin.")
    .length(1)
    .default([250])
    .optional(),

  // Custom Voice
  isCustomVoice: z
    .boolean()
    .optional()
    .describe("The custom voice of the admin."),

  // Words Replacement
  wordReplacements: z
    .array(
      z.object({
        original: z
          .string()
          .describe("The original word of the word replacement."),
        replacement: z
          .string()
          .describe("The replacement word of the word replacement."),
      }),
    )
    .describe("The word replacements of the admin.")
    .default([])
    .optional(),
});
export type AdminVoiceType = z.infer<typeof AdminVoiceConfigScheme>;

export const AdminTranscriptionConfigScheme = z.object({
  language: z
    .string()
    .describe("The language of the transcription config of the admin.")
    .default("en-US")
    .optional(),
  utteranceThreshold: z
    .array(z.number())
    .describe(
      "The utterance threshold of the transcription config of the admin.",
    )
    .default([150])
    .optional(),
  inputVoiceEnhancer: z
    .boolean()
    .describe(
      "The input voice enhancer of the transcription config of the admin.",
    )
    .default(true)
    .optional(),
  silenceDetection: z
    .boolean()
    .describe("The silence detection of the transcription config of the admin.")
    .default(true)
    .optional(),
  timeoutSeconds: z
    .array(z.number())
    .describe("The timeout seconds of the transcription config of the admin.")
    .default([10])
    .optional(),
  endCallAfterFillerPhrases: z
    .array(z.number())
    .describe(
      "The end call after filler phrases of the transcription config of the admin.",
    )
    .default([1])
    .optional(),
  keywords: z
    .array(z.string())
    .describe("The keywords of the transcription config of the admin.")
    .default([])
    .optional(),
});
export type AdminTranscriptionType = z.infer<
  typeof AdminTranscriptionConfigScheme
>;

export const adminSettingsSchema = z.object({
  id: z.string(),
  globalPrompts: z
    .string()
    .default("")
    .describe("The global prompts to use before each interview."),
  greetingMessage: z
    .string()
    .default("")
    .describe("The greeting message to show at the start of each interview."),
  voiceProfiles: z
    .array(
      z.object({
        id: z.string().describe("The id of the voice profile."),
        name: z.string().describe("The name of the voice profile."),
        gender: z
          .enum(["male", "female"])
          .describe("The gender of the voice profile."),
        language: z.string().describe("The language of the voice profile."),
        image: z.any().describe("The image of the voice profile."),
        voiceConfig: AdminVoiceConfigScheme,
        transcriptionConfig: AdminTranscriptionConfigScheme,
      }),
    )
    .describe("The voice profiles to use for the admin."),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type AdminSettingsType = z.infer<typeof adminSettingsSchema>;
