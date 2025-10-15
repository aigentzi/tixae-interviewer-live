import { z } from "zod";

export const DeepgramPlatformSpecificOptionsSchema = z.object({
  keywords: z
    .array(z.string())
    .optional()
    .describe("Keywords to focus on in the transcription."),
  language: z
    .string()
    .optional()
    .describe("The language of the transcription."),
  smart_format: z
    .boolean()
    .optional()
    .describe("Enable smart format."),
  model: z
    .string()
    .optional()
    .describe("The model of the transcription."),
  interim_results: z
    .boolean()
    .optional()
    .describe("Enable interim results."),
  endpointing: z
    .number()
    .optional()
    .describe("The endpointing of the transcription."),
  no_delay: z
    .boolean()
    .optional()
    .describe("Enable no delay."),
  autoLanguageDetection: z
    .boolean()
    .optional()
    .describe("Enable auto language detection."),
});

export const AssemblyaiPlatformSpecificOptionsSchema = z.object({
  modelId: z
    .string()
    .optional()
    .describe("The model id of the transcription."),
});

export const GoogleCloudPlatformSpecificOptionsSchema = z.object({
  keywords: z
    .array(z.string())
    .optional()
    .describe("Keywords or phrases to focus on in the transcription."),
  languageCode: z
    .string()
    .optional()
    .describe("The language code for transcription."),
  enableAutomaticPunctuation: z
    .boolean()
    .optional()
    .describe("Enable automatic punctuation."),
  enableWordTimeOffsets: z
    .boolean()
    .optional()
    .describe("Enable word time offsets."),
  maxAlternatives: z
    .number()
    .optional()
    .describe("Maximum number of recognition alternatives."),
  profanityFilter: z
    .boolean()
    .optional()
    .describe("Enable profanity filter."),
  speechContexts: z
    .array(
      z.object({
        phrases: z.array(z.string()).optional().describe("The phrases of the speech context."),
        boost: z.number().optional().describe("The boost of the speech context."),
      }),
    )
    .optional()
    .describe("Speech contexts for better recognition."),
});

export const ElevenLabsPlatformSpecificOptionsSchema = z.object({
  stability: z
    .number()
    .optional()
    .describe("The stability of the speech gen."),
  similarity_boost: z
    .number()
    .optional()
    .describe("The similarity boost of the speech gen."),
  use_speaker_boost: z
    .boolean()
    .optional()
    .describe("Whether to use speaker boost."),
  speed: z
    .number()
    .optional()
    .describe("The speed of the speech gen."),
  style: z
    .number()
    .optional()
    .describe("The style of the speech gen."),
});

export const transcriberProviderOptionsSchema = z.object({
  modelId: z
    .string()
    .optional()
    .describe("The model id of the transcriber."),
  patienceFactor: z
    .number()
    .optional()
    .describe("The patience factor of the transcriber."),
  language: z
    .string()
    .optional()
    .describe("The language of the transcriber."),
  provider: z
    .enum(["deepgram", "gladia", "assemblyai", "speechmatics", "google-cloud-speech"])
    .describe("The provider of the transcriber."),
  randomOptions: z
    .any()
    .optional()
    .describe("The random options of the transcriber."),
  apiKey: z
    .string()
    .optional()
    .describe("The api key of the transcriber."),
  platformSpecific: z
    .object({
      deepgram: DeepgramPlatformSpecificOptionsSchema
        .optional()
        .describe("The deepgram specific options."),
      assemblyai: AssemblyaiPlatformSpecificOptionsSchema
        .optional()
        .describe("The assemblyai specific options."),
      googleCloud: GoogleCloudPlatformSpecificOptionsSchema
        .optional()
        .describe("The google cloud specific options."),
    })
    .optional()
    .describe("The platform specific options of the transcriber."),
  utteranceThreshold: z
    .number()
    .optional()
    .describe("The threshold for the utterance of the transcriber."),
  inputVoiceEnhancer: z
    .boolean()
    .optional()
    .describe("Whether to enable input voice enhancer."),
});

