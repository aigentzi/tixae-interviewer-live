"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Button } from "@root/components/ui/button";
import InlineNotification, {
  type NotificationType,
} from "@root/app/components/InlineNotification";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, X, Download, Copy } from "lucide-react";
import { cn } from "@root/lib/utils";
import {
  extractTextFromFile,
  validateFileSize,
  ExtractionResult,
} from "./utils/advancedTextExtractor";
import { CVUploadDemo } from "./components/CVUploadDemo";
import { Progress } from "@heroui/react";

interface UploadedCV {
  file: File;
  content: string;
  uploadedAt: Date;
  wordCount: number;
  extractionMethod: string;
  confidence: number;
}

export default function CVPage() {
  const [uploadedCV, setUploadedCV] = useState<UploadedCV | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [notification, setNotification] = useState<{
    type: NotificationType;
    message: string;
  } | null>(null);

  const handleFileDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Validate file size
    if (!validateFileSize(file, 10)) {
      setNotification({
        type: "error",
        message: "File size exceeds 10MB limit. Please choose a smaller file.",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProcessingProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const extractionResult = await extractTextFromFile(file);

      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (!extractionResult.text.trim()) {
        setNotification({
          type: "error",
          message:
            "No text could be extracted from the file. Please check if the file contains readable text.",
        });
        return;
      }

      setUploadedCV({
        file,
        content: extractionResult.text,
        uploadedAt: new Date(),
        wordCount: extractionResult.wordCount,
        extractionMethod: extractionResult.method,
        confidence: extractionResult.confidence,
      });
      setNotification({
        type: "success",
        message: `CV processed successfully! Extracted ${
          extractionResult.wordCount
        } words (${Math.round(
          extractionResult.confidence * 100
        )}% confidence).`,
      });
    } catch (error) {
      console.error("Error processing CV:", error);
      setNotification({
        type: "error",
        message:
          "Failed to process the CV file. Please try again or check the file format.",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const handleRemoveCV = () => {
    setUploadedCV(null);
    setNotification({ type: "info", message: "CV removed successfully" });
  };

  const handleCopyText = async () => {
    if (!uploadedCV?.content) return;

    try {
      await navigator.clipboard.writeText(uploadedCV.content);
      setNotification({
        type: "success",
        message: "CV text copied to clipboard!",
      });
    } catch (error) {
      setNotification({
        type: "error",
        message: "Failed to copy text to clipboard",
      });
    }
  };

  const handleDownloadText = () => {
    if (!uploadedCV?.content) return;

    const blob = new Blob([uploadedCV.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${uploadedCV.file.name.split(".")[0]}_extracted.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setNotification({
      type: "success",
      message: "CV text downloaded successfully!",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {notification && (
        <div className="mb-4">
          <InlineNotification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">CV Text Extractor</h1>
        <p className="text-muted-foreground">
          Upload your CV in PDF, DOCX, or TXT format to extract and view the
          text content.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CV
            </CardTitle>
            <CardDescription>
              Supported formats: PDF, DOCX, DOC, TXT (Max 10MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!uploadedCV ? (
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5",
                  isProcessing && "pointer-events-none opacity-50"
                )}
              >
                <input {...getInputProps()} />
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />

                {isProcessing ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Processing your CV...</p>
                    <Progress
                      aria-label="Processing Progress"
                      color="primary"
                      value={processingProgress}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      {processingProgress < 90
                        ? "Extracting text..."
                        : "Almost done..."}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      {isDragActive
                        ? "Drop your CV here"
                        : "Drag & drop your CV here"}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      or click to browse files
                    </p>
                    <Button variant="bordered" size="sm">
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{uploadedCV.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadedCV.file.size / 1024 / 1024).toFixed(2)} MB •{" "}
                        {uploadedCV.wordCount} words
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Extracted using{" "}
                        {uploadedCV.extractionMethod.toUpperCase()} method •{" "}
                        {Math.round(uploadedCV.confidence * 100)}% confidence
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {uploadedCV.uploadedAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={handleRemoveCV}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  onPress={() => setUploadedCV(null)}
                  variant="bordered"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Different CV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extracted Text Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Extracted Text
              </span>
              {uploadedCV && (
                <div className="flex gap-2">
                  <Button
                    variant="bordered"
                    size="sm"
                    onPress={handleCopyText}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="bordered"
                    size="sm"
                    onPress={handleDownloadText}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              {uploadedCV
                ? `Text content from your CV (${uploadedCV.wordCount} words)`
                : "Upload a CV to see the extracted text content here"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadedCV ? (
              <div className="relative">
                <textarea
                  value={uploadedCV.content}
                  readOnly
                  className="w-full h-96 p-4 border rounded-lg bg-muted/30 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Extracted text will appear here..."
                />
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                  {uploadedCV.wordCount} words
                </div>
              </div>
            ) : (
              <div className="h-96 border rounded-lg bg-muted/30 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No CV uploaded yet</p>
                  <p className="text-xs">
                    Upload a file to see the extracted text
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Tips for Best Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Smart Extraction Methods:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• PDF.js: Advanced PDF text extraction</li>
                <li>• DOCX: XML-based document parsing</li>
                <li>• AI Fallback: For complex or image-based files</li>
                <li>• TXT: Direct text file reading</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Quality Guidelines:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Use clear fonts and good contrast</li>
                <li>• Avoid complex layouts with many columns</li>
                <li>• Standard CV templates work best</li>
                <li>• Keep file size under 10MB</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Section */}
      <CVUploadDemo />
    </div>
  );
}
