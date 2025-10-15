// Advanced text extraction using PDF.js and AI fallback
import * as pdfjsLib from "pdfjs-dist";

// Set up PDF.js worker - use the correct version that matches our installed package
if (typeof window !== "undefined") {
  const version = (pdfjsLib as any).version || "5.4.54";
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;

  console.log(
    "📦 PDF.js worker configured:",
    pdfjsLib.GlobalWorkerOptions.workerSrc
  );
}

export interface ExtractionResult {
  text: string;
  method: "pdfjs" | "ai" | "basic" | "txt" | "docx";
  confidence: number;
  wordCount: number;
}

// Main extraction function with multiple strategies
export async function extractTextFromFile(
  file: File
): Promise<ExtractionResult> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    if (fileType === "text/plain" || fileName.endsWith(".txt")) {
      const text = await extractTextFromTXT(file);
      return {
        text,
        method: "txt",
        confidence: 1.0,
        wordCount: countWords(text),
      };
    } else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      return await extractTextFromPDFAdvanced(file);
    } else if (
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      const text = await extractTextFromDOCX(file);
      return {
        text,
        method: "docx",
        confidence: 0.9,
        wordCount: countWords(text),
      };
    } else if (fileType === "application/msword" || fileName.endsWith(".doc")) {
      throw new Error(
        "DOC files are not fully supported. Please convert to DOCX or PDF format."
      );
    } else {
      throw new Error(
        "Unsupported file format. Please use PDF, DOCX, or TXT files."
      );
    }
  } catch (error) {
    console.error("Text extraction error:", error);
    throw new Error(
      `Failed to extract text: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Advanced PDF extraction with multiple strategies
async function extractTextFromPDFAdvanced(
  file: File
): Promise<ExtractionResult> {
  console.log("🔍 Starting PDF extraction for:", file.name);

  // Strategy 1: Try PDF.js first (most reliable)
  try {
    console.log("📖 Attempting PDF.js extraction...");
    const pdfResult = await extractTextWithPDFJS(file);
    console.log("✅ PDF.js extraction successful:", {
      textLength: pdfResult.text.length,
      wordCount: pdfResult.wordCount,
      confidence: pdfResult.confidence,
    });

    if (pdfResult.text.trim().length > 10) {
      // Lowered threshold for testing
      return pdfResult;
    }
  } catch (error) {
    console.warn("❌ PDF.js extraction failed:", (error as Error).message);
  }

  // Strategy 2: If PDF.js didn't work well, try AI extraction
  try {
    console.log("🤖 Attempting AI extraction fallback...");
    const aiResult = await extractTextWithAI(file);
    console.log("✅ AI extraction successful:", aiResult);

    if (aiResult.text.trim().length > 10) {
      return aiResult;
    }
  } catch (error) {
    console.warn("❌ AI extraction failed:", (error as Error).message);
  }

  // Strategy 3: Final fallback to basic extraction
  try {
    console.log("🔧 Attempting basic extraction fallback...");
    const basicText = await extractTextFromPDFBasic(file);
    console.log(
      "✅ Basic extraction successful, text length:",
      basicText.length
    );

    return {
      text: basicText,
      method: "basic",
      confidence: 0.3,
      wordCount: countWords(basicText),
    };
  } catch (error) {
    console.warn("❌ Basic extraction failed:", (error as Error).message);
  }

  throw new Error(
    "All PDF extraction methods failed. This might be an image-based PDF, encrypted, or corrupted file. Please try converting to DOCX format."
  );
}

// PDF.js extraction (most reliable for text-based PDFs)
async function extractTextWithPDFJS(file: File): Promise<ExtractionResult> {
  try {
    console.log("📋 Loading PDF with PDF.js...");

    // Verify PDF.js worker is available
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      throw new Error("PDF.js worker not configured");
    }

    const arrayBuffer = await file.arrayBuffer();
    console.log(`📄 PDF file size: ${arrayBuffer.byteLength} bytes`);

    console.log("📄 Creating PDF document object...");
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // Add these options for better compatibility
      verbosity: 0, // Reduce console spam
      isEvalSupported: false,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;

    console.log(`📚 PDF loaded successfully! Pages: ${pdf.numPages}`);

    let fullText = "";
    let totalChars = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`📖 Processing page ${pageNum}/${pdf.numPages}...`);

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Extract text items with better handling
      const pageTexts = textContent.items
        .filter((item: any) => item.str && typeof item.str === "string")
        .map((item: any) => item.str.trim())
        .filter((text: string) => text.length > 0);

      if (pageTexts.length > 0) {
        const pageText = pageTexts.join(" ");
        fullText += pageText + "\n";
        totalChars += pageText.length;
        console.log(
          `✅ Page ${pageNum}: Extracted ${pageText.length} characters`
        );
      } else {
        console.log(`⚠️ Page ${pageNum}: No text found`);
      }
    }

    console.log(`📊 Total extraction: ${totalChars} characters`);

    if (fullText.trim().length === 0) {
      throw new Error(
        "No text content found in PDF. This might be an image-based PDF."
      );
    }

    const cleanedText = cleanExtractedText(fullText);
    const wordCount = countWords(cleanedText);

    // Calculate confidence based on text quality
    let confidence = 0.9;
    if (cleanedText.length < 100) confidence = 0.6;
    else if (wordCount < 20) confidence = 0.4;
    else if (wordCount > 100) confidence = 0.95;

    console.log(
      `🎯 PDF.js extraction complete: ${wordCount} words, ${Math.round(
        confidence * 100
      )}% confidence`
    );

    return {
      text: cleanedText,
      method: "pdfjs",
      confidence,
      wordCount,
    };
  } catch (error) {
    console.error("❌ PDF.js extraction error:", error);
    throw new Error("PDF.js extraction failed: " + (error as Error).message);
  }
}

// AI-powered extraction for complex/image-based PDFs
async function extractTextWithAI(file: File): Promise<ExtractionResult> {
  try {
    // Convert PDF to base64 for AI processing
    const base64 = await fileToBase64(file);

    const response = await fetch("/api/extract-pdf-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: base64,
        fileName: file.name,
        fileSize: file.size,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI extraction failed: ${response.statusText}`);
    }

    const result = await response.json();
    const cleanedText = cleanExtractedText(result.text);

    return {
      text: cleanedText,
      method: "ai",
      confidence: result.confidence || 0.8,
      wordCount: countWords(cleanedText),
    };
  } catch (error) {
    throw new Error("AI extraction failed: " + (error as Error).message);
  }
}