export const speechGenProviderOptionsSchema = z.object({
  provider: z
    .enum([
      "elevenlabs",
      "deepgram",
      "cartesia",
      "playht",
      "azure",
      "rime-ai",
      "openai",
      "playai-groq"
    ])
    .describe("The provider of the speech gen."),
  apiKey: z
    .string()
    .optional()
    .describe("The api key of the speech gen."),
  modelId: z
    .string()
    .optional()
    .describe("The model id of the speech gen."),
  voiceId: z
    .string()
    .describe("The voice id for the speech service.")
    .optional(),
  punctuationBreaks: z
    .array(z.string())
    .optional()
    .describe("The punctuation breaks of the speech gen."),
  backChannelling: z
    .boolean()
    .optional()
    .describe(
      "Whether to say umm, sure, etc.. when the user is talking for too long.",
    ),
  language: z
    .string()
    .optional()
    .describe("The language of the speech gen."),
  enableLongMessageBackchannelling: z
    .boolean()
    .optional()
    .describe(
      "Whether to say umm, sure, etc.. when the user is talking for too long.",
    ),
  backchannelMessages: z
    .array(z.string())
    .optional()
    .describe("The backchannel messages of the speech gen."),
  backchannelInterval: z
    .number()
    .optional()
    .describe("The backchannel interval of the speech gen."),
  wordsReplacements: z
    .array(
      z.object({
        word: z.string(),
        replacement: z.string(),
      }),
    )
    .optional()
    .describe("The words replacements of the speech gen."),
  platformSpecific: z
    .object({
      elevenLabs: ElevenLabsPlatformSpecificOptionsSchema
        .optional()
        .describe("Elevenlabs specific options."),
    })
    .optional()
    .describe("The platform specific options of the speech gen."),
});

export const callConfigSchema = z.object({
  recordAudio: z
    .boolean()
    .describe("Whether to record audio."),
  backgroundNoise: z
    .enum(["restaurant", "office", "street", "none"])
    .optional()
    .describe("The background noise to use during the interview."),
  enableWebCalling: z
    .boolean()
    .optional()
    .describe("Whether to enable web calling."),
  firstInputChunkUNIXMs: z
    .number()
    .optional()
    .describe("The first input chunk unix ms of the speech gen."),
  firstOutputChunkUNIXMs: z
    .number()
    .optional()
    .describe("The first output chunk unix ms of the speech gen."),
});

export const LLMNodeSchema = z.object({
  isGlobal: z
    .boolean()
    .optional()
    .describe("Whether the node is global."),
  llmConfig: z
    .object({
      modelId: z
        .enum([
          "gpt-3.5-turbo-0125",
          "gpt-4-1106-preview",
          "gpt-4.5-preview-2025-02-27",
          "gpt-4o",
          "gpt-4o-mini",
          "gpt-4.1-2025-04-14",
          "gpt-4.1-mini-2025-04-14",
          "ft:gpt-4o-mini-2024-07-18:personal:4o-with-tools-t11:A6mByttv",
          "llama3-8b-8192",
          "llama3-70b-8192",
          "llama-3.1-8b-instant",
          "llama-3.1-70b-versatile",
          "llama-3.2-90b-text-preview",
          "llama-3.2-11b-text-preview",
          "llama-3.3-70b-versatile",
          "meta-llama/llama-4-scout-17b-16e-instruct",
          "meta-llama/llama-4-maverick-17b-128e-instruct",
          "mixtral-8x7b-32768",
          "gemma-7b-it",
          "gemma2-9b-it",
          "claude-opus-4-20250514",
          "claude-sonnet-4-20250514",
          "claude-3-5-sonnet-20240620",
          "claude-3-5-sonnet-20241022",
          "claude-3-opus-20240229",
          "claude-3-sonnet-20240229",
          "claude-3-haiku-20240307",
          "claude-3-5-haiku-20241022",
          "claude-3-7-sonnet-20250219",
          "gemini-1.5-pro",
          "gemini-1.5-flash",
          "gemini-1.0-pro",
          "gemini-2.0-flash-exp",
          "gemini-2.0-flash-thinking-exp-1219",
          "gemini-2.5-pro-exp-03-25",
          "gemini-2.5-pro-preview-03-25",
          "gemini-2.5-flash-preview-05-20",
          "gpt-4-32k",
          "gpt-4",
          "gpt-3.5-turbo-16k",
          "gpt-3.5-turbo",
          "deepseek-chat",
          "deepseek-r1-distill-llama-70b",
          "grok-2-latest",
          "qwen-max-latest",
          "qwen-plus-latest",
          "qwen-turbo-latest",
          "custom-llm",
          "models/gemini-2.5-pro-preview-03-25",
        ])
        .describe("The model id of the LLM"),
      temperature: z
        .number()
        .describe(`The temperature of the LLM`),
      maxTokens: z
        .number()
        .describe(`The max tokens of the LLM`),
      customModelId: z
        .string()
        .optional()
        .describe(`The custom model id of the LLM`),
      serverUrl: z
        .string()
        .optional()
        .describe(`The server url of the LLM`),
      apiKey: z
        .string()
        .optional()
        .describe(`The api key of the LLM`),
    })
    .describe("The LLM config of the node."),
  type: z
    .enum([
      "start",
      "end",
      "default",
      "condition",
      "note",
    ])
    .describe("The type of the node."),
  startConfig: z
    .object({
      initialMessage: z
        .string()
        .optional()
        .describe("The initial message to start the conversation with."),
      userStarts: z
        .boolean()
        .optional()
        .describe("Whether the user or AI agent gives the first message."),
    })
    .optional()
    .describe("The start config of the node."),
  id: z.string().describe("The id of the node."),
  name: z.string().describe("The name of the node."),
  description: z
    .string()
    .describe("A short description of what this node does and when it should be used, specially useful if the node is global or when the LLM detects automatic rerouting."),
  instructions: z
    .string()
    .describe("What should this LLM node do."),
});

