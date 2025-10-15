import { db } from "@root/server/typedFirestore";
import { AdminSettingsType } from "@root/shared/zod-schemas";
import { ServiceError } from "./service-error.lib";
import {
  defaultTranscriptionSettings,
  defaultVoiceSettings,
} from "@root/shared/defaults";
import { tixae } from "./tixae.lib";

export type VoiceProfile = AdminSettingsType["voiceProfiles"][number];

export class AdminService {
  private static readonly ADMIN_SETTINGS_ID = "global";

  /**
   * Helper function to detect changes in voice profiles
   */
  private static detectVoiceProfileChanges(
    currentProfiles: VoiceProfile[],
    updatedProfiles: VoiceProfile[],
  ): VoiceProfile[] {
    if (!updatedProfiles || updatedProfiles.length === 0) {
      return [];
    }

    const changedVoices: VoiceProfile[] = [];

    for (const updatedProfile of updatedProfiles) {
      const currentProfile = currentProfiles.find(
        (p) => p.id === updatedProfile.id,
      );

      if (currentProfile) {
        const hasChanged =
          JSON.stringify(currentProfile) !== JSON.stringify(updatedProfile);
        if (hasChanged) {
          changedVoices.push(updatedProfile);
        }
      }
    }

    return changedVoices;
  }

  /**
   * Get admin settings, creating default if none exist
   */
  static async getAdminSettings(language?: string): Promise<AdminSettingsType> {
    try {
      const settings = await db.adminSettings.get(
        this.ADMIN_SETTINGS_ID as any,
      );

      if (!settings) {
        // Create default admin settings if none exist
        return await this.createDefaultAdminSettings();
      }

      return {
        ...settings.data,
        voiceProfiles: language
          ? settings.data?.voiceProfiles.filter(
              (profile) => profile.language === language,
            )
          : settings.data?.voiceProfiles,
      };
    } catch (error) {
      throw new ServiceError(
        "Failed to get admin settings",
        "[AdminService::getAdminSettings()]",
      );
    }
  }

  /**
   * Update admin settings
   */
  static async updateAdminSettings(
    updates: Partial<
      Pick<
        AdminSettingsType,
        "globalPrompts" | "greetingMessage" | "voiceProfiles"
      >
    >,
    syncVoiceSettings: boolean = false,
  ): Promise<AdminSettingsType> {
    try {
      const now = new Date();
      const currentSettings = await this.getAdminSettings();

      const updatedSettings: AdminSettingsType = {
        ...currentSettings,
        ...updates,
        updatedAt: now,
      };

      await db.adminSettings
        .ref(this.ADMIN_SETTINGS_ID as any)
        .set(updatedSettings);

      if (syncVoiceSettings) {
        await this.syncVoiceSettings(
          currentSettings.voiceProfiles || [],
          updates.voiceProfiles || [],
        );
      }

      return updatedSettings;
    } catch (error) {
      throw new ServiceError(
        "Failed to update admin settings",
        "[AdminService::updateAdminSettings()]",
      );
    }
  }

