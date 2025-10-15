import { useState, useEffect } from "react";
import { JobProfileTemplate } from "@root/lib/job-profile-templates.lib";
import { api } from "@root/trpc/react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import {
  ProgressIndicator,
  TemplateSelectionStep,
  BrandingStep,
  QuestionsStep,
  FinalStep,
  InterviewerSelectionStep,
  NavigationButtons,
  OnboardingCompletionScreen,
} from "./onboarding";

// Constants
const TOTAL_STEPS = 4;

interface InterviewsOnboardingProps {
  onCreateInterview: () => void;
}

export const InterviewsOnboarding = ({
  onCreateInterview,
}: InterviewsOnboardingProps) => {
  const { activeWorkspace } = useActiveWorkspace();

  // Helper function to get localStorage key for current workspace
  const getOnboardingStepKey = () =>
    activeWorkspace?.id
      ? `onboarding-step-${activeWorkspace.id}`
      : "onboarding-step-default";

  // Initialize currentStep from localStorage
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== "undefined" && activeWorkspace?.id) {
      const saved = localStorage.getItem(getOnboardingStepKey());
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const [selectedTemplate, setSelectedTemplate] =
    useState<JobProfileTemplate | null>(null);
  const [workspaceJobProfileId, setWorkspaceJobProfileId] = useState<
    string | null
  >(null);
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);

  // API mutations
  const cloneTemplateMutation = api.jobProfiles.cloneTemplate.useMutation({
    onSuccess: (data) => {
      setWorkspaceJobProfileId(data.id);
    },
    onError: (error) => {
      console.error("Failed to clone template:", error.message);
    },
  });

  const createJobProfileMutation = api.jobProfiles.create.useMutation({
    onSuccess: (data) => {
      console.log("createJobProfileMutation", data);
      setWorkspaceJobProfileId(data.id);
    },
    onError: (error) => {
      console.error("Failed to create job profile:", error.message);
    },
  });

  const updateWorkspaceSettingsMutation = api.workspace.update.useMutation({
    onSuccess: () => {
      // Clear onboarding step from localStorage on completion
      if (typeof window !== "undefined") {
        localStorage.removeItem(getOnboardingStepKey());
      }

      // Add a delay for the loading animation
      setTimeout(() => {
        // Refresh the page to go back to root with completed onboarding
        window.location.href = "/";
      }, 2000);
    },
    onError: (error) => {
      setIsCompletingOnboarding(false);
      console.error("Failed to save onboarding status:", error.message);
    },
  });

  // Effect to restore step when workspace changes
  useEffect(() => {
    if (typeof window !== "undefined" && activeWorkspace?.id) {
      const saved = localStorage.getItem(getOnboardingStepKey());
      if (saved) {
        const savedStep = parseInt(saved, 10);
        if (savedStep >= 0 && savedStep < TOTAL_STEPS) {
          setCurrentStep(savedStep);
        }
      }
    }
  }, [activeWorkspace?.id]);

  // Effect to persist step changes to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && activeWorkspace?.id) {
      localStorage.setItem(getOnboardingStepKey(), currentStep.toString());
    }
  }, [currentStep, activeWorkspace?.id]);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTemplateSelection = async (template: JobProfileTemplate) => {
    setSelectedTemplate(template);

    if (!activeWorkspace?.id) {
      console.error("No active workspace found");
      return;
    }

    console.log("handleTemplateSelection", template);

    // Check if this is a custom template (starts with "custom-")
    if (template.id.startsWith("custom-")) {
      // Create a new job profile for custom templates
      await createJobProfileMutation.mutateAsync({
        workspaceId: activeWorkspace.id,
        name: template.name,
        description: template.description,
        generalPrompt: template.generalPrompt,
      });
    } else {
      // Clone existing global template
      await cloneTemplateMutation.mutateAsync({
        workspaceId: activeWorkspace.id,
        templateId: template.id,
      });
    }

    handleNext();
  };

  const handleCreateInterview = async () => {
    if (!activeWorkspace?.id) {
      console.error("No active workspace found");
      return;
    }

    // Set loading state
    setIsCompletingOnboarding(true);

    // Mark onboarding as completed
    try {
      await updateWorkspaceSettingsMutation.mutateAsync({
        workspaceId: activeWorkspace.id,
        settings: {
          ...activeWorkspace.settings,
          onboardingCompleted: true,
        },
      });
    } catch (error) {
      console.error("Failed to update onboarding status:", error);
      setIsCompletingOnboarding(false);
    }
  };

  const isLoading =
    cloneTemplateMutation.isPending || createJobProfileMutation.isPending;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <TemplateSelectionStep
            onNext={handleTemplateSelection}
            isLoading={isLoading}
          />
        );
      case 1:
        return <BrandingStep onNext={handleNext} />;
      case 2:
        return (
          <FinalStep
            selectedTemplate={selectedTemplate}
            workspaceJobProfileId={workspaceJobProfileId}
            onCreateInterview={handleNext}
          />
        );
      case 3:
        return (
          <InterviewerSelectionStep
            onNext={handleCreateInterview}
            jobProfileId={workspaceJobProfileId || ""}
          />
        );
      default:
        return null;
    }
  };

  // Show completion loading screen
  if (isCompletingOnboarding) {
    return <OnboardingCompletionScreen />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/10 to-secondary/10 p-8">
      <div className="max-w-4xl mx-auto">
        <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        {renderStep()}
        <NavigationButtons
          currentStep={currentStep}
          onPrevious={handlePrevious}
        />
      </div>
    </div>
  );
};
