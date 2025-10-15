import { z } from "zod";

export const workspaceSettingsColorsScheme = z.object({
  primary: z
    .string()
    .optional()
    .describe("The primary color of the interview page."),
  secondary: z
    .string()
    .optional()
    .describe("The secondary color of the interview page."),
  default: z
    .string()
    .optional()
    .describe("The default color of the interview page."),
  warning: z
    .string()
    .optional()
    .describe("The warning color of the interview page."),
  success: z
    .string()
    .optional()
    .describe("The success color of the interview page."),
  danger: z
    .string()
    .optional()
    .describe("The danger color of the interview page."),
});
export type WorkspaceSettingsColors = z.infer<
  typeof workspaceSettingsColorsScheme
>;

export const presetColorsKeys = ["blue", "purple"] as const;

export const presetColors: Record<
  (typeof presetColorsKeys)[number],
  WorkspaceSettingsColors
> = {
  blue: {
    primary: "#1e40af",
    secondary: "#475569",
    default: "#3b82f6",
    warning: "#f59e0b",
    success: "#10b981",
    danger: "#ef4444",
  },
  purple: {
    primary: "#7c3aed",
    secondary: "#a78bfa",
    default: "#8b5cf6",
    warning: "#f59e0b",
    success: "#10b981",
    danger: "#ef4444",
  },
};

export const brandingConfigurationScheme = z.object({
  customBranding: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether the custom branding is enabled."),
  themeColor: workspaceSettingsColorsScheme
    .optional()
    .nullable()
    .describe("The theme color of the interview page."),
  themeColorPreset: z
    .enum(presetColorsKeys)
    .optional()
    .nullable()
    .describe("The theme color preset of the interview page."),
  logo: z
    .string()
    .optional()
    .nullable()
    .describe("The logo to be used in the interview page."),
  name: z
    .string()
    .optional()
    .nullable()
    .describe("The name of the company to be displayed in the interview page."),
  description: z
    .string()
    .optional()
    .nullable()
    .describe(
      "The description of the company to be displayed in the interview page.",
    ),
  url: z
    .string()
    .optional()
    .nullable()
    .describe("The url of the company to be used to extract the style from."),
  useStyleFromUrl: z
    .boolean()
    .optional()
    .nullable()
    .describe(
      "Whether to use the style from the url. If true, the style will be extracted from the url.",
    ),
});

export const interviewConfigurationScheme = z.object({
  interviewType: z
    .enum(["voice-to-text", "voice-only"])
    .optional()
    .nullable()
    .describe(
      "The type of interview to be conducted. voice-to-text: The interview will be conducted with voice to text. voice-only: The interview will be conducted with voice only.",
    ),
  showRealTimeTranscript: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether to show the real time transcript."),
  autoSaveTranscript: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether to auto save the transcript."),
  enableAISummarization: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether to enable AI summarization."),
  enablePersonInMeetingVerification: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether to enable person in meeting verification."),
  analysisPrompt: z
    .string()
    .optional()
    .nullable()
    .describe("The prompt to be used for AI analysis."),
  companyContext: z
    .object({
      companyName: z.string().optional().describe("The name of the company."),
      companyDescription: z
        .string()
        .optional()
        .describe("The description of the company."),
      companyValues: z
        .string()
        .optional()
        .describe("The values of the company."),
      companyWebsite: z
        .string()
        .optional()
        .describe("The website of the company."),
      additionalContext: z
        .string()
        .optional()
        .describe("The additional context of the company."),
    })
    .optional()
    .nullable()
    .describe("The context of the company to be used for AI analysis."),
  aiAssistant: z
    .object({
      name: z
        .string()
        .optional()
        .nullable()
        .describe("The name of the AI assistant."),
      avatar: z
        .string()
        .optional()
        .nullable()
        .describe("The avatar of the AI assistant."),
      language: z
        .string()
        .optional()
        .nullable()
        .describe("The language of the AI assistant."),
      voiceId: z
        .string()
        .optional()
        .nullable()
        .describe("The voice id of the AI assistant."),
      isCustomVoice: z
        .boolean()
        .optional()
        .nullable()
        .describe("Whether the voice is custom."),
    })
    .optional()
    .nullable()
    .describe("The AI assistant to be used for AI analysis."),
  requiredFields: z
    .object({
      phone: z
        .boolean()
        .optional()
        .nullable()
        .default(true)
        .describe("Whether phone field is required in the interview form."),
      age: z
        .boolean()
        .optional()
        .nullable()
        .default(true)
        .describe("Whether age field is required in the interview form."),
    })
    .optional()
    .nullable()
    .describe(
      "Configuration for which fields are required in the interview form.",
    ),
});

