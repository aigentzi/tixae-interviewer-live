"use client";

import { useState } from "react";
import { OnboardingFlow } from "../app/components/OnboardingFlow";
import { ContentHeader } from "../components/ContentHeader";
import { useInterviewSetup } from "../contexts/interview-setup.context";
import { useTranslations } from "@root/app/providers/TranslationContext";
import ErrorNotification from "./ErrorNotification";

export function WelcomePanel() {
  const {
    undo,
    undoHistory,
    selectedJobProfile,
    selectedTemplate,
    jobProfileData,
  } = useInterviewSetup();
  const t = useTranslations("mainPage");
  const [error, setError] = useState<string | null>(null);

  const handleOnboardingComplete = () => {
    // Handle onboarding completion
    console.log("Onboarding completed");
  };

  const handleUndo = () => {
    const success = undo();
    if (!success) {
      setError("Nothing to undo");
    }
  };

  // Determine the title to display based on available job profile information
  const getHeaderTitle = () => {
    if (selectedJobProfile?.name) {
      return selectedJobProfile.name;
    }
    if (selectedTemplate?.name) {
      return selectedTemplate.name;
    }
    if (jobProfileData?.name) {
      return jobProfileData.name;
    }
    return t("interviewSetup", "Interview Setup");
  };

  return (
    <div className="flex-1 rounded-2xl bg-content1 border border-default-100 shadow-lg overflow-hidden flex flex-col min-h-0">
      <ContentHeader
        title={getHeaderTitle()}
        onUndo={handleUndo}
        showUndoButton={undoHistory.length > 0}
      />
      {error && (
        <div className="p-4">
          <ErrorNotification
            message={error}
            onClose={() => setError(null)}
          />
        </div>
      )}
      <div className="flex-1 overflow-hidden min-h-0">
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </div>
    </div>
  );
}
