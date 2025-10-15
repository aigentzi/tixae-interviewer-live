import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Lazy-load OpenAI client to avoid build-time issues
let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { message: "Valid prompt is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured");
      return NextResponse.json(
        { message: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    console.log("Generating prompt for:", prompt.substring(0, 100) + "...");

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an expert interview prompt generator. Create comprehensive, professional interview prompts that include relevant questions for the specified role and level. Format the response as a structured prompt that an AI interviewer can use effectively.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const generatedPrompt = completion.choices[0]?.message?.content;

    if (!generatedPrompt) {
      console.error("OpenAI returned empty response");
      return NextResponse.json(
        {
          message: "No prompt generated",
          error: "OpenAI returned empty response",
        },
        { status: 500 }
      );
    }

    console.log("Successfully generated prompt");
    return NextResponse.json({ generatedPrompt });
  } catch (error) {
    console.error("Error generating prompt:", error);

    return NextResponse.json(
      {
        message: "Failed to generate prompt",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
