import { CSSProperties, FC, useMemo } from "react";
import {
  CalendarRange,
  Camera,
  Check,
  FileText,
  Lock,
  User,
  Shield,
} from "lucide-react";
import { PreMeetingAuth } from "./pre-meeting-components/pre-meeting-auth";
import { PreMeetingKYC } from "./pre-meeting-components/pre-meeting-kyc";
import { AppEnhancedSteps } from "@root/app/components/AppSteps";
import { PreMeetingSchedule } from "./pre-meeting-components/pre-meeting-schedule";
import { PreMeetingTerms } from "./pre-meeting-components/pre-meeting-terms";
import { PreMeetingPayment } from "./pre-meeting-components/pre-meeting-payment";
import { PreMeetingCamera } from "./pre-meeting-components/pre-meeting-camera";
import { PreMeetingFinalize } from "./pre-meeting-components/pre-meeting-finalize";
import { useRoom } from "../hooks/room.hook";

export const PreMeeting: FC<{
  currentStep: number;
  setCurrentStep: (step: number) => void;
  setInterviewStarted: (started: boolean) => void;
  style?: CSSProperties;
}> = ({ currentStep, setCurrentStep, setInterviewStarted, style }) => {
  const { interview, error, setError, workspaceSettings, isRescheduling } =
    useRoom();
  const isPaidInterview = useMemo(
    () => (interview?.paid ? 1 : 0),
    [interview?.paid],
  );
  const isTermsAndConditionsEnabled = useMemo(() => {
    return workspaceSettings?.termsAndConditionsConfig
      ?.enableTermsAndConditions ||
      workspaceSettings?.helpAndSupportConfig?.enableShowHelpDuringInterview
      ? 1
      : 0;
  }, [workspaceSettings]);

  const isKYCEnabled = useMemo(() => {
    return interview?.enableVerification ?? false;
  }, [interview?.enableVerification]);

  const steps = useMemo(() => {
    const allSteps = [];
    let stepIndex = 1;

    // Calculate schedule step index for rescheduling logic
    const getScheduleStepIndex = () => {
      let stepIdx = 1; // Auth step
      if (isKYCEnabled) stepIdx++; // KYC step if enabled
      stepIdx++; // Schedule step
      return stepIdx;
    };

    // Step 1: Interviewee Authentication (always present)
    const authStep = {
      icon: <User size={24} />,
      onClick: () => setCurrentStep(1),
      component: null as any, // Will be set after we know all steps
      label: "Interviewee",
    };
    allSteps.push(authStep);

    // Step 2: KYC (conditional)
    if (isKYCEnabled) {
      stepIndex++;
      const kycStep = {
        icon: <Shield size={24} />,
        onClick: () => setCurrentStep(stepIndex),
        component: null as any,
        label: "Identity Verification",
      };
      allSteps.push(kycStep);
    }

    // Step: Schedule (always present)
    stepIndex++;
    const scheduleStep = {
      icon: <CalendarRange size={24} />,
      onClick: () => setCurrentStep(stepIndex),
      component: null as any,
      label: "Schedule",
    };
    allSteps.push(scheduleStep);

    // Step: Terms and Conditions (conditional)
    if (isTermsAndConditionsEnabled) {
      stepIndex++;
      const termsStepIndex = stepIndex;
      const termsStep = {
        icon: <FileText size={24} />,
        onClick: () => {
          // Block navigation to steps after schedule if rescheduling
          if (isRescheduling && termsStepIndex > getScheduleStepIndex()) {
            return;
          }
          setCurrentStep(termsStepIndex);
        },
        component: null as any,
        label: "Terms and Conditions",
      };
      allSteps.push(termsStep);
    }

    // Step: Payment (conditional)
    if (isPaidInterview) {
      stepIndex++;
      const paymentStepIndex = stepIndex;
      const paymentStep = {
        icon: <Lock size={24} />,
        onClick: () => {
          // Block navigation to steps after schedule if rescheduling
          if (isRescheduling && paymentStepIndex > getScheduleStepIndex()) {
            return;
          }
          setCurrentStep(paymentStepIndex);
        },
        component: null as any,
        label: "Payment",
      };
      allSteps.push(paymentStep);
    }

    // Step: Camera (always present)
    stepIndex++;
    const cameraStepIndex = stepIndex;
    const cameraStep = {
      icon: <Camera size={24} />,
      onClick: () => {
        // Block navigation to steps after schedule if rescheduling
        if (isRescheduling && cameraStepIndex > getScheduleStepIndex()) {
          return;
        }
        setCurrentStep(cameraStepIndex);
      },
      component: null as any,
      label: "Camera",
    };
    allSteps.push(cameraStep);

    // Step: Finalize (always present)
    stepIndex++;
    const finalizeStepIndex = stepIndex;
    const finalizeStep = {
      icon: <Check size={24} />,
      onClick: () => {
        // Block navigation to steps after schedule if rescheduling
        if (isRescheduling && finalizeStepIndex > getScheduleStepIndex()) {
          return;
        }
        setCurrentStep(finalizeStepIndex);
      },
      component: null as any,
      label: "Finalize",
    };
    allSteps.push(finalizeStep);

    // Now set the components with proper navigation
    const scheduleStepIndex = getScheduleStepIndex();

    // Create navigation helper that works with actual step numbers
    const createNavigation = (currentStepNumber: number) => {
      const nextStep =
        currentStepNumber < allSteps.length
          ? currentStepNumber + 1
          : currentStepNumber;
      const prevStep =
        currentStepNumber > 1 ? currentStepNumber - 1 : currentStepNumber;

      return {
        next: () => {
          // If we're rescheduling and trying to move past schedule step without completing it, block
          if (isRescheduling && currentStepNumber >= scheduleStepIndex) {
            return; // Block navigation
          }

          if (currentStepNumber < allSteps.length) {
            setCurrentStep(nextStep);
          }
        },
        prev: () => {
          if (currentStepNumber > 1) {
            setCurrentStep(prevStep);
          }
        },
      };
    };

    let currentStepNumber = 1;

    // Auth component (Step 1)
    const authNav = createNavigation(currentStepNumber);
    allSteps[currentStepNumber - 1].component = (
      <PreMeetingAuth next={authNav.next} />
    );
    currentStepNumber++;

    // KYC component (if enabled)
    if (isKYCEnabled) {
      const kycNav = createNavigation(currentStepNumber);
      allSteps[currentStepNumber - 1].component = (
        <PreMeetingKYC next={kycNav.next} prev={kycNav.prev} />
      );
      currentStepNumber++;
    }

    // Schedule component
    const scheduleNav = createNavigation(currentStepNumber);
    allSteps[currentStepNumber - 1].component = (
      <PreMeetingSchedule next={scheduleNav.next} prev={scheduleNav.prev} />
    );
    currentStepNumber++;

    // Terms component (if enabled)
    if (isTermsAndConditionsEnabled) {
      const termsNav = createNavigation(currentStepNumber);
      allSteps[currentStepNumber - 1].component = (
        <PreMeetingTerms next={termsNav.next} prev={termsNav.prev} />
      );
      currentStepNumber++;
    }

    // Payment component (if enabled)
    if (isPaidInterview) {
      const paymentNav = createNavigation(currentStepNumber);
      allSteps[currentStepNumber - 1].component = (
        <PreMeetingPayment next={paymentNav.next} prev={paymentNav.prev} />
      );
      currentStepNumber++;
    }

    // Camera component
    const cameraNav = createNavigation(currentStepNumber);
    allSteps[currentStepNumber - 1].component = (
      <PreMeetingCamera next={cameraNav.next} prev={cameraNav.prev} />
    );
    currentStepNumber++;

    // Finalize component (last step)
    const finalizeNav = createNavigation(currentStepNumber);
    allSteps[currentStepNumber - 1].component = (
      <PreMeetingFinalize
        next={() => setInterviewStarted(true)}
        prev={finalizeNav.prev}
      />
    );

    return allSteps;
  }, [
    interview,
    currentStep,
    setCurrentStep,
    isPaidInterview,
    setInterviewStarted,
    workspaceSettings,
    isTermsAndConditionsEnabled,
    isKYCEnabled,
    isRescheduling,
  ]);

  return (
    <div>
      <AppEnhancedSteps style={style} steps={steps} currentStep={currentStep} />
    </div>
  );
};