export const agentSchema = z.object({
  title: z
    .string()
    .optional()
    .describe("The title of the agent."),
  description: z
    .string()
    .optional()
    .describe("A brief description of the agent."),
  nodesSettings: z.object({
    appendBeforePrompt: z
      .string()
      .optional()
      .describe("The prompt to append to the nodes' prompt."),
    silenceDetection: z
      .object({
        enabled: z
          .boolean()
          .default(false)
          .describe("Whether to enable the silence detection feature which will insert filler phrases during long periods of silence")
          .optional(),
        timeoutSeconds: z
          .number()
          .default(60)
          .describe("Number of seconds of silence before triggering a filler phrase")
          .optional(),
        endCallAfterNPhrases: z
          .number()
          .default(1)
          .describe("Number of filler phrases utterances to say before ending the call if 0 it will end the call instantly after reching the timeout.")
          .optional(),
      })
      .optional()
      .describe("The silence detection configuration."),
    startCallPhrases: z
      .array(z.string())
      .optional()
      .describe("The phrases to start the call with."),
    stopSpeakPlan: z
      .object({
        minWords: z
          .number()
          .optional()
          .describe("The minimum words to speak."),
      })
      .optional()
      .describe("The stop speak plan configuration."),
    callTimeoutSeconds: z
      .number()
      .optional()
      .describe("The timeout for the call in seconds."),
    enableEndcallTool: z
      .boolean()
      .optional()
      .describe("Whether to enable endcall tool."),
    voiceSpecific: z
      .object({
        minCharacters: z
          .number()
          .optional()
          .describe("The minimum number of characters to init the speech gen to generate audio for, the more the higher the latency will be, default is 5"),
        maxLengthWithoutPunctuation: z
          .number()
          .optional()
          .describe("The maximum length of the string without punctuation to init the speech gen to generate audio for, the more the higher the latency will be, default is 100"),
      })
      .optional(),
  }),
  voiceConfig: z
    .object({
      transcriber: transcriberProviderOptionsSchema
        .optional()
        .describe(
          "**Transcriber**: The configuration options for the transcriber provider used by the agent.",
        ),
      speechGen: speechGenProviderOptionsSchema
        .optional()
        .describe(
          "**Speech Generation**: The configuration options for the speech generation provider used by the agent.",
        ),
      config: callConfigSchema
        .optional()
        .describe(
          "**Call Configuration**: The call configuration settings for the agent.",
        ),
    })
    .optional()
    .describe("The voice configuration of the agent."),
  nodes: z.array(LLMNodeSchema).optional(),
  enableNodes: z.boolean().optional(),
  globalOptions: z.object({
    silenceDetection: z.object({
      enabled: z.boolean().optional(),
      timeoutSeconds: z.number().optional(),
      endCallAfterNPhrases: z.number().optional(),
    }).optional(),
  }).optional(),
});

export type AgentType = z.infer<typeof agentSchema>;
export type LLMNodeType = z.infer<typeof LLMNodeSchema>;
