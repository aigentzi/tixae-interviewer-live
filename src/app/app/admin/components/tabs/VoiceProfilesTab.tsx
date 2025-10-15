import {
  AdminSettingsType,
  AdminTranscriptionType,
  AdminVoiceType,
} from "@root/shared/zod-schemas";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@root/components/ui/button";
import { useState, useEffect, FC } from "react";
import {
  defaultTranscriptionSettings,
  defaultVoiceSettings,
  languageMap,
} from "@root/shared/defaults";
import { createId } from "@paralleldrive/cuid2";
import { Label } from "@root/components/ui/label";
import { InputTags } from "@root/components/ui/input-tags";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import {
  Input,
  Progress,
  Switch,
  Select,
  SelectItem,
  Slider,
  Tabs,
  Tab,
} from "@heroui/react";
import { Badge } from "@root/components/ui/badge";
import {
  Trash2,
  Plus,
  X,
  Save,
  Loader2,
  CloudUpload,
  VoicemailIcon,
  Settings,
} from "lucide-react";
import InlineNotification from "@root/app/components/InlineNotification";
import { FlagImage, VoicesSelection } from "../partials/voicesSelection";
import { useUploader } from "@root/app/hooks/uploader.hook";

interface VoiceProfilesTabProps {
  voiceProfiles: Pick<AdminSettingsType, "voiceProfiles">["voiceProfiles"];
  onSave: (
    profiles: AdminSettingsType["voiceProfiles"],
    syncVoiceSettings: boolean
  ) => Promise<void>;
}

