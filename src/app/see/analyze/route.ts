import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@root/lib/openai";
import {
  SEE_FEATURES,
  SeeAnalysisSchema,
  computeSeeScorePercent,
} from "../see.constants";

const RequestSchema = z.object({
  transcription: z
    .string()
    .min(30, "Provide the full interview transcription."),
  language: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { transcription, language } = RequestSchema.parse(json);

    const system = `You are an expert oral proficiency examiner. Score an interviewee using the SEE rubric.
Return STRICT JSON matching the schema. Score each feature 0-${5} (integers preferred). Provide concise, actionable comments.`;

    const rubric = SEE_FEATURES.map(
      (f) => `${f.id} (${f.label}) [weight ${f.weight}, ${f.percentage}%]`
    ).join("\n");

    const prompt = `Interview transcription (${
      language || "unknown language"
    }):\n\n${transcription}\n\nRubric features:\n${rubric}\n\nRespond with JSON only.`;

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      system,
      prompt,
      schema: SeeAnalysisSchema,
    });

    const parsed = SeeAnalysisSchema.parse(object);
    const features = SEE_FEATURES.map(
      (def) =>
        parsed.features.find((f: any) => f.id === def.id) || {
          id: def.id,
          score: 0,
          comment: "Missing",
        }
    );
    const seeScorePercent = computeSeeScorePercent(features);

    return NextResponse.json({
      features,
      overallSummary: parsed.overallSummary,
      seeScorePercent,
    });
  } catch (error: any) {
    console.error("SEE analysis error", error);
    const message = error?.message || "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
