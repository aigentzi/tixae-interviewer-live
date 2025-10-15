import { useState, useMemo, useCallback, useEffect } from "react";
import { useRoom } from "./room.hook";
import { Interview } from "@root/shared/zod-schemas";
import { useGAuth } from "@root/app/hooks/guath.hook";

export const useRoomFlow = () => {
  const { gauthUser } = useGAuth();
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const {
    isOwner,
    workspaceSettings,
    interview,
    setError,
    rescheduleNeeded,
    resetSteps,
  } = useRoom();

  // Calculate the schedule step index based on interview configuration
  const getScheduleStepIndex = useCallback(() => {
    let stepIndex = 1; // Start with auth step

    // Step 2: KYC (if enabled)
    if (interview?.enableVerification) {
      stepIndex++;
    }

    // Schedule step comes after KYC (or after auth if no KYC)
    stepIndex++;
    return stepIndex;
  }, [interview?.enableVerification]);

  // Handle reschedule needed - jump directly to schedule step
  useEffect(() => {
    if (rescheduleNeeded) {
      const scheduleStep = getScheduleStepIndex();
      console.log(
        `Reschedule needed - jumping to schedule step ${scheduleStep}`,
      );
      resetSteps();
      setCurrentStep(scheduleStep);
    }
  }, [rescheduleNeeded, resetSteps, getScheduleStepIndex]);

  // Restore saved step from localStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined" && !rescheduleNeeded) {
      // Clear any legacy persisted value to avoid interference
      sessionStorage.removeItem("preMeetingCurrentStep");

      // Restore step for this specific interview
      if (interview?.id) {
        const savedStep = localStorage.getItem(
          `premeeting_step_${interview.id}`,
        );
        if (savedStep) {
          const stepNumber = parseInt(savedStep, 10);
          if (stepNumber > 0) {
            console.log(
              `Restored step ${stepNumber} for interview ${interview.id}`,
            );
            setCurrentStep(stepNumber);
          }
        }
      }
    }
  }, [interview?.id, rescheduleNeeded]);

  const showMeetingImmediately = useMemo(() => {
    return interviewStarted || isOwner;
  }, [interviewStarted, isOwner]);

  useEffect(() => {
    if (
      isOwner &&
      interview?.intervieweeEmail &&
      interview?.intervieweeEmail !== gauthUser?.email
    ) {
      console.log(isOwner, interview?.intervieweeEmail, gauthUser?.email);
      setError(
        `This interview is scheduled for ${interview?.intervieweeEmail} and you are logged in as ${gauthUser?.email}.`,
      );
    }
  }, [isOwner, interview, gauthUser]);

  const handleInterviewStart = useCallback(() => {
    setInterviewStarted(true);
  }, []);

  const goToNextStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const goToPreviousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  // Function to clear saved step for this interview
  const clearSavedStep = useCallback(() => {
    if (typeof window !== "undefined" && interview?.id) {
      localStorage.removeItem(`premeeting_step_${interview.id}`);
      console.log(`Cleared saved step for interview ${interview.id}`);
    }
  }, [interview?.id]);

  // Clear saved step when interview starts
  const handleInterviewStartWithCleanup = useCallback(() => {
    clearSavedStep();
    setInterviewStarted(true);
  }, [clearSavedStep]);

  // Wrapper for setCurrentStep that automatically saves to localStorage
  const setCurrentStepWithPersistence = useCallback(
    (step: number) => {
      setCurrentStep(step);
      if (typeof window !== "undefined" && interview?.id && step > 0) {
        localStorage.setItem(
          `premeeting_step_${interview.id}`,
          step.toString(),
        );
        console.log(`Saved step ${step} for interview ${interview.id}`);
      }
    },
    [interview?.id],
  );

  const primaryColor = useMemo(() => {
    return workspaceSettings?.brandingConfig?.themeColor?.primary;
  }, [workspaceSettings?.brandingConfig?.themeColor?.primary]);

  const customStyle = useMemo(
    () =>
      ({
        "--color-primary": primaryColor,
      }) as React.CSSProperties,
    [primaryColor],
  );

  return {
    interviewStarted,
    currentStep,
    showMeetingImmediately,
    customStyle,
    handleInterviewStart,
    goToNextStep,
    goToPreviousStep,
    setCurrentStep: setCurrentStepWithPersistence,
    setInterviewStarted,
    clearSavedStep,
    handleInterviewStartWithCleanup,
  };
};
