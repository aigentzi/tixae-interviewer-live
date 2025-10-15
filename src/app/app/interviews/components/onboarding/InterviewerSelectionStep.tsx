import { FlagImage } from "@root/app/app/admin/components/partials/voicesSelection";
import { useGAuth } from "@root/app/hooks/guath.hook";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { Button } from "@root/components/ui/button";
import { Card, CardContent } from "@root/components/ui/card";
import { languageMap } from "@root/shared/defaults";
import { api } from "@root/trpc/react";
import {
  ChevronDown,
  ChevronUp,
  Play,
  Volume2,
  Pause,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import InlineNotification from "@root/app/components/InlineNotification";
import { BUTTON_STYLES } from "./constants";
import { Input, Select, SelectItem } from "@heroui/react";
import { useLocale } from "@root/app/providers/LocaleContext";
import { useVoicePreview } from "@root/app/hooks/voice-preview.hook";

interface InterviewerSelectionStepProps {
  onNext: () => void;
  jobProfileId: string;
}

interface Interviewer {
  id: string;
  name: string;
  image: string;
  description: string;
}

export const InterviewerSelectionStep = ({
  onNext,
  jobProfileId,
}: InterviewerSelectionStepProps) => {
  const t = useTranslations("onboarding");
  const { locale } = useLocale();

  // ------------------------------------
  // Hooks
  // ------------------------------------
  const { activeWorkspace, setActiveWorkspace } = useActiveWorkspace();
  const { gauthUser } = useGAuth();

  // ------------------------------------
  // Queries & Mutations
  // ------------------------------------
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const createInterviewMutation = api.interviews.create.useMutation({
    onSuccess: (data) => {
      window.open(`/app/meeting/${data.interviews?.[0]?.id}`, "_blank");
      setNotification({
        type: "success",
        message: "Interview created successfully",
      });
    },
    onError: (error) => {
      console.error(error);
      setNotification({
        type: "error",
        message: "Failed to create interview" + error.message,
      });
    },
  });
  const updateWorkspaceSettingsMutation = api.workspace.update.useMutation({
    onSuccess: () => {
      setNotification({
        type: "success",
        message: "Workspace settings updated successfully",
      });
    },
    onError: (error) => {
      console.error(error);
      setNotification({
        type: "error",
        message: "Failed to update workspace settings" + error.message,
      });
    },
  });
  const getProfilePresetsQuery = api.admin.getVoiceProfiles.useQuery(
    {
      language:
        activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language ||
        Object.keys(languageMap)[0],
    },
    {
      enabled: !!activeWorkspace?.id, // Always load if workspace exists
    },
  );
  const agentMutation = api.tixae.getAgentVoiceConfig.useQuery(
    {
      agentId: activeWorkspace?.associatedAgentId || "",
    },
    {
      enabled: !!activeWorkspace?.associatedAgentId,
    },
  );
  const voicesMutation = api.tixae.getVoices.useQuery({
    language:
      activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language ||
      Object.keys(languageMap)[0],
  });
  const getVoiceMutation = api.tixae.getVoice.useQuery(
    {
      voiceId:
        activeWorkspace?.settings?.interviewConfig?.aiAssistant?.voiceId || "",
    },
    {
      enabled:
        !!activeWorkspace?.settings?.interviewConfig?.aiAssistant?.voiceId,
    },
  );

  // ------------------------------------
  // Custom variables
  // ------------------------------------
  const assistantName =
    activeWorkspace?.settings?.interviewConfig?.aiAssistant?.name;
  const assistantAvatar =
    activeWorkspace?.settings?.interviewConfig?.aiAssistant?.avatar;
  const initialInterviewer = assistantAvatar
    ? getProfilePresetsQuery.data?.voiceProfiles.find(
        (i) => i.image === assistantAvatar,
      )?.id ||
      (assistantName
        ? getProfilePresetsQuery.data?.voiceProfiles.find(
            (i) => i.name.toLowerCase() === assistantName.toLowerCase(),
          )?.id
        : getProfilePresetsQuery.data?.voiceProfiles?.[0]?.id)
    : assistantName
      ? getProfilePresetsQuery.data?.voiceProfiles.find(
          (i) => i.name.toLowerCase() === assistantName.toLowerCase(),
        )?.id || getProfilePresetsQuery.data?.voiceProfiles?.[0]?.id
      : getProfilePresetsQuery.data?.voiceProfiles?.[0]?.id;
  const initialIndex = getProfilePresetsQuery.data?.voiceProfiles?.findIndex(
    (i) => i.id === initialInterviewer,
  );

  // ------------------------------------
  // State
  // ------------------------------------
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);
  const [selectedInterviewer, setSelectedInterviewer] = useState(
    initialInterviewer ||
      getProfilePresetsQuery.data?.voiceProfiles?.[0]?.id ||
      "",
  );
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex !== undefined && initialIndex >= 0 ? initialIndex : 0,
  );
  const [sampleText, setSampleText] = useState("Hi, how are you today?");

  // Voice preview functionality
  const { playVoice, currentlyPlaying, isLoading, isPlaying, isLoadingVoice } =
    useVoicePreview();

  // ------------------------------------
  // Custom variables
  // ------------------------------------
  const currentInterviewer = getProfilePresetsQuery.data?.voiceProfiles.find(
    (i) => i.id === selectedInterviewer,
  );

  // ------------------------------------
  // Refs
  // ------------------------------------
  const profilesContainerRef = useRef<HTMLDivElement>(null);

  // ------------------------------------
  // Helper functions
  // ------------------------------------
  const updateAiAssistant = (
    data: Partial<{
      name: string;
      language: string;
      voiceId: string;
      avatar: string;
      isCustomVoice: boolean;
    }>,
  ) => {
    if (!activeWorkspace) return;

    setActiveWorkspace({
      ...activeWorkspace,
      settings: {
        ...activeWorkspace.settings,
        interviewConfig: {
          ...activeWorkspace.settings?.interviewConfig,
          aiAssistant: {
            ...activeWorkspace.settings?.interviewConfig?.aiAssistant,
            ...data,
          },
        },
      },
      updatedAt: new Date(),
    });

    updateWorkspaceSettingsMutation.mutate({
      workspaceId: activeWorkspace.id,
      settings: {
        ...activeWorkspace.settings,
        interviewConfig: {
          ...activeWorkspace.settings?.interviewConfig,
          aiAssistant: {
            ...activeWorkspace.settings?.interviewConfig?.aiAssistant,
            ...data,
          },
        },
      },
    });
  };

  const handleArrowUp = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      const interviewer =
        getProfilePresetsQuery.data?.voiceProfiles?.[newIndex];
      if (interviewer?.id) {
        setSelectedInterviewer(interviewer.id);
        updateAiAssistant({
          name: interviewer.name,
          avatar: interviewer.image,
          language: interviewer.language,
          voiceId: interviewer.voiceConfig.selectedVoice || "",
          isCustomVoice: false,
        });
      }
    }
  };

  const handleArrowDown = () => {
    if (
      currentIndex <
      (getProfilePresetsQuery.data?.voiceProfiles.length || 0) - 1
    ) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setSelectedInterviewer(
        getProfilePresetsQuery.data?.voiceProfiles[newIndex]?.id || "",
      );

      // Update AI assistant name and avatar in workspace settings
      const interviewer = getProfilePresetsQuery.data?.voiceProfiles[newIndex];
      if (interviewer) {
        updateAiAssistant({
          name: interviewer.name,
          avatar: interviewer.image,
          language: interviewer.language,
          voiceId: interviewer.voiceConfig.selectedVoice || "",
          isCustomVoice: false,
        });
      }
    }
  };

  const handleInterviewerSelect = (interviewerId: string) => {
    setSelectedInterviewer(interviewerId);
    const index = getProfilePresetsQuery.data?.voiceProfiles.findIndex(
      (i) => i.id === interviewerId,
    );
    setCurrentIndex(index || 0);

    // Update AI assistant name and avatar in workspace settings
    const interviewer = getProfilePresetsQuery.data?.voiceProfiles.find(
      (i) => i.id === interviewerId,
    );
    if (interviewer) {
      updateAiAssistant({
        name: interviewer.name,
        avatar: interviewer.image,
        language: interviewer.language,
        voiceId: interviewer.voiceConfig.selectedVoice || "",
        isCustomVoice: false,
      });
    }
  };

  const handleCreateInterview = async () => {
    setIsCreatingInterview(true);
    try {
      await createInterviewMutation.mutateAsync({
        workspaceId: activeWorkspace?.id || "",
        jobProfileId: jobProfileId,
        level: "1",
        duration: 10,
        intervieweeEmails: [gauthUser?.email || ""],
        enableSchedule: false,
        isDemo: true,
        language: locale, // Pass user's selected language
      });
      setIsCreatingInterview(false);
    } catch (error) {
      console.error(error);
      setNotification({
        type: "error",
        message: "Failed to create interview" + (error as Error).message,
      });
    } finally {
      setIsCreatingInterview(false);
    }
  };

  useEffect(() => {
    if (profilesContainerRef.current) {
      const cardHeight = 120; // Approximate height of each profile card including spacing
      profilesContainerRef.current.scrollTop = Math.max(
        0,
        (currentIndex - 1) * cardHeight,
      );
    }
  }, [currentIndex]);

  useEffect(() => {
    if (
      activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language &&
      getProfilePresetsQuery.data?.voiceProfiles?.length
    ) {
      updateAiAssistant({
        language:
          activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language,
        voiceId:
          getProfilePresetsQuery.data?.voiceProfiles?.find(
            (i) =>
              i.language ===
              activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language,
          )?.voiceConfig?.selectedVoice || "",
        avatar:
          getProfilePresetsQuery.data?.voiceProfiles?.find(
            (i) =>
              i.language ===
              activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language,
          )?.image || "",
        isCustomVoice: false,
        name:
          getProfilePresetsQuery.data?.voiceProfiles?.find(
            (i) =>
              i.language ===
              activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language,
          )?.name || "",
      });
      setSelectedInterviewer(
        getProfilePresetsQuery.data?.voiceProfiles?.find(
          (i) =>
            i.language ===
            activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language,
        )?.id ||
          getProfilePresetsQuery.data?.voiceProfiles?.[0]?.id ||
          "",
      );
    }
  }, [
    activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language,
    getProfilePresetsQuery.data?.voiceProfiles,
  ]);

  return (
    <div className="space-y-6">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          {t("chooseAiInterviewer", "Choose Your AI Interviewer")}
        </h2>
        <p className="text-lg text-gray-600">
          {t(
            "customizeLanguageVoiceAppearance",
            "Customize the language, voice, and appearance for your interview",
          )}
        </p>
      </div>

      <div className="flex gap-6 max-w-6xl mx-auto">
        {/* Left Sidebar - Controls */}
        <div className="w-80 space-y-6">
          {/* Language Selection */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {t("language", "Language")}
            </label>
            <Select
              selectedKeys={[
                activeWorkspace?.settings?.interviewConfig?.aiAssistant
                  ?.language || Object.keys(languageMap)[0],
              ]}
              items={Object.entries(languageMap).map(([key, value]) => ({
                key: key,
                value: (
                  <div className="flex items-center gap-2">
                    <FlagImage countryCode={value.countryCode} />
                    {value.name}
                  </div>
                ),
              }))}
              onSelectionChange={(value) =>
                updateAiAssistant({
                  language: value.currentKey as string,
                })
              }
              renderValue={(items) => {
                return items.map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <FlagImage
                      countryCode={languageMap[item.key as string].countryCode}
                    />
                    {languageMap[item.key as string].name}
                  </div>
                ));
              }}
            >
              {Object.entries(languageMap).map(([key, value]) => (
                <SelectItem key={key}>
                  <div className="flex items-center gap-2">
                    <FlagImage countryCode={value.countryCode} />
                    {value.name}
                  </div>
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Voice Name */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {t("voiceName", "Voice Name")}
            </label>
            <Input
              value={
                activeWorkspace?.settings?.interviewConfig?.aiAssistant?.name ||
                ""
              }
              onValueChange={(value) => updateAiAssistant({ name: value })}
              placeholder={t("enterVoiceName", "Enter voice name")}
              classNames={{
                inputWrapper:
                  "h-12 bg-white border-gray-300 hover:bg-white/50!",
              }}
              className="w-full h-12"
              color="default"
              radius="sm"
            />
          </div>

          {/* Voice Preview Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {t("sampleText", "Sample Text")}
            </label>
            <Input
              value={sampleText}
              onValueChange={(value) =>
                setSampleText(value || "Hi, how are you today?")
              }
              placeholder={t(
                "enterSampleText",
                "Enter sample text to preview voices",
              )}
              classNames={{
                inputWrapper:
                  "h-12 bg-white border-gray-300 hover:bg-white/50!",
              }}
              className="w-full h-12"
              color="default"
              radius="sm"
            />

            {/* Voice Preview Button */}
            {(() => {
              if (!currentInterviewer) return null;

              let voiceId = "";
              if (currentInterviewer.voiceConfig.provider === "google-live") {
                voiceId =
                  currentInterviewer.voiceConfig.googleLiveVoice || "Puck";
              } else {
                voiceId =
                  currentInterviewer.voiceConfig.selectedVoice ||
                  "XA2bIQ92TabjGbpO2xRr";
              }
              const provider =
                currentInterviewer.voiceConfig.provider || "elevenlabs";
              const isVoicePlaying = isPlaying(voiceId);
              const isVoiceLoading = isLoadingVoice(voiceId);

              return (
                <Button
                  variant="light"
                  onPress={() => playVoice(voiceId, provider, sampleText)}
                  isDisabled={isVoiceLoading}
                  startContent={
                    isVoiceLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isVoicePlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )
                  }
                  className="w-full h-14 flex items-center justify-start gap-3 text-[#421566] hover:text-[#421566] hover:bg-transparent text-base font-medium px-0"
                >
                  {isVoicePlaying
                    ? t("pause", "Pause")
                    : t("clickToTry", "Click to try")}
                </Button>
              );
            })()}
          </div>

          {/* Demo Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full h-12 text-white rounded-xl border-0 hover:opacity-90 text-base font-medium"
              style={{ backgroundColor: "#D46686" }}
              onPress={handleCreateInterview}
              isDisabled={isCreatingInterview}
            >
              {isCreatingInterview
                ? t("creatingInterview", "Creating interview...")
                : t("viewDemoInterview", "View demo AI interview")}
            </Button>
          </div>
        </div>

        {/* Center - Video Preview */}
        <div className="flex-1 max-w-2xl">
          <Card className="bg-gray-900 border-0 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="relative h-100 bg-gradient-to-br from-gray-800 to-gray-900">
                {/* Video Preview Area */}
                <div className="absolute inset-0">
                  <img
                    src={currentInterviewer?.image || "/face.jpg"}
                    alt={currentInterviewer?.name || "Georgia"}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Tixae AI Branding */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                  <img
                    src="/Powered_by_Tixae (1).png"
                    alt="Powered by Tixae AI"
                    className="h-4"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Interviewer Profiles */}
        <div className="w-40 flex flex-col -mt-8">
          {/* Up Arrow */}
          <Button
            variant="ghost"
            size="sm"
            onPress={handleArrowUp}
            isDisabled={currentIndex === 0}
            className="mb-2 h-8 w-8 p-0 mx-auto hover:bg-primary/10 disabled:opacity-30"
          >
            <ChevronUp className="w-4 h-4 text-primary" />
          </Button>

          {/* Profiles Container */}
          <div
            ref={profilesContainerRef}
            className="h-98 overflow-y-auto space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {getProfilePresetsQuery.isLoading ? (
              // Loading state
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : getProfilePresetsQuery.data?.voiceProfiles?.length === 0 ? (
              // Empty state
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">
                  {t("noVoiceProfiles", "No voice profiles available")}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t("contactAdmin", "Contact your admin to add profiles")}
                </p>
              </div>
            ) : (
              // Profiles list
              getProfilePresetsQuery.data?.voiceProfiles.map((interviewer) => (
                <div
                  key={interviewer.id}
                  onClick={() => handleInterviewerSelect(interviewer.id)}
                  className="flex items-center gap-3 cursor-pointer transition-all hover:shadow-md"
                >
                  {/* Profile Image */}
                  <div
                    className={`rounded-xl overflow-hidden transition-all duration-300 ${
                      selectedInterviewer === interviewer.id
                        ? "w-20 h-20 border-3 border-primary"
                        : "w-16 h-16 border-2 border-gray-200 hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={interviewer.image}
                      alt={interviewer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Name */}
                  <h3
                    className={`font-medium transition-all duration-300 ${
                      selectedInterviewer === interviewer.id
                        ? "text-primary text-base font-semibold"
                        : "text-gray-900 text-sm"
                    }`}
                  >
                    {interviewer.name}
                  </h3>
                </div>
              ))
            )}
          </div>

          {/* Down Arrow */}
          <Button
            variant="ghost"
            size="sm"
            onPress={handleArrowDown}
            isDisabled={
              currentIndex ===
              (getProfilePresetsQuery.data?.voiceProfiles.length || 0) - 1
            }
            className="mt-2 h-8 w-8 p-0 mx-auto hover:bg-primary/10 disabled:opacity-30"
          >
            <ChevronDown className="w-4 h-4 text-primary" />
          </Button>
        </div>
      </div>

      {/* Continue Button */}
      <div className="text-center pt-6">
        <Button
          onPress={onNext}
          startContent={<Play className="w-5 h-5" />}
          className={`px-8 py-4 text-lg ${BUTTON_STYLES.primary}`}
        >
          {t("createFirstInterview", "Create Your First Interview")}
        </Button>
        <p className="text-sm text-gray-500 mt-2">
          {t(
            "aiInterviewerReady",
            "Your AI interviewer is ready to conduct professional interviews",
          )}
        </p>
      </div>
    </div>
  );
};