export const termsAndConditionsConfigurationScheme = z.object({
  enableTermsAndConditions: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether to enable terms and conditions."),
  title: z
    .string()
    .optional()
    .nullable()
    .describe("The title of the terms & conditions."),
  content: z
    .string()
    .optional()
    .nullable()
    .describe("The content of the terms & conditions."),
  privacyPolicy: z
    .string()
    .optional()
    .nullable()
    .describe("The privacy policy of the company."),
  includeDataProcessingAgreement: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether to include a data processing agreement."),
});

export const helpAndSupportConfigurationScheme = z.object({
  enableShowHelpDuringInterview: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether to show help during the interview."),
  helpText: z
    .string()
    .optional()
    .nullable()
    .describe("The help text to be displayed during the interview."),
  helpEmail: z
    .string()
    .email()
    .optional()
    .nullable()
    .describe("The help email to be displayed during the interview."),
  supportOptions: z
    .array(z.enum(["email", "faq", "chat"]))
    .optional()
    .nullable()
    .describe("The support options to be displayed during the interview."),
  faq: z
    .array(
      z.object({
        question: z.string().describe("The question of the FAQ."),
        answer: z.string().describe("The answer of the FAQ."),
      }),
    )
    .optional()
    .nullable()
    .describe("The FAQ to be displayed during the pre interview steps."),
});

export const emailTemplateScheme = z.object({
  subject: z
    .string()
    .optional()
    .nullable()
    .describe("The subject of the email."),
  greeting: z
    .string()
    .optional()
    .nullable()
    .describe("The greeting of the email."),
  introText: z
    .string()
    .optional()
    .nullable()
    .describe("The intro text of the email."),
  closingText: z
    .string()
    .optional()
    .nullable()
    .describe("The closing text of the email."),
  buttonText: z
    .string()
    .optional()
    .nullable()
    .describe("The button text of the email."),
  preparationTips: z
    .array(z.string())
    .optional()
    .nullable()
    .describe("The preparation tips of the email."),
});

export const introductionVideoScheme = z.object({
  url: z
    .string()
    .url()
    .optional()
    .nullable()
    .describe("The URL of the introduction video (uploaded/recorded)."),
  durationSec: z
    .number()
    .max(120)
    .optional()
    .nullable()
    .describe("Duration of the video in seconds. Max 120 seconds (2 minutes)."),
  title: z
    .string()
    .optional()
    .nullable()
    .describe("Optional title for the video."),
  createdAt: z
    .date()
    .optional()
    .nullable()
    .describe("When the video was added."),
});

export const workspaceSettingsScheme = z.object({
  brandingConfig: brandingConfigurationScheme
    .optional()
    .nullable()
    .describe("The branding configuration of the workspace."),
  interviewConfig: interviewConfigurationScheme
    .optional()
    .nullable()
    .describe("The interview configuration of the workspace."),
  termsAndConditionsConfig: termsAndConditionsConfigurationScheme
    .optional()
    .nullable()
    .describe("The terms and conditions configuration of the workspace."),
  helpAndSupportConfig: helpAndSupportConfigurationScheme
    .optional()
    .nullable()
    .describe("The help and support configuration of the workspace."),
  emailTemplate: emailTemplateScheme
    .optional()
    .nullable()
    .describe("The email template of the workspace."),
  introductionVideo: introductionVideoScheme
    .optional()
    .nullable()
    .describe("Workspace introduction video configuration."),
  introductionVideos: z
    .array(introductionVideoScheme)
    .optional()
    .nullable()
    .describe("Multiple introduction videos for the workspace."),
  onboardingCompleted: z
    .boolean()
    .optional()
    .nullable()
    .describe("Whether the onboarding is completed."),
  levels: z
    .array(
      z.object({
        levelNumber: z.number().describe("The level number of the workspace."),
        levelName: z.string().describe("The level name of the workspace."),
      }),
    )
    .optional()
    .nullable()
    .describe("The levels of the workspace to be used for interview."),
});

export type WorkspaceSettings = z.infer<typeof workspaceSettingsScheme>;

export const workspaceLimitsScheme = z.object({
  maxTeamMembers: z
    .union([z.literal("infinity"), z.number()])
    .optional()
    .describe("The maximum number of team members."),
  maxAnalyticsReports: z
    .union([z.literal("infinity"), z.number()])
    .optional()
    .describe("The maximum number of analytics reports."),
  maxHumanFollowUps: z
    .union([z.literal("infinity"), z.number()])
    .optional()
    .describe("The maximum number of human follow ups."),
  maxHrWorkflowAutomations: z
    .union([z.literal("infinity"), z.number()])
    .optional()
    .describe("The maximum number of HR workflow automations."),
});

export type WorkspaceLimits = z.infer<typeof workspaceLimitsScheme>;
