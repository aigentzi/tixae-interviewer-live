"use client";

import {
  Autocomplete,
  AutocompleteItem,
  AutocompleteSection,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import { useInterviewSetup } from "@root/app/contexts/interview-setup.context";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { Label } from "@root/components/ui/label";
import {
  getTemplateById,
  JOB_PROFILE_TEMPLATES,
  JobProfileTemplate,
  useJobProfileTemplates,
} from "@root/lib/job-profile-templates.lib";
import { JobProfile } from "@root/shared/zod-schemas";
import { api } from "@root/trpc/react";
import { CheckCircle, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import InlineNotification from "@root/app/components/InlineNotification";
import { ExpandWithAIButton } from "./ExpandWithAIButton";

export function ControlPanel() {
  const t = useTranslations("mainPage");
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newStartingMessage, setNewStartingMessage] = useState(
    "Hello, welcome to your interview, who am I speaking with today?"
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);
  const { activeWorkspace } = useActiveWorkspace();
  const {
    selectedJobProfile,
    selectedTemplate,
    setSelectedJobProfile,
    setSelectedTemplate,
    jobProfileData,
    setJobProfileData,
  } = useInterviewSetup();

  const { translateJobProfile } = useJobProfileTemplates();

  const utils = api.useUtils();

  // Fetch existing job profiles
  const { data: existingJobProfiles } = api.jobProfiles.getAll.useQuery(
    {
      workspaceId: activeWorkspace?.id || "",
    },
    {
      enabled: !!activeWorkspace?.id,
    }
  );

  // Auto-select the most recently updated profile
  useEffect(() => {
    if (
      existingJobProfiles?.jobProfiles &&
      existingJobProfiles.jobProfiles.length > 0 &&
      !selectedJobProfile &&
      !selectedTemplate &&
      !jobProfileData.name
    ) {
      // Sort profiles by updatedAt (most recent first) or createdAt if updatedAt doesn't exist
      const sortedProfiles = [...existingJobProfiles.jobProfiles].sort(
        (a, b) => {
          const aDate = new Date(
            (a as any).updatedAt || (a as any).createdAt || 0
          );
          const bDate = new Date(
            (b as any).updatedAt || (b as any).createdAt || 0
          );
          return bDate.getTime() - aDate.getTime();
        }
      );

      const mostRecentProfile = sortedProfiles[0];
      if (mostRecentProfile) {
        handleExistingJobProfileSelect(mostRecentProfile);
      }
    }
  }, [
    existingJobProfiles,
    selectedJobProfile,
    selectedTemplate,
    jobProfileData.name,
  ]);

  const handleTemplateSelect = (template: JobProfileTemplate) => {
    setSelectedTemplate(template);
    setSelectedJobProfile(null);
    setJobProfileData({
      name: template.name,
      description: template.description,
      generalPrompt: template.generalPrompt,
      startingMessage: template.startingMessage,
    });
  };

  const handleExistingJobProfileSelect = (jobProfile: JobProfile) => {
    setSelectedTemplate(null);
    setSelectedJobProfile(jobProfile);
    setJobProfileData({
      name: jobProfile.name,
      description: jobProfile.description || "",
      generalPrompt: jobProfile.generalPrompt || "",
      startingMessage: jobProfile.startingMessage || "",
    });
  };

  const createJobProfileMutation = api.jobProfiles.create.useMutation({
    onSuccess: async (data) => {
      // Invalidate and refetch job profiles to get the updated data with default questions
      await utils.jobProfiles.getAll.invalidate();

      // Fetch the newly created profile with its enhanced prompt
      try {
        const createdProfile = await utils.jobProfiles.getById.fetch({
          jobProfileId: data.id,
        });

        if (
          createdProfile &&
          createdProfile.workspaceId === activeWorkspace?.id
        ) {
          setSelectedTemplate(null);
          setSelectedJobProfile(createdProfile);
          setJobProfileData({
            name: createdProfile.name,
            description: createdProfile.description || "",
            generalPrompt: createdProfile.generalPrompt || "",
            startingMessage: createdProfile.startingMessage || "",
          });
        } else {
          throw new Error("Profile not found or doesn't belong to workspace");
        }
      } catch (error) {
        console.warn("Failed to fetch created profile, using fallback:", error);

        // Fallback: Trigger refetch of all profiles to update the UI
        const profiles = await utils.jobProfiles.getAll.fetch({
          workspaceId: activeWorkspace?.id || "",
        });

        const createdProfile = profiles.jobProfiles.find(
          (p) => p.id === data.id
        );
        if (createdProfile) {
          setSelectedTemplate(null);
          setSelectedJobProfile(createdProfile);
          setJobProfileData({
            name: createdProfile.name,
            description: createdProfile.description || "",
            generalPrompt: createdProfile.generalPrompt || "",
            startingMessage: createdProfile.startingMessage || "",
          });
        }
      }

      setNewJobTitle("");
      setNewStartingMessage("");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    },
    onError: (error) => {
      console.error("Error creating job profile:", error);
      setNotification({
        type: "error",
        message: "Failed to create job profile",
      });
    },
  });

  const handleNewProfileSubmit = () => {
    if (!newJobTitle.trim() || !activeWorkspace?.id) return;

    createJobProfileMutation.mutate({
      workspaceId: activeWorkspace.id,
      name: newJobTitle.trim(),
      description: "",
      generalPrompt: "",
      startingMessage: newStartingMessage.trim() || "",
    });
  };

  const handlePromptUpdate = (updatedPrompt: string) => {
    setJobProfileData((prev) => ({
      ...prev,
      generalPrompt: updatedPrompt,
    }));
  };

  return (
    <div className="w-full ">
      <div className="bg-content1 rounded-2xl shadow-lg border border-default-100">
        <div className="p-4">
          <div className="space-y-4">
            {notification && (
              <InlineNotification
                type={notification.type}
                message={notification.message}
                onClose={() => setNotification(null)}
              />
            )}
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <Label htmlFor="jobSelector" className="text-sm font-medium">
                  {t("selectJobProfile", "Select job profile")}
                </Label>
              </div>
              <div className="flex flex-col lg:flex-row justify-between items-start gap-2">
                <div className="w-full flex gap-2 items-center">
                  <div className="w-full lg:w-fit">
                    {/* Fixed width */}
                    <Autocomplete
                      isClearable={false}
                      selectedKey={
                        selectedTemplate?.id ||
                        (selectedJobProfile
                          ? `existing_${selectedJobProfile.id}`
                          : jobProfileData.name
                          ? "custom"
                          : "")
                      }
                      onSelectionChange={(value) => {
                        if (value === "custom") {
                          // Custom profile is already selected, no action needed
                          return;
                        } else if (
                          value &&
                          value.toString().startsWith("existing_")
                        ) {
                          // Handle existing job profile selection
                          const jobProfileId = value
                            .toString()
                            .replace("existing_", "");
                          const jobProfile =
                            existingJobProfiles?.jobProfiles.find(
                              (jp) => jp.id === jobProfileId
                            );
                          if (jobProfile) {
                            handleExistingJobProfileSelect(jobProfile);
                          }
                        } else if (value) {
                          // Handle template selection
                          const template = getTemplateById(value.toString());
                          if (template) {
                            handleTemplateSelect(template);
                          }
                        }
                      }}
                      placeholder={t(
                        "chooseFromExisting",
                        "Choose from existing profiles, templates, or create custom"
                      )}
                      className="max-lg:w-full hover:scale-105 transition-all duration-200"
                      size="sm"
                      variant="bordered"
                      inputProps={{
                        classNames: {
                          inputWrapper: "border-default-100",
                        },
                      }}
                    >
                      {(() => {
                        const items = [];

                        // Custom Profile
                        if (
                          jobProfileData.name &&
                          !selectedTemplate &&
                          !selectedJobProfile
                        ) {
                          items.push(
                            <AutocompleteItem key="custom">
                              {jobProfileData.name}
                            </AutocompleteItem>
                          );
                        }

                        // Existing Job Profiles
                        if (
                          existingJobProfiles?.jobProfiles &&
                          existingJobProfiles.jobProfiles.length > 0
                        ) {
                          items.push(
                            <AutocompleteSection
                              key="your-job-profiles"
                              title={t("yourJobProfiles", "Your Job Profiles")}
                            >
                              {existingJobProfiles.jobProfiles.map(
                                (jobProfile) => {
                                  const translatedProfile =
                                    translateJobProfile(jobProfile);
                                  return (
                                    <AutocompleteItem
                                      key={`existing_${jobProfile.id}`}
                                      className="focus:bg-content2 focus:text-foreground data-[hover=true]:bg-content2 data-[hover=true]:text-foreground"
                                    >
                                      {translatedProfile.name}
                                    </AutocompleteItem>
                                  );
                                }
                              )}
                            </AutocompleteSection>
                          );
                        }

                        // Templates Section
                        items.push(
                          <AutocompleteSection
                            key="templates"
                            title={t("templates", "Templates")}
                          >
                            {JOB_PROFILE_TEMPLATES.map((template) => (
                              <AutocompleteItem
                                key={template.id}
                                className="focus:bg-content2 focus:text-foreground data-[hover=true]:bg-content2 data-[hover=true]:text-foreground"
                              >
                                {template.name}
                              </AutocompleteItem>
                            ))}
                          </AutocompleteSection>
                        );

                        return items;
                      })()}
                    </Autocomplete>
                  </div>

                  <Button
                    variant="bordered"
                    size="sm"
                    onPress={onOpen}
                    startContent={<PlusIcon className="w-4 h-4" />}
                    className="min-w-40 hover:scale-105 transition-all duration-200 border-default-100"
                  >
                    {t("newJobProfile", "New job profile ")}
                  </Button>
                  <Modal size="lg" isOpen={isOpen} onOpenChange={onOpenChange}>
                    <ModalContent>
                      {(onClose) => (
                        <>
                          <ModalHeader className="flex flex-col gap-1">
                            {t("newJobProfile", "New Job Profile")}
                          </ModalHeader>
                          <ModalBody>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label isRequired htmlFor="jobTitle">
                                  {t("jobTitle", "Job Title")}
                                </Label>
                                <Input
                                  id="jobTitle"
                                  variant="bordered"
                                  color="primary"
                                  placeholder={t(
                                    "jobTitlePlaceholder",
                                    "e.g. Software Engineer, Data Scientist, Product Manager"
                                  )}
                                  value={newJobTitle}
                                  onChange={(e) =>
                                    setNewJobTitle(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleNewProfileSubmit();
                                    }
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="startingMessage">
                                  {t(
                                    "startingMessage",
                                    "Interview Starting Message"
                                  )}{" "}
                                  {t("optional", "(optional)")}
                                </Label>
                                <Textarea
                                  id="startingMessage"
                                  variant="bordered"
                                  color="primary"
                                  placeholder={t(
                                    "startingMessagePlaceholder",
                                    "Welcome to your interview. Let's begin—what interests you about this position?"
                                  )}
                                  value={newStartingMessage}
                                  onChange={(e) =>
                                    setNewStartingMessage(e.target.value)
                                  }
                                  minRows={4}
                                  maxRows={8}
                                  description={t(
                                    "startingMessageDescription",
                                    "If not provided the AI will generate something on it's own from the job profile instructions."
                                  )}
                                />
                              </div>
                            </div>
                          </ModalBody>
                          <ModalFooter>
                            <Button
                              size="sm"
                              color="secondary"
                              variant="light"
                              onPress={() => {
                                setNewJobTitle("");
                                setNewStartingMessage("");
                                onClose();
                              }}
                            >
                              {t("close", "Close")}
                            </Button>
                            <Button
                              size="sm"
                              color="primary"
                              startContent={
                                showSuccess ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : undefined
                              }
                              isLoading={createJobProfileMutation.isPending}
                              onPress={handleNewProfileSubmit}
                              isDisabled={
                                !newJobTitle.trim() ||
                                createJobProfileMutation.isPending
                              }
                            >
                              {showSuccess
                                ? t("profileCreated", "Profile Created!")
                                : t("createProfile", "Create Profile")}
                            </Button>
                          </ModalFooter>
                        </>
                      )}
                    </ModalContent>
                  </Modal>
                </div>

                <div className="w-full lg:w-96  flex lg:flex-col gap-2">
                  {/* Row 1: Expand and Regenerate */}
                  <ExpandWithAIButton
                    jobProfileData={jobProfileData}
                    onPromptUpdate={handlePromptUpdate}
                    mode="expand"
                    className="w-full"
                    variant="solid"
                  />
                  {jobProfileData.generalPrompt?.trim() && (
                    <ExpandWithAIButton
                      jobProfileData={jobProfileData}
                      onPromptUpdate={handlePromptUpdate}
                      mode="regenerate"
                      variant="light"
                      className="w-full border border-default-200"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
