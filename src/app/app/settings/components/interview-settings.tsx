import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { Label } from "@root/components/ui/label";
import { languageMap } from "@root/shared/defaults";
import {
  AdminSettingsType,
  interviewConfigurationScheme,
} from "@root/shared/zod-schemas";
import { api } from "@root/trpc/react";
import { FC, useEffect, useRef, useState } from "react";
import InlineNotification from "@root/app/components/InlineNotification";
import { z } from "zod";
import { FlagImage } from "../../admin/components/partials/voicesSelection";
import { Button } from "@root/components/ui/button";
import {
  Loader2,
  Mic,
  Square,
  Upload,
  Volume2,
  Play,
  Pause,
} from "lucide-react";
import { useUploader } from "@root/app/hooks/uploader.hook";
import { Input, Select, Switch, Textarea, SelectItem, cn } from "@heroui/react";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { EditableField } from "./EditableField";
import { useVoicePreview } from "@root/app/hooks/voice-preview.hook";

type UpdateInterviewSettingsCallback = (
  key: keyof z.infer<typeof interviewConfigurationScheme>,
  value:
    | string
    | boolean
    | undefined
    | Partial<AiAssistantSettings>
    | { phone?: boolean | null; age?: boolean | null },
) => void;
type UpdateAiAssistantCallback = (data: Partial<AiAssistantSettings>) => void;

interface AiAssistantSettings {
  name: string;
  avatar: string;
  voiceId: string;
  language: string;
  isCustomVoice: boolean;
}

