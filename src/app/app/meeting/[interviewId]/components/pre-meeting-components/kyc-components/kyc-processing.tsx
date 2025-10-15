import { FC, useEffect, useState, useRef } from "react";
import { Button } from "@root/components/ui/button";
import { Card, CardContent } from "@root/components/ui/card";
import { Progress } from "@heroui/react";
import {
  Shield,
  FileText,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { KYCStepProps, KYCVerificationResult } from "@root/types/kyc";
import InlineNotification from "@root/app/components/InlineNotification";
import axios from "axios";

const processingSteps = [
  {
    id: "document",
    label: "Analyzing Document",
    description: "Extracting and validating document information",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "authenticity",
    label: "Checking Authenticity",
    description: "Verifying document security features",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: "aml",
    label: "AML Screening",
    description: "Checking against global watchlists",
    icon: <CheckCircle className="h-5 w-5" />,
  },
];

export const KYCProcessingStep: FC<KYCStepProps> = ({
  onNext,
  onPrev,
  state,
  updateState,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  const processingRef = useRef(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  useEffect(() => {
    // Prevent multiple API calls using ref
    if (processingRef.current || state.result) {
      return;
    }
    const processKYC = async () => {
      if (!state.documentImage) {
        setNotification({ type: "error", message: "No document image found" });
        return;
      }

      processingRef.current = true;
      updateState({ isProcessing: true, error: undefined });

      try {
        // Simulate processing steps
        for (let i = 0; i < processingSteps.length; i++) {
          setCurrentStep(i);
          setProgress((i / processingSteps.length) * 80); // 80% for steps

          // Simulate processing time for each step
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        // Final processing
        setProgress(90);

        // Make API call to verify the document
        const requestData: any = {
          document: state.documentImage,
          documentType: state.documentType,
        };

        // Add back side if available (for ID cards)
        if (state.documentImageBack) {
          requestData.documentBack = state.documentImageBack;
        }

        const response = await axios.post<KYCVerificationResult>(
          "/api/kyc/scan",
          requestData
        );

        setProgress(100);
        setProcessingComplete(true);

        // Small delay to show 100% completion
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (response.data.success) {
          updateState({
            result: response.data,
            isProcessing: false,
            error: undefined,
          });
          setNotification({
            type: "success",
            message: "Identity verification completed successfully!",
          });
        } else {
          updateState({
            result: response.data,
            isProcessing: false,
            error: response.data.error || "Verification failed",
          });
          setNotification({
            type: "error",
            message: response.data.error || "Identity verification failed",
          });
        }

        // Proceed to results
        setTimeout(onNext, 1000);
      } catch (error) {
        console.error("KYC processing error:", error);
        const errorMessage =
          axios.isAxiosError(error) && error.response?.data?.error
            ? error.response.data.error
            : "Failed to process identity verification";

        updateState({
          isProcessing: false,
          error: errorMessage,
          result: { success: false, error: errorMessage },
        });
        setNotification({ type: "error", message: errorMessage });

        // Proceed to results to show error
        setTimeout(onNext, 1000);
      }
    };

    processKYC();
  }, []); // Empty dependency array - only run once when component mounts

  // Reset processing state when component unmounts or when starting fresh
  useEffect(() => {
    return () => {
      processingRef.current = false;
    };
  }, []);

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

  return (
    <div className="w-full space-y-6">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Verifying Your Identity</h2>
        <p className="text-muted-foreground text-sm">
          Please wait while we process your{" "}
          {getDocumentTypeDisplay().toLowerCase()} and verify your identity
        </p>
      </div>

      <Card className="border-1 border-primary-50">
        <CardContent className="p-6 space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress
              value={progress}
              color="primary"
              className="w-full"
              size="md"
            />
          </div>

          {/* Processing steps */}
          <div className="space-y-4">
            {processingSteps.map((step, index) => {
              const isActive = index === currentStep && !processingComplete;
              const isCompleted = index < currentStep || processingComplete;
              const isPending = index > currentStep && !processingComplete;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : isCompleted
                      ? "bg-green-50 border border-green-200"
                      : "bg-muted/50"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 ${
                      isActive
                        ? "text-primary"
                        : isCompleted
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {isActive && <Loader2 className="h-5 w-5 animate-spin" />}
                    {isCompleted && !isActive && (
                      <CheckCircle className="h-5 w-5" />
                    )}
                    {isPending && step.icon}
                  </div>

                  <div className="flex-1">
                    <div
                      className={`font-medium text-sm ${
                        isActive
                          ? "text-primary"
                          : isCompleted
                          ? "text-green-700"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  </div>

                  {isActive && (
                    <div className="text-xs text-primary font-medium">
                      Processing...
                    </div>
                  )}
                  {isCompleted && !isActive && (
                    <div className="text-xs text-green-600 font-medium">
                      Complete
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {processingComplete && (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-700">
                Verification Complete!
              </p>
              <p className="text-xs text-muted-foreground">
                Redirecting to results...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button
          variant="bordered"
          onPress={onPrev}
          disabled={state.isProcessing}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="text-sm text-muted-foreground flex items-center">
          Step 3 of 3
        </div>
      </div>
    </div>
  );
};
