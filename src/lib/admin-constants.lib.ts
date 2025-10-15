// Default prompts and configuration for Tixae agents
// These values are used when creating new agents and can be managed via the admin panel

export interface DefaultAgentPrompts {
  systemPrompt: string;
  initialMessage: string;
  instructions: string;
  nodeDescription: string;
  llmConfig: {
    modelId: string;
    temperature: number;
    maxTokens: number;
  };
  voiceConfig: {
    provider: string;
    defaultVoiceId: string;
    defaultLanguage: string;
    backgroundNoise: string;
    recordAudio: boolean;
  };
}

// Current hardcoded values from tixae.lib.ts that should be made configurable
export const DEFAULT_AGENT_PROMPTS: DefaultAgentPrompts = {
  systemPrompt: "", // Currently empty - agents inherit from job profiles
  initialMessage: "Hello, how was your day?",
  instructions: "This is the start of the conversation",
  nodeDescription: "Start of the conversation",
  llmConfig: {
    modelId: "gpt-4o-mini",
    temperature: 0.5,
    maxTokens: 1000,
  },
  voiceConfig: {
    provider: "elevenlabs",
    defaultVoiceId: "SOYHLrjzK2X1ezoPC6cr",
    defaultLanguage: "en",
    backgroundNoise: "none",
    recordAudio: false,
  },
};

// Professional interview-focused default prompts
export const PROFESSIONAL_INTERVIEW_DEFAULTS: DefaultAgentPrompts = {
  systemPrompt: `You are a professional AI interviewer for Tixae Interviewer platform. Your role is to:

1. Conduct structured, professional interviews
2. Ask relevant questions based on the job profile and level
3. Provide a welcoming yet professional atmosphere
4. Assess candidate responses thoughtfully
5. Use company context when available to ask relevant questions
6. Maintain conversation flow and ask appropriate follow-up questions

Guidelines:
- Be professional but approachable
- Listen actively to candidate responses
- Ask clarifying questions when needed
- Respect the candidate's time and experience level
- Provide clear instructions about the interview process`,

  initialMessage:
    "Hello! Welcome to your interview with us today. I'm your AI interviewer, and I'm excited to learn more about you and your background. Are you ready to begin?",
  instructions:
    "Greet the candidate professionally and begin the structured interview based on the job profile and level requirements.",
  nodeDescription: "Professional interview greeting and introduction",
  llmConfig: {
    modelId: "gpt-4o-mini",
    temperature: 0.7, // Slightly higher for more natural conversation
    maxTokens: 1500, // More tokens for detailed responses
  },
  voiceConfig: {
    provider: "elevenlabs",
    defaultVoiceId: "SOYHLrjzK2X1ezoPC6cr",
    defaultLanguage: "en",
    backgroundNoise: "none",
    recordAudio: false,
  },
};

// Different preset configurations
export const AGENT_PROMPT_PRESETS = {
  basic: DEFAULT_AGENT_PROMPTS,
  professional: PROFESSIONAL_INTERVIEW_DEFAULTS,
  // Future presets can be added here
  casual: {
    ...DEFAULT_AGENT_PROMPTS,
    initialMessage: "Hey there! Ready for a friendly chat about the role?",
    systemPrompt:
      "You are a casual, friendly interviewer. Keep the conversation relaxed while still gathering important information about the candidate.",
  },
} as const;

export type PromptPresetType = keyof typeof AGENT_PROMPT_PRESETS;
