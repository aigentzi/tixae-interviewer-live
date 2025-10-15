import { z } from "zod";

const policySchema = z.object({
  allTime: z.any().optional(),
  monthly: z.any().optional(),
});

const freeTierSchema = z.object({
  enabled: z.enum(["always", "only-trial", "never"]),
  policy: policySchema.optional(),
});

export const addonsKeys = z.enum([
  "remove-branding",
  "add-team-member",
  "hr-workflow-automation",
  "analytics-reporting",
  "human-follow-up",
  "mini-whitelabel",
  "custom-branding",
]);

const featureModelSchema = z.object({
  label: z.string().optional(),
  description: z.string().optional(),
  key: addonsKeys,
  freeTier: freeTierSchema.optional(),
  monthlyPriceUSD: z.number().optional(),
  icon: z.string().optional(),
});

const stripePriceSchema = z.object({
  priceId: z.string(),
  billingCycle: z.enum(["monthly", "yearly"]),
  usdAmount: z.number(),
  currency: z.string(),
});

export const stripeProductAddonSchema = z.object({
  key: addonsKeys,
  name: z.string(),
  description: z.string(),
  stripePrices: stripePriceSchema.array().optional(),
  maxValue: z.number().optional(),
  minValue: z.number().optional(),
  step: z.number().optional(),
  isFeature: z.boolean().optional(),
});
export type StripeProductAddonModel = z.infer<typeof stripeProductAddonSchema>;

export const stripeCustomPlanSchema = z.object({
  key: z.string().optional(),
  userId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  features: z
    .lazy(() => featureModelSchema)
    .array()
    .optional(),
  referrer: z.string().optional(),
  metadata: z
    .object({
      mostPopular: z.boolean().optional(),
      includedInterviews: z.union([z.literal("infinity"), z.number()]).optional(),
      includedMinutes: z.union([z.literal("infinity"), z.number()]).optional(),
      includedVerifications: z.union([z.literal("infinity"), z.number()]).optional(),
      includedTeamMembers: z.union([z.literal("infinity"), z.number()]).optional(),
      includedAnalyticsReports: z.union([z.literal("infinity"), z.number()]).optional(),
      includedHumanFollowUps: z.union([z.literal("infinity"), z.number()]).optional(),
      includedHrWorkflowAutomations: z.union([z.literal("infinity"), z.number()]).optional(),
    })
    .optional(),
  billingCycle: z.enum(["monthly", "yearly"]),
  limits: z.object({
    maxInterviews: z.union([z.literal("infinity"), z.number()]).optional(),
    maxMinutes: z.union([z.literal("infinity"), z.number()]).optional(),
    maxVerifications: z.union([z.literal("infinity"), z.number()]).optional(),
    maxTeamMembers: z.union([z.literal("infinity"), z.number()]).optional(),
    maxAnalyticsReports: z.union([z.literal("infinity"), z.number()]).optional(),
    maxHumanFollowUps: z.union([z.literal("infinity"), z.number()]).optional(),
    maxHrWorkflowAutomations: z.union([z.literal("infinity"), z.number()]).optional(),
  }).optional(),
  icon: z.any(),
  stripePrices: stripePriceSchema.array().optional(),
  includedLimits: z
    .object({
      key: addonsKeys,
      value: z.number().optional(),
      isFeature: z.boolean().optional(),
    })
    .array()
    .optional(),
  addonsPrices: z.custom<StripeProductAddonModel>().array().optional(),
  isV4Pricing: z.boolean().optional(),
  marketingStatements: z.string().array().optional(),
});
export type StripeCustomPlanModel = z.infer<typeof stripeCustomPlanSchema>;

export const getStripeCustomPlanSchema = z.object({
  id: z.string(),
  ID: z.string().optional(),
  ...stripeCustomPlanSchema.shape,
  USDToPay: z.number().optional(),
  createdAt: z.string().optional(),
  status: z.enum([
    "complete",
    "active",
    "cancelled",
    "trialing",
    "past_due",
    "unpaid",
    "pending",
  ]),
  ts: z.number().optional(),
  stripe: z.object({
    sessionId: z.string().optional(),
    customerId: z.string().optional(),
    subscriptionId: z.string().optional(),
  }),
});
export type GetStripeCustomPlanModel = z.infer<typeof getStripeCustomPlanSchema>;

export const stripeOrderSchema = getStripeCustomPlanSchema.extend({
  userId: z.string(),
  currency: z.string(),
});
export type StripeOrderModel = z.infer<typeof stripeOrderSchema>;

export const featuresList: z.infer<typeof featureModelSchema>[] = [
  {
    label: "Mini Whitelabel",
    description:
      "Get a mini whitelabel for your website, with your own domain and branding.",
    key: "mini-whitelabel",
    freeTier: {
      enabled: "never",
    },
    monthlyPriceUSD: 20,
  },
  {
    label: "Custom Branding",
    description:
      "Across all our products you'll be able to customise the logo, branding, custom domains on agent prototype links, client dashboard and more.",
    key: "custom-branding",
    freeTier: {
      enabled: "never",
    },
    monthlyPriceUSD: 200,
  },
];