"use client";

import { QrModal } from "@root/app/components/QrCodeModal";
import { useInterviewSetup } from "@root/app/contexts/interview-setup.context";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { Accordion, AccordionItem, Button, Textarea } from "@heroui/react";
import { InputTagsRef } from "@root/components/ui/input-tags";
import { JobProfileTemplate } from "@root/lib/job-profile-templates.lib";
import { getAppUrl, uploadImageToBunny } from "@root/shared/utils";
import { JobProfile, Level } from "@root/shared/zod-schemas";
import { api } from "@root/trpc/react";
import imageCompression from "browser-image-compression";
import { Briefcase, MessageSquare, Sparkles, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import InlineNotification from "@root/app/components/InlineNotification";
import InterviewConfiguration from "./InterviewConfiguration";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { useLocale } from "@root/app/providers/LocaleContext";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const STEPS = [
  {
    id: 1,
    title: "Create Job Profile",
    description: "Define the position you'll be interviewing for",
    icon: Briefcase,
  },
  {
    id: 2,
    title: "Setup Interview",
    description: "Configure your first interview session",
    icon: MessageSquare,
  },
  {
    id: 3,
    title: "Ready to Interview",
    description: "Everything is set up and ready to go!",
    icon: Sparkles,
  },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
}) => {
  const t = useTranslations("mainPage");
  const { locale } = useLocale();

  const [isQrCode, setIsQrCode] = useState(false);
  const [jobProfileData, setJobProfileData] = useState<Partial<JobProfile>>({
    name: "",
    description: "",
    generalPrompt: "",
    startingMessage: "",
    workspaceId: "",
  });
  const [interviewData, setInterviewData] = useState({
    jobProfileId: "",
    level: undefined as Level | undefined,
    duration: 10,
    intervieweeEmails: [] as string[],
    paid: false,
    enableVerification: false,
    analysisPrompt: "",
    price: 0,
    enableLevels: false,
    enableSchedule: false,
    startTime: undefined as Date | undefined,
    endTime: undefined as Date | undefined,
    introVideoUrl: undefined as string | undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [createdJobProfile, setCreatedJobProfile] = useState<JobProfile | null>(
    null,
  );
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(
    new Set([]),
  );
  const [createdInterview, setCreatedInterview] = useState<any>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const [selectedTemplate, setSelectedTemplate] =
    useState<JobProfileTemplate | null>(null);
  const [selectedExistingProfile, setSelectedExistingProfile] =
    useState<JobProfile | null>(null);
  const [originalPrompt, setOriginalPrompt] = useState<string>("");
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
  const [showQrCodeLogo, setShowQrCodeLogo] = useState(true);

  const emailInputRef = useRef<InputTagsRef>(null);
  const emailsForCreationRef = useRef<string[]>([]);

  const { activeWorkspace } = useActiveWorkspace();
  const router = useRouter();
  const utils = api.useUtils();

  // Get shared state from context
  const {
    selectedJobProfile: contextJobProfile,
    selectedTemplate: contextTemplate,
    jobProfileData: contextJobProfileData,
  } = useInterviewSetup();

  // Set workspace ID when available
  useEffect(() => {
    if (activeWorkspace?.id) {
      setJobProfileData((prev) => ({
        ...prev,
        workspaceId: activeWorkspace.id,
      }));
    }
  }, [activeWorkspace]);

  // Sync with context data from ControlPanel
  useEffect(() => {
    if (contextJobProfile) {
      setSelectedExistingProfile(contextJobProfile);
      setSelectedTemplate(null);
      setJobProfileData((prev) => ({
        ...prev,
        name: contextJobProfile.name,
        description: contextJobProfile.description || "",
        generalPrompt: contextJobProfile.generalPrompt || "",
        startingMessage: contextJobProfile.startingMessage || "",
      }));
      // Store original prompt for comparison
      setOriginalPrompt(contextJobProfile.generalPrompt || "");
      // Set the jobProfileId for interview creation
      setInterviewData((prev) => ({
        ...prev,
        jobProfileId: contextJobProfile.id,
      }));
    } else if (contextTemplate) {
      setSelectedTemplate(contextTemplate);
      setSelectedExistingProfile(null);
      setJobProfileData((prev) => ({
        ...prev,
        name: contextTemplate.name,
        description: contextTemplate.description,
        generalPrompt: contextTemplate.generalPrompt,
        startingMessage: contextTemplate.startingMessage,
      }));
      // Store original prompt for comparison
      setOriginalPrompt(contextTemplate.generalPrompt);
      // Clear jobProfileId since this is a template, not a saved profile
      setInterviewData((prev) => ({
        ...prev,
        jobProfileId: "",
      }));
    } else if (
      contextJobProfileData.name ||
      contextJobProfileData.generalPrompt
    ) {
      setJobProfileData((prev) => ({
        ...prev,
        name: contextJobProfileData.name,
        description: contextJobProfileData.description,
        generalPrompt: contextJobProfileData.generalPrompt,
        startingMessage: contextJobProfileData.startingMessage,
      }));
      // Store original prompt for comparison
      setOriginalPrompt(contextJobProfileData.generalPrompt || "");
      // Clear jobProfileId since this is custom data, not a saved profile
      setInterviewData((prev) => ({
        ...prev,
        jobProfileId: "",
      }));
    }
  }, [contextJobProfile, contextTemplate, contextJobProfileData]);

  // Additional sync for generalPrompt changes from ControlPanel
  useEffect(() => {
    if (contextJobProfileData.generalPrompt !== jobProfileData.generalPrompt) {
      setJobProfileData((prev) => ({
        ...prev,
        generalPrompt: contextJobProfileData.generalPrompt,
      }));
    }
  }, [contextJobProfileData.generalPrompt]);

  const createJobProfileMutation = api.jobProfiles.create.useMutation({
    onSuccess: async (data) => {
      setNotification({
        type: "success",
        message: "Job profile created successfully!",
      });

      // Invalidate job profiles cache to refresh with default questions
      await utils.jobProfiles.getAll.invalidate();

      // Fetch the created profile with enhanced prompt
      try {
        const createdProfile = await utils.jobProfiles.getById.fetch({
          jobProfileId: data.id,
        });
        setCreatedJobProfile(createdProfile);
      } catch (error) {
        console.warn("Failed to fetch created profile, using fallback");
        setCreatedJobProfile({ ...jobProfileData, id: data.id } as JobProfile);
      }

      // Update interview data with new job profile ID
      const newJobProfileId = data.id;
      setInterviewData((prev) => ({ ...prev, jobProfileId: newJobProfileId }));

      // Now create the interview
      createInterviewMutation.mutate({
        workspaceId: activeWorkspace?.id!,
        jobProfileId: newJobProfileId,
        duration: interviewData.duration,
        intervieweeEmails: emailsForCreationRef.current,
        paid: interviewData.paid,
        price: interviewData.price,
        enableSchedule: interviewData.enableSchedule,
        startTime: interviewData.startTime,
        endTime: interviewData.endTime,
        language: locale, // Pass user's selected language
        ...(interviewData.level && { level: interviewData.level }),
      });
    },
    onError: (error) => {
      setNotification({ type: "error", message: error.message });
      setIsLoading(false);
    },
  });

  const createInterviewMutation = api.interviews.create.useMutation({
    onSuccess: (data) => {
      setCreatedInterview(data.interviews?.[0]);
      setIsLoading(false);
      // Clear interviewee emails after successful creation
      setInterviewData((prev) => ({
        ...prev,
        intervieweeEmails: [],
      }));
    },
    onError: (error) => {
      setNotification({ type: "error", message: error.message });
      setIsLoading(false);
    },
  });

  const updateJobProfileMutation = api.jobProfiles.update.useMutation({
    onSuccess: () => {
      // Update original prompt to current prompt so Save button disappears
      setOriginalPrompt(jobProfileData.generalPrompt || "");
      // Invalidate job profiles to refresh the list and update timestamps
      utils.jobProfiles.getAll.invalidate();
      setNotification({
        type: "success",
        message: "Job profile saved successfully!",
      });
    },
    onError: (error) => {
      setNotification({
        type: "error",
        message: "Failed to save job profile: " + error.message,
      });
    },
  });

  const createQrCodeInterviewMutation = api.qrInterviews.create.useMutation({
    onError: (error) => {
      setNotification({
        type: "error",
        message: "Failed to create interview: " + error.message,
      });
    },
  });

  const updateQrCodeInterviewMutation = api.qrInterviews.update.useMutation({
    onSuccess: () => {
      setNotification({
        type: "success",
        message: "Interview updated successfully!",
      });
    },
    onError: (error) => {
      setNotification({
        type: "error",
        message: "Failed to update interview: " + error.message,
      });
    },
  });

  const handleInterviewSubmit = async (): Promise<void> => {
    // Basic validation
    if (!jobProfileData.name) {
      setNotification({
        type: "error",
        message: "Please select or create a job profile",
      });
      throw new Error("Please select or create a job profile");
    }

    if (!jobProfileData.generalPrompt?.trim()) {
      setNotification({
        type: "error",
        message: "Interview prompt cannot be empty",
      });
      throw new Error("Interview prompt cannot be empty");
    }

    await continueWithValidation();

    return;
  };

  const continueWithValidation = async (): Promise<void> => {
    // Check for pending email and add it if exists
    let isValidStartTime = interviewData.enableSchedule;
    let emailsToValidate = [...interviewData.intervieweeEmails];
    if (emailInputRef.current) {
      const pendingEmail = emailInputRef.current.getPendingValue();
      if (pendingEmail.trim()) {
        emailInputRef.current.addPendingValue();
        emailsToValidate.push(pendingEmail.trim());
      }
    }

    if (emailsToValidate.length === 0) {
      setNotification({
        type: "error",
        message: "Please add at least one interviewee email",
      });
      throw new Error("Please add at least one interviewee email");
    }

    if (!interviewData.duration || interviewData.duration <= 0) {
      setNotification({
        type: "error",
        message: "Please set a valid interview duration",
      });
      throw new Error("Please set a valid interview duration");
    }

    if (interviewData.enableSchedule) {
      if (!interviewData.startTime) {
        setNotification({
          type: "error",
          message: "Please set a start time for the scheduled interview",
        });
        throw new Error("Please set a start time for the scheduled interview");
      }

      if (new Date(interviewData.startTime) <= new Date()) {
        isValidStartTime = false;
      }
    }

    // Store emails for creation (used by both paths)
    emailsForCreationRef.current = emailsToValidate;

    setIsLoading(true);

    // If we have a jobProfileId, use it directly
    if (interviewData.jobProfileId) {
      await createInterviewMutation.mutateAsync({
        workspaceId: activeWorkspace?.id!,
        jobProfileId: interviewData.jobProfileId,
        duration: interviewData.duration,
        intervieweeEmails: emailsToValidate,
        paid: interviewData.paid,
        price: interviewData.price,
        enableSchedule: isValidStartTime ? interviewData.enableSchedule : false,
        startTime: isValidStartTime ? interviewData.startTime : undefined,
        endTime: isValidStartTime ? interviewData.endTime : undefined,
        enableVerification: interviewData.enableVerification,
        analysisPrompt: interviewData.analysisPrompt,
        introVideoUrl: interviewData.introVideoUrl,
        language: locale, // Pass user's selected language
        ...(interviewData.level && { level: interviewData.level }),
      });
    } else {
      // Need to create job profile first, then create interview
      await createJobProfileMutation.mutateAsync({
        workspaceId: jobProfileData.workspaceId!,
        name: jobProfileData.name || "",
        description: jobProfileData.description || "",
        generalPrompt: jobProfileData.generalPrompt || "",
        startingMessage: jobProfileData.startingMessage || "",
      });
    }
  };

  const handleSaveJobProfile = () => {
    // Determine which job profile to update
    const profileToUpdate = selectedExistingProfile || contextJobProfile;

    if (!profileToUpdate?.id) {
      setNotification({
        type: "error",
        message: "No job profile selected to save",
      });
      return;
    }

    if (!jobProfileData.generalPrompt?.trim()) {
      setNotification({
        type: "error",
        message: "Please provide an interview prompt before saving",
      });
      return;
    }

    updateJobProfileMutation.mutate({
      workspaceId: activeWorkspace?.id!,
      jobProfileId: profileToUpdate.id,
      data: {
        name: jobProfileData.name || profileToUpdate.name,
        description:
          jobProfileData.description || profileToUpdate.description || "",
        generalPrompt: jobProfileData.generalPrompt,
        startingMessage: jobProfileData.startingMessage,
      },
    });
  };

  const handleCancelPromptChanges = () => {
    // Revert the prompt back to the original
    setJobProfileData((prev) => ({
      ...prev,
      generalPrompt: originalPrompt,
    }));
  };

  const onGeneratingQrCode = async () => {
    if (!jobProfileData.name) {
      throw new Error("Please select or create a job profile");
      return;
    }

    if (!jobProfileData.generalPrompt?.trim()) {
      throw new Error("Please provide an interview prompt");
      return;
    }

    //  Basic validation for the interview
    if (!interviewData.duration || interviewData.duration <= 0) {
      throw new Error("Please set a valid interview duration");
      return;
    }

    if (interviewData.enableSchedule) {
      if (!interviewData.startTime) {
        throw new Error("Please set a start time for the scheduled interview");
        return;
      }

      if (new Date(interviewData.startTime) < new Date()) {
        throw new Error("Interview start time cannot be in the past");
        return;
      }
    }

    if (interviewData.jobProfileId) {
      const data = await createQrCodeInterviewMutation.mutateAsync({
        workspaceId: activeWorkspace?.id!,
        jobProfileId: interviewData.jobProfileId,
        interviewData: {
          jobProfileId: interviewData.jobProfileId,
          level: interviewData.level,
          startTime: interviewData.startTime,
          endTime: interviewData.endTime,
          duration: interviewData.duration,
          paid: interviewData.paid,
          price: interviewData.price,
          enableVerification: interviewData.enableVerification,
          analysisPrompt: interviewData.analysisPrompt,
        },
      });
      setCreatedInterview(data.id);
    } else {
      // Need to create job profile first, then create interview
      createJobProfileMutation.mutate({
        workspaceId: jobProfileData.workspaceId!,
        name: jobProfileData.name || "",
        description: jobProfileData.description || "",
        generalPrompt: jobProfileData.generalPrompt || "",
        startingMessage: jobProfileData.startingMessage || "",
      });
    }
  };

  const handleQrCodeInterviewSubmit = async () => {
    try {
      await onGeneratingQrCode();
    } catch (error) {
      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong please try again",
      });
      return;
    }

    // TODO: Add interview with qr code to firebase qr-interviews collection
    setIsQrCodeModalOpen(true);
  };

  // Check if the prompt has changed from the original
  const hasPromptChanged = useMemo(
    () => jobProfileData.generalPrompt !== originalPrompt,
    [jobProfileData.generalPrompt, originalPrompt],
  );

  return (
    <div className="h-full bg-content1 flex flex-col overflow-hidden py-4">
      {notification && (
        <div className="px-4">
          <InlineNotification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
      {/* Textarea Section */}
      <div className="flex-1 px-4 min-h-0">
        <Textarea
          id="generalPrompt"
          placeholder={t(
            "interviewPromptPlaceholder",
            "Enter interview guidelines and prompts for this role...",
          )}
          value={jobProfileData.generalPrompt}
          onChange={(e) =>
            setJobProfileData((prev) => ({
              ...prev,
              generalPrompt: e.target.value,
            }))
          }
          variant="bordered"
          color="primary"
          classNames={{
            inputWrapper: "h-full! overflow-hidden border-content2/20 ",
            input: "scrollbar-thin min-h-full! ",
          }}
          className="w-full h-full "
        />
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 flex flex-col lg:flex-row justify-between gap-2 mt-2 px-4 bg-content1">
        {/* Save and Cancel buttons - only show when there's a profile to save AND prompt has changed */}
        {(selectedExistingProfile || contextJobProfile) && hasPromptChanged ? (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onPress={handleCancelPromptChanges}
              startContent={<Undo2 className="w-4 h-4" />}
              isDisabled={updateJobProfileMutation.isPending}
              className="w-full lg:w-fit hover:scale-105 transition-all duration-200"
            >
              {t("discardChanges", "Discard Changes")}
            </Button>
            <Button
              color="primary"
              size="sm"
              onPress={handleSaveJobProfile}
              isLoading={updateJobProfileMutation.isPending}
              isDisabled={updateJobProfileMutation.isPending}
              className="w-full lg:w-fit hover:scale-105 transition-all duration-200"
            >
              {t("save", "Save")}
            </Button>
          </div>
        ) : (
          <div></div>
        )}

        <div className="flex gap-2">
          <div className="w-full lg:w-fit">
            <InterviewConfiguration
              jobProfileData={jobProfileData}
              setJobProfileData={setJobProfileData}
              interviewData={interviewData}
              setInterviewData={setInterviewData}
              showQrCodeLogo={showQrCodeLogo}
              setShowQrCodeLogo={setShowQrCodeLogo}
              handleInterviewSubmit={handleInterviewSubmit}
              isLoading={isLoading}
            />
          </div>
          <Button
            onPress={() => {
              handleQrCodeInterviewSubmit();
            }}
            isDisabled={createQrCodeInterviewMutation.isPending}
            isLoading={createQrCodeInterviewMutation.isPending}
            color="primary"
            size="sm"
            className="w-full lg:w-fit hover:scale-105 transition-all duration-200"
          >
            {createQrCodeInterviewMutation.isPending ? (
              <>{t("generatingQrCode", "Generating QR Code...")}</>
            ) : (
              <>{t("generateQrCode", "Generate QR Code")}</>
            )}
          </Button>
        </div>
      </div>

      {/* QR Code Modal */}
      {createdInterview && (
        <QrModal
          isOpen={isQrCodeModalOpen}
          setIsOpen={setIsQrCodeModalOpen}
          value={
            getAppUrl() +
            "/interviews/new?profile=" +
            interviewData.jobProfileId +
            "&qrInterview=" +
            createdInterview
          }
          showLogo={showQrCodeLogo}
          onSuccess={async (imageDataUrl) => {
            try {
              // Create a file from the image data url
              const file = await imageCompression.getFilefromDataUrl(
                imageDataUrl,
                createdInterview + "-qr-code.png",
              );
              // Upload the image to BunnyCDN
              const result = await uploadImageToBunny({
                file,
                params: { folder: "qr-codes" },
                compressionOptions: {
                  maxSizeMB: 1,
                },
              });

              if (createdInterview) {
                updateQrCodeInterviewMutation.mutate({
                  id: createdInterview,
                  qrCode: result || "",
                });
              }
            } catch (error) {
              setNotification({
                type: "error",
                message: "Failed to upload QR code: " + String(error),
              });
            }
          }}
          logoSrc={activeWorkspace?.settings?.brandingConfig?.logo || undefined}
        />
      )}
    </div>
  );
};
