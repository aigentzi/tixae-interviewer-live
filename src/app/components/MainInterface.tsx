"use client";

import { WelcomePanel } from "../components/WelcomePanel";
import { ChatPanel } from "../components/ChatPanel";
import { ControlPanel } from "../components/ControlPanel";
import { ToolNotification } from "../components/ToolNotification";
import MainNavbar from "@root/components/ui/MainNavbar";
import { InterviewSetupProvider } from "../providers/InterviewSetupProvider";
import { useInterviewSetup } from "../contexts/interview-setup.context";
import { useState } from "react";
import { api } from "@root/trpc/react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { useMediaQuery } from "usehooks-ts";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  Modal,
  useDisclosure,
} from "@heroui/react";
import { MessageCircle, X } from "lucide-react";

function MainInterfaceContent() {
  const {
    selectedJobProfile,
    selectedTemplate,
    jobProfileData,
    setJobProfileData,
  } = useInterviewSetup();

  const { activeWorkspace } = useActiveWorkspace();

  const [notification, setNotification] = useState<{
    type: "prompt_update" | "questions_update" | null;
    isVisible: boolean;
  }>({ type: null, isVisible: false });

  const isMobile = useMediaQuery("(max-width: 1024px)");

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  // TRPC mutations for database operations
  const updateJobProfileMutation = api.jobProfiles.update.useMutation({
    onSuccess: () => {
      console.log("Job profile updated in database successfully");
    },
    onError: (error) => {
      console.error("Failed to update job profile in database:", error);
    },
  });

  const updateQuestionsMutation = api.jobProfiles.updateQuestions.useMutation({
    onSuccess: () => {
      console.log("Questions updated in database successfully");
    },
    onError: (error) => {
      console.error("Failed to update questions in database:", error);
    },
  });

  // Create interview setup data for ChatPanel
  const interviewSetup = {
    jobProfile: selectedJobProfile || {
      name:
        jobProfileData.name || selectedTemplate?.name || "Software Engineer",
      description:
        jobProfileData.description || selectedTemplate?.description || "",
      generalPrompt:
        jobProfileData.generalPrompt || selectedTemplate?.generalPrompt || "",
    },
    currentContent:
      jobProfileData.generalPrompt || selectedTemplate?.generalPrompt || "",
    questions: [], // Questions can be added through the chat interface
  };

  const handleContentUpdate = async (content: string) => {
    console.log("🔄 AI Content Update Request:", {
      hasSelectedJobProfile: !!selectedJobProfile,
      jobProfileId: selectedJobProfile?.id,
      hasWorkspace: !!activeWorkspace?.id,
      workspaceId: activeWorkspace?.id,
      contentLength: content.length,
    });

    // Update local state
    setJobProfileData((prev) => ({
      ...prev,
      generalPrompt: content,
    }));

    // Persist to database if we have a job profile ID and workspace
    if (selectedJobProfile?.id && activeWorkspace?.id) {
      try {
        console.log("💾 Saving to database...");
        await updateJobProfileMutation.mutateAsync({
          workspaceId: activeWorkspace.id,
          jobProfileId: selectedJobProfile.id,
          data: {
            name: selectedJobProfile.name,
            description: selectedJobProfile.description,
            generalPrompt: content,
            levels: selectedJobProfile.levels || [],
          },
        });
        console.log("✅ Job profile updated in database successfully!");
      } catch (error) {
        console.error("❌ Failed to update job profile:", error);
      }
    } else {
      console.log("ℹ️ Cannot save to database:", {
        reason: !selectedJobProfile?.id
          ? "No job profile selected (working with template/custom data)"
          : "No workspace available",
        suggestion: "User needs to save/create the job profile first",
      });
    }

    // Show notification
    setNotification({ type: "prompt_update", isVisible: true });
  };

  const handleQuestionsUpdate = async (questions: string[]) => {
    console.log("🔄 AI Questions Update Request:", {
      questionsToAdd: questions,
      hasSelectedJobProfile: !!selectedJobProfile,
      jobProfileId: selectedJobProfile?.id,
      hasWorkspace: !!activeWorkspace?.id,
    });

    // Persist to database if we have a job profile ID and workspace
    if (selectedJobProfile?.id && activeWorkspace?.id) {
      try {
        console.log("💾 Adding questions to database...");
        await updateQuestionsMutation.mutateAsync({
          workspaceId: activeWorkspace.id,
          jobProfileId: selectedJobProfile.id,
          questions: questions,
        });
        console.log("✅ Questions added to database successfully!");
      } catch (error) {
        console.error("❌ Failed to add questions:", error);
      }
    } else {
      console.log("ℹ️ Cannot save questions to database:", {
        reason: !selectedJobProfile?.id
          ? "No job profile selected (working with template/custom data)"
          : "No workspace available",
        suggestion: "User needs to save/create the job profile first",
      });
    }

    // Show notification
    setNotification({ type: "questions_update", isVisible: true });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-default-400">
      {/* Navigation Bar */}
      <MainNavbar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row bg-gradient-to-b from-background to-background/95  min-h-0 overflow-hidden">
        {/* Left Panel - Main Content */}
        <div className="flex flex-col min-h-0 lg:w-2/3 flex-1 gap-4 overflow-hidden p-2">
          {/* Content Area - Takes remaining height */}
          <WelcomePanel />

          {/* Control Panel Area - Fixed height */}
          <ControlPanel />
        </div>

        {/* Right Panel - Chat Panel */}
        {isMobile ? (
          <>
            <Button
              onPress={onOpen}
              color="primary"
              radius="full"
              size="lg"
              isIconOnly
              className="fixed bottom-4 right-4 z-40"
            >
              <MessageCircle className="size-5" />
            </Button>
            <Drawer
              hideCloseButton
              isOpen={isOpen}
              size="full"
              onClose={onClose}
            >
              <DrawerContent className="bg-background/50 backdrop-blur-lg">
                {(onClose) => (
                  <>
                    <DrawerBody className="p-6 relative">
                      <ChatPanel
                        interviewSetup={interviewSetup}
                        onContentUpdate={handleContentUpdate}
                        onQuestionsUpdate={handleQuestionsUpdate}
                      />
                      <Button
                        onPress={onClose}
                        color="default"
                        radius="md"
                        size="sm"
                        isIconOnly
                        className="absolute top-9 right-9 z-40"
                      >
                        <X className="size-5" />
                      </Button>
                    </DrawerBody>
                  </>
                )}
              </DrawerContent>
            </Drawer>
          </>
        ) : (
          <div className="lg:flex lg:w-1/3 xl:max-w-[360px] overflow-hidden">
            <ChatPanel
              interviewSetup={interviewSetup}
              onContentUpdate={handleContentUpdate}
              onQuestionsUpdate={handleQuestionsUpdate}
            />
          </div>
        )}
      </div>

      {/* Tool Notifications */}
      <ToolNotification
        type={notification.type}
        isVisible={notification.isVisible}
        onHide={() => setNotification({ type: null, isVisible: false })}
      />
    </div>
  );
}

export function MainInterface() {
  return (
    <InterviewSetupProvider>
      <MainInterfaceContent />
    </InterviewSetupProvider>
  );
}
