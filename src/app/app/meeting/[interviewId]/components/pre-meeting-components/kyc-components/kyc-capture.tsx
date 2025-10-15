import { FC, useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@root/components/ui/button";
import { Card, CardContent } from "@root/components/ui/card";
import { Badge } from "@root/components/ui/badge";
import {
  Camera,
  Upload,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { KYCStepProps, KYCCaptureMode } from "@root/types/kyc";
import { cn } from "@root/lib/utils";
import InlineNotification from "@root/app/components/InlineNotification";

export const KYCCaptureStep: FC<KYCStepProps> = ({
  onNext,
  onPrev,
  state,
  updateState,
}) => {
  const [captureMode, setCaptureMode] = useState<KYCCaptureMode | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDocumentTypeDisplay = () => {
    switch (state.documentType) {
      case "passport":
        return "Passport";
      case "driver_license":
        return "Driver's License";
      case "id_card":
        return "National ID Card";
      default:
        return "Document";
    }
  };

  const requiresBackSide = () => {
    return state.documentType === "id_card";
  };

  const getCurrentSideDisplay = () => {
    if (!requiresBackSide()) return "";
    return state.currentSide === "back" ? " (Back Side)" : " (Front Side)";
  };

  const isCapturComplete = () => {
    if (!requiresBackSide()) {
      return !!capturedImage;
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

  const startCamera = useCallback(async () => {
    console.log("startCamera called, current isCapturing:", isCapturing);
    try {
      setIsCapturing(true);
      console.log("Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      console.log("Camera access granted, stream:", mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        console.log("Video stream set to video element");
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

  // Reset local state when transitioning TO capture step from document type selection
  // Only reset if we don't already have a capture mode set (avoid resetting during camera usage)
  useEffect(() => {
    if (
      state.step === "capture" &&
      !state.documentImage &&
      !state.documentImageBack &&
      !captureMode // Don't reset if user has already chosen a capture mode
    ) {
      setCaptureMode(null);
      setCapturedImage(null);
      setIsCapturing(false);
      stopCamera();
    }
  }, [
    state.step,
    state.documentImage,
    state.documentImageBack,
    stopCamera,
    captureMode,
  ]);

  // Ensure camera starts when camera mode is selected but not yet capturing
  useEffect(() => {
    console.log("Camera useEffect triggered:", {
      captureMode,
      isCapturing,
      capturedImage: !!capturedImage,
    });
    if (captureMode === "camera" && !isCapturing && !capturedImage) {
      console.log("Starting camera via useEffect");
      startCamera();
    }
  }, [captureMode, isCapturing, capturedImage, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);

    // Store the image based on current side
    if (requiresBackSide()) {
      if (state.currentSide === "front" || !state.currentSide) {
        updateState({ documentImage: imageData, currentSide: "front" });
        setNotification({
          type: "success",
          message: "Front side captured successfully!",
        });
      } else {
        updateState({ documentImageBack: imageData });
        setNotification({
          type: "success",
          message: "Back side captured successfully!",
        });
      }
    } else {
      updateState({ documentImage: imageData });
      setNotification({
        type: "success",
        message: "Document captured successfully!",
      });
    }

    stopCamera();
  }, [stopCamera, updateState, requiresBackSide, state.currentSide]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setNotification({
          type: "error",
          message: "Please select a valid image file",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setNotification({
          type: "error",
          message: "File size must be less than 10MB",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCapturedImage(result);

        // Store the image based on current side
        if (requiresBackSide()) {
          if (state.currentSide === "front" || !state.currentSide) {
            updateState({ documentImage: result, currentSide: "front" });
            setNotification({
              type: "success",
              message: "Front side uploaded successfully!",
            });
          } else {
            updateState({ documentImageBack: result });
            setNotification({
              type: "success",
              message: "Back side uploaded successfully!",
            });
          }
        } else {
          updateState({ documentImage: result });
          setNotification({
            type: "success",
            message: "Document uploaded successfully!",
          });
        }
      };
      reader.readAsDataURL(file);

      // Clear the input value so the same file can be selected again if needed
      event.target.value = "";
    },
    [updateState, requiresBackSide, state.currentSide]
  );

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);

    // Only clear the current side being captured
    if (requiresBackSide() && state.currentSide === "back") {
      // If we're on back side, only clear back side
      updateState({ documentImageBack: undefined });
    } else {
      // If we're on front side or single-sided document, clear front
      updateState({ documentImage: undefined });
    }

    if (captureMode === "camera") {
      startCamera();
    }
  }, [
    captureMode,
    startCamera,
    updateState,
    requiresBackSide,
    state.currentSide,
  ]);

  const handleNext = useCallback(() => {
    if (requiresBackSide()) {
      // For ID cards, check if we have front side
      if (!state.documentImage) {
        setNotification({
          type: "error",
          message:
            "Please capture or upload the front side of your ID card first",
        });
        return;
      }

      // If we only have front side, prompt for back side
      if (!state.documentImageBack) {
        console.log("Transitioning to back side capture");
        updateState({ currentSide: "back" });
        setCapturedImage(null);
        // Keep the same capture mode the user selected for consistency
        // The useEffect will automatically start the camera when needed
        setNotification({
          type: "info",
          message: "Now capture or upload the back side of your ID card",
        });
        return;
      }

      // Both sides captured, proceed
      onNext();
    } else {
      // For passport and driver's license, only need front
      if (!capturedImage) {
        setNotification({
          type: "error",
          message: "Please capture or upload your document first",
        });
        return;
      }
      onNext();
    }
  }, [
    capturedImage,
    onNext,
    requiresBackSide,
    state.documentImage,
    state.documentImageBack,
    updateState,
    captureMode,
    startCamera,
  ]);

  const renderModeSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          Capture Your {getDocumentTypeDisplay()}
          {getCurrentSideDisplay()}
        </h2>
        <p className="text-muted-foreground text-sm">
          {requiresBackSide() && state.currentSide === "back"
            ? "Now capture the back side of your ID card"
            : "Choose how you'd like to provide your document"}
        </p>

        {requiresBackSide() && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <div
              className={`w-3 h-3 rounded-full ${
                state.documentImage ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-xs text-muted-foreground">Front</span>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div
              className={`w-3 h-3 rounded-full ${
                state.documentImageBack ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-xs text-muted-foreground">Back</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border border-primary-50 hover:border-primary/50"
          isPressable
          onPress={() => {
            console.log("Camera card clicked");
            setCaptureMode("camera");
            // Don't call startCamera here - let the useEffect handle it to avoid duplicate calls
          }}
        >
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-primary mx-auto w-fit">
              <Camera className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Use Camera</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Take a photo with your device camera
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Recommended
            </Badge>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border border-primary-50 hover:border-primary/50"
          isPressable
          onPress={() => {
            setCaptureMode("upload");
            fileInputRef.current?.click();
          }}
        >
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-primary mx-auto w-fit">
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Upload File</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Select an image from your device
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );

  const renderCameraCapture = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          Position Your {getDocumentTypeDisplay()}
          {getCurrentSideDisplay()}
        </h2>
        <p className="text-muted-foreground text-sm">
          {requiresBackSide() && state.currentSide === "back"
            ? "Position the back side of your ID card in the frame"
            : "Make sure your document is well-lit and all text is clearly visible"}
        </p>

        {requiresBackSide() && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <div
              className={`w-3 h-3 rounded-full ${
                state.documentImage ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-xs text-muted-foreground">Front</span>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div
              className={`w-3 h-3 rounded-full ${
                state.documentImageBack ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-xs text-muted-foreground">Back</span>
          </div>
        )}
      </div>

      <div className="relative mx-auto max-w-2xl">
        {!isCapturing && (
          <div className="w-full aspect-video rounded-lg border-2 border-dashed border-primary/50 bg-muted flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">
                Starting camera...
              </p>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full rounded-lg border-2 border-dashed border-primary/50",
            !isCapturing && "hidden"
          )}
        />

        {/* Document guide overlay - Dynamic proportions based on document type */}
        {isCapturing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-5/6 border-2 border-primary rounded-lg border-dashed opacity-70"
              style={{
                aspectRatio: getDocumentAspectRatio(),
                maxHeight: "60%",
              }}
            >
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-primary"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-primary"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary"></div>

              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">
                  Position document here
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Button
          onPress={capturePhoto}
          size="lg"
          disabled={!isCapturing}
          className="rounded-full w-16 h-16"
        >
          <Camera className="h-6 w-6" />
        </Button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const renderCapturedImage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          Review Your {getDocumentTypeDisplay()}
          {requiresBackSide() && !isCapturComplete()
            ? getCurrentSideDisplay()
            : ""}
        </h2>
        <p className="text-muted-foreground text-sm">
          {requiresBackSide() && !isCapturComplete()
            ? `${
                state.currentSide === "back" ? "Back side" : "Front side"
              } captured. Please verify it's clear and readable.`
            : "Please verify that your document is clear and readable"}
        </p>

        {requiresBackSide() && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <div
              className={`w-3 h-3 rounded-full ${
                state.documentImage ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-xs text-muted-foreground">Front</span>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div
              className={`w-3 h-3 rounded-full ${
                state.documentImageBack ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-xs text-muted-foreground">Back</span>
          </div>
        )}
      </div>

      {/* Show both sides for ID cards if both are captured */}
      {requiresBackSide() && isCapturComplete() ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-center">Front Side</h3>
              <div className="relative">
                <img
                  src={state.documentImage || ""}
                  alt="Front side"
                  className="w-full rounded-lg border object-cover"
                  style={{ aspectRatio: getDocumentAspectRatio() }}
                />
                <div className="absolute top-2 right-2">
                  <Badge className="text-xs bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Clear
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-center">Back Side</h3>
              <div className="relative">
                <img
                  src={state.documentImageBack || ""}
                  alt="Back side"
                  className="w-full rounded-lg border object-cover"
                  style={{ aspectRatio: getDocumentAspectRatio() }}
                />
                <div className="absolute top-2 right-2">
                  <Badge className="text-xs bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Clear
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative mx-auto max-w-md">
          <img
            src={capturedImage || ""}
            alt={`Captured document ${
              requiresBackSide() ? `(${state.currentSide} side)` : ""
            }`}
            className="w-full rounded-lg border object-cover"
            style={{ aspectRatio: getDocumentAspectRatio() }}
          />

          {/* Quality indicators */}
          <div className="absolute top-2 right-2 space-y-1">
            <Badge className="text-xs bg-green-100 text-green-800">
              <Check className="h-3 w-3 mr-1" />
              Clear
            </Badge>
          </div>

          {/* Side indicator for ID cards */}
          {requiresBackSide() && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs capitalize">
                {state.currentSide} Side
              </Badge>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center gap-3">
        <Button
          variant="bordered"
          onPress={retakePhoto}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Retake
        </Button>

        {requiresBackSide() &&
          state.currentSide === "back" &&
          !state.documentImageBack && (
            <Button
              variant="ghost"
              onPress={() => {
                // Skip back side and proceed with front only
                onNext();
              }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              Skip Back Side
            </Button>
          )}

        <Button onPress={handleNext} className="flex items-center gap-2">
          {requiresBackSide() && !isCapturComplete()
            ? "Continue"
            : "Looks Good"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  console.log("=== RENDER CONDITIONS ===");
  console.log("State:", {
    captureMode,
    isCapturing,
    capturedImage: !!capturedImage,
    currentSide: state.currentSide,
  });
  console.log("Conditions:", {
    showModeSelection:
      !captureMode || (captureMode === "upload" && !capturedImage),
    showCameraCapture: captureMode === "camera" && !capturedImage,
    showCapturedImage: !!capturedImage,
  });
  console.log("========================");

  return (
    <div className="w-full space-y-6">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Show mode selection when no mode chosen or upload mode without image */}
      {(!captureMode || (captureMode === "upload" && !capturedImage)) &&
        renderModeSelection()}

      {/* Show camera capture when camera mode is selected and no captured image */}
      {captureMode === "camera" && !capturedImage && renderCameraCapture()}

      {/* Show captured image review when we have an image */}
      {capturedImage && renderCapturedImage()}

      {!capturedImage && (
        <div className="flex justify-between pt-4">
          <Button
            variant="bordered"
            onPress={() => {
              stopCamera();
              onPrev();
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground flex items-center">
            Step 2 of 3
          </div>
        </div>
      )}

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Tips for Best Results
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Ensure good lighting</li>
          <li>• Hold the document flat</li>
          <li>• Include all edges of the document</li>
          <li>• Avoid shadows and glare</li>
          <li>• Make sure all text is readable</li>
        </ul>
      </div>
    </div>
  );
};