export const VoiceProfileCard: FC<{
  profile: AdminSettingsType["voiceProfiles"][0];
  expandedProfiles: Set<string>;
  toggleProfileExpansion: () => void;
  deleteProfile: () => void;
  updateProfile: (
    updates: Partial<AdminSettingsType["voiceProfiles"][0]>
  ) => void;
  updateVoiceConfig: (field: keyof AdminVoiceType, value: any) => void;
  updateTranscriptionConfig: (
    field: keyof AdminTranscriptionType,
    value: any
  ) => void;
  addWordReplacement: () => void;
  updateWordReplacement: (
    index: number,
    field: "original" | "replacement",
    value: string
  ) => void;
  removeWordReplacement: (index: number) => void;
}> = ({
  profile,
  expandedProfiles,
  toggleProfileExpansion,
  deleteProfile,
  updateProfile,
  updateVoiceConfig,
  updateTranscriptionConfig,
  addWordReplacement,
  updateWordReplacement,
  removeWordReplacement,
}) => {
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    uploading,
    uploadProgress,
  } = useUploader("voice-profile-images", {
    directUpload: true,
    onSuccess: (url) => {
      updateProfile({ image: url });
    },
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onError: () => {},
  });

  useEffect(() => {
    console.log(profile.voiceConfig);
  }, [profile.voiceConfig]);

  return (
    <motion.div
      key={profile.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleProfileExpansion()}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                🎤
              </div>
              <div>
                <CardTitle className="text-lg">{profile.name}</CardTitle>
                <CardDescription>
                  {profile.gender} • {profile.language}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="secondary" variant="default" className="text-xs">
                {expandedProfiles.has(profile.id) ? "Expanded" : "Collapsed"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProfile();
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {expandedProfiles.has(profile.id) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0">
                {/* Basic Profile Settings */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Basic Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${profile.id}`}>Profile Name</Label>
                      <Input
                        id={`name-${profile.id}`}
                        value={profile.name}
                        onValueChange={(value) =>
                          updateProfile({ name: value })
                        }
                        placeholder="Enter profile name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`gender-${profile.id}`}>Gender</Label>
                      <Select
                        selectedKeys={[profile.gender]}
                        onSelectionChange={(value) =>
                          updateProfile({
                            gender: value.currentKey as "male" | "female",
                          })
                        }
                      >
                        <SelectItem key="male">Male</SelectItem>
                        <SelectItem key="female">Female</SelectItem>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`language-${profile.id}`}>Language</Label>
                      <Select
                        selectedKeys={[profile.language]}
                        items={Object.entries(languageMap).map(
                          ([key, value]) => ({
                            key: key,
                            value: (
                              <div className="flex items-center gap-2">
                                <FlagImage countryCode={value.countryCode} />
                                {value.name}
                              </div>
                            ),
                          })
                        )}
                        onSelectionChange={(value) =>
                          updateProfile({
                            language: value.currentKey as string,
                          })
                        }
                        renderValue={(items) => {
                          return items.map((item) => (
                            <div
                              key={item.key}
                              className="flex items-center gap-2"
                            >
                              <FlagImage
                                countryCode={
                                  languageMap[item.key as string].countryCode
                                }
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
                  </div>
                  <div className="mt-6 space-y-4">
                    {uploading && (
                      <div className="w-full mt-2">
                        <Progress
                          aria-label="Upload Progress"
                          color="primary"
                          value={uploadProgress}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Uploading… {uploadProgress}%
                        </p>
                      </div>
                    )}
                    <div
                      className="grid max-h-[200px] overflow-hidden grid-cols-1 md:grid-cols-1 gap-4 items-center justify-center"
                      {...getRootProps()}
                    >
                      {profile.image ? (
                        <div className="mt-6 space-y-4 flex flex-row justify-center items-center gap-4">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Label>Uploaded Image</Label>
                            <img
                              src={profile.image}
                              alt="Profile Image"
                              width={100}
                              height={100}
                              className="max-h-[200px] object-contain"
                            />
                            <div className="flex flex-row items-center gap-2">
                              <Button
                                variant="bordered"
                                size="sm"
                                onPress={() => updateProfile({ image: "" })}
                                className="flex flex-row items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove Image
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Upload Image</Label>
                          <div
                            className={`flex w-full flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed transition-colors duration-200 ${
                              isDragActive
                                ? "border-primary"
                                : "border-foreground-300"
                            }`}
                          >
                            <input {...getInputProps()} />
                            <CloudUpload className="w-8 h-8 text-primary/60" />
                            <p className="text-sm text-center">
                              Drop image or click to browse
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Google Live Switch */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 justify-between">
                    <div>
                      <Label
                        htmlFor="googleLiveMode"
                        className="text-lg font-semibold"
                      >
                        Google Live Provider
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enable Google Live provider (handles both voice and
                        transcription)
                      </p>
                    </div>
                    <Switch
                      id="googleLiveMode"
                      isSelected={
                        profile.voiceConfig.provider === "google-live"
                      }
                      onValueChange={(value) =>
                        updateVoiceConfig(
                          "provider",
                          value ? "google-live" : "elevenlabs"
                        )
                      }
                    />
                  </div>
                </div>

                {/* Conditional Settings based on Google Live Mode */}
                {profile.voiceConfig.provider === "google-live" ? (
                  // Google Live Unified Settings
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Voice Selection */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Voice Selection</h3>
                      <div className="space-y-2">
                        <Label>Google Live Voice</Label>
                        <Select
                          selectedKeys={[
                            profile.voiceConfig.googleLiveVoice || "Puck",
                          ]}
                          onSelectionChange={(value) =>
                            updateVoiceConfig(
                              "googleLiveVoice",
                              value.currentKey
                            )
                          }
                        >
                          <SelectItem key="Zephyr">Zephyr</SelectItem>
                          <SelectItem key="Puck">Puck</SelectItem>
                          <SelectItem key="Charon">Charon</SelectItem>
                          <SelectItem key="Kore">Kore</SelectItem>
                          <SelectItem key="Fenrir">Fenrir</SelectItem>
                          <SelectItem key="Leda">Leda</SelectItem>
                          <SelectItem key="Orus">Orus</SelectItem>
                          <SelectItem key="Aoede">Aoede</SelectItem>
                        </Select>
                      </div>

                      {/* VAD Switch */}
                      <div className="flex items-center space-x-2">
                        <Switch
                          isSelected={profile.voiceConfig.enableVAD || false}
                          onValueChange={(value) =>
                            updateVoiceConfig("enableVAD", value)
                          }
                        />
                        <div>
                          <Label>Voice Activity Detection (VAD)</Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically detect when user starts and stops
                            speaking
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Google Live Speech Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        Speech Detection Settings
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Start of Speech Sensitivity</Label>
                          <Select
                            selectedKeys={[
                              profile.voiceConfig.startOfSpeechSensitivity ||
                                "START_SENSITIVITY_MEDIUM",
                            ]}
                            onSelectionChange={(value) =>
                              updateVoiceConfig(
                                "startOfSpeechSensitivity",
                                value.currentKey
                              )
                            }
                            classNames={{
                              description: "text-xs text-muted-foreground",
                            }}
                            description="How sensitive to detect the start of speech."
                          >
                            <SelectItem key="START_SENSITIVITY_LOW">
                              Low
                            </SelectItem>
                            <SelectItem key="START_SENSITIVITY_MEDIUM">
                              Medium
                            </SelectItem>
                            <SelectItem key="START_SENSITIVITY_HIGH">
                              High
                            </SelectItem>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>End of Speech Sensitivity</Label>
                          <Select
                            selectedKeys={[
                              profile.voiceConfig.endOfSpeechSensitivity ||
                                "END_SENSITIVITY_MEDIUM",
                            ]}
                            onSelectionChange={(value) =>
                              updateVoiceConfig(
                                "endOfSpeechSensitivity",
                                value.currentKey
                              )
                            }
                            classNames={{
                              description: "text-xs text-muted-foreground",
                            }}
                            description="How sensitive to detect the end of speech."
                          >
                            <SelectItem key="END_SENSITIVITY_LOW">
                              Low
                            </SelectItem>
                            <SelectItem key="END_SENSITIVITY_MEDIUM">
                              Medium
                            </SelectItem>
                            <SelectItem key="END_SENSITIVITY_HIGH">
                              High
                            </SelectItem>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Prefix Padding:{" "}
                            {profile.voiceConfig.prefixPaddingMs || 20}ms
                          </Label>
                          <Slider
                            value={[profile.voiceConfig.prefixPaddingMs || 20]}
                            onChange={(value) =>
                              updateVoiceConfig(
                                "prefixPaddingMs",
                                Array.isArray(value) ? value[0] : value
                              )
                            }
                            maxValue={1000}
                            minValue={0}
                            step={10}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            Audio padding before detected speech start
                            (0-1000ms)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Silence Duration:{" "}
                            {profile.voiceConfig.silenceDurationMs || 100}ms
                          </Label>
                          <Slider
                            value={[
                              profile.voiceConfig.silenceDurationMs || 100,
                            ]}
                            onChange={(value) =>
                              updateVoiceConfig(
                                "silenceDurationMs",
                                Array.isArray(value) ? value[0] : value
                              )
                            }
                            maxValue={5000}
                            minValue={50}
                            step={50}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            How long to wait for silence before ending speech
                            (0-5000ms)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Audio Transcription Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        Audio Transcription
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            isSelected={
                              profile.voiceConfig.inputAudioTranscription ||
                              false
                            }
                            onValueChange={(value) =>
                              updateVoiceConfig(
                                "inputAudioTranscription",
                                value
                              )
                            }
                          />
                          <Label>Input Audio Transcription</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            isSelected={
                              profile.voiceConfig.outputAudioTranscription ||
                              false
                            }
                            onValueChange={(value) =>
                              updateVoiceConfig(
                                "outputAudioTranscription",
                                value
                              )
                            }
                          />
                          <Label>Output Audio Transcription</Label>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        Advanced Options
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Background Noise</Label>
                          <Select
                            selectedKeys={[
                              profile.voiceConfig.backgroundNoise || "none",
                            ]}
                            onSelectionChange={(value) =>
                              updateVoiceConfig(
                                "backgroundNoise",
                                value.currentKey
                              )
                            }
                          >
                            <SelectItem key="none">None</SelectItem>
                            <SelectItem key="restaurant">Restaurant</SelectItem>
                            <SelectItem key="cafe">Cafe</SelectItem>
                            <SelectItem key="office">Office</SelectItem>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Punctuation Breaks */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        Punctuation Breaks
                      </h3>
                      <InputTags
                        value={profile.voiceConfig.punctuationBreaks || []}
                        onChange={(tags) =>
                          updateVoiceConfig("punctuationBreaks", tags)
                        }
                        placeholder="Add punctuation characters (e.g., ., !, ?)"
                      />
                    </div>
                  </motion.div>
                ) : (
                  // ElevenLabs Traditional Tabs
                  <Tabs className="flex gap-6" color="primary" radius="full">
                    {/* Tab Content */}
                    <Tab
                      key="voice"
                      title={
                        <div className="flex items-center space-x-2">
                          <Settings className="w-4 h-4" />
                          <span>Voice Settings</span>
                        </div>
                      }
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                      >
                        {/* Voice Selection */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Voice Selection
                          </h3>
                          <div className="flex items-center gap-2 justify-between">
                            <Label htmlFor="isCustomVoice">
                              Use Custom Voice
                            </Label>
                            <Switch
                              id="isCustomVoice"
                              isSelected={profile.voiceConfig.isCustomVoice}
                              onValueChange={(value) =>
                                updateVoiceConfig("isCustomVoice", value)
                              }
                            />
                          </div>

                          {profile.voiceConfig.isCustomVoice ? (
                            <div className="space-y-2">
                              <Label>Voice ID</Label>
                              <Input
                                value={profile.voiceConfig.selectedVoice || ""}
                                onValueChange={(value) =>
                                  updateVoiceConfig("selectedVoice", value)
                                }
                              />
                            </div>
                          ) : (
                            <VoicesSelection
                              onUpdateSettings={(key, value) => {
                                updateVoiceConfig(
                                  key as keyof AdminVoiceType,
                                  value as any
                                );
                              }}
                              selectedVoice={
                                profile.voiceConfig.selectedVoice || ""
                              }
                            />
                          )}
                        </div>

                        {/* ElevenLabs Options */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            ElevenLabs Options
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label>Speed: {profile.voiceConfig.speed}</Label>
                              <Slider
                                value={profile.voiceConfig.speed}
                                onChange={(value) =>
                                  updateVoiceConfig("speed", value)
                                }
                                maxValue={2}
                                minValue={0.5}
                                step={0.1}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>
                                Stability: {profile.voiceConfig.stability}
                              </Label>
                              <Slider
                                value={profile.voiceConfig.stability}
                                onChange={(value) =>
                                  updateVoiceConfig("stability", value)
                                }
                                maxValue={1}
                                minValue={0}
                                step={0.1}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>
                                Similarity Boost:{" "}
                                {profile.voiceConfig.similarityBoost}
                              </Label>
                              <Slider
                                value={profile.voiceConfig.similarityBoost}
                                onChange={(value) =>
                                  updateVoiceConfig("similarityBoost", value)
                                }
                                maxValue={1}
                                minValue={0}
                                step={0.1}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>
                                Style Exaggeration:{" "}
                                {profile.voiceConfig.styleExaggeration}
                              </Label>
                              <Slider
                                value={profile.voiceConfig.styleExaggeration}
                                onChange={(value) =>
                                  updateVoiceConfig("styleExaggeration", value)
                                }
                                maxValue={1}
                                minValue={0}
                                step={0.1}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Advanced Options */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Advanced Options
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Background Noise</Label>
                              <Select
                                selectedKeys={[
                                  profile.voiceConfig.backgroundNoise || "none",
                                ]}
                                onSelectionChange={(value) =>
                                  updateVoiceConfig(
                                    "backgroundNoise",
                                    value.currentKey
                                  )
                                }
                              >
                                <SelectItem key="none">None</SelectItem>
                                <SelectItem key="restaurant">
                                  Restaurant
                                </SelectItem>
                                <SelectItem key="cafe">Cafe</SelectItem>
                                <SelectItem key="office">Office</SelectItem>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2 lg:mt-5">
                              <Switch
                                isSelected={
                                  profile.voiceConfig.speakerBoost || false
                                }
                                onValueChange={(value) =>
                                  updateVoiceConfig("speakerBoost", value)
                                }
                              />
                              <Label>Speaker Boost</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                isSelected={
                                  profile.voiceConfig
                                    .longMessageBackchanneling || false
                                }
                                onValueChange={(value) =>
                                  updateVoiceConfig(
                                    "longMessageBackchanneling",
                                    value
                                  )
                                }
                              />
                              <Label>Long Message Backchanneling</Label>
                            </div>
                          </div>
                        </div>

                        {/* Punctuation Breaks */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Punctuation Breaks
                          </h3>
                          <InputTags
                            value={profile.voiceConfig.punctuationBreaks || []}
                            onChange={(tags) =>
                              updateVoiceConfig("punctuationBreaks", tags)
                            }
                            placeholder="Add punctuation characters (e.g., ., !, ?)"
                          />
                        </div>

                        {/* Word Replacements */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                              Word Replacements
                            </h3>
                            <Button
                              variant="bordered"
                              size="sm"
                              onPress={() => addWordReplacement()}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Replacement
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(profile.voiceConfig.wordReplacements || []).map(
                              (replacement, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <Input
                                    placeholder="Original word"
                                    value={replacement.original}
                                    onValueChange={(value) =>
                                      updateWordReplacement(
                                        index,
                                        "original",
                                        value
                                      )
                                    }
                                  />
                                  <span>→</span>
                                  <Input
                                    placeholder="Replacement word"
                                    value={replacement.replacement}
                                    onValueChange={(value) =>
                                      updateWordReplacement(
                                        index,
                                        "replacement",
                                        value
                                      )
                                    }
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onPress={() => removeWordReplacement(index)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </Tab>

                    <Tab
                      key="transcription"
                      title={
                        <div className="flex items-center space-x-2">
                          <Settings className="w-4 h-4" />
                          <span>Transcription Settings</span>
                        </div>
                      }
                      className=""
                    >
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                      >
                        {/* Language Settings */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Language Settings
                          </h3>
                          <div className="space-y-2">
                            <Label>Transcription Language</Label>
                            <Select
                              selectedKeys={[
                                profile.transcriptionConfig.language || "en-US",
                              ]}
                              onSelectionChange={(value) =>
                                updateTranscriptionConfig(
                                  "language",
                                  value.currentKey
                                )
                              }
                            >
                              {Object.entries(languageMap).map(
                                ([key, value]) => (
                                  <SelectItem key={key}>
                                    {value.name}
                                  </SelectItem>
                                )
                              )}
                            </Select>
                          </div>
                        </div>

                        {/* Audio Processing */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Audio Processing
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                isSelected={
                                  profile.transcriptionConfig
                                    .inputVoiceEnhancer || false
                                }
                                onValueChange={(value) =>
                                  updateTranscriptionConfig(
                                    "inputVoiceEnhancer",
                                    value
                                  )
                                }
                              />
                              <Label>Input Voice Enhancer</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                isSelected={
                                  profile.transcriptionConfig
                                    .silenceDetection || false
                                }
                                onValueChange={(value) =>
                                  updateTranscriptionConfig(
                                    "silenceDetection",
                                    value
                                  )
                                }
                              />
                              <Label>Silence Detection</Label>
                            </div>
                          </div>
                        </div>

                        {/* Timing Settings */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">
                            Timing Settings
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label>
                                Utterance Threshold:{" "}
                                {profile.transcriptionConfig
                                  .utteranceThreshold?.[0] || 150}
                                ms
                              </Label>
                              <Slider
                                value={
                                  profile.transcriptionConfig
                                    .utteranceThreshold || [150]
                                }
                                onChange={(value) =>
                                  updateTranscriptionConfig(
                                    "utteranceThreshold",
                                    value
                                  )
                                }
                                maxValue={1000}
                                minValue={50}
                                step={25}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>
                                Timeout:{" "}
                                {profile.transcriptionConfig
                                  .timeoutSeconds?.[0] || 10}
                                s
                              </Label>
                              <Slider
                                value={
                                  profile.transcriptionConfig
                                    .timeoutSeconds || [10]
                                }
                                onChange={(value) =>
                                  updateTranscriptionConfig(
                                    "timeoutSeconds",
                                    value
                                  )
                                }
                                maxValue={60}
                                minValue={1}
                                step={1}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>
                                End Call After Filler:{" "}
                                {profile.transcriptionConfig
                                  .endCallAfterFillerPhrases?.[0] || 1}
                              </Label>
                              <Slider
                                value={
                                  profile.transcriptionConfig
                                    .endCallAfterFillerPhrases || [1]
                                }
                                onChange={(value) =>
                                  updateTranscriptionConfig(
                                    "endCallAfterFillerPhrases",
                                    value
                                  )
                                }
                                maxValue={10}
                                minValue={0}
                                step={1}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Keywords */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Keywords</h3>
                          <InputTags
                            value={profile.transcriptionConfig.keywords || []}
                            onChange={(keywords) =>
                              updateTranscriptionConfig("keywords", keywords)
                            }
                            placeholder="Add keywords for transcription"
                          />
                        </div>
                      </motion.div>
                    </Tab>
                  </Tabs>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export const VoiceProfileList: FC<{
  profiles: AdminSettingsType["voiceProfiles"];
  expandedProfiles: Set<string>;
  toggleProfileExpansion: (profileId: string) => void;
  deleteProfile: (profileId: string) => void;
  updateVoiceConfig: (
    profileId: string,
    field: keyof AdminVoiceType,
    value: any
  ) => void;
  updateTranscriptionConfig: (
    profileId: string,
    field: keyof AdminTranscriptionType,
    value: any
  ) => void;
  addWordReplacement: (profileId: string) => void;
  updateWordReplacement: (
    profileId: string,
    index: number,
    field: "original" | "replacement",
    value: string
  ) => void;
  removeWordReplacement: (profileId: string, index: number) => void;
  updateProfile: (
    profileId: string,
    updates: Partial<AdminSettingsType["voiceProfiles"][0]>
  ) => void;
}> = ({
  profiles,
  expandedProfiles,
  toggleProfileExpansion,
  deleteProfile,
  updateVoiceConfig,
  updateTranscriptionConfig,
  addWordReplacement,
  updateWordReplacement,
  removeWordReplacement,
  updateProfile,
}) => {
  return (
    <AnimatePresence>
      {profiles.map((profile) => {
        return (
          <VoiceProfileCard
            key={profile.id}
            profile={profile}
            expandedProfiles={expandedProfiles}
            toggleProfileExpansion={() => toggleProfileExpansion(profile.id)}
            deleteProfile={() => deleteProfile(profile.id)}
            updateProfile={(updates) => updateProfile(profile.id, updates)}
            updateVoiceConfig={(field, value) =>
              updateVoiceConfig(profile.id, field, value)
            }
            updateTranscriptionConfig={(field, value) =>
              updateTranscriptionConfig(profile.id, field, value)
            }
            addWordReplacement={() => addWordReplacement(profile.id)}
            updateWordReplacement={(index, field, value) =>
              updateWordReplacement(profile.id, index, field, value)
            }
            removeWordReplacement={(index) =>
              removeWordReplacement(profile.id, index)
            }
          />
        );
      })}
    </AnimatePresence>
  );
};

export function VoiceProfilesTab({
  voiceProfiles,
  onSave,
}: VoiceProfilesTabProps) {
  const [profiles, setProfiles] =
    useState<AdminSettingsType["voiceProfiles"]>(voiceProfiles);
  const [originalProfiles, setOriginalProfiles] =
    useState<AdminSettingsType["voiceProfiles"]>(voiceProfiles);
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(
    new Set()
  );
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const updateProfile = (
    profileId: string,
    updates: Partial<AdminSettingsType["voiceProfiles"][0]>
  ) => {
    setProfiles(
      profiles.map((p) => (p.id === profileId ? { ...p, ...updates } : p))
    );
  };

  const handleSave = async (syncVoiceSettings: boolean = false) => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await onSave(profiles, syncVoiceSettings);
      setOriginalProfiles(profiles);
      setNotification({
        type: "success",
        message: "Voice profiles saved successfully!",
      });
    } catch (error) {
      setNotification({
        type: "error",
        message: "Failed to save voice profiles. Please try again.",
      });
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setProfiles(originalProfiles);
    setIsAddingProfile(false);
    setExpandedProfiles(new Set());
  };

  const addNewProfile = () => {
    const newProfile: AdminSettingsType["voiceProfiles"][0] = {
      id: createId(),
      name: `Voice Profile ${profiles.length + 1}`,
      gender: "male",
      language: "en-US",
      voiceConfig: { ...defaultVoiceSettings },
      transcriptionConfig: { ...defaultTranscriptionSettings },
    };

    setProfiles([...profiles, newProfile]);
    setExpandedProfiles(new Set([...expandedProfiles, newProfile.id]));
    setIsAddingProfile(false);
  };

  const deleteProfile = (profileId: string) => {
    setProfiles(profiles.filter((p) => p.id !== profileId));
    setExpandedProfiles(
      new Set([...expandedProfiles].filter((id) => id !== profileId))
    );
  };

  const updateVoiceConfig = (
    profileId: string,
    field: keyof AdminVoiceType,
    value: any
  ) => {
    setProfiles(
      profiles.map((p) =>
        p.id === profileId
          ? { ...p, voiceConfig: { ...p.voiceConfig, [field]: value } }
          : p
      )
    );
  };

  const updateTranscriptionConfig = (
    profileId: string,
    field: keyof AdminTranscriptionType,
    value: any
  ) => {
    setProfiles(
      profiles.map((p) =>
        p.id === profileId
          ? {
              ...p,
              transcriptionConfig: { ...p.transcriptionConfig, [field]: value },
            }
          : p
      )
    );
  };

  const toggleProfileExpansion = (profileId: string) => {
    const newExpanded = new Set(expandedProfiles);
    if (newExpanded.has(profileId)) {
      newExpanded.delete(profileId);
    } else {
      newExpanded.add(profileId);
    }
    setExpandedProfiles(newExpanded);
  };

  const addWordReplacement = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      const current = profile.voiceConfig.wordReplacements || [];
      updateVoiceConfig(profileId, "wordReplacements", [
        ...current,
        { original: "", replacement: "" },
      ]);
    }
  };

  const updateWordReplacement = (
    profileId: string,
    index: number,
    field: "original" | "replacement",
    value: string
  ) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      const current = profile.voiceConfig.wordReplacements || [];
      const updated = [...current];
      updated[index] = { ...updated[index], [field]: value };
      updateVoiceConfig(profileId, "wordReplacements", updated);
    }
  };

  const removeWordReplacement = (profileId: string, index: number) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      const current = profile.voiceConfig.wordReplacements || [];
      updateVoiceConfig(
        profileId,
        "wordReplacements",
        current.filter((_, i) => i !== index)
      );
    }
  };

  // Track if there are any changes
  const hasChanges =
    JSON.stringify(profiles) !== JSON.stringify(originalProfiles);

  // Update when props change
  useEffect(() => {
    setProfiles(voiceProfiles);
    setOriginalProfiles(voiceProfiles);
  }, [voiceProfiles]);

  return (
    <div className="flex flex-col gap-6">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Header with Save Button */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between fixed md:sticky bottom-0 left-0 right-0 md:top-[64px] z-40 bg-background/95 supports-[backdrop-filter]:bg-background/60 backdrop-blur border-b border-default-200/60 p-4  md:py-2">
        <div>
          <h2 className="text-lg md:text-2xl font-bold">Voice Profiles</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Configure voice and transcription settings for interviews
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              variant="bordered"
              className="max-md:flex-1"
              onPress={handleReset}
              isDisabled={isSaving}
              size="sm"
            >
              Reset Changes
            </Button>
          )}
          <Button
            onPress={() => handleSave(false)}
            color="primary"
            isDisabled={!hasChanges || isSaving}
            size="sm"
            className="flex items-center gap-2 max-md:flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Profiles
              </>
            )}
          </Button>
          <Button
            onPress={() => handleSave(true)}
            color="primary"
            size="sm"
            isDisabled={!hasChanges || isSaving}
            className="flex items-center gap-2 max-md:flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save and Sync
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Profiles List */}
      <div className="space-y-4">
        <VoiceProfileList
          profiles={profiles}
          expandedProfiles={expandedProfiles}
          toggleProfileExpansion={toggleProfileExpansion}
          deleteProfile={deleteProfile}
          updateVoiceConfig={(profileId, field, value) =>
            updateVoiceConfig(profileId, field, value)
          }
          updateTranscriptionConfig={(profileId, field, value) =>
            updateTranscriptionConfig(profileId, field, value)
          }
          addWordReplacement={(profileId) => addWordReplacement(profileId)}
          updateWordReplacement={(profileId, index, field, value) =>
            updateWordReplacement(profileId, index, field, value)
          }
          removeWordReplacement={(profileId, index) =>
            removeWordReplacement(profileId, index)
          }
          updateProfile={(profileId, updates) =>
            updateProfile(profileId, updates)
          }
        />
      </div>

      {/* Add New Profile Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center"
      >
        <Button
          variant="bordered"
          onPress={addNewProfile}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Voice Profile
        </Button>
      </motion.div>
    </div>
  );
}