export const OwnVoiceInfo: FC<{
  ownVoiceInfo: { name: string; description: string; isEnabled: boolean };
  setOwnVoiceInfo: (ownVoiceInfo: {
    name: string;
    description: string;
    isEnabled: boolean;
  }) => void;
  updateAiAssistant: UpdateAiAssistantCallback;
}> = ({ ownVoiceInfo, setOwnVoiceInfo, updateAiAssistant }) => {
  const t = useTranslations("settings");
  const [voiceNotification, setVoiceNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  /* ---------------------------- voice upload ----------------------------- */
  const createVoiceMutation = api.tixae.useOwnVoice.useMutation({
    onSuccess: (d) => {
      if (d.voiceId)
        updateAiAssistant({ voiceId: d.voiceId, isCustomVoice: true });
      setVoiceNotification({
        type: "success",
        message: t("voiceCreatedSuccessfully", "Voice created successfully"),
      });
    },
    onError: (e) => setVoiceNotification({ type: "error", message: e.message }),
  });

  const { uploading, uploadProgress, getRootProps, getInputProps } =
    useUploader("interview-settings-voice", {
      customUpload: async (file) => {
        const arr = Array.from(new Uint8Array(await file.arrayBuffer()));
        await createVoiceMutation.mutateAsync({
          files: [arr],
          ...ownVoiceInfo,
        });
      },
    });

  // recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  //   /* ----------------------------- recording ------------------------------- */
  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0",
    )}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) =>
        e.data.size && audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000,
      );
    } catch (e) {
      setVoiceNotification({
        type: "error",
        message: t("cannotAccessMicrophone", "Cannot access microphone"),
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  /* ------------------------------- cleanup ------------------------------- */
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return (
    <div className="flex flex-col gap-2">
      {voiceNotification && (
        <InlineNotification
          type={voiceNotification.type}
          message={voiceNotification.message}
          onClose={() => setVoiceNotification(null)}
        />
      )}
      <div className="flex flex-col gap-2">
        <EditableField
          value={ownVoiceInfo.name}
          label={t("voiceName", "Voice Name")}
          placeholder={t("enterName", "Enter Name")}
          onSave={async (value) => {
            setOwnVoiceInfo({ ...ownVoiceInfo, name: value });
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <EditableField
          value={ownVoiceInfo.description}
          label={t("voiceDescription", "Voice Description")}
          placeholder={t("enterDescription", "Enter Description")}
          onSave={async (value) => {
            setOwnVoiceInfo({ ...ownVoiceInfo, description: value });
          }}
          isTextArea
        />
      </div>
      <div className="flex flex-row gap-2 items-center justify-between">
        <div
          className="flex flex-1 flex-row border-2 border-gray-300 bg-gray-50 rounded-lg p-2 border-dashed items-center justify-center gap-2"
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <p className="text-gray-500">
                {t("uploadingProgress", "Uploading... {{progress}}%").replace(
                  "{{progress}}",
                  uploadProgress.toString(),
                )}
              </p>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 text-gray-400" />
              <p className="text-gray-500">
                {t("uploadAudioFile", "Upload an audio file")}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2">{t("or", "OR")}</div>
        <div className="flex flex-1 flex-col gap-2">
          {isRecording && (
            <div className="flex items-center gap-2 text-red-600 text-sm w-full">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              {t("recordingTime", "Recording: {{time}}").replace(
                "{{time}}",
                formatTime(recordingTime),
              )}
            </div>
          )}
          <div className="flex gap-2 w-full">
            {isRecording ? (
              <Button
                variant="bordered"
                className="text-red-600 w-full"
                onPress={stopRecording}
              >
                <Square size={16} /> {t("stop", "Stop")}
              </Button>
            ) : (
              <Button
                variant="bordered"
                onPress={startRecording}
                className="w-full"
              >
                <Mic size={16} /> {t("startRecording", "Start Recording")}
              </Button>
            )}
          </div>
          {recordedAudioUrl && (
            <audio className="w-full" controls src={recordedAudioUrl} />
          )}
        </div>
      </div>
    </div>
  );
};

export const RightColumn: FC<{
  updateInterviewSettings: UpdateInterviewSettingsCallback;
  updateAiAssistant: UpdateAiAssistantCallback;
  voiceProfiles: AdminSettingsType["voiceProfiles"][number][];
  onSelect: (id: string) => void;
}> = ({
  updateInterviewSettings,
  updateAiAssistant,
  voiceProfiles,
  onSelect,
}) => {
  const { activeWorkspace } = useActiveWorkspace();
  const t = useTranslations("settings");
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [avatarMode, setAvatarMode] = useState<"ready" | "custom">("ready");
  const [sampleText, setSampleText] = useState("Hi, how are you today?");

  const { playVoice, currentlyPlaying, isLoading, isPlaying, isLoadingVoice } =
    useVoicePreview();

  const currentAvatar =
    activeWorkspace?.settings?.interviewConfig?.aiAssistant?.avatar;

  // Check if current avatar is from ready avatars or custom
  const isReadyAvatar = voiceProfiles.some(
    (profile) => profile.image === currentAvatar,
  );

  // Set initial mode based on current avatar
  useEffect(() => {
    if (currentAvatar) {
      setAvatarMode(isReadyAvatar ? "ready" : "custom");
    }
  }, [currentAvatar, isReadyAvatar]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setPreviewUrl(result);
        updateAiAssistant({ avatar: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedProfile = voiceProfiles.find((p) => p.image === currentAvatar);

  return (
    <div className="flex flex-col gap-8">
      {/* Live Preview Section */}
      <div className="relative">
        <h3 className="text-lg font-semibold mb-4">
          {t("aiAssistantPreview", "AI Assistant Preview")}
        </h3>
        <div className="relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
          <div className="flex items-center justify-center">
            <div className="relative">
              {currentAvatar ? (
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl ring-4 ring-primary/20">
                  <img
                    src={currentAvatar}
                    alt="AI Assistant"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-white shadow-2xl ring-4 ring-gray-200/50 flex items-center justify-center">
                  <div className="text-4xl">🤖</div>
                </div>
              )}
            </div>
          </div>
          <div className="text-center mt-4">
            <h4 className="font-semibold text-lg">
              {activeWorkspace?.settings?.interviewConfig?.aiAssistant?.name ||
                "AI Assistant"}
            </h4>
            <p className="text-sm text-muted-foreground">
              Ready for interviews
            </p>
            {selectedProfile && avatarMode === "ready" && (
              <p className="text-xs text-primary mt-1">
                Using {selectedProfile.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Selection Mode Toggle */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {t("avatarSelection", "Avatar Selection")}
        </h3>

        <div className="bg-gray-50 p-1 rounded-xl border border-gray-200 flex">
          <button
            onClick={() => setAvatarMode("ready")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
              avatarMode === "ready"
                ? "bg-white text-primary shadow-sm border border-primary/20"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-purple-500"></div>
              {t("readyAvatars", "Ready Avatars")}
            </div>
          </button>
          <button
            onClick={() => setAvatarMode("custom")}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
              avatarMode === "custom"
                ? "bg-white text-primary shadow-sm border border-primary/20"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              {t("customAvatar", "Custom Avatar")}
            </div>
          </button>
        </div>
      </div>

      {/* Avatar Selection Content */}
      <div className="min-h-[400px]">
        {avatarMode === "ready" ? (
          // Ready Avatars Section
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                {t("chooseFromCollection", "Choose from our collection")}
              </h4>
              <span className="text-sm text-gray-500">
                {voiceProfiles.length}{" "}
                {t("avatarsAvailable", "avatars available")}
              </span>
            </div>

            {/* Voice Preview Section */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-primary" />
                  <h5 className="font-medium text-sm text-gray-900">
                    {t("voicePreview", "Voice Preview")}
                  </h5>
                </div>

                {/* Play Button for Selected Voice */}
                {(() => {
                  const selectedProfile = voiceProfiles.find(
                    (p) => p.image === currentAvatar,
                  );
                  if (!selectedProfile) return null;

                  let voiceId = "";

                  if (selectedProfile.voiceConfig.provider === "google-live") {
                    voiceId =
                      selectedProfile.voiceConfig.googleLiveVoice || "Puck";
                  } else {
                    voiceId =
                      selectedProfile.voiceConfig.selectedVoice ||
                      "XA2bIQ92TabjGbpO2xRr";
                  }

                  console.log(selectedProfile.voiceConfig);
                  const provider =
                    selectedProfile.voiceConfig.provider || "elevenlabs";
                  const isVoicePlaying = isPlaying(voiceId);
                  const isVoiceLoading = isLoadingVoice(voiceId);

                  return (
                    <Button
                      size="sm"
                      variant="bordered"
                      startContent={
                        isVoiceLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isVoicePlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )
                      }
                      className="border-primary/20 hover:border-primary hover:bg-primary/5 text-primary"
                      onPress={() => {
                        playVoice(voiceId, provider, sampleText);
                      }}
                      disabled={isVoiceLoading}
                    >
                      {isVoicePlaying
                        ? t("pause", "Pause")
                        : t("preview", "Preview")}
                    </Button>
                  );
                })()}
              </div>

              {/* Sample Text Input */}
              <div>
                <EditableField
                  value={sampleText}
                  label={t("sampleText", "Sample Text")}
                  placeholder={t(
                    "enterSampleText",
                    "Enter sample text to preview voices",
                  )}
                  onSave={async (value) => {
                    setSampleText(value || "Hi, how are you today?");
                  }}
                />
                <p className="text-xs text-gray-600 mt-1">
                  {t(
                    "voicePreviewDescription",
                    "Click Preview to hear how the selected voice sounds with this text",
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {voiceProfiles.map((profile) => {
                const isSelected = currentAvatar === profile.image;
                return (
                  <div
                    key={profile.id}
                    onClick={() => onSelect(profile.id)}
                    className={`relative group cursor-pointer transition-all duration-300 rounded-xl ${
                      isSelected
                        ? "scale-105 ring-4 ring-primary/50 shadow-xl"
                        : "hover:scale-102 hover:ring-2 hover:ring-primary/30 hover:shadow-lg"
                    }`}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-transparent group-hover:border-primary/20">
                      <img
                        src={profile.image}
                        alt={profile.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>

                    {/* Name overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs font-medium truncate">
                          {profile.name}
                        </p>
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Hover effect */}
                    <div className="absolute inset-0 rounded-xl ring-1 ring-black/5 group-hover:ring-primary/20 transition-all duration-300"></div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Custom Avatar Section
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                {t("uploadCustomAvatar", "Upload your custom avatar")}
              </h4>
              <p className="text-sm text-gray-600">
                {t(
                  "customAvatarDescription",
                  "Upload your own image or provide a URL to personalize your AI assistant",
                )}
              </p>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 ${
                dragActive
                  ? "border-primary bg-primary/5 scale-102"
                  : "border-gray-300 hover:border-primary/50 hover:bg-gray-50/50"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
                    dragActive
                      ? "bg-primary/20 text-primary scale-110"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Upload className="w-8 h-8" />
                </div>

                <h4 className="text-lg font-semibold mb-2">
                  {dragActive ? "Drop your image here" : "Upload Image"}
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag & drop an image or click to browse
                </p>
                <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                  <span className="bg-gray-100 px-2 py-1 rounded">JPG</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">PNG</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">GIF</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    Max 10MB
                  </span>
                </div>
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <EditableField
                value={
                  avatarMode === "custom" && !isReadyAvatar
                    ? currentAvatar || ""
                    : ""
                }
                label={t("orEnterImageUrl", "Or paste image URL")}
                placeholder="https://example.com/avatar.jpg"
                onSave={async (value) => {
                  updateAiAssistant({ avatar: value });
                }}
              />
            </div>

            {/* Current Custom Avatar Preview */}
            {currentAvatar && !isReadyAvatar && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border-2 border-gray-200">
                    <img
                      src={currentAvatar}
                      alt="Current avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {t("currentCustomAvatar", "Current Custom Avatar")}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t("customAvatarActive", "Your custom avatar is active")}
                    </p>
                  </div>
                  <Button
                    variant="bordered"
                    size="sm"
                    onPress={() => {
                      updateAiAssistant({ avatar: "" });
                      setPreviewUrl("");
                    }}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {t("remove", "Remove")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const LeftColumn: FC<{
  updateInterviewSettings: UpdateInterviewSettingsCallback;
  updateAiAssistant: UpdateAiAssistantCallback;
}> = ({ updateInterviewSettings, updateAiAssistant }) => {
  const { activeWorkspace } = useActiveWorkspace();
  const t = useTranslations("settings");
  const [ownVoiceInfo, setOwnVoiceInfo] = useState({
    name: "",
    description: "",
    isEnabled: false,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ai-assistant-language">
          {t("aiAssistantLanguage", "AI Assistant Language")}
        </Label>
        <Select
          selectedKeys={[
            activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language ||
              "en-uk",
          ]}
          variant="bordered"
          color="primary"
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
      <div className="flex flex-col gap-2">
        <EditableField
          value={
            activeWorkspace?.settings?.interviewConfig?.aiAssistant?.name || ""
          }
          label={t("aiAssistantName", "AI Assistant Name")}
          placeholder={t("enterAiAssistantName", "Enter AI Assistant Name")}
          onSave={async (value) => {
            updateAiAssistant({ name: value });
          }}
        />
      </div>

      {ownVoiceInfo.isEnabled && (
        <OwnVoiceInfo
          ownVoiceInfo={ownVoiceInfo}
          setOwnVoiceInfo={setOwnVoiceInfo}
          updateAiAssistant={updateAiAssistant}
        />
      )}
      <div className="flex flex-col gap-2">
        <Button
          variant="bordered"
          onPress={() =>
            setOwnVoiceInfo({
              ...ownVoiceInfo,
              isEnabled: !ownVoiceInfo.isEnabled,
            })
          }
        >
          {ownVoiceInfo.isEnabled
            ? t("usePlatformPresets", "Use Platform Presets")
            : t("useYourOwnVoice", "Use Your Own Voice")}
        </Button>
      </div>

      {/* Required Fields Configuration */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>{t("requiredFields", "Required Fields")}</Label>
          <p className="text-sm text-muted-foreground">
            {t(
              "requiredFieldsDescription",
              "Configure which fields are required in the interview form. Email, first name, last name, and gender are always required.",
            )}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {t("phoneField", "Phone Number")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(
                  "phoneFieldDescription",
                  "Require interviewees to provide their phone number",
                )}
              </span>
            </div>
            <Switch
              isSelected={
                activeWorkspace?.settings?.interviewConfig?.requiredFields
                  ?.phone ?? true
              }
              onValueChange={(value) =>
                updateInterviewSettings("requiredFields", {
                  ...activeWorkspace?.settings?.interviewConfig?.requiredFields,
                  phone: value,
                })
              }
              color="primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {t("ageField", "Age")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(
                  "ageFieldDescription",
                  "Require interviewees to provide their age",
                )}
              </span>
            </div>
            <Switch
              isSelected={
                activeWorkspace?.settings?.interviewConfig?.requiredFields
                  ?.age ?? true
              }
              onValueChange={(value) =>
                updateInterviewSettings("requiredFields", {
                  ...activeWorkspace?.settings?.interviewConfig?.requiredFields,
                  age: value,
                })
              }
              color="primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function InterviewSettings() {
  const { activeWorkspace, setActiveWorkspace, refetchWorkspaces } =
    useActiveWorkspace();
  const t = useTranslations("settings");
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  // Queries && Mutations
  const { data: voiceProfiles = [] } = api.admin.getVoiceProfiles.useQuery(
    {
      language:
        activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language ||
        "en-uk",
    },
    {
      enabled:
        !!activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language,
      select: (d) => d.voiceProfiles,
    },
  );
  const updateWorkspaceMutation = api.workspace.update.useMutation({
    onSuccess: () => refetchWorkspaces(),
    onError: (e) => setNotification({ type: "error", message: e.message }),
  });

  useEffect(() => {
    if (!voiceProfiles.length) return;
    if (!activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language)
      return;

    const currentProfile = voiceProfiles.find(
      (p) =>
        activeWorkspace?.settings?.interviewConfig?.aiAssistant?.name &&
        p.name.toLowerCase() ===
          activeWorkspace?.settings?.interviewConfig?.aiAssistant?.name.toLowerCase() &&
        p.language.toLowerCase() ===
          activeWorkspace.settings.interviewConfig.aiAssistant.language!.toLowerCase(),
    );

    if (!currentProfile) {
      const fallback = voiceProfiles[0];
      updateAiAssistant({
        name: fallback.name,
        avatar: fallback.image,
        language: fallback.language,
        voiceId:
          activeWorkspace.settings.interviewConfig.aiAssistant.voiceId ||
          fallback.voiceConfig.selectedVoice,
        isCustomVoice:
          activeWorkspace.settings.interviewConfig.aiAssistant.isCustomVoice ||
          fallback.voiceConfig.isCustomVoice ||
          false,
      });
      return;
    }

    updateAiAssistant({
      name: currentProfile.name,
      avatar: currentProfile.image,
      voiceId:
        activeWorkspace.settings.interviewConfig.aiAssistant.voiceId ||
        currentProfile.voiceConfig.selectedVoice,
      isCustomVoice:
        activeWorkspace.settings.interviewConfig.aiAssistant.isCustomVoice ||
        currentProfile.voiceConfig.isCustomVoice ||
        false,
    });
  }, [
    activeWorkspace?.settings?.interviewConfig?.aiAssistant?.language,
    voiceProfiles,
  ]);

  // Helpers
  const updateAiAssistant = (data: Partial<AiAssistantSettings>) => {
    if (!activeWorkspace) return;
    const updatedAi: Partial<AiAssistantSettings> = {
      name:
        data.name ||
        activeWorkspace.settings?.interviewConfig?.aiAssistant?.name ||
        "",
      avatar:
        data.avatar ||
        activeWorkspace.settings?.interviewConfig?.aiAssistant?.avatar ||
        "",
      voiceId:
        data.voiceId ||
        activeWorkspace.settings?.interviewConfig?.aiAssistant?.voiceId ||
        "",
      language:
        data.language ||
        activeWorkspace.settings?.interviewConfig?.aiAssistant?.language ||
        "",
      isCustomVoice:
        data.isCustomVoice ||
        activeWorkspace.settings?.interviewConfig?.aiAssistant?.isCustomVoice ||
        false,
    };
    updateInterviewSettings("aiAssistant", updatedAi);
  };

  const updateInterviewSettings: UpdateInterviewSettingsCallback = (
    key: keyof z.infer<typeof interviewConfigurationScheme>,
    value:
      | string
      | boolean
      | undefined
      | Partial<AiAssistantSettings>
      | { phone?: boolean | null; age?: boolean | null },
  ) => {
    if (!activeWorkspace) return;
    const updated = {
      ...activeWorkspace,
      settings: {
        ...activeWorkspace.settings,
        interviewConfig: {
          ...activeWorkspace.settings?.interviewConfig,
          [key]: value,
        },
      },
      updatedAt: new Date(),
    };

    updateWorkspaceMutation.mutate({
      workspaceId: activeWorkspace.id,
      settings: updated.settings,
    });

    setActiveWorkspace(updated);
  };

  const onSelect = (id: string) => {
    const profile = voiceProfiles.find((p) => p.id === id);
    if (!profile) return;
    updateAiAssistant({
      avatar: profile.image,
      name: profile.name,
      voiceId: profile.voiceConfig.selectedVoice,
      language: profile.language,
      isCustomVoice: profile.voiceConfig.isCustomVoice || false,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div>
        <h1 className="text-2xl font-bold">
          {t("aiAssistantSettings", "AI Assistant Settings")}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t(
            "aiAssistantSettingsDesc",
            "Configure your AI assistant's appearance, voice, and behavior for interviews.",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <LeftColumn
          updateInterviewSettings={updateInterviewSettings}
          updateAiAssistant={updateAiAssistant}
        />
        <RightColumn
          updateInterviewSettings={updateInterviewSettings}
          updateAiAssistant={updateAiAssistant}
          voiceProfiles={voiceProfiles}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
