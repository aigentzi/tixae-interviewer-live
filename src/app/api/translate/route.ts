import { openai } from "@root/lib/openai";
import { generateText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { text, targetLang } = await req.json();

    if (!text || !targetLang) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // If the target language is English or not provided, return original text
    if (targetLang === "en") {
      return new Response(
        JSON.stringify({ translation: text }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const { text: translation } = await generateText({
      model: openai("gpt-4o-mini"),
      temperature: 0,
      maxTokens: 150,
      messages: [
        {
          role: "system",
          content: `You are a translation engine. Translate the following text to ${targetLang}. Only output the translated text without any additional explanations.`,
        },
        { role: "user", content: text },
      ],
    });

    return new Response(
      JSON.stringify({ translation: translation.trim() }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation API error:", error);
    return new Response(
      JSON.stringify({ error: "Translation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
