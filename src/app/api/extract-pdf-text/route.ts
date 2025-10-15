import { gpt4o } from "@root/lib/openai";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { file, fileName, fileSize } = body;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 10MB for AI processing)
    if (fileSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large for AI processing. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    console.log(
      `🤖 AI extracting text from PDF: ${fileName} (${(
        fileSize /
        1024 /
        1024
      ).toFixed(2)}MB)`
    );

    // Use OpenAI to extract text from PDF
    // Note: This approach converts the PDF to images and uses vision API
    const extractedText = await extractTextWithOpenAI(file, fileName);

    if (!extractedText.trim()) {
      return NextResponse.json(
        {
          error:
            "No text could be extracted from this PDF. It might be image-based or encrypted.",
        },
        { status: 422 }
      );
    }

    // Calculate confidence based on extraction quality
    const wordCount = extractedText
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    let confidence = 0.8;

    if (wordCount < 20) confidence = 0.4;
    else if (wordCount < 50) confidence = 0.6;
    else if (wordCount > 200) confidence = 0.9;

    console.log(
      `✅ AI extraction completed: ${wordCount} words (confidence: ${confidence})`
    );

    return NextResponse.json({
      text: extractedText,
      confidence,
      wordCount,
      method: "ai",
      fileName,
    });
  } catch (error) {
    console.error("AI PDF extraction error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Handle different types of errors
    if (errorMessage.includes("rate_limit")) {
      return NextResponse.json(
        {
          error:
            "AI service rate limit exceeded. Please try again in a moment.",
        },
        { status: 429 }
      );
    }

    if (errorMessage.includes("insufficient_quota")) {
      return NextResponse.json(
        { error: "AI service quota exceeded. Please contact support." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `AI extraction failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

async function extractTextWithOpenAI(
  base64File: string,
  fileName: string
): Promise<string> {
  // Note: Vercel AI SDK doesn't support vision models for PDF processing yet
  // For complex PDFs, recommend conversion to DOCX format
  throw new Error(
    `AI extraction is not yet available for PDF files. For best results with "${fileName}", please:\n\n• Convert the PDF to DOCX format\n• Use a PDF with selectable text\n• Check if the PDF is password protected\n• Try using OCR software for image-based PDFs`
  );
}
