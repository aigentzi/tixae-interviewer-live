import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@root/trpc/trpc";

import { createId } from "@paralleldrive/cuid2";
import { db } from "@root/server/typedFirestore";
import {
  brandingConfigurationScheme,
  workspaceSchema,
  WorkspaceSettingsColors,
  workspaceSettingsScheme,
} from "@root/shared/zod-schemas";
import { TRPCError } from "@trpc/server";
import openai from "openai";
import { stripeService } from "@root/lib/stripe.lib";
import { tixae } from "@root/lib/tixae.lib";
import { ServiceError } from "@root/lib/service-error.lib";
import { workspace } from "@root/lib/workspace.lib";
import { AdminService } from "@root/lib/admin.lib";
import { sendAntiSpamEmail } from "@root/server/utils/resend.util";
import { getAuth } from "firebase-admin/auth";
import { serverApp } from "@root/server/firebase";
import { getAppUrl } from "@root/shared/utils";

// Define member role type
const MemberRole = z.enum(["OWNER", "ADMIN", "MEMBER", "PENDING"]);

// Helper function to build voice config for workspace sync
function buildWorkspaceVoiceConfig(voiceProfile: any, aiAssistant?: any) {
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
        inputVoiceEnhancer: voiceProfile.transcriptionConfig.inputVoiceEnhancer,
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
        voiceId: aiAssistant?.voiceId,
        language: aiAssistant?.language || "en-us",
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
        inputVoiceEnhancer: voiceProfile.transcriptionConfig.inputVoiceEnhancer,
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

export const workspaceRouter = createTRPCRouter({
  create: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/workspaces",
        tags: ["workspaces"],
        summary: "Create a new workspace",
        description: "Create a new workspace",
      },
    })
    .input(
      z.object({
        name: z.string(),
        ownerId: z.string(),
      }),
    )
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        ownerId: z.string(),
        members: z.array(z.string()),
        createdAt: z.date(),
        updatedAt: z.date(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Validate input
        if (!input.name?.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Workspace name is required",
          });
        }

        if (!input.ownerId || input.ownerId !== ctx.user.uid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only create workspaces for yourself",
          });
        }

        // Check if user already has workspaces to prevent duplicates during auto-creation
        const existingWorkspaces = await db.workspaces.query(($) => [
          $.field("ownerId").eq(ctx.user.uid),
        ]);

        // Additional check: prevent duplicate workspace names for the same user
        const duplicateNameWorkspace = existingWorkspaces.find(
          (workspace) => workspace.data.name === input.name,
        );

        if (duplicateNameWorkspace) {
          console.log(
            `Workspace with name "${input.name}" already exists for user ${ctx.user.uid}`,
          );
          throw new TRPCError({
            code: "CONFLICT",
            message: `A workspace named "${input.name}" already exists`,
          });
        }

        console.log(
          `Creating workspace for user ${ctx.user.uid}. Existing workspaces: ${existingWorkspaces.length}`,
        );

        const stripeCustomerId = await stripeService().createCustomer(
          ctx.user.email || "",
          ctx.user.displayName || "",
        );

        const newWorkspace = await workspace.createWorkspace({
          name: input.name,
          ownerId: input.ownerId,
          email: ctx.user.email || "",
          stripeCustomerId: stripeCustomerId.id,
        });

        console.log(
          `Successfully created workspace ${newWorkspace.id} for user ${ctx.user.uid}`,
        );

        return newWorkspace;
      } catch (error) {
        console.error("Error creating workspace:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create workspace",
        });
      }
    }),

  getWorkspaceSettingsById: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/workspaces/{workspaceId}/settings",
        tags: ["workspaces"],
        summary: "Get a workspace settings using workspace id",
        description: "Get a workspace settings using workspace id",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      }),
    )
    .output(
      z.object({
        workspaceSettings: workspaceSchema
          .pick({ settings: true })
          .shape.settings.nullable(),
        associatedAgent: z.string().optional().nullable(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        if (!workspace.data.associatedAgentId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Workspace can't make interviews because it has no agent",
          });
        }

        return {
          workspaceSettings: workspace.data.settings,
          associatedAgent: workspace.data.associatedAgentId,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Error getting workspace settings",
        });
      }
    }),

  getByUserId: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/workspaces/{userId}",
        tags: ["workspaces"],
        summary: "Get workspaces by user id",
        description: "Get workspaces by user id",
      },
    })
    .input(z.void())
    .output(
      z.object({
        workspaces: z.array(workspaceSchema),
      }),
    )
    .query(async ({ ctx }) => {
      try {
        const workspacesRef = await db.workspaces.query(($) => [
          $.field("members").contains(ctx.user.email || ""),
        ]);

        const workspaces = workspacesRef.map((workspace) => {
          const data = {
            ...workspace.data,
            id: workspace.ref.id,
            // Ensure dates are proper Date objects
            createdAt:
              workspace.data.createdAt instanceof Date
                ? workspace.data.createdAt
                : new Date(workspace.data.createdAt),
            updatedAt:
              workspace.data.updatedAt instanceof Date
                ? workspace.data.updatedAt
                : workspace.data.updatedAt
                  ? new Date(workspace.data.updatedAt)
                  : null,
            // Ensure required fields have defaults
            members: workspace.data.members || [],
          };

          // Clean up null values in settings to prevent validation errors
          if (data.settings?.interviewConfig?.aiAssistant) {
            const aiAssistant = data.settings.interviewConfig.aiAssistant;
            if (aiAssistant.avatar === null) {
              aiAssistant.avatar = undefined;
            }
            if (aiAssistant.name === null) {
              aiAssistant.name = undefined;
            }
            if (aiAssistant.language === null) {
              aiAssistant.language = undefined;
            }
            if (aiAssistant.voiceId === null) {
              aiAssistant.voiceId = undefined;
            }
          }

          return data;
        });

        // Validate the data before returning
        const validationResult = z
          .object({
            workspaces: z.array(workspaceSchema),
          })
          .safeParse({ workspaces });

        if (!validationResult.success) {
          console.error(
            "Workspace validation failed:",
            validationResult.error.errors,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Workspace data validation failed",
          });
        }

        console.log(
          `Successfully validated ${workspaces.length} workspaces for user ${ctx.user.uid}`,
        );

        return {
          workspaces,
        };
      } catch (error) {
        console.error("Error getting workspaces", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error getting workspaces",
        });
      }
    }),

  useBrandingFromUrl: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/workspaces/{workspaceId}/use-branding-from-url",
        tags: ["workspaces"],
        summary: "Use branding from URL",
        description: "Use branding from URL",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        url: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        brandingConfig: brandingConfigurationScheme,
        error: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspace = await db.workspaces.get(input.workspaceId as any);
      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }
      if (!workspace.data.members.includes(ctx.user.email || "")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this workspace",
        });
      }

      // const brandingConfig = workspac.data.settings?.brandingConfig;
      // if (!brandingConfig) {e
      //   throw new TRPCError({
      //     code: "BAD_REQUEST",
      //     message: "Workspace does not have branding config",
      //   });
      // }

      const html = await fetch(
        input.url.startsWith("http") ? input.url : `https://${input.url}`,
      ).then((res) => res.text());

      const aiResponse = await new openai.OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      }).chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `YOU ARE A PROFESSIONAL BRANDING EXTRACTOR. YOU ARE GIVEN A URL AND YOU NEED TO EXTRACT THE CORRECT THEME COLOR AND LOGO FROM THE URL + THE COMPANIES NAME.
          Extract the theme color and the logo from the following html: ${html} and return the result in JSON format.
          MAKE SURE TO USE THE CORRECT JSON FORMAT.
          MAKE SURE TO EXTRACT THE CORRECT THEME COLOR AND LOGO FROM THE URL + THE COMPANIES NAME.
          REUTRN AN ERROR IF YOU CAN'T EXTRACT THE CORRECT THEME COLOR AND LOGO FROM THE URL + THE COMPANIES NAME.
          IF YOU CAN'T EXTRACT THE THEME COLOR YOU CAN USE THE DEFAULT COLOR FOR THE COMPANY.
          If you can't extract the correct theme color and logo from the URL + the companies name, return an error message in the JSON format and also the reason why you can't extract the correct theme color and logo.
          The JSON should have the following fields: themeColor should be 6 diffirent colors {primary, secondary, default, warning, success, danger}, logo, url, name`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const aiResponseJson = JSON.parse(
        aiResponse.choices[0].message.content || "{}",
      );
      const brandingConfig = {
        themeColor: aiResponseJson.themeColor as WorkspaceSettingsColors,
        logo: aiResponseJson.logo as string,
        url: input.url,
        useStyleFromUrl: true,
      };

      if (aiResponseJson.error) {
        return {
          success: false,
          brandingConfig: brandingConfig,
          error: aiResponseJson.error,
          reason: aiResponseJson.reason,
        };
      }

      // await db.workspaces.update(input.workspaceId as any, {
      //   settings: {
      //     ...workspace.data.settings,
      //     brandingConfig: brandingConfig,
      //   },
      // });

      return { success: true, brandingConfig: brandingConfig };
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/workspaces/{workspaceId}",
        tags: ["workspaces"],
        summary: "Update a workspace",
        description: "Update a workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().optional(),
        members: z.array(z.string()).optional(),
        settings: workspaceSettingsScheme,
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("🔍 [WORKSPACE_UPDATE] Attempting to update workspace:");
        console.log("🔹 Workspace ID:", input.workspaceId);
        console.log("🔹 User ID:", ctx.user.uid);
        console.log("🔹 Settings keys:", Object.keys(input.settings || {}));

        const workspace = await db.workspaces.get(input.workspaceId as any);
        console.log("🔹 Workspace found:", !!workspace);

        if (!workspace) {
          console.error(
            "❌ [WORKSPACE_UPDATE] Workspace not found in database",
          );
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        console.log("🔹 Workspace data:", {
          id: workspace.ref.id,
          ownerId: workspace.data.ownerId,
          name: workspace.data.name,
        });

        // if (workspace.data.ownerId !== ctx.user.uid) {
        //   console.error(
        //     "❌ [WORKSPACE_UPDATE] Permission denied - wrong owner"
        //   );
        //   throw new TRPCError({
        //     code: "FORBIDDEN",
        //     message: "You don't have access to this workspace",
        //   });
        // }

        if (input.settings?.interviewConfig?.aiAssistant?.voiceId) {
          console.log("🎤 [WORKSPACE_UPDATE] Updating agent voice:", {
            agentId: workspace.data.associatedAgentId,
            voiceId: input.settings.interviewConfig.aiAssistant.voiceId,
            language:
              input.settings.interviewConfig.aiAssistant.language || "en-us",
          });

          let agentId = workspace.data.associatedAgentId;
          const adminSettings = await AdminService.getAdminSettings();
          const voiceProfile =
            adminSettings.voiceProfiles.find(
              (profile) =>
                profile.name ===
                input.settings?.interviewConfig?.aiAssistant?.name,
            ) || adminSettings.voiceProfiles[0];

          // If workspace doesn't have an agent, create one
          if (!agentId) {
            console.log(
              "🤖 [WORKSPACE_UPDATE] No agent found, creating new agent...",
            );
            try {
              const tixaeAgent = await tixae.createAgent({
                title: workspace.data.name,
                description: workspace.data.name,
                voiceProfile: voiceProfile,
                globalPrompts: adminSettings.globalPrompts || "",
                greetingMessage: adminSettings.greetingMessage || "",
              });

              if (tixaeAgent?.data?.ID) {
                agentId = tixaeAgent.data.ID;
                console.log(
                  "✅ [WORKSPACE_UPDATE] Created new agent:",
                  agentId,
                );

                // Update workspace with the new agent ID
                await db.workspaces.update(input.workspaceId as any, {
                  associatedAgentId: agentId,
                });
                console.log(
                  "💾 [WORKSPACE_UPDATE] Saved agent ID to workspace",
                );
              } else {
                throw new Error("Failed to create agent - no ID returned");
              }
            } catch (error) {
              console.error(
                "❌ [WORKSPACE_UPDATE] Failed to create agent:",
                error,
              );
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create agent for workspace",
              });
            }
          }

          // Now update the agent voice
          await tixae.updateAgent(agentId, {
            nodes: [
              {
                name: "Start",
                description: "Start of the conversation",
                type: "start",
                id: "__start__",
                instructions: adminSettings.globalPrompts || "",
                llmConfig: {
                  modelId: "gpt-4o-mini",
                  temperature: 0.5,
                  maxTokens: 1000,
                },
                startConfig: {
                  initialMessage:
                    adminSettings.greetingMessage ||
                    adminSettings.globalPrompts ||
                    "",
                },
              },
            ],
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
            voiceConfig: buildWorkspaceVoiceConfig(
              voiceProfile,
              input.settings?.interviewConfig?.aiAssistant,
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
              } as any, // Type cast to bypass schema limitation
            }),
          });
        }

        const now = new Date();
        const updateData = {
          ...(input.name && { name: input.name }),
          ...(input.members && { members: input.members }),
          ...(input.settings && { settings: input.settings }),
          updatedAt: now,
        };

        console.log("💾 [WORKSPACE_UPDATE] Updating workspace in database");
        await db.workspaces.update(input.workspaceId as any, updateData);
        console.log("✅ [WORKSPACE_UPDATE] Workspace updated successfully");
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "workspaceRouter.update()")
            .message,
        });
      }
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/workspaces/{workspaceId}",
        tags: ["workspaces"],
        summary: "Delete a workspace",
        description: "Delete a workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspace = await db.workspaces.get(input.workspaceId as any);
      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }
      if (workspace.data.ownerId !== ctx.user.uid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this workspace",
        });
      }

      // Finally delete the workspace
      await db.workspaces.remove(input.workspaceId as any);
      return { success: true };
    }),

  deleteByName: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/workspaces/bulk-delete-by-name",
        tags: ["workspaces"],
        summary: "Delete all workspaces by name",
        description:
          "Delete all workspaces owned by the user with a specific name",
      },
    })
    .input(
      z.object({
        workspaceName: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        deletedCount: z.number(),
        deletedWorkspaces: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            ownerId: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Find all workspaces owned by the user with the specified name
        const workspacesToDelete = await db.workspaces.query(($) => [
          $.field("ownerId").eq(ctx.user.uid),
          $.field("name").eq(input.workspaceName),
        ]);

        if (workspacesToDelete.length === 0) {
          return {
            success: true,
            deletedCount: 0,
            deletedWorkspaces: [],
          };
        }

        // Delete each workspace
        const deletedWorkspaces = [];
        for (const workspace of workspacesToDelete) {
          await db.workspaces.remove(workspace.ref.id);
          deletedWorkspaces.push({
            id: workspace.ref.id,
            name: workspace.data.name,
            ownerId: workspace.data.ownerId,
          });
        }

        return {
          success: true,
          deletedCount: workspacesToDelete.length,
          deletedWorkspaces,
        };
      } catch (error) {
        console.error("Error deleting workspaces by name:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete workspaces",
        });
      }
    }),

  listByName: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/workspaces/list-by-name/{workspaceName}",
        tags: ["workspaces"],
        summary: "List workspaces by name",
        description:
          "List all workspaces owned by the user with a specific name",
      },
    })
    .input(
      z.object({
        workspaceName: z.string(),
      }),
    )
    .output(
      z.object({
        workspaces: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            ownerId: z.string(),
            members: z.array(z.string()),
            createdAt: z.date(),
          }),
        ),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const workspaces = await db.workspaces.query(($) => [
          $.field("ownerId").eq(ctx.user.uid),
          $.field("name").eq(input.workspaceName),
        ]);

        return {
          workspaces: workspaces.map((workspace) => ({
            id: workspace.ref.id,
            name: workspace.data.name,
            ownerId: workspace.data.ownerId,
            members: workspace.data.members || [],
            createdAt: workspace.data.createdAt,
          })),
        };
      } catch (error) {
        console.error("Error listing workspaces by name:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list workspaces",
        });
      }
    }),

  updateOwner: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/workspaces/{workspaceId}/owner",
        tags: ["workspaces"],
        summary: "Update the owner of a workspace",
        description: "Update the owner of a workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        newOwnerId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspace = await db.workspaces.get(input.workspaceId as any);
      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }
      if (workspace.data.ownerId !== ctx.user.uid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this workspace",
        });
      }

      const newOwnerEmail = await db.users
        .get(input.newOwnerId as any)
        .then((user) => user?.data.email || "");
      if (!newOwnerEmail) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "New owner assigned to workspace is not a user",
        });
      }

      await db.workspaces.update(input.workspaceId as any, {
        ownerId: input.newOwnerId,
        members: [newOwnerEmail],
        updatedAt: new Date(),
      });

      return { success: true };
    }),

  getMembers: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/workspaces/{workspaceId}/members",
        tags: ["workspaces"],
        summary: "Get members of a workspace",
        description: "Get members of a workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      }),
    )
    .output(
      z.array(
        z.object({
          id: z.string(),
          email: z.string(),
          name: z.string(),
          role: MemberRole,
        }),
      ),
    )
    .query(async ({ input }) => {
      const workspace = await db.workspaces.get(input.workspaceId as any);
      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const members = workspace.data.members || [];

      // Get all users from the users collection
      // const users = await db.users.all();
      // const memberUsers = users.filter((user) => members.includes(user.ref.id));

      // Get all users from the users collection
      const users = await db.users.query(($) => $.field("email").in(members));

      return users.map((user) => ({
        id: user.ref.id,
        email: user.data.email,
        name: user.data.name || user.data.email?.split("@")[0] || "",
        role:
          workspace.data.ownerId === user.ref.id
            ? "OWNER"
            : workspace.data.memberRoles?.[user.data.email] || "MEMBER",
      }));
    }),

  addMemberInvitation: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/workspaces/{workspaceId}/members",
        tags: ["workspaces"],
        summary: "Add a member to a workspace",
        description: "Add a member to a workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        memberEmail: z.string(),
        role: MemberRole.default("PENDING"),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspace = await db.workspaces.get(input.workspaceId as any);
      // Check if workspace exists
      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      // Check if user is the owner of the workspace
      if (workspace.data.ownerId !== ctx.user.uid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this workspace",
        });
      }

      // Check if user is not adding themselves as a member
      if (input.memberEmail === ctx.user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot add yourself as a member",
        });
      }

      // const user = await db.users.query(($) =>
      //   $.field("email").eq(input.memberEmail)
      // );
      // if (user.length === 0) {
      //   throw new TRPCError({
      //     code: "NOT_FOUND",
      //     message: "User not found",
      //   });
      // }

      // Check if user is already a member
      const members = workspace.data.members || [];
      if (members.includes(input.memberEmail)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a member",
        });
      }

      // TODO: Add member to workspace after accepting invitation
      await db.workspaces.update(input.workspaceId as any, {
        members: [...members, input.memberEmail],
        memberRoles: {
          ...(workspace.data.memberRoles || {}),
          [input.memberEmail]: input.role,
        },
        updatedAt: new Date(),
      });

      // Send email to user
      await sendAntiSpamEmail({
        to: input.memberEmail,
        emailTemplate: "workspaceInvitation",
        locals: {
          workspaceName: workspace.data.name,
          workspaceUrl: `${getAppUrl()}/settings?tab=workspace-management`,
        },
        minutes: 10,
      });

      // Add workspace to user's workspaces

      return { success: true };
    }),

  acceptInvitation: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/workspaces/{workspaceId}/members/accept-invitation",
        tags: ["workspaces"],
        summary: "Accept an invitation to a workspace",
        description: "Accept an invitation to a workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspace = await db.workspaces.get(input.workspaceId as any);
      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const members = workspace.data.members || [];
      if (!members.includes(ctx.user.email || "")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not a member of this workspace",
        });
      }

      await db.workspaces.update(input.workspaceId as any, {
        memberRoles: {
          ...(workspace.data.memberRoles || {}),
          [ctx.user.email || ""]: "MEMBER",
        },
      });

      return { success: true };
    }),

  rejectInvitation: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/workspaces/{workspaceId}/members/reject-invitation",
        tags: ["workspaces"],
        summary: "Reject an invitation to a workspace",
        description: "Reject an invitation to a workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspace = await db.workspaces.get(input.workspaceId as any);
      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      const members = workspace.data.members || [];
      if (!members.includes(ctx.user.email || "")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are not a member of this workspace",
        });
      }

      const memberRoles = workspace.data.memberRoles || {};
      delete memberRoles[ctx.user.email || ""];

      await db.workspaces.update(input.workspaceId as any, {
        members: members.filter((email) => email !== ctx.user.email),
        memberRoles,
        updatedAt: new Date(),
      });

      return { success: true };
    }),

  addMember: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/workspaces/{workspaceId}/members",
        tags: ["workspaces"],
        summary: "Add a member to a workspace",
        description: "Add a member to a workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        member: z.object({
          uid: z.string(),
          email: z.string(),
          displayName: z.string(),
        }),
        role: MemberRole.default("MEMBER"),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspace = await db.workspaces.get(input.workspaceId as any);
      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }
      if (workspace.data.ownerId !== ctx.user.uid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to add members to this workspace",
        });
      }

      const members = workspace.data.members || [];
      if (members.includes(input.member.email)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a member",
        });
      }

      await db.workspaces.update(input.workspaceId as any, {
        members: [...members, input.member.email],
        memberRoles: {
          ...(workspace.data.memberRoles || {}),
          [input.member.email]: input.role,
        },
        updatedAt: new Date(),
      });

      // Send email to user
      await sendAntiSpamEmail({
        to: input.member.email,
        emailTemplate: "workspaceInvitation",
        locals: {
          workspaceName: workspace.data.name,
          workspaceUrl: `${getAppUrl()}/settings?tab=workspace-management`,
        },
        minutes: 10,
      });

      return { success: true };
    }),

  removeMember: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/workspaces/{workspaceId}/members/{memberId}",
        tags: ["workspaces"],
        summary: "Remove a member from a workspace",
        description: "Remove a member from a workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        memberId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspace = await db.workspaces.get(input.workspaceId as any);

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      if (workspace.data.ownerId !== ctx.user.uid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to remove members from this workspace",
        });
      }

      // Can't remove the owner
      if (input.memberId === workspace.data.ownerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove workspace owner",
        });
      }

      const members = workspace.data.members || [];
      const memberEmail = await db.users
        .get(input.memberId as any)
        .then((user) => user?.data.email || "");

      if (!memberEmail || !members.includes(memberEmail)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is not a member",
        });
      }

      await db.workspaces.update(input.workspaceId as any, {
        members: members.filter((email) => email !== memberEmail),
        updatedAt: new Date(),
      });

      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/workspaces/{workspaceId}/members/{memberId}/role",
        tags: ["workspaces"],
        summary: "Update the role of a member",
        description: "Update the role of a member",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        memberId: z.string(),
        role: MemberRole,
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspace = await db.workspaces.get(input.workspaceId as any);
      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }
      if (workspace.data.ownerId !== ctx.user.uid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this workspace",
        });
      }

      // Can't change owner's role
      if (input.memberId === workspace.data.ownerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change workspace owner's role",
        });
      }

      const members = workspace.data.members || [];
      const memberEmail = await db.users
        .get(input.memberId as any)
        .then((user) => user?.data.email || "");
      if (!memberEmail || !members.includes(memberEmail)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is not a member",
        });
      }

      // Update member role logic here
      // You might need to adjust your data structure to store roles
      await db.workspaces.update(input.workspaceId as any, {
        [`memberRoles.${memberEmail}`]: input.role,
        updatedAt: new Date(),
      });

      return { success: true };
    }),

  // Transfer workspace ownership to another user
  transferOwnership: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/workspaces/{workspaceId}/transfer-ownership",
        tags: ["workspaces"],
        summary: "Transfer workspace ownership to another member",
        description:
          "Allows the current owner to transfer ownership to another member of the workspace.",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        newOwnerId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspaceDoc = await db.workspaces.get(input.workspaceId as any);

      if (!workspaceDoc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      // Only current owner can transfer ownership
      if (workspaceDoc.data.ownerId !== ctx.user.uid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You don't have permission to transfer ownership of this workspace",
        });
      }

      if (input.newOwnerId === ctx.user.uid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already the owner of this workspace",
        });
      }

      // Fetch the new owner's user document to get their email
      const newOwnerUser = await db.users.get(input.newOwnerId as any);

      if (!newOwnerUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "New owner user not found",
        });
      }

      const newOwnerEmail = newOwnerUser.data.email;
      if (!newOwnerEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "New owner does not have a valid email",
        });
      }

      // Ensure the new owner is in members list
      const members: string[] = workspaceDoc.data.members || [];
      if (!members.includes(newOwnerEmail)) {
        members.push(newOwnerEmail);
      }

      // Prepare updated memberRoles
      const memberRoles: Record<string, string> = {
        ...(workspaceDoc.data.memberRoles || {}),
      };

      // Downgrade current owner to ADMIN (you may choose MEMBER instead)
      if (ctx.user.email) {
        memberRoles[ctx.user.email] = "MEMBER";
      }

      // Set new owner role
      memberRoles[newOwnerEmail] = "OWNER";

      // await db.workspaces.set(input.workspaceId as any, {
      //   ownerId: input.newOwnerId,
      //   members,
      //   memberRoles,
      //   updatedAt: new Date(),
      // });
      await db.workspaces.update(input.workspaceId, {
        ownerId: input.newOwnerId,
        members,
        updatedAt: new Date(),
        memberRoles: { ...memberRoles } as any,
      });

      return { success: true };
    }),

  // Get all workspaces (admin only)
  getAll: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/workspaces",
        tags: ["workspaces"],
        summary: "Get all workspaces (admin only)",
        description: "Get all workspaces for analytics - admin only",
        protect: true,
      },
    })
    .input(
      z.object({
        limit: z.number().min(1).max(1000).default(100),
      }),
    )
    .output(
      z.object({
        workspaces: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            ownerId: z.string(),
            members: z.array(z.string()).optional(),
            createdAt: z.date().optional(),
            updatedAt: z.date().optional(),
          }),
        ),
        total: z.number(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        // Admin check - you may want to implement proper admin role checking
        const userWorkspaces = await db.workspaces.query(($) => [
          $.field("ownerId").eq(ctx.user.uid),
        ]);

        if (userWorkspaces.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Admin access required",
          });
        }

        const allWorkspaces = await db.workspaces.all();
        const totalWorkspaces = allWorkspaces.length;

        const limitedWorkspaces = allWorkspaces
          .slice(0, input.limit)
          .map((workspace) => ({
            id: workspace.ref.id,
            name: workspace.data.name,
            ownerId: workspace.data.ownerId,
            members: workspace.data.members,
            createdAt: workspace.data.createdAt,
            updatedAt: workspace.data.updatedAt || undefined,
          }));

        return {
          workspaces: limitedWorkspaces,
          total: totalWorkspaces,
        };
      } catch (error) {
        console.error("Error fetching all workspaces:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch workspaces",
        });
      }
    }),

  deleteCurrentWorkspace: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/workspaces/current",
        tags: ["workspaces"],
        summary: "Delete current workspace",
        description:
          "Delete the current workspace with validation to prevent deletion of last workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
        switchToWorkspaceId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get all user's workspaces
        const userWorkspaces = await db.workspaces.query(($) => [
          $.field("members").contains(ctx.user.email || ""),
        ]);

        // Filter to only workspaces where user has access (owner or member with non-PENDING role)
        const accessibleWorkspaces = userWorkspaces.filter((workspace) => {
          const memberRole = workspace.data.memberRoles?.[ctx.user.email || ""];
          return (
            workspace.data.ownerId === ctx.user.uid ||
            (memberRole && memberRole !== "PENDING")
          );
        });

        // Prevent deletion of last workspace
        if (accessibleWorkspaces.length <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot delete your last workspace. You must have at least one workspace.",
          });
        }

        // Get the workspace to delete
        const workspaceToDelete = await db.workspaces.get(
          input.workspaceId as any,
        );

        if (!workspaceToDelete) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        // Check if user is the owner of the workspace
        if (workspaceToDelete.data.ownerId !== ctx.user.uid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete workspaces you own",
          });
        }

        // Delete the workspace
        await db.workspaces.remove(input.workspaceId as any);

        // Find the first available workspace to switch to (excluding the deleted one)
        const remainingWorkspaces = accessibleWorkspaces.filter(
          (workspace) => workspace.ref.id !== input.workspaceId,
        );

        const switchToWorkspaceId =
          remainingWorkspaces.length > 0
            ? remainingWorkspaces[0].ref.id
            : undefined;

        return {
          success: true,
          message: "Workspace deleted successfully",
          switchToWorkspaceId,
        };
      } catch (error) {
        console.error("Error deleting current workspace:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete workspace",
        });
      }
    }),

  convertWorkspaceMembersToMembersEmails: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/workspaces/{workspaceId}/members/convert-to-email",
        tags: ["workspaces"],
        summary: "Convert workspace members to members email",
        description: "Convert workspace members to members email",
      },
    })
    .input(z.object({}))
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const workspaces = await db.workspaces.all();

      const workspacesWithMembers = workspaces.map((workspace) => ({
        workspaceId: workspace.ref.id,
        members: workspace.data.members,
      }));

      await Promise.all(
        workspacesWithMembers.map(async (workspace) => {
          const users = await db.users.query(($) => [
            $.field("id").in(workspace.members),
          ]);

          await db.workspaces.update(workspace.workspaceId as any, ($: any) => [
            $.field("members").set(users.map((user) => user.data.email)),
          ]);
        }),
      );

      console.log(
        "new workspaces after update",
        (await db.workspaces.all()).map((workspace) => ({
          ...workspace.data,
        })),
      );

      return { success: true };
    }),
});
