import { z } from "zod";

// SEE rubric definitions
export type SEECategory =
  | "Range"
  | "Accuracy"
  | "Fluency"
  | "Interaction"
  | "Coherence";

export interface SEEFeatureDefinition {
  id: string;
  label: string;
  category: SEECategory;
  weight: 1 | 0.5;
  percentage: number; // percentage contribution to 100
}

export const MAX_FEATURE_SCORE = 5;

export const SEE_FEATURES: readonly SEEFeatureDefinition[] = [
  // Range
  {
    id: "R1",
    label: "Range of topics",
    category: "Range",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "R2",
    label: "Range of vocabulary",
    category: "Range",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "R3",
    label: "Circumlocution",
    category: "Range",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "R4",
    label: "Precision of language",
    category: "Range",
    weight: 0.5,
    percentage: 2.9,
  },

  // Accuracy
  {
    id: "A1",
    label: "Sentence structure",
    category: "Accuracy",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "A2",
    label: "Subject-verb agreement",
    category: "Accuracy",
    weight: 0.5,
    percentage: 2.9,
  },
  {
    id: "A3",
    label: "Pronouns",
    category: "Accuracy",
    weight: 0.5,
    percentage: 2.9,
  },
  {
    id: "A4",
    label: "Tenses",
    category: "Accuracy",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "A5",
    label: "Conjugation and prepositions",
    category: "Accuracy",
    weight: 0.5,
    percentage: 2.9,
  },

  // Fluency
  {
    id: "F1",
    label: "Accent",
    category: "Fluency",
    weight: 0.5,
    percentage: 2.9,
  },
  {
    id: "F3",
    label: "Tempo and pausing",
    category: "Fluency",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "F4",
    label: "Intonation and fluidity",
    category: "Fluency",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "F5",
    label: "Free speech",
    category: "Fluency",
    weight: 1,
    percentage: 5.7,
  },

  // Interaction
  {
    id: "I1",
    label: "Participation",
    category: "Interaction",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "I2",
    label: "Conversational ease",
    category: "Interaction",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "I3",
    label: "Clarifications",
    category: "Interaction",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "I4",
    label: "Conversational cues",
    category: "Interaction",
    weight: 1,
    percentage: 5.7,
  },

  // Coherence
  {
    id: "C1",
    label: "Conversational planning",
    category: "Coherence",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "C2",
    label: "Details",
    category: "Coherence",
    weight: 1,
    percentage: 5.7,
  },
  {
    id: "C3",
    label: "Rambling",
    category: "Coherence",
    weight: 1,
    percentage: 5.7,
  },
] as const;

export const SEE_FEATURE_IDS = SEE_FEATURES.map(
  (f) => f.id
) as readonly string[];
export const SEE_FEATURE_BY_ID = Object.fromEntries(
  SEE_FEATURES.map((f) => [f.id, f])
) as Record<string, SEEFeatureDefinition>;

export const SeeFeatureScoreSchema = z.object({
  id: z.enum(SEE_FEATURE_IDS as [string, ...string[]]),
  score: z.number().min(0).max(MAX_FEATURE_SCORE),
  comment: z.string().min(1),
});

export const SeeAnalysisSchema = z.object({
  features: z
    .array(SeeFeatureScoreSchema)
    .min(SEE_FEATURES.length)
    .max(SEE_FEATURES.length),
  overallSummary: z.string().min(1),
});

export type SeeFeatureScore = z.infer<typeof SeeFeatureScoreSchema>;
export type SeeAnalysis = z.infer<typeof SeeAnalysisSchema>;

export function computeSeeScorePercent(
  features: ReadonlyArray<SeeFeatureScore>
): number {
  const byId = new Map(features.map((f) => [f.id, f]));
  let total = 0;
  for (const def of SEE_FEATURES) {
    const item = byId.get(def.id);
    if (!item) continue;
    total += def.percentage * (item.score / MAX_FEATURE_SCORE);
  }
  return Math.round(total * 10) / 10; // one decimal place
}

export const SEE_CATEGORY_DESCRIPTIONS: Record<SEECategory, string> = {
  Range:
    "Breadth and specificity of topics and vocabulary. Assesses whether the speaker can handle varied subjects, refine ideas with precise wording, and avoid over‑reliance on simple language.",
  Accuracy:
    "Grammatical control (sentence structure, agreement, tense, pronouns, prepositions). Focuses on error frequency, impact on meaning, and consistency.",
  Fluency:
    "Natural flow and rhythm of speech (pace, pausing, prosody). Looks for smooth delivery, appropriate pausing, and clear intonation without excessive hesitations.",
  Interaction:
    "Conversational skills: engaging with prompts, turn‑taking, clarifying, and responding to cues. Measures how actively and effectively the speaker sustains a two‑way exchange.",
  Coherence:
    "Organization and clarity of ideas. Evaluates planning, logical sequencing, quality of detail, and staying on topic without rambling.",
};
