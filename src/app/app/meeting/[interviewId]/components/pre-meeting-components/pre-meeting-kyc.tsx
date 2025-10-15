import { FC, useState, useCallback, useEffect } from "react";
import { CardContent } from "@root/components/ui/card";
import { KYCState, KYCStepProps } from "@root/types/kyc";
import { KYCDocumentTypeStep } from "./kyc-components/kyc-document-type";
import { KYCCaptureStep } from "./kyc-components/kyc-capture";
import { KYCQRCodeStep } from "./kyc-components/kyc-qr-code";
import { KYCProcessingStep } from "./kyc-components/kyc-processing";
import { KYCResultsStep } from "./kyc-components/kyc-results";
import { isDesktopDevice } from "@root/lib/device-detection";

export const PreMeetingKYC: FC<{
  next: () => void;
  prev: () => void;
}> = ({ next, prev }) => {
  const [kycState, setKycState] = useState<KYCState>({
    step: "document_type",
    isProcessing: false,
    currentSide: "front", // Start with front side for ID cards
  });

  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    setIsDesktop(isDesktopDevice());
  }, []);

  const updateState = useCallback((updates: Partial<KYCState>) => {
    setKycState((current) => ({ ...current, ...updates }));
  }, []);

  const handleNext = useCallback(() => {
    switch (kycState.step) {
      case "document_type":
        updateState({ step: "capture" });
        break;
      case "capture":
        updateState({ step: "processing" });
        break;
      case "processing":
        updateState({ step: "results" });
        break;
      case "results":
        if (kycState.result?.success) {
          next(); // Proceed to next pre-meeting step
        }
        break;
    }
  }, [kycState.step, kycState.result, next, updateState]);

  const handlePrev = useCallback(() => {
    switch (kycState.step) {
      case "document_type":
        prev(); // Go back to previous pre-meeting step
        break;
      case "capture":
        updateState({ step: "document_type" });
        break;
      case "processing":
        updateState({ step: "capture" });
        break;
      case "results":
        if (kycState.result?.success) {
          next(); // If successful, don't go back
        } else {
          updateState({
            step: "document_type",
            documentImage: undefined,
            documentImageBack: undefined,
            currentSide: "front",
            error: undefined,
            result: undefined,
          });
        }
        break;
    }
  }, [kycState.step, kycState.result, prev, updateState]);

  const stepProps: KYCStepProps = {
    onNext: handleNext,
    onPrev: handlePrev,
    state: kycState,
    updateState,
  };

  const renderCurrentStep = () => {
    switch (kycState.step) {
      case "document_type":
        return <KYCDocumentTypeStep {...stepProps} />;
      case "capture":
        // Show QR code for desktop (unless user chooses desktop mode), direct capture for mobile
        return isDesktop && !kycState.forceDesktopCapture ? (
          <KYCQRCodeStep {...stepProps} />
        ) : (
          <KYCCaptureStep {...stepProps} />
        );
      case "processing":
        return <KYCProcessingStep {...stepProps} />;
      case "results":
        return <KYCResultsStep {...stepProps} />;
      default:
        return <KYCDocumentTypeStep {...stepProps} />;
    }
  };

  return (
    <CardContent className="flex flex-col gap-6 items-center w-full mx-auto">
      {renderCurrentStep()}
    </CardContent>
  );
};