// Basic PDF extraction (fallback)
async function extractTextFromPDFBasic(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const text = await extractTextFromPDFBytes(new Uint8Array(arrayBuffer));
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read PDF file"));
    reader.readAsArrayBuffer(file);
  });
}

// Basic PDF parsing (simplified version of previous implementation)
async function extractTextFromPDFBytes(bytes: Uint8Array): Promise<string> {
  try {
    const pdfString = new TextDecoder("latin1").decode(bytes);

    if (!pdfString.startsWith("%PDF-")) {
      throw new Error("Invalid PDF format");
    }

    let extractedText = "";

    // Look for text objects
    const textObjectRegex = /BT\s+([\s\S]*?)\s+ET/g;
    let match;

    while ((match = textObjectRegex.exec(pdfString)) !== null) {
      const textObject = match[1];

      // Extract simple text operations
      const tjRegex = /\(((?:[^()\\]|\\.|\\[0-7]{1,3})*)\)\s*Tj/g;
      let tjMatch;

      while ((tjMatch = tjRegex.exec(textObject)) !== null) {
        const textContent = decodePDFString(tjMatch[1]);
        if (isReadableText(textContent)) {
          extractedText += textContent + " ";
        }
      }
    }

    if (extractedText.trim().length === 0) {
      throw new Error("No readable text found");
    }

    return cleanExtractedText(extractedText);
  } catch (error) {
    throw new Error("Basic PDF extraction failed");
  }
}

// Text extraction from plain text files
async function extractTextFromTXT(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text || "");
    };
    reader.onerror = () => reject(new Error("Failed to read text file"));
    reader.readAsText(file);
  });
}

// DOCX extraction (improved version)
async function extractTextFromDOCX(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const text = await extractTextFromDOCXBuffer(arrayBuffer);
        resolve(text);
      } catch (error) {
        reject(new Error("Failed to extract text from DOCX file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read DOCX file"));
    reader.readAsArrayBuffer(file);
  });
}

async function extractTextFromDOCXBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    const uint8Array = new Uint8Array(buffer);
    const content = new TextDecoder().decode(uint8Array);

    let extractedText = "";

    // Extract from w:t elements
    const textElementRegex = /<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g;
    let match;

    while ((match = textElementRegex.exec(content)) !== null) {
      const textContent = decodeXMLEntities(match[1]);
      if (textContent && textContent.trim()) {
        extractedText += textContent + " ";
      }
    }

    if (extractedText.trim().length === 0) {
      throw new Error("No readable text found in DOCX file");
    }

    return cleanExtractedText(extractedText);
  } catch (error) {
    throw new Error("DOCX parsing failed");
  }
}

// Utility functions
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

function decodePDFString(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (match, octal) => {
      return String.fromCharCode(parseInt(octal, 8));
    });
}

function isReadableText(text: string): boolean {
  if (!text || text.length < 1) return false;
  if (!/[a-zA-Z]/.test(text)) return false;

  const specialCharCount = (text.match(/[^\w\s.,!?;:()\-"']/g) || []).length;
  const ratio = specialCharCount / text.length;

  return ratio <= 0.5;
}

function decodeXMLEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\s*\n\s*/g, "\n") // Clean line breaks
    .replace(/([.!?])\s*([A-Z])/g, "$1\n$2") // Add line breaks after sentences
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Add spaces between camelCase
    .replace(/\n\s*\n+/g, "\n") // Remove multiple empty lines
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

// Validation functions
export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

export function getFileTypeDescription(file: File): string {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === "text/plain" || fileName.endsWith(".txt")) {
    return "Plain Text";
  } else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return "PDF Document";
  } else if (
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    return "Word Document (DOCX)";
  } else if (fileType === "application/msword" || fileName.endsWith(".doc")) {
    return "Word Document (DOC)";
  } else {
    return "Unknown Format";
  }
}
