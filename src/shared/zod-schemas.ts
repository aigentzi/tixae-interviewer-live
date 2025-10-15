import { z } from "zod";
import { workspaceSettingsScheme } from "./schemes/workspace-settings.schemes";
import { stripeCustomPlanSchema } from "./schemes/pricing.schemes";
import { SetStateAction, Dispatch } from "react";

export const levelEnum = z.enum([
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
]);
export type Level = z.infer<typeof levelEnum>;

export const userRoleEnum = z.enum(["USER", "ADMIN", "SUPER_ADMIN"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const recurringUsageSchema = z.object({
  interviewsUsed: z.number().int().nonnegative().default(0),
  interviewsLimit: z.number().int().nonnegative(), // plan/trial monthly limit
  lastResetAt: z.date(), // last reset date
});

export const interviewBundleSchema = z.object({
  id: z.string(), // Stripe payment intent or invoice id
  interviewsLimit: z.number().int().nonnegative(),
  expiresAt: z.date(), // 30-day validity
});
export type InterviewBundle = z.infer<typeof interviewBundleSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  cv: z.string().optional(),
  workspaceIds: z.array(z.string()).default([]),
  role: userRoleEnum.default("USER"),

  // stripe
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional().nullable(),

  // Usage tracking
  recurringUsage: recurringUsageSchema.optional(), // subscription/trial

  // Active bundles
  bundles: z.array(interviewBundleSchema).default([]).optional(), // bundles

  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof userSchema>;

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  ownerId: z.string(),
  members: z.array(z.string()).default([]),
  createdAt: z.date(),
  associatedAgentId: z.string().optional().nullable(),
  updatedAt: z.date().optional().nullable(),
  settings: workspaceSettingsScheme.optional(),
  customPlan: stripeCustomPlanSchema.optional().nullable(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  memberRoles: z
    .record(z.string(), z.enum(["OWNER", "ADMIN", "MEMBER", "PENDING"]))
    .optional()
    .nullable(),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const promptSetSchema = z.object({
  level: levelEnum,
  prompt: z.string(),
});
export type PromptSet = z.infer<typeof promptSetSchema>;

export const jobProfileSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  levels: z.array(promptSetSchema).default([]),
  generalPrompt: z.string().optional(),
  startingMessage: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type JobProfile = z.infer<typeof jobProfileSchema>;

export const interviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  jobProfileId: z.string(),
  intervieweeEmail: z.string().email().optional(),
  level: levelEnum.optional().nullable(),
  startTime: z.date().optional().nullable(),
  endTime: z.date().optional().nullable(),
  content: z.string().optional(),
  duration: z.number(),
  paid: z.boolean().default(false),
  price: z.number().min(0).optional(),
  score: z.number().min(0).max(100).optional(),
  recordingUrl: z.string().url().optional().nullable(),
  recordingId: z.string().optional().nullable(),
  recordingExpiresAt: z.date().optional().nullable(),
  dailyRoomUrl: z.string().url().optional(),
  meetLink: z.string().url().optional(),
  feedback: z.string().optional(),
  enableVerification: z.boolean().default(false),
  analysisPrompt: z.string().optional().nullable(),
  introVideoUrl: z.string().url().optional().nullable(),
  isDemo: z.boolean().default(false).optional().nullable(),
  isEndedByInterviewee: z.boolean().default(false).optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Interview = z.infer<typeof interviewSchema>;

export const qrInterviewSchema = z.object({
  id: z.string().optional(),
  workspaceId: z.string(),
  qrCode: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  interviewData: interviewSchema.pick({
    jobProfileId: true,
    level: true,
    startTime: true,
    endTime: true,
    duration: true,
    paid: true,
    price: true,
    enableVerification: true,
    analysisPrompt: true,
  }),
});
export type QrInterview = z.infer<typeof qrInterviewSchema>;

export const gauthUserSchema = z.object({
  email: z.string().email(),
  uid: z.string(),
  photoURL: z.string().optional(),
  displayName: z.string(),
});
export type GAuthUser = z.infer<typeof gauthUserSchema>;

export const emailSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  workspaceId: z.string(),
  interviewId: z.string().optional(),
  jobProfileId: z.string().optional(),
});
export type Email = z.infer<typeof emailSchema>;

export const dailyCoRoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  api_created: z.boolean(),
  privacy: z.enum(["public", "private"]),
  url: z.string().url(),
  created_at: z.string().datetime(),
  config: z.record(z.string(), z.any()),
});
export type DailyCoRoom = z.infer<typeof dailyCoRoomSchema>;

export const levelsText = [
  "Intern",
  "Junior Level",
  "Mid Level",
  "Senior Level",
  "Lead Level",
  "Executive Level",
  "Director Level",
  "VP Level",
  "C-Level",
  "Founder Level",
] as const;
export type LevelText = (typeof levelsText)[number];

export const verificationImagesSchema = z.object({
  idDocumentFrontUrl: z.string().url().optional().nullable(),
  idDocumentBackUrl: z.string().url().optional().nullable(),
  selfieUrl: z.string().url().optional().nullable(),
  documentFiles: z.array(z.string().url()).optional().nullable(),
});
export type VerificationImages = z.infer<typeof verificationImagesSchema>;

export const applicantSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  age: z.number().optional(),
  gender: z.enum(["male", "female"]).optional(),
  interviewIds: z.array(z.string()).optional(),
  workspaceId: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  cvUrl: z.string().url().optional(),
  cvContent: z.string().optional(),
});
export type ApplicantType = z.infer<typeof applicantSchema>;

export const kycSessionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  interviewId: z.string(),
  documentType: z.enum(["passport", "driver_license", "id_card"]).optional(),
  status: z
    .enum(["pending", "in_progress", "completed", "failed"])
    .default("pending"),
  documentImage: z.string().optional(),
  documentImageBack: z.string().optional(),
  result: z.any().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});
export type KYCSession = z.infer<typeof kycSessionSchema>;

export type SetState<T> = Dispatch<SetStateAction<T>>;

export * from "./schemes/pricing.schemes";
export * from "./schemes/workspace-settings.schemes";
export * from "./schemes/room.schemes";
export * from "./schemes/tixae-agents.schemes";
export * from "./schemes/admin-settings.schemes";