  /**
   * Create default admin settings
   */
  private static async createDefaultAdminSettings(): Promise<AdminSettingsType> {
    try {
      const now = new Date();
      const defaultSettings: AdminSettingsType = {
        id: this.ADMIN_SETTINGS_ID,
        globalPrompts: "",
        greetingMessage: "",
        voiceProfiles: [
          {
            id: "default",
            name: "Default Voice Profile",
            gender: "male",
            language: "en-US",
            voiceConfig: defaultVoiceSettings,
            transcriptionConfig: defaultTranscriptionSettings,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      await db.adminSettings
        .ref(this.ADMIN_SETTINGS_ID as any)
        .set(defaultSettings);

      return defaultSettings;
    } catch (error) {
      throw new ServiceError(
        "Failed to create default admin settings",
        "[AdminService::createDefaultAdminSettings()]",
      );
    }
  }

  /**
   * Build voice config for sync operations
   */
  private static buildSyncVoiceConfig(voiceProfile: any, aiAssistant?: any) {
    if (voiceProfile.voiceConfig.provider === "google-live") {
      return {
        config: {
          recordAudio: true,
          backgroundNoise: voiceProfile.voiceConfig.backgroundNoise || "none",
          enableWebCalling: true,
        },
        transcriber: {
          modelId: "nova-3-general",
          language: voiceProfile.transcriptionConfig.language || "en-us",
          provider: "deepgram" as const,
          platformSpecific: {
            deepgram: {
              keywords: voiceProfile.transcriptionConfig.keywords || [],
            },
            googleCloud: { keywords: [] },
          },
          utteranceThreshold:
            voiceProfile.transcriptionConfig.utteranceThreshold?.[0] || 400,
          inputVoiceEnhancer:
            voiceProfile.transcriptionConfig.inputVoiceEnhancer,
        },
        speechGen: {
          provider: "google-live" as const,
          punctuationBreaks: voiceProfile.voiceConfig.punctuationBreaks || [],
        },
      };
    } else {
      return {
        speechGen: {
          provider: "elevenlabs" as const,
          apiKey: process.env.ELEVENLABS_API_KEY,
          voiceId: voiceProfile.voiceConfig.selectedVoice,
          language: voiceProfile.language || "en-us",
          wordsReplacements:
            voiceProfile.voiceConfig.wordReplacements?.map((word: any) => ({
              word: word.original,
              replacement: word.replacement,
            })) || [],
          enableLongMessageBackchannelling:
            voiceProfile.voiceConfig.longMessageBackchanneling || false,
          punctuationBreaks: voiceProfile.voiceConfig.punctuationBreaks || [],
          platformSpecific: {
            elevenLabs: {
              stability: voiceProfile.voiceConfig.stability?.[0] || 0.5,
              similarity_boost:
                voiceProfile.voiceConfig.similarityBoost?.[0] || 0.5,
              use_speaker_boost: voiceProfile.voiceConfig.speakerBoost || false,
              speed: voiceProfile.voiceConfig.speed?.[0] || 1,
              style: voiceProfile.voiceConfig.styleExaggeration?.[0] || 0,
            },
          },
        },
        config: {
          recordAudio: true,
          backgroundNoise: voiceProfile.voiceConfig.backgroundNoise || "none",
          enableWebCalling: true,
        },
        transcriber: {
          inputVoiceEnhancer:
            voiceProfile.transcriptionConfig.inputVoiceEnhancer,
          provider: "deepgram" as const,
          modelId: "nova-2",
          language: voiceProfile.transcriptionConfig.language || "en-us",
          utteranceThreshold:
            voiceProfile.transcriptionConfig.utteranceThreshold?.[0] || 0,
          platformSpecific: {
            deepgram: {
              language: voiceProfile.transcriptionConfig.language || "en-us",
              keywords: voiceProfile.transcriptionConfig.keywords || [],
            },
          },
        },
      };
    }
  }

  /**
   * Sync voice settings to agents in convocore
   */

  private static async syncVoiceSettings(
    currentVoiceProfiles: VoiceProfile[],
    updatedVoiceProfiles: VoiceProfile[],
  ) {
    console.log("SYNCING VOICE SETTINGS");

    try {
      const changedVoices = this.detectVoiceProfileChanges(
        currentVoiceProfiles,
        updatedVoiceProfiles,
      );

      console.log("CHANGED VOICES", changedVoices.length);

      if (changedVoices.length === 0) {
        return;
      }

      const workspaces = await db.workspaces.all();

      console.log("WORKSPACES", workspaces.length);

      const voiceProfileIds = changedVoices.map(
        (voice) => voice.voiceConfig.selectedVoice,
      );

      const workspacesNeedingUpdate = workspaces.filter(
        ({ data: workspace }) =>
          workspace.settings?.interviewConfig?.aiAssistant?.voiceId &&
          voiceProfileIds.includes(
            workspace.settings.interviewConfig.aiAssistant.voiceId,
          ),
      );

      const promises = workspacesNeedingUpdate.map(
        async ({ data: workspace }) => {
          const agentId = workspace.associatedAgentId;

          const voiceProfile = changedVoices.find(
            (voice) =>
              voice.voiceConfig.selectedVoice ===
              workspace.settings?.interviewConfig?.aiAssistant?.voiceId,
          );

          if (!voiceProfile) {
            return;
          }

          return tixae.updateAgent(agentId as string, {
            globalOptions: {
              silenceDetection: {
                enabled: voiceProfile.transcriptionConfig.silenceDetection,
                timeoutSeconds:
                  voiceProfile.transcriptionConfig.timeoutSeconds?.[0] || 0,
                endCallAfterNPhrases:
                  voiceProfile.transcriptionConfig
                    .endCallAfterFillerPhrases?.[0] || 0,
              },
            },
            voiceConfig: this.buildSyncVoiceConfig(
              voiceProfile,
              workspace.settings?.interviewConfig?.aiAssistant,
            ) as any,
            ...(voiceProfile.voiceConfig.provider === "google-live" && {
              enableNodes: true,
              nodesSettings: {
                geminiLiveOptions: {
                  sessionConfig: {
                    model: "gemini-2.5-flash-preview-native-audio-dialog",
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                      voiceConfig: {
                        prebuiltVoiceConfig: {
                          voiceName:
                            voiceProfile.voiceConfig.googleLiveVoice || "Puck",
                        },
                      },
                    },
                    ...(voiceProfile.voiceConfig.inputAudioTranscription && {
                      inputAudioTranscription: {},
                    }),
                    ...(voiceProfile.voiceConfig.outputAudioTranscription && {
                      outputAudioTranscription: {},
                    }),
                    realtimeInputConfig: {
                      automaticActivityDetection: {
                        disabled: !voiceProfile.voiceConfig.enableVAD,
                        startOfSpeechSensitivity:
                          voiceProfile.voiceConfig.startOfSpeechSensitivity ||
                          "START_SENSITIVITY_MEDIUM",
                        endOfSpeechSensitivity:
                          voiceProfile.voiceConfig.endOfSpeechSensitivity ||
                          "END_SENSITIVITY_MEDIUM",
                        prefixPaddingMs:
                          voiceProfile.voiceConfig.prefixPaddingMs || 20,
                        silenceDurationMs:
                          voiceProfile.voiceConfig.silenceDurationMs || 100,
                      },
                    },
                  },
                  apiConfig: { apiKey: "" },
                  internal: { debug: false, enableLogging: true },
                },
              } as any,
            }),
          });
        },
      );

      console.log("PROMISES", promises.length);

      await Promise.all(promises);
    } catch (error) {
      throw new ServiceError(
        "Failed to sync voice settings",
        "[AdminService::syncVoiceSettings()]",
      );
    }
  }
}
