import { ServiceError } from "@root/lib/service-error.lib";
import { tixae } from "@root/lib/tixae.lib";
import { createTRPCRouter, protectedProcedure } from "@root/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from "fs";
import { agentSchema } from "@root/shared/zod-schemas";
import { AdminService } from "@root/lib/admin.lib";

export const tixaeRouter = createTRPCRouter({
  getVoices: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/tixae/voices",
        tags: ["tixae"],
        summary: "Get voices from Tixae",
        description: "Get voices from Tixae",
      },
    })
    .input(
      z.object({
        language: z.string().optional().nullable(),
      })
    )
    .output(
      z.array(
        z.object({
          voiceId: z.string(),
          name: z.string(),
          previewUrl: z.string().nullable(),
          filters: z.object({
            accent: z.string().optional().nullable(),
            gender: z.string().optional().nullable(),
            useCase: z.string().optional().nullable(),
            language: z.array(z.string()).optional().nullable(),
          }),
        })
      )
    )
    .query(async ({ input }) => {
      try {
        const elevenlabs = new ElevenLabsClient({
          apiKey: process.env.ELEVENLABS_API_KEY || "",
        });

        const voices = await elevenlabs.voices.search({
          includeTotalCount: true,
          pageSize: 100,
          search: input.language || "",
        });

        return voices.voices
          .filter((voice) => {
            if (input.language) {
              return (
                (voice.verifiedLanguages?.filter((language) =>
                  language.language?.includes(input.language || "")
                ).length || 0) > 0
              );
            }
            return true;
          })
          .map((voice) => ({
            voiceId: voice.voiceId,
            name: voice.name || "",
            previewUrl: voice.previewUrl || null,
            filters: {
              language:
                voice.verifiedLanguages?.map((language) => language.language) ||
                null,
              gender: voice.labels?.gender || null,
              accent: voice.labels?.accent || null,
              useCase: voice.labels?.useCase || null,
            },
          }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "tixaeRouter.getVoices()")
            .message,
        });
      }
    }),

  getAudioLibrary: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/tixae/audio-library",
        tags: ["tixae"],
        summary: "Get audio library from Tixae",
        description: "Get audio library from Tixae",
      },
    })
    .input(
      z.object({
        sampleText: z.string().optional().nullable(),
      })
    )
    .output(
      z.array(
        z.object({
          voiceId: z.string(),
          name: z.string(),
          previewUrl: z.string().optional().nullable(),
          filters: z.object({
            accent: z.string().optional().nullable(),
            gender: z.string().optional().nullable(),
            useCase: z.string().optional().nullable(),
            language: z.array(z.string()).optional().nullable(),
          }),
        })
      )
    )
    .mutation(async ({ input }) => {
      try {
        const elevenlabs = new ElevenLabsClient({
          apiKey: process.env.ELEVENLABS_API_KEY || "",
        });

        const voices = await elevenlabs.voices.getAll({
          showLegacy: true,
        });

        console.log("voices from elevenlabs", voices.voices.length);

        const voicesReversed = voices.voices.reverse();

        console.log("voicesReversed from elevenlabs", voicesReversed[0]);

        return voicesReversed.map((voice: any) => ({
          voiceId: voice.voiceId,
          name: voice.name,
          previewUrl: voice.previewUrl,
          filters: {
            accent: voice.labels.accent,
            gender: voice.labels.gender,
            useCase: voice.labels.useCase,
            language:
              voice.verified_languages?.map((lang: any) => lang.language) ||
              null,
          },
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "tixaeRouter.getVoices()")
            .message,
        });
      }
    }),

  getVoice: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/tixae/voices/{voiceId}",
        tags: ["tixae"],
        summary: "Get a voice",
        description: "Get a voice",
      },
    })
    .input(
      z.object({
        voiceId: z.string(),
      })
    )
    .output(
      z.object({
        voiceId: z.string(),
        name: z.string(),
        previewUrl: z.string().nullable(),
        filters: z.object({
          accent: z.string().optional().nullable(),
          gender: z.string().optional().nullable(),
          useCase: z.string().optional().nullable(),
          language: z.array(z.string()).optional().nullable(),
        }),
      })
    )
    .query(async ({ input }) => {
      try {
        const elevenlabs = new ElevenLabsClient({
          apiKey: process.env.ELEVENLABS_API_KEY || "",
        });
        const voice = await elevenlabs.voices.get(input.voiceId);
        return {
          voiceId: voice.voiceId,
          name: voice.name || "",
          previewUrl: voice.previewUrl || null,
          filters: {
            language:
              voice.verifiedLanguages?.map((language) => language.language) ||
              null,
            gender: voice.labels?.gender || null,
            accent: voice.labels?.accent || null,
            useCase: voice.labels?.useCase || null,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "tixaeRouter.getVoice()")
            .message,
        });
      }
    }),

  useOwnVoice: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/tixae/use-own-voice",
      },
    })
    .input(
      z.object({
        files: z.array(z.any()),
        name: z.string(),
        description: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
        voiceId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const elevenlabs = new ElevenLabsClient({
          apiKey: process.env.ELEVENLABS_API_KEY || "",
        });

        // Convert the serialized file data to Buffer for ElevenLabs
        const fileStreams = input.files.map((fileData: any) => {
          let buffer: Buffer;

          // If it's already a Buffer, use it directly
          if (Buffer.isBuffer(fileData)) {
            buffer = fileData;
          }
          // If it's an object with data property (serialized File), convert it
          else if (fileData && typeof fileData === "object" && fileData.data) {
            buffer = Buffer.from(fileData.data);
          }
          // If it's a base64 string, decode it
          else if (typeof fileData === "string") {
            buffer = Buffer.from(fileData, "base64");
          }
          // If it's an array of numbers (Uint8Array), convert it
          else if (Array.isArray(fileData)) {
            buffer = Buffer.from(fileData);
          } else {
            throw new Error("Unsupported file format");
          }

          // Create a readable stream from the buffer
          const { Readable } = require("stream");
          const stream = new Readable();
          stream.push(buffer);
          stream.push(null); // End the stream
          return stream;
        });

        const voices = await elevenlabs.voices.ivc.create({
          files: fileStreams,
          name: input.name,
          removeBackgroundNoise: true,
          description: input.description,
          labels: JSON.stringify({
            gender: "male",
            accent: "egyptian",
            useCase: "interviewing",
            language: "en",
          }),
        });

        console.log("Voice created", voices);

        return {
          success: true,
          message: "Voice created successfully",
          voiceId: voices.voiceId,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "tixaeRouter.useOwnVoice()")
            .message,
        });
      }
    }),

  updateAgent: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/tixae/agents/{agentId}",
        tags: ["tixae"],
        summary: "Update an agent",
        description: "Update an agent",
      },
    })
    .input(
      z.object({
        agentId: z.string(),
        agent: agentSchema.partial(),
      })
    )
    .output(
      z.object({
        agentId: z.string(),
        success: z.boolean(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await tixae.updateAgent(input.agentId, input.agent);
        return {
          agentId: input.agentId,
          success: true,
          message: "Agent updated successfully",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "tixaeRouter.updateAgent()")
            .message,
        });
      }
    }),

  getAgentVoiceConfig: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/tixae/agents/{agentId}",
        tags: ["tixae"],
        summary: "Get an agent",
        description: "Get an agent",
      },
    })
    .input(
      z.object({
        agentId: z.string(),
      })
    )
    .output(
      z.object({
        language: z.string().optional().nullable(),
        voiceId: z.string().optional().nullable(),
      })
    )
    .query(async ({ input }) => {
      try {
        const response = await tixae.getAgent(input.agentId);
        if (!response.data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Agent with id: ${input.agentId} not found`,
          });
        }

        const speechGenConfig = response?.data?.voiceConfig?.speechGen;

        return {
          language: speechGenConfig?.language || "en",
          voiceId: speechGenConfig?.voiceId || "SOYHLrjzK2X1ezoPC6cr",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "tixaeRouter.getAgent()")
            .message,
        });
      }
    }),

  createTixaeAgent: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/tixae/agents",
        tags: ["tixae"],
        summary:
          "Create a Tixae agent which will be used as AI Interview Assistant",
        description:
          "Create a Tixae agent which will be used as AI Interview Assistant",
      },
    })
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .output(
      z.object({
        agent: z.any(),
        success: z.boolean(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const adminSettings = await AdminService.getAdminSettings();

        const selectedVoiceProfile =
          adminSettings.voiceProfiles.find(
            (profile) => profile.id === "default"
          ) || adminSettings.voiceProfiles[0];

        if (!selectedVoiceProfile) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No voice profile available in admin settings",
          });
        }

        const response = await tixae.createAgent({
          title: input.title,
          description: input.description,
          globalPrompts: adminSettings.globalPrompts,
          greetingMessage: adminSettings.greetingMessage,
          voiceProfile: selectedVoiceProfile,
        });

        return {
          agent: response.data,
          success: true,
          message: "Agent created successfully",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "tixaeRouter.createTixaeAgent()"
          ).message,
        });
      }
    }),
});
