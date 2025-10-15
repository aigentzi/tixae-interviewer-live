"use client";
import { FC, useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@root/components/ui/button";
import { Card, CardContent } from "@root/components/ui/card";
import { Badge } from "@root/components/ui/badge";
import {
  Camera,
  Upload,
  ArrowRight,
  RotateCcw,
  Check,
  AlertCircle,
  Smartphone,
  CheckCircle,
  XCircle,
  Shield,
  FileText,
  ScanLine,
  Loader2,
  ArrowLeft,
  Info,
  Star,
} from "lucide-react";
import InlineNotification from "@root/app/components/InlineNotification";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

interface MobileKYCState {
  step: "loading" | "capture" | "review";
  documentType?: string;
  captureMode?: "camera" | "upload";
  currentSide?: "front" | "back";
  documentImage?: string;
  documentImageBack?: string;
  // Verification state - now inline within capture/review
  verificationStatus?: "idle" | "processing" | "success" | "failed";
  result?: any;
  error?: string;
  failureReason?: string;
}

const MobileKYCPage: FC = () => {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const [state, setState] = useState<MobileKYCState>({ step: "loading" });
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateState = useCallback((updates: Partial<MobileKYCState>) => {
    setState((current) => ({ ...current, ...updates }));
  }, []);

  const requiresBackSide = () => {
    return state.documentType === "id_card";
  };

  const isComplete = () => {
    if (!requiresBackSide()) {
      return !!state.documentImage;
    }
    return !!(state.documentImage && state.documentImageBack);
  };

  const getDocumentAspectRatio = () => {
    switch (state.documentType) {
      case "passport":
        return 1.5; // 135mm x 90mm (width:height) - landscape orientation
      case "driver_license":
        return 1.588; // 85.6mm x 54mm (same as ID card)
      case "id_card":
      default:
        return 1.588; // 85.6mm x 54mm
    }
  };

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await axios.get(
          `/api/kyc/session?sessionId=${sessionId}`
        );

        if (response.data.success) {
          const { session } = response.data;
          updateState({
            step: "capture",
            documentType: session.documentType,
            currentSide: "front",
          });

          // Don't update session status yet - let user complete verification first
        } else {
          updateState({
            step: "review",
            verificationStatus: "failed",
            error: "Session not found",
          });
        }
      } catch (error) {
        console.error("Error loading session:", error);
        updateState({
          step: "review",
          verificationStatus: "failed",
          error: "Failed to load verification session",
        });
      }
    };

    if (sessionId) {
      loadSession();
    }
  }, [sessionId, updateState]);

  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setNotification({
        type: "error",
        message: "Unable to access camera. Please check permissions.",
      });
      setIsCapturing(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Calculate crop area for document frame (dynamic aspect ratio based on document type)
    const videoAspect = video.videoWidth / video.videoHeight;
    const docAspect = getDocumentAspectRatio();

    let cropWidth, cropHeight, cropX, cropY;

    // Frame is 280px wide in UI, calculate actual video coordinates
    const frameWidthInVideo = Math.min(
      video.videoWidth * 0.8,
      video.videoHeight * 0.8 * docAspect
    );
    const frameHeightInVideo = frameWidthInVideo / docAspect;

    cropWidth = frameWidthInVideo;
    cropHeight = frameHeightInVideo;
    cropX = (video.videoWidth - cropWidth) / 2;
    cropY = (video.videoHeight - cropHeight) / 2;

    // Create new canvas for cropped image
    const croppedCanvas = document.createElement("canvas");
    const croppedContext = croppedCanvas.getContext("2d");

    if (!croppedContext) return;

    // Set cropped canvas dimensions to maintain document aspect ratio
    const outputWidth = 800;
    const outputHeight = outputWidth / docAspect;

    croppedCanvas.width = outputWidth;
    croppedCanvas.height = outputHeight;

    // Draw cropped and scaled image
    croppedContext.drawImage(
      canvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    const imageData = croppedCanvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(imageData);

    // Store based on current side
    if (requiresBackSide()) {
      if (state.currentSide === "front") {
        updateState({ documentImage: imageData });
        setNotification({
          type: "success",
          message: "Front side captured and cropped!",
        });
      } else {
        updateState({ documentImageBack: imageData });
        setNotification({
          type: "success",
          message: "Back side captured and cropped!",
        });
      }
    } else {
      updateState({ documentImage: imageData });
      setNotification({
        type: "success",
        message: "Document captured and cropped!",
      });
    }

    stopCamera();
  }, [stopCamera, updateState, requiresBackSide, state.currentSide]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      // If no file selected (user cancelled), reset capture mode
      if (!file) {
        updateState({ captureMode: undefined });
        return;
      }

      if (!file.type.startsWith("image/")) {
        setNotification({
          type: "error",
          message: "Please select a valid image file",
        });
        updateState({ captureMode: undefined });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setNotification({
          type: "error",
          message: "File size must be less than 10MB",
        });
        updateState({ captureMode: undefined });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedImage(result);

        if (requiresBackSide()) {
          if (state.currentSide === "front") {
            updateState({ documentImage: result });
            setNotification({
              type: "success",
              message: "Front side uploaded!",
            });
          } else {
            updateState({ documentImageBack: result });
            setNotification({
              type: "success",
              message: "Back side uploaded!",
            });
          }
        } else {
          updateState({ documentImage: result });
          setNotification({ type: "success", message: "Document uploaded!" });
        }
      };

      reader.onerror = () => {
        setNotification({ type: "error", message: "Failed to read file" });
        updateState({ captureMode: undefined });
        setCapturedImage(null);
      };

      reader.readAsDataURL(file);
      event.target.value = "";
    },
    [updateState, requiresBackSide, state.currentSide]
  );

  const handleNext = useCallback(async () => {
    if (requiresBackSide()) {
      if (!state.documentImage) {
        setNotification({
          type: "error",
          message: "Please capture the front side first",
        });
        return;
      }

      if (!state.documentImageBack) {
        updateState({ currentSide: "back", captureMode: undefined });
        setCapturedImage(null);
        setNotification({
          type: "info",
          message: "Now capture the back side of your ID card",
        });
        return;
      }
    } else if (!state.documentImage) {
      setNotification({
        type: "error",
        message: "Please capture your document first",
      });
      return;
    }

    // All images captured, process verification inline
    updateState({
      step: "review",
      verificationStatus: "processing",
      captureMode: undefined,
    });
    setCapturedImage(null);

    try {
      const requestData: any = {
        document: state.documentImage,
        documentType: state.documentType,
      };

      if (state.documentImageBack) {
        requestData.documentBack = state.documentImageBack;
      }

      const response = await axios.post("/api/kyc/scan", requestData);

      if (response.data.success) {
        // Check if verification is FULLY successful (no warnings, no AML matches, document authenticity passes)
        const data = response.data.data;
        const isFullySuccessful =
          data?.documentAuthenticity?.overall === "pass" &&
          !data?.aml?.match &&
          (!data?.documentAuthenticity?.details ||
            data.documentAuthenticity.details.length === 0);

        if (isFullySuccessful) {
          // Only update session as completed when verification is FULLY successful
          console.log("Verification FULLY successful, updating session:", {
            sessionId,
            status: "completed",
            hasResult: !!response.data,
          });

          // Update session with in_progress first, then completed with result
          await axios.post("/api/kyc/session", {
            action: "update_session",
            sessionId,
            status: "in_progress",
          });

          // Small delay to ensure desktop sees the in_progress status
          await new Promise((resolve) => setTimeout(resolve, 500));

          await axios.post("/api/kyc/session", {
            action: "update_session",
            sessionId,
            status: "completed",
            result: response.data,
          });

          // Show success inline
          updateState({
            verificationStatus: "success",
            result: response.data,
          });
          setNotification({
            type: "success",
            message: "Identity verification completed successfully!",
          });
        } else {
          // Verification has warnings or issues - treat as failed, let user retry
          console.log("Verification has warnings/issues, treating as failed");

          let failureMessage = "Verification incomplete. ";
          if (data?.documentAuthenticity?.overall === "warning") {
            failureMessage += "Document has security warnings. ";
          } else if (data?.documentAuthenticity?.overall === "fail") {
            failureMessage += "Document authenticity check failed. ";
          }
          if (data?.aml?.match) {
            failureMessage += "AML screening flagged potential matches. ";
          }
          if (
            data?.documentAuthenticity?.details &&
            data.documentAuthenticity.details.length > 0
          ) {
            failureMessage += "Document has quality issues. ";
          }
          failureMessage += "Please try again with a clearer document photo.";

          updateState({
            verificationStatus: "failed",
            failureReason: failureMessage,
          });
        }
      } else {
        // Verification failed - show failure inline
        console.log("Verification failed, showing inline failure.");

        const failureMessage =
          response.data.error ||
          response.data.message ||
          "Verification failed. Please ensure your document is clear and all corners are visible.";

        updateState({
          verificationStatus: "failed",
          failureReason: failureMessage,
        });
      }
    } catch (error) {
      console.error("Error processing KYC:", error);

      // Show error inline
      let failureMessage = "Processing failed. Please try again.";
      if (error instanceof Error) {
        failureMessage = `Processing failed: ${error.message}`;
      }

      updateState({
        verificationStatus: "failed",
        failureReason: failureMessage,
      });
    }
  }, [
    sessionId,
    state.documentImage,
    state.documentImageBack,
    state.documentType,
    requiresBackSide,
    updateState,
  ]);

  const handleVerificationRetry = useCallback(async () => {
    // Retry verification with the same captured images
    updateState({ verificationStatus: "processing" });

    try {
      const requestData: any = {
        document: state.documentImage,
        documentType: state.documentType,
      };

      if (state.documentImageBack) {
        requestData.documentBack = state.documentImageBack;
      }

      const response = await axios.post("/api/kyc/scan", requestData);

      if (response.data.success) {
        // Check if verification is FULLY successful (no warnings, no AML matches, document authenticity passes)
        const data = response.data.data;
        const isFullySuccessful =
          data?.documentAuthenticity?.overall === "pass" &&
          !data?.aml?.match &&
          (!data?.documentAuthenticity?.details ||
            data.documentAuthenticity.details.length === 0);

        if (isFullySuccessful) {
          // Only update session as completed when verification is FULLY successful
          await axios.post("/api/kyc/session", {
            action: "update_session",
            sessionId,
            status: "in_progress",
          });

          await new Promise((resolve) => setTimeout(resolve, 500));

          await axios.post("/api/kyc/session", {
            action: "update_session",
            sessionId,
            status: "completed",
            result: response.data,
          });

          updateState({
            verificationStatus: "success",
            result: response.data,
            failureReason: undefined,
          });
          setNotification({
            type: "success",
            message: "Identity verification completed successfully!",
          });
        } else {
          // Verification has warnings or issues - treat as failed, let user retry
          let failureMessage = "Verification incomplete. ";
          if (data?.documentAuthenticity?.overall === "warning") {
            failureMessage += "Document has security warnings. ";
          } else if (data?.documentAuthenticity?.overall === "fail") {
            failureMessage += "Document authenticity check failed. ";
          }
          if (data?.aml?.match) {
            failureMessage += "AML screening flagged potential matches. ";
          }
          if (
            data?.documentAuthenticity?.details &&
            data.documentAuthenticity.details.length > 0
          ) {
            failureMessage += "Document has quality issues. ";
          }
          failureMessage += "Please try again with a clearer document photo.";

          updateState({
            verificationStatus: "failed",
            failureReason: failureMessage,
          });
        }
      } else {
        // Failed again - update failure reason
        const failureMessage =
          response.data.error ||
          response.data.message ||
          "Verification failed again. Please check that your document is clear and well-lit.";

        updateState({
          verificationStatus: "failed",
          failureReason: failureMessage,
        });
      }
    } catch (error) {
      console.error("Error retrying KYC:", error);

      let failureMessage = "Retry failed. Please try again.";
      if (error instanceof Error) {
        failureMessage = `Retry failed: ${error.message}`;
      }

      updateState({
        verificationStatus: "failed",
        failureReason: failureMessage,
      });
    }
  }, [
    sessionId,
    state.documentImage,
    state.documentImageBack,
    state.documentType,
    updateState,
  ]);

  const retake = () => {
    setCapturedImage(null);
    if (requiresBackSide() && state.currentSide === "back") {
      updateState({
        documentImageBack: undefined,
        captureMode: undefined,
        verificationStatus: "idle",
      });
    } else {
      updateState({
        documentImage: undefined,
        captureMode: undefined,
        verificationStatus: "idle",
      });
    }
  };

  if (state.step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-sm">
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-primary">
              Setting up verification
            </h1>
            <p className="text-secondary">
              Preparing your secure document capture session...
            </p>
          </div>

          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-sm mx-auto p-4 pt-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <FileText className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-primary">
              Verify your identity
            </h1>
            <p className="text-secondary">
              Take a photo of your{" "}
              {state.documentType === "id_card"
                ? "ID card"
                : state.documentType === "passport"
                ? "passport"
                : "driver's license"}
              {requiresBackSide() ? ` ${state.currentSide} side` : ""}
            </p>
          </div>

          {requiresBackSide() && (
            <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl p-3">
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      state.documentImage ? "bg-primary" : "bg-secondary/30"
                    } ${state.documentImage ? "ring-2 ring-primary/30" : ""}`}
                  />
                  <span className="text-xs font-medium text-secondary">
                    Front
                  </span>
                </div>
                <div className="w-6 h-0.5 bg-secondary/30 rounded-full" />
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      state.documentImageBack ? "bg-primary" : "bg-secondary/30"
                    } ${
                      state.documentImageBack ? "ring-2 ring-primary/30" : ""
                    }`}
                  />
                  <span className="text-xs font-medium text-secondary">
                    Back
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Verification Status - show when verification is in progress or complete */}
        {state.verificationStatus && state.verificationStatus !== "idle" && (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 space-y-6">
            {/* Show captured images */}
            <div className="space-y-3">
              {state.documentImage && (
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={state.documentImage}
                    alt="Front side document"
                    className="w-full object-cover"
                    style={{ aspectRatio: getDocumentAspectRatio() }}
                  />
                  {requiresBackSide() && (
                    <div className="absolute top-3 left-3">
                      <div className="bg-white/90 text-primary px-2 py-1 rounded-md text-xs font-medium">
                        Front Side
                      </div>
                    </div>
                  )}
                </div>
              )}

              {state.documentImageBack && (
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={state.documentImageBack}
                    alt="Back side document"
                    className="w-full object-cover"
                    style={{ aspectRatio: getDocumentAspectRatio() }}
                  />
                  <div className="absolute top-3 left-3">
                    <div className="bg-white/90 text-primary px-2 py-1 rounded-md text-xs font-medium">
                      Back Side
                    </div>
                  </div>
                </div>
              )}
            </div>
            {state.verificationStatus === "processing" && (
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <ScanLine className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-transparent border-t-primary rounded-full animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-primary">
                    Verifying your identity
                  </h2>
                  <p className="text-sm text-secondary">
                    Processing your document securely...
                  </p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            )}

            {state.verificationStatus === "success" && state.result && (
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-primary">
                    Verification Complete!
                  </h2>
                  <p className="text-sm text-secondary">
                    Your identity has been fully verified and approved! All
                    security checks passed. You can now close this page and
                    return to your desktop.
                  </p>
                </div>
                <div className="bg-primary/5 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-2 text-xs text-secondary">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Your information is secure and encrypted</span>
                  </div>
                </div>
              </div>
            )}

            {state.verificationStatus === "failed" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-red-600">
                    Verification Incomplete
                  </h2>
                  <p className="text-sm text-secondary">
                    {state.failureReason ||
                      "We couldn't fully verify your document. Please try again with a clearer photo."}
                  </p>
                  <p className="text-xs text-red-600 font-medium">
                    Keep trying until all security checks pass!
                  </p>
                </div>

                <div className="bg-red-50 rounded-xl p-3">
                  <div className="space-y-2 text-xs text-red-600">
                    <p className="font-medium">Tips for better results:</p>
                    <ul className="space-y-1 text-left list-disc list-inside">
                      <li>Ensure good lighting</li>
                      <li>Keep document flat and steady</li>
                      <li>Make sure all corners are visible</li>
                      <li>Avoid glare and shadows</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleVerificationRetry}
                    className="bg-primary text-white rounded-xl p-3 text-sm font-medium hover:bg-primary/90 active:scale-95 transform transition-all"
                  >
                    Verify Again
                  </button>
                  <button
                    onClick={() => {
                      updateState({
                        step: "capture",
                        captureMode: undefined,
                        documentImage: undefined,
                        documentImageBack: undefined,
                        currentSide: "front",
                        verificationStatus: "idle",
                        failureReason: undefined,
                      });
                      setCapturedImage(null);
                    }}
                    className="bg-white border border-secondary/30 text-secondary rounded-xl p-3 text-sm font-medium hover:bg-secondary/5 active:scale-95 transform transition-all"
                  >
                    New Photos
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Capture Interface */}
        {!capturedImage &&
        (!state.verificationStatus || state.verificationStatus === "idle") ? (
          <div className="space-y-6">
            {!state.captureMode ? (
              <div className="space-y-4">
                <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <h2 className="text-lg font-semibold text-primary">
                      Choose how to capture
                    </h2>
                    <p className="text-sm text-secondary">
                      For best results, use your camera in good lighting
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        updateState({ captureMode: "camera" });
                        startCamera();
                      }}
                      className="w-full bg-primary text-white rounded-xl p-4 flex items-center gap-4 hover:bg-primary/90 transition-colors active:scale-95 transform"
                    >
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Camera className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">Take photo</div>
                        <div className="text-sm opacity-90">Recommended</div>
                      </div>
                      <Star className="h-4 w-4 ml-auto opacity-75" />
                    </button>

                    <button
                      onClick={() => {
                        updateState({ captureMode: "upload" });
                        // Use setTimeout to ensure state is updated before triggering file input
                        setTimeout(() => {
                          fileInputRef.current?.click();
                        }, 0);
                      }}
                      className="w-full bg-white border-2 border-secondary/30 rounded-xl p-4 flex items-center gap-4 hover:border-secondary/50 transition-colors active:scale-95 transform"
                    >
                      <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                        <Upload className="h-6 w-6 text-secondary" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-primary">
                          Upload file
                        </div>
                        <div className="text-sm text-secondary">
                          From gallery
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-primary mb-1">
                        Tips for best results
                      </p>
                      <ul className="text-secondary space-y-1 text-xs">
                        <li>• Use good lighting</li>
                        <li>• Hold document flat</li>
                        <li>• Include all edges</li>
                        <li>• Avoid shadows and glare</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : state.captureMode === "camera" && isCapturing ? (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-semibold text-primary">
                    Position your document
                  </h2>
                  <p className="text-sm text-secondary">
                    Line up your{" "}
                    {state.documentType === "id_card"
                      ? "ID card"
                      : state.documentType}{" "}
                    with the frame
                  </p>
                </div>

                <div className="relative rounded-2xl overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-[4/3] object-cover bg-black"
                  />

                  {/* Document guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Scanning animation */}
                      <div
                        className="absolute inset-0 border-2 border-white/50 rounded-xl"
                        style={{
                          aspectRatio: getDocumentAspectRatio(),
                          width: "280px",
                        }}
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-xl">
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                        </div>
                      </div>

                      {/* Corner guides */}
                      <div
                        className="border-2 border-white rounded-xl relative"
                        style={{
                          aspectRatio: getDocumentAspectRatio(),
                          width: "280px",
                        }}
                      >
                        <div className="absolute -top-2 -left-2 w-6 h-6">
                          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white rounded-tl-md" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6">
                          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white rounded-tr-md" />
                        </div>
                        <div className="absolute -bottom-2 -left-2 w-6 h-6">
                          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white rounded-bl-md" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-6 h-6">
                          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white rounded-br-md" />
                        </div>

                        {/* Center instruction */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                            {requiresBackSide()
                              ? `${
                                  state.currentSide === "front"
                                    ? "Front"
                                    : "Back"
                                } side`
                              : "Fit document here"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={capturePhoto}
                    className="w-full bg-white text-primary rounded-xl p-4 font-semibold flex items-center justify-center gap-2 hover:bg-primary/5 active:scale-95 transform transition-all shadow-lg"
                  >
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                    Capture{" "}
                    {requiresBackSide()
                      ? `${state.currentSide} side`
                      : "document"}
                  </button>

                  <button
                    onClick={() => {
                      stopCamera();
                      updateState({ captureMode: undefined });
                    }}
                    className="w-full text-secondary rounded-xl p-2 text-sm hover:bg-white/50 transition-colors"
                  >
                    Try a different method
                  </button>
                </div>

                <canvas ref={canvasRef} className="hidden" />
              </div>
            ) : state.captureMode === "upload" ? (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-semibold text-primary">
                    Select your document
                  </h2>
                  <p className="text-sm text-secondary">
                    Choose an image from your gallery
                  </p>
                </div>

                <div className="bg-white/60 backdrop-blur-sm border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-primary/60" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">
                      Waiting for file selection...
                    </p>
                    <p className="text-xs text-secondary">
                      The file picker should have opened automatically
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-primary text-white rounded-xl p-3 font-medium hover:bg-primary/90 transition-colors"
                    >
                      Select File Again
                    </button>

                    <button
                      onClick={() => updateState({ captureMode: undefined })}
                      className="w-full text-secondary rounded-xl p-2 text-sm hover:bg-white/50 transition-colors"
                    >
                      Use Camera Instead
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        ) : capturedImage &&
          (!state.verificationStatus || state.verificationStatus === "idle") ? (
          <div className="space-y-4">
            <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-6 space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-primary">
                  Review your document
                </h2>
                <p className="text-sm text-secondary">
                  Make sure all text is clear and readable
                </p>
              </div>

              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured document"
                  className="w-full object-cover"
                  style={{ aspectRatio: getDocumentAspectRatio() }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                <div className="absolute top-3 right-3">
                  <div className="bg-primary text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Clear
                  </div>
                </div>

                {requiresBackSide() && (
                  <div className="absolute top-3 left-3">
                    <div className="bg-white/90 text-primary px-2 py-1 rounded-md text-xs font-medium capitalize">
                      {state.currentSide} Side
                    </div>
                  </div>
                )}

                {/* Quality indicators */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-white/90 rounded-lg p-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-primary">
                        <Check className="h-3 w-3" />
                        <span>Good lighting</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        <Check className="h-3 w-3" />
                        <span>All edges visible</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={retake}
                  className="bg-white border border-secondary/30 text-secondary rounded-xl p-3 font-medium flex items-center justify-center gap-2 hover:bg-secondary/5 active:scale-95 transform transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </button>

                <button
                  onClick={handleNext}
                  className="bg-primary text-white rounded-xl p-3 font-medium flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transform transition-all"
                >
                  {requiresBackSide() && !isComplete() ? "Continue" : "Verify"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Progress indicator for multi-step */}
            {requiresBackSide() && (
              <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">Progress</span>
                  <span className="font-medium text-primary">
                    {isComplete() ? "2" : "1"} of 2
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MobileKYCPage;
