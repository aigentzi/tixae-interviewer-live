import axios, { AxiosError, AxiosInstance } from "axios";
import { ServiceError } from "./service-error.lib";
import { AdminSettingsType, AgentType } from "@root/shared/zod-schemas";

class TixaeAgent {
  private readonly baseUrl: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(private readonly apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = (process.env.QRHR_AGENT_VG_DOCKER_URL || "") + "/v3";
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  private buildVoiceConfig(
    voiceProfile: AdminSettingsType["voiceProfiles"][number]
  ) {
    if (voiceProfile.voiceConfig.provider === "google-live") {
      return {
        config: {
          backgroundNoise: voiceProfile.voiceConfig.backgroundNoise,
          recordAudio: false,
          enableWebCalling: true,
        },
        transcriber: {
          modelId: "nova-3-general",
          language: voiceProfile.transcriptionConfig.language,
          provider: "deepgram",
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
          provider: "google-live",
          punctuationBreaks: voiceProfile.voiceConfig.punctuationBreaks || [],
        },
      };
    } else {
      return {
        config: {
          backgroundNoise: voiceProfile.voiceConfig.backgroundNoise,
          recordAudio: false,
          enableWebCalling: true,
        },
        transcriptionConfig: {
          provider: "deepgram",
          language: voiceProfile.transcriptionConfig.language,
          utteranceThreshold:
            voiceProfile.transcriptionConfig.utteranceThreshold?.[0] || 0,
          inputVoiceEnhancer:
            voiceProfile.transcriptionConfig.inputVoiceEnhancer,
          platformSpecific: {
            deepgram: {
              keywords: voiceProfile.transcriptionConfig.keywords,
            },
          },
        },
        speechGen: {
          provider: "elevenlabs",
          modelId: "eleven_flash_v2_5",
          voiceId: voiceProfile.voiceConfig.selectedVoice,
          punctuationBreaks: voiceProfile.voiceConfig.punctuationBreaks,
          wordReplacements: voiceProfile.voiceConfig.wordReplacements,
          enableLongMessageBackchannelling:
            voiceProfile.voiceConfig.longMessageBackchanneling,
          platformSpecific: {
            elevenLabs: {
              stability: voiceProfile.voiceConfig.stability?.[0] || 0,
              similarity_boost:
                voiceProfile.voiceConfig.similarityBoost?.[0] || 0,
              use_speaker_boost: voiceProfile.voiceConfig.speakerBoost,
              style: voiceProfile.voiceConfig.styleExaggeration?.[0] || 0,
              speed: voiceProfile.voiceConfig.speed?.[0] || 0,
            },
          },
        },
      };
    }
  }

  public async getAgent(agentId: string) {
    try {
      const response = await this.axiosInstance.get(`/agents/${agentId}`);
      return response.data;
    } catch (error: any) {
      throw new ServiceError(
        error instanceof AxiosError
          ? JSON.stringify(error.response?.data)
          : error.message,
        "Failed to get agent"
      );
    }
  }

  public async updateAgent(agentId: string, agent: Partial<AgentType>) {
    try {
      const response = await this.axiosInstance.patch(`/agents/${agentId}`, {
        agent: { ...agent },
      });
      console.log(
        "UPDATED AGENT REQUEST",
        JSON.stringify(
          {
            agent: { ...agent },
          },
          null,
          2
        )
      );
      console.log(
        "UPDATED AGENT RESPONSE",
        JSON.stringify(response.data, null, 2)
      );
      return response.data;
    } catch (error: any) {
      throw new ServiceError(
        error instanceof AxiosError
          ? JSON.stringify(error.response?.data)
          : error.message,
        "Failed to update agent"
      );
    }
  }

  public async createAgent(agentData: {
    title: string;
    description: string;
    globalPrompts: string;
    greetingMessage: string;
    voiceProfile: AdminSettingsType["voiceProfiles"][number];
  }): Promise<{
    data: {
      ID: string;
      title: string;
      description: string;
      [key: string]: any;
    };
    success: boolean;
    message: "Agent created successfully";
  }> {
    try {
      const response = await this.axiosInstance.post("/agents", {
        agent: {
          title: agentData.title,
          description: `${
            agentData.description || ""
          } This agent is coming from Interviewer.tixae.ai`,
          ownerID: process.env.QRHR_WORKSPACE_ID || "",
          systemPrompt: agentData.globalPrompts,
          agentPlatform: "vg",
          nodes: [
            {
              name: "Start",
              description: "Start of the conversation",
              type: "start",
              id: "__start__",
              instructions: agentData.globalPrompts,
              llmConfig: {
                modelId: "gpt-4o-mini",
                temperature: 0.5,
                maxTokens: 1000,
              },
              startConfig: {
                initialMessage:
                  agentData.greetingMessage || agentData.globalPrompts,
              },
            },
          ],
          globalOptions: {
            silenceDetection: {
              enabled:
                agentData.voiceProfile.transcriptionConfig.silenceDetection,
              timeoutSeconds:
                agentData.voiceProfile.transcriptionConfig
                  .timeoutSeconds?.[0] || 0,
              endCallAfterNPhrases:
                agentData.voiceProfile.transcriptionConfig
                  .endCallAfterFillerPhrases?.[0] || 0,
              voiceSpecific: {
                maxLengthWithoutPunctuation:
                  agentData.voiceProfile.voiceConfig
                    .maxLengthWithoutPunctuation?.[0] || 0,
              },
            },
          },
          voiceConfig: this.buildVoiceConfig(agentData.voiceProfile),
          enableNodes: true,
          ...(agentData.voiceProfile.voiceConfig.provider === "google-live" && {
            nodesSettings: {
              geminiLiveOptions: {
                sessionConfig: {
                  model: "gemini-2.5-flash-preview-native-audio-dialog",
                  responseModalities: ["AUDIO"],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: {
                        voiceName:
                          agentData.voiceProfile.voiceConfig.googleLiveVoice ||
                          "Puck",
                      },
                    },
                  },
                  ...(agentData.voiceProfile.voiceConfig
                    .inputAudioTranscription && {
                    inputAudioTranscription: {},
                  }),
                  ...(agentData.voiceProfile.voiceConfig
                    .outputAudioTranscription && {
                    outputAudioTranscription: {},
                  }),
                  realtimeInputConfig: {
                    automaticActivityDetection: {
                      disabled: !agentData.voiceProfile.voiceConfig.enableVAD,
                      startOfSpeechSensitivity:
                        agentData.voiceProfile.voiceConfig
                          .startOfSpeechSensitivity ||
                        "START_SENSITIVITY_MEDIUM",
                      endOfSpeechSensitivity:
                        agentData.voiceProfile.voiceConfig
                          .endOfSpeechSensitivity || "END_SENSITIVITY_MEDIUM",
                      prefixPaddingMs:
                        agentData.voiceProfile.voiceConfig.prefixPaddingMs ||
                        20,
                      silenceDurationMs:
                        agentData.voiceProfile.voiceConfig.silenceDurationMs ||
                        100,
                    },
                  },
                },
                apiConfig: { apiKey: "" },
                internal: { debug: false, enableLogging: true },
              },
            },
          }),
        },
      });
      return response.data;
    } catch (error: any) {
      throw new ServiceError(
        error instanceof AxiosError
          ? JSON.stringify(error.response?.data)
          : error.message,
        "TixaeAgent.createAgent()"
      );
    }
  }
}

export const tixae = new TixaeAgent(process.env.QRHR_API_KEY || "");
