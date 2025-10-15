import { daily, DailyError } from "@root/lib/daily.lib";
import {
  completeInterview,
  createInterview,
  getInterview,
  getInterviewPrompt,
  getQrInterview,
  getWorkspaceInterviews,
} from "@root/lib/interviews.lib";
import jsonParser from "@root/lib/json-parser.lib";
import { stripeVerificationService } from "@root/lib/stripe.lib";
import { db } from "@root/server/typedFirestore";
import { safeDailyRoomDeletion } from "@root/server/utils/daily.util";
import {
  sendAntiSpamEmail,
  sendInterviewInvitation,
} from "@root/server/utils/resend.util";
import { getVerificationImages } from "@root/server/utils/stripe.util";
import { getAppUrl } from "@root/shared/utils";
import {
  interviewSchema,
  levelEnum,
  QrInterview,
  qrInterviewSchema,
} from "@root/shared/zod-schemas";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@root/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { v2 as cloudinary } from "cloudinary";
import moment from "moment";
import OpenAI from "openai";
import { z } from "zod";

const createInterviewSchema = z.object({
  workspaceId: z.string(),
  jobProfileId: z.string(),
  level: levelEnum.optional(),
  duration: z.number(),
  enableSchedule: z.boolean().optional(),
  enableVerification: z.boolean().optional(),
  analysisPrompt: z.string().optional(),
  introVideoUrl: z.string().url().optional(),
  paid: z.boolean().optional(),
  price: z.number().optional(),
  isDemo: z.boolean().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  intervieweeEmails: z.array(z.string().email()).optional(),
  language: z.string().optional(), // Language for email translations
});

const completeInterviewSchema = z.object({
  interviewId: z.string(),
  content: z.string(),
  score: z.number().min(0).max(100).optional(),
  feedback: z.string().optional(),
});

export const interviewsRouter = createTRPCRouter({
  interviewEnded: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/interviews/{interviewId}/ended",
        tags: ["Interviews"],
        summary: "End an interview",
        description: "End an interview",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
        content: z.string(),
        meetingRecordingId: z.string().optional(),
        isEndedByInterviewee: z.boolean().optional().nullable(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        score: z.number().optional(),
        feedback: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const interview = await getInterview(input.interviewId);

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Interview not found (likely already expired or never created)",
        });
      }

      if (input.meetingRecordingId) {
        const recording = await daily.getRecordingAccessLink(
          input.meetingRecordingId,
        );
        console.log("recording", recording);
        await db.interviews.update(input.interviewId as any, {
          recordingUrl: recording.download_link,
          recordingExpiresAt: moment(recording.expires_at).toDate(),
          recordingId: input.meetingRecordingId,
        });
      }

      if (input.isEndedByInterviewee) {
        await db.interviews.update(input.interviewId as any, {
          isEndedByInterviewee: true,
        });
      }

      // Get workspace settings to check for custom analysis prompt
      console.log(
        "🔍 [ANALYSIS] Fetching workspace settings for interview:",
        input.interviewId,
      );
      const customPrompt = interview.analysisPrompt;

      // Default prompt as the base
      const defaultPrompt = `You are an analyzer who is analyzing the interview content and based on the content:
- you will give a score between 0 and 100.
- you will give detailed feedback based on the content.

The interview content is: {INTERVIEW_CONTENT}

IMPORTANT: You must respond with ONLY a valid JSON object in this exact format:
{
  "score": 85,
  "feedback": "Your detailed feedback here..."
}

Do not include any text before or after the JSON object. Do not use markdown code blocks.`;

      // Log prompt selection and combination
      if (customPrompt && customPrompt.trim()) {
        console.log(
          "✅ [ANALYSIS] APPENDING custom analysis prompt to default for workspace:",
          interview.workspaceId,
        );
        console.log(
          "📝 [ANALYSIS] Custom prompt preview:",
          customPrompt.substring(0, 200) + "...",
        );
      } else {
        console.log(
          "⚙️ [ANALYSIS] Using DEFAULT analysis prompt only for workspace:",
          interview.workspaceId,
        );
      }

      // Combine default prompt with custom prompt (append custom to default)
      const promptTemplate =
        customPrompt && customPrompt.trim()
          ? `${defaultPrompt}

ADDITIONAL CUSTOM INSTRUCTIONS:
${customPrompt}`
          : defaultPrompt;
      const finalPrompt = promptTemplate.replace(
        "{INTERVIEW_CONTENT}",
        interview.content || "",
      );

      console.log("🚀 [ANALYSIS] Combined prompt length:", finalPrompt.length);
      console.log("📄 [ANALYSIS] Combined prompt structure:");
      console.log("  ├── Default prompt: Always included");
      if (customPrompt && customPrompt.trim()) {
        console.log("  └── Additional instructions: Appended");
      } else {
        console.log("  └── Additional instructions: None");
      }
      console.log(
        "📄 [ANALYSIS] Final combined prompt preview:",
        finalPrompt.substring(0, 400) + "...",
      );

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        input: [
          {
            role: "user",
            content: finalPrompt,
          },
        ],
      });

      let score = 0;
      let feedback = "";

      try {
        const parsed = jsonParser(response.output_text);
        score = parsed.score || 0;
        feedback = parsed.feedback || "";

        console.log("🎯 [ANALYSIS] Analysis completed:");
        console.log("🔹 Score:", score);
        console.log("🔹 Feedback length:", feedback?.length || 0);
        console.log(
          "🔹 Feedback preview:",
          feedback?.substring(0, 150) + "..." || "No feedback",
        );
      } catch (error) {
        console.error(
          "❌ [ANALYSIS] Failed to parse AI response as JSON:",
          error,
        );
        console.log(
          "🔍 [ANALYSIS] Raw AI response:",
          response.output_text?.substring(0, 500) + "...",
        );

        // Attempt to extract feedback from raw text if JSON parsing fails
        const rawText = response.output_text?.trim();
        if (rawText && rawText.length > 10) {
          // Try to find score in text (e.g., "score: 75" or "Score: 75")
          const scoreMatch = rawText.match(/(?:score|Score):\s*(\d+)/);
          if (scoreMatch) {
            score = parseInt(scoreMatch[1]) || 0;
          }

          // Use the raw text as feedback if it's meaningful
          feedback =
            rawText.length > 50
              ? rawText
              : "The AI provided a response but it couldn't be properly parsed. Please try running the analysis again.";
        } else {
          feedback =
            "The AI didn't provide a valid response. This might be due to insufficient interview content or a temporary service issue. Please try again.";
        }
      }

      await db.interviews.update(input.interviewId as any, {
        score: score,
        feedback:
          feedback ||
          "Unable to generate feedback at this time. Please try again.",
      });

      console.log("✅ [ANALYSIS] Interview analysis saved to database");
      return { success: true, score, feedback };
    }),

  saveMessageHistory: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/interviews/{interviewId}/messageHistory",
        tags: ["Interviews"],
        summary: "Save message history",
        description: "Save message history",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
        messageHistory: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        ),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const interview = await getInterview(input.interviewId);
      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Interview not found (likely already expired or never created)",
        });
      }

      await db.interviews.update(input.interviewId as any, {
        content: JSON.stringify(input.messageHistory),
      });

      return { success: true };
    }),

  verifyStripe: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/interviews/{interviewId}/verifyStripe",
        tags: ["Interviews"],
        summary: "Verify stripe",
        description: "Verify stripe",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
      }),
    )
    .output(
      z.object({
        clientSecret: z.string().optional(),
        stripeSessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const session = await stripeVerificationService.createVerificationSession(
        {
          verification_flow: "vf_1RRyRCI62q3idEK7OmrmMzWR",
        },
      );

      return {
        clientSecret: session.client_secret || undefined,
        stripeSessionId: session.id || undefined,
      };
    }),

  getVerificationSessionFromStripe: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/stripe/verification/{verificationId}",
        tags: ["Interviews"],
        summary: "Get verification session from stripe",
        description: "Get verification session from stripe",
      },
    })
    .input(
      z.object({
        verificationId: z.string(),
      }),
    )
    .output(
      z.object({
        idDocumentFrontUrl: z.string().optional(),
        idDocumentBackUrl: z.string().optional(),
        selfieUrl: z.string().optional(),
        documentFiles: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ input }) => {
      const session = await getVerificationImages(input.verificationId);
      return {
        idDocumentFrontUrl: session.idDocumentFrontUrl || "",
        idDocumentBackUrl: session.idDocumentBackUrl || "",
        selfieUrl: session.selfieUrl || "",
        documentFiles: session.documentFiles || [],
      };
    }),

  verifyPersonInMeeting: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/stripe/verification/{verificationId}/verifyPersonInMeeting",
        tags: ["Interviews"],
        summary: "Verify person in meeting",
        description: "Verify person in meeting",
      },
    })
    .input(
      z.object({
        verificationId: z.string(),
        personInMeetingImage: z.string(),
      }),
    )
    .output(
      z.object({
        similarityScore: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const stripeSessionImages = await getVerificationImages(
        input.verificationId,
      );
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Cloudinary configuration. (This is temporary used but it will be replaced with bunny cdn)
      cloudinary.config({
        cloud_name: "djecusowf",
        api_key: "255188296677438",
        api_secret: "UZIQR7sBc1dPYvma2prmJFW15T8",
      });
      // Upload an image to cloudinary (This is temporary used but it will be replaced with bunny cdn).
      const uploadResult = await cloudinary.uploader.upload(
        input.personInMeetingImage,
        {
          public_id: "personInMeetingImage",
        },
      );

      const images = [
        ...(stripeSessionImages.idDocumentFrontUrl
          ? [
              {
                type: "input_image",
                image_url: stripeSessionImages.idDocumentFrontUrl,
                detail: "auto",
              },
            ]
          : []),
        ...(stripeSessionImages.idDocumentBackUrl
          ? [
              {
                type: "input_image",
                image_url: stripeSessionImages.idDocumentBackUrl,
                detail: "auto",
              },
            ]
          : []),
        ...(stripeSessionImages.selfieUrl
          ? [
              {
                type: "input_image",
                image_url: stripeSessionImages.selfieUrl,
                detail: "auto",
              },
            ]
          : []),
        ...(stripeSessionImages.documentFiles &&
        stripeSessionImages.documentFiles.length > 0
          ? stripeSessionImages.documentFiles.map((file) => ({
              type: "input_image" as any,
              image_url: file,
              detail: "auto",
            }))
          : []),
      ];

      console.log("images", images);

      const response = await openai.responses.create({
        model: "gpt-4o",
        temperature: 0.7,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `I will provider some images.
                Describe what you see in the following images.
                And also there is might be a id document with the person name in it
                If the id document is present. compare the selfie for the person with the id document
                AND RETURN ONLY JSON OBJECT WITH THE KEY similarityScore AND THE VALUE between 0 and 100 in percentage for the similarity score.
                If the id document is not present. RETURN ONLY JSON OBJECT WITH THE KEY similarityScore AND THE VALUE 0 COMPARED TO THE SELFIE.`,
              },
              {
                type: "input_image",
                image_url: uploadResult.secure_url,
                detail: "auto",
              },
              ...images,
            ],
          },
        ],
      });
      console.log("response", response);
      const similarityScore = jsonParser(response.output_text);
      console.log("similarityScore", similarityScore);
      return similarityScore;
    }),

  create: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/{workspaceId}/interviews",
        tags: ["Interviews"],
        summary: "Create an interview",
        description: "Create an interview",
      },
    })
    .input(createInterviewSchema)
    .output(
      z.object({
        interviews: z.array(interviewSchema).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);
        if (!workspace) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const ownerUser = await db.users.get(workspace.data.ownerId as any);
        if (!ownerUser) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Something went wrong, please try again later",
          });
        }

        const { recurringUsage, bundles } = ownerUser.data;

        // Calculate interview slots needed (every 10 minutes = 1 slot)
        const interviewSlotsNeeded =
          Math.ceil(input.duration / 10) *
          (input.intervieweeEmails?.length || 1);

        // Check and consume interview limits
        let remainingSlotsNeeded = interviewSlotsNeeded;
        let updatedRecurringUsage = recurringUsage
          ? { ...recurringUsage }
          : null;
        let updatedBundles = bundles ? [...bundles] : [];

        // First, try to consume from recurring usage
        if (updatedRecurringUsage) {
          const availableRecurringSlots = Math.max(
            0,
            updatedRecurringUsage.interviewsLimit -
              updatedRecurringUsage.interviewsUsed,
          );
          const slotsFromRecurring = Math.min(
            remainingSlotsNeeded,
            availableRecurringSlots,
          );

          if (slotsFromRecurring > 0) {
            updatedRecurringUsage.interviewsUsed += slotsFromRecurring;
            remainingSlotsNeeded -= slotsFromRecurring;
          }
        }

        // If still need more slots, consume from bundles (newest first, non-expired)
        if (remainingSlotsNeeded > 0 && updatedBundles.length > 0) {
          const now = new Date();
          // Filter and sort bundles - newest first, non-expired only
          const validBundles = updatedBundles
            .filter(
              (bundle) => bundle.expiresAt > now && bundle.interviewsLimit > 0,
            )
            .sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());

          for (const bundle of validBundles) {
            if (remainingSlotsNeeded <= 0) break;

            const slotsFromBundle = Math.min(
              remainingSlotsNeeded,
              bundle.interviewsLimit,
            );
            if (slotsFromBundle > 0) {
              bundle.interviewsLimit -= slotsFromBundle;
              remainingSlotsNeeded -= slotsFromBundle;
            }
          }

          // Remove bundles with no remaining interviews
          updatedBundles = updatedBundles.filter(
            (bundle) => bundle.interviewsLimit > 0,
          );
        }

        // Check if user has sufficient limits
        if (remainingSlotsNeeded > 0) {
          const totalAvailable =
            (updatedRecurringUsage
              ? Math.max(
                  0,
                  updatedRecurringUsage.interviewsLimit -
                    (recurringUsage?.interviewsUsed || 0),
                )
              : 0) +
            updatedBundles.reduce((sum, bundle) => {
              const now = new Date();
              return (
                sum + (bundle.expiresAt > now ? bundle.interviewsLimit : 0)
              );
            }, 0);

          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Insufficient interview slots. You need ${interviewSlotsNeeded} slots (${input.duration} minutes × ${input.intervieweeEmails?.length || 1} interviews = ${Math.ceil(input.duration / 10)} slots each), but only ${totalAvailable} slots are available. Every 10 minutes counts as 1 interview slot.`,
          });
        }

        // Update user's usage and bundles in database
        const updateData: any = {};
        if (updatedRecurringUsage) {
          updateData.recurringUsage = updatedRecurringUsage;
        }
        if (updatedBundles) {
          updateData.bundles = updatedBundles;
        }

        if (Object.keys(updateData).length > 0) {
          await db.users.update(ownerUser.ref.id as any, updateData);
        }

        const jobProfile = await db.jobProfiles.get(input.jobProfileId as any);

        if (!jobProfile || jobProfile.data.workspaceId !== input.workspaceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid job profile",
          });
        }

        if (!input.intervieweeEmails || input.intervieweeEmails.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Interviewee emails are required to create an interview",
          });
        }

        const interviews = await Promise.all(
          input.intervieweeEmails.map(async (email) => {
            const interview = await createInterview({
              duration: input.duration,
              jobProfileId: input.jobProfileId,
              isDemo: input.isDemo || false,
              ...(input.level && { level: input.level }),
              workspaceId: input.workspaceId,
              paid: input.paid,
              price: input.price,
              intervieweeEmail: email,
              ...(input.enableSchedule
                ? {
                    startTime: input.startTime || new Date(),
                    endTime: new Date(
                      (input.startTime?.getTime() || new Date().getTime()) +
                        input.duration * 60000,
                    ),
                  }
                : {}),
              userId: ctx.user?.uid || "",
              enableVerification: input.enableVerification,
              analysisPrompt: input.analysisPrompt,
              introVideoUrl: input.introVideoUrl,
            });

            console.log("created interview", interview);

            if (input.enableSchedule) {
              const now = new Date();

              if (interview.startTime && interview.startTime < now) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Interview start time cannot be in the past",
                });
              }

              const startTime = interview.startTime
                ? Math.floor(
                    interview.startTime.getTime() / 1000 - Date.now() / 1000,
                  )
                : 0;

              // Create the room only if the interview admin has added a start time
              // This is to avoid creating a room for the interview admin
              // and then the room is not used
              await daily.createRoom({
                name: interview.id,
                properties: {
                  exp: startTime + interview.duration * 60,
                  nbf: startTime + Date.now() / 1000,
                },
              });
            } else {
              // Create a room for the interview admin
              await daily.createRoom({
                name: `${interview.id}-owner`,
                properties: {
                  exp: interview.duration * 60 + 60 * 60 * 24 * 30,
                },
              });
            }

            // Send confirmation email to the interview creator
            sendAntiSpamEmail({
              to: ctx.user?.email || "",
              emailTemplate: "interviewCreated",
              locals: {
                jobProfileName: jobProfile.data.name,
                workspaceName: workspace.data.name,
                interviewId: interview.id,
              },
            });

            // Send invitation email to the interviewee
            if (interview.intervieweeEmail) {
              await sendInterviewInvitation({
                to: interview.intervieweeEmail,
                interviewerName:
                  ctx.user?.displayName || ctx.user?.email || "Interviewer",
                jobTitle: jobProfile.data.name,
                workspaceName: workspace.data.name,
                meetingLink: `${getAppUrl()}/meeting/${interview.id}`,
                duration: interview.duration,
                startTime: interview.startTime || undefined,
                level: interview.level ? `Level ${interview.level}` : undefined,
                brandingConfig: workspace.data.settings?.brandingConfig || null,
                emailTemplate: workspace.data.settings?.emailTemplate || null,
                language: input.language || "en", // Pass user's language
              });
            }

            return interview;
          }),
        );

        return { interviews };
      } catch (error) {
        console.error("Error creating interview:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create interview",
        });
      }
    }),

  complete: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/{workspaceId}/interviews/{interviewId}/complete",
        tags: ["Interviews"],
        summary: "Complete an interview",
        description: "Complete an interview",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
        workspaceId: z.string(),
        content: z.string(),
        score: z.number().optional(),
        feedback: z.string().optional(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);
        if (
          !workspace ||
          !workspace.data.members.includes(ctx.user.email || "")
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const interview = await getInterview(input.interviewId);

        if (!interview) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Interview not found (likely already expired or never created)",
          });
        }

        if (interview.userId !== ctx.user.uid) {
          const workspace = await db.workspaces.get(
            interview.workspaceId as any,
          );

          if (
            !workspace ||
            !workspace.data.members.includes(ctx.user.email || "")
          ) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        const success = await completeInterview(
          input.interviewId,
          input.content,
          input.score,
          input.feedback,
        );

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to complete interview",
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  getById: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/interviews/{interviewId}",
        tags: ["Interviews"],
        summary: "Get an interview by id",
        description: "Get an interview by id",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
      }),
    )
    .output(interviewSchema)
    .query(async ({ input }) => {
      try {
        if (!input.interviewId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You are not authorized to access this interview",
          });
        }

        if (input.interviewId.includes("-owner")) {
          const interview = await getInterview(input.interviewId.split("-")[0]);
          if (!interview) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Interview not found (likely already expired or never created)",
            });
          }

          return interview;
        }

        const interview = await getInterview(input.interviewId);

        if (!interview) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Interview not found (likely already expired or never created)",
          });
        }

        return interview;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
    }),

  getWorkspaceInterviews: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/{workspaceId}/interviews",
        tags: ["Interviews"],
        summary: "Get workspace interviews",
        description: "Get workspace interviews",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .output(
      z.object({
        interviews: z.object({
          qrInterviews: z.array(qrInterviewSchema.partial()),
          nonQrInterviews: z.array(interviewSchema.partial()),
        }),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
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

        const interviews = await getWorkspaceInterviews(
          input.workspaceId,
          input.limit,
        );

        const qrInterviews = await db.qrInterviews.query(($) =>
          $.field("workspaceId").eq(input.workspaceId),
        );

        return {
          interviews: {
            qrInterviews: qrInterviews.map((i) => i.data),
            nonQrInterviews: interviews,
          },
        };
      } catch (error) {
        console.error("Error fetching workspace interviews:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch interviews",
        });
      }
    }),

  getPrompt: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/{workspaceId}/interviews/{interviewId}/prompt",
        tags: ["Interviews"],
        summary: "Get an interview prompt",
        description: "Get an interview prompt",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
        workspaceId: z.string(),
      }),
    )
    .output(
      z.object({
        prompt: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);
        if (
          !workspace ||
          !workspace.data.members.includes(ctx.user.email || "")
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const interview = await getInterview(input.interviewId);

        if (!interview) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Interview not found (likely already expired or never created)",
          });
        }

        if (interview.userId !== ctx.user.uid) {
          const workspace = await db.workspaces.get(
            interview.workspaceId as any,
          );

          if (
            !workspace ||
            !workspace.data.members.includes(ctx.user.email || "")
          ) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        const prompt = await getInterviewPrompt(input.interviewId);

        if (!prompt) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get interview prompt",
          });
        }

        return { prompt };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/{workspaceId}/interviews/{interviewId}",
        tags: ["Interviews"],
        summary: "Delete an interview",
        description: "Delete an interview",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
        workspaceId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);
        if (
          !workspace ||
          !workspace.data.members.includes(ctx.user.email || "")
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const interview = await getInterview(input.interviewId);

        if (!interview) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        console.log("Deleting interview", interview);

        await db.interviews.remove(input.interviewId as any);
        // Safely delete Daily room without failing the interview deletion
        safeDailyRoomDeletion(interview.id);

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        } else if (error instanceof DailyError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete interview",
        });
      }
    }),

  deleteAll: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/trpc/interviews.deleteAll",
        tags: ["Interviews"],
        summary: "Delete multiple interviews",
        description: "Delete multiple interviews in bulk",
      },
    })
    .input(
      z.object({
        interviewIds: z.array(z.string()).min(1).max(50),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        deletedCount: z.number(),
        failedCount: z.number(),
        errors: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const results = {
        success: true,
        deletedCount: 0,
        failedCount: 0,
        errors: [] as string[],
      };

      // Process interviews in parallel for better performance
      await Promise.allSettled(
        input.interviewIds.map(async (interviewId: string) => {
          try {
            let qrInterview: QrInterview | null = null;

            const interview = await getInterview(interviewId);

            if (!interview) {
              // check if it's a qr interview
              qrInterview = await getQrInterview(interviewId);
            }

            if (!interview && !qrInterview) {
              results.failedCount++;
              results.errors.push(`Interview ${interviewId} not found`);
              return;
            }

            const workspaceId =
              interview?.workspaceId || qrInterview?.workspaceId;

            const workspace = await db.workspaces.get(workspaceId as any);

            if (
              !workspace ||
              !workspace.data.members.includes(ctx.user.email || "")
            ) {
              results.failedCount++;
              results.errors.push(
                `No permission to delete interview ${interviewId}`,
              );
              return;
            }

            console.log("Deleting interview", interview);

            if (interview) {
              await db.interviews.remove(interviewId as any);
            } else {
              await db.qrInterviews.remove(interviewId as any);
            }

            // Safely delete Daily room without failing the interview deletion
            safeDailyRoomDeletion(interview?.id || qrInterview?.id || "");

            results.deletedCount++;
          } catch (error) {
            console.error(`Error deleting interview ${interviewId}:`, error);
            results.failedCount++;
            results.errors.push(
              `Failed to delete interview ${interviewId}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            );
          }
        }),
      );

      // If no interviews were deleted, consider it a failure
      if (results.deletedCount === 0) {
        results.success = false;
      }

      return results;
    }),

  update: publicProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/interviews/{interviewId}",
        tags: ["Interviews"],
        summary: "Update an interview",
        description: "Update an interview",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
        data: interviewSchema.partial().extend({
          enableSchedule: z.boolean().optional(),
          duration: z.number().optional(),
          startTime: z.date().optional(),
          endTime: z.date().optional(),
          intervieweeEmail: z.string().email().optional(),
        }),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const interview = await getInterview(input.interviewId);

        if (!interview) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await db.interviews.update(input.interviewId as any, {
          ...input.data,
          ...(input.data.enableSchedule
            ? {
                startTime: input.data.startTime || interview.startTime,
                endTime: new Date(
                  (input.data.startTime?.getTime() ||
                    interview.startTime?.getTime() ||
                    new Date().getTime()) +
                    (input.data.duration || interview.duration) * 60000,
                ),
              }
            : {}),
        });

        console.log("Interview to update", interview);

        if (input.data.enableSchedule) {
          const startTime = Math.floor(
            (input.data.startTime?.getTime() ||
              interview.startTime?.getTime() ||
              new Date().getTime()) /
              1000 -
              Date.now() / 1000,
          );

          console.log("newly calculated startTime", startTime);

          /// Delete the preview room that has been created for admin to be able to join the meeting
          /// This step is necessary as Daily have qouta for number of rooms created and making rooms
          /// without specifing end date for them (like admin rooms which lasts for one month) will make
          /// our account on daily ran out of room quota quick
          try {
            await daily.deleteRoom(interview.id + "-owner");
          } catch (error) {
            console.log(
              "Looks like no rooms have been created for admin or something wrong happened",
            );
          }

          // If enableSchedule is true, we need to create/update the room
          const roomProperties = {
            exp: startTime + (input.data.duration || interview.duration) * 60,
            nbf: startTime + Date.now() / 1000,
          };

          try {
            // If interview already had a startTime, it's rescheduling - update existing room
            if (interview.startTime) {
              console.log("Rescheduling: updating existing room");
              await daily.updateRoom(interview.id, roomProperties);
            } else {
              // First-time scheduling - create new room
              console.log("First-time scheduling: creating new room");
              await daily.createRoom({
                name: interview.id,
                properties: roomProperties,
              });
            }
          } catch (error) {
            // If update fails (room doesn't exist), fall back to creating new room
            console.log("Room update failed, creating new room:", error);
            await daily.createRoom({
              name: interview.id,
              properties: roomProperties,
            });
          }
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof DailyError
              ? error.message
              : "Failed to update interview",
        });
      }
    }),

  getRecordingAccessLink: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/interviews/{interviewId}/recordingAccessLink",
        tags: ["Interviews"],
        summary: "Get (or refresh) the recording access link for an interview",
        description:
          "Returns a fresh, time-limited access link for the interview recording and updates the interview record with the new link and expiration date.",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        recordingUrl: z.string().url(),
        recordingExpiresAt: z.date(),
      }),
    )
    .mutation(async ({ input }) => {
      const interview = await getInterview(input.interviewId);

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Interview not found (likely already expired or never created)",
        });
      }

      if (!interview.recordingId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No recording is associated with this interview yet.",
        });
      }

      // Request a fresh access link from Daily.co
      const recording = await daily.getRecordingAccessLink(
        interview.recordingId,
      );

      const recordingUrl: string = recording.download_link;
      const recordingExpiresAt = moment(recording.expires_at).toDate();

      // Persist the updated link & expiry to the DB
      await db.interviews.update(input.interviewId as any, {
        recordingUrl,
        recordingExpiresAt,
      });

      return { success: true, recordingUrl, recordingExpiresAt };
    }),

  // Get all interviews (admin only)
  getAll: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/interviews",
        tags: ["Interviews"],
        summary: "Get all interviews (admin only)",
        description: "Get all interviews for analytics - admin only",
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
        interviews: z.array(interviewSchema),
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

        const allInterviews = await db.interviews.all();
        const totalInterviews = allInterviews.length;

        const limitedInterviews = allInterviews
          .slice(0, input.limit)
          .map((interview) => ({
            ...interview.data,
            id: interview.ref.id,
          }));

        return {
          interviews: limitedInterviews,
          total: totalInterviews,
        };
      } catch (error) {
        console.error("Error fetching all interviews:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch interviews",
        });
      }
    }),

  // Reanalyze an existing interview
  reanalyze: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/interviews/{interviewId}/reanalyze",
        tags: ["Interviews"],
        summary: "Reanalyze an interview",
        description:
          "Reanalyze an existing interview to generate new feedback and score",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        score: z.number(),
        feedback: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const interview = await getInterview(input.interviewId);

      if (!interview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Interview not found",
        });
      }

      if (!interview.content) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Interview has no content to analyze",
        });
      }

      console.log(
        "🔄 [REANALYSIS] Starting reanalysis for interview:",
        input.interviewId,
      );

      const customPrompt = interview.analysisPrompt;

      // Default prompt as the base
      const defaultPrompt = `You are an analyzer who is analyzing the interview content and based on the content:
- you will give a score between 0 and 100.
- you will give detailed feedback based on the content.

The interview content is: {INTERVIEW_CONTENT}

IMPORTANT: You must respond with ONLY a valid JSON object in this exact format:
{
  "score": 85,
  "feedback": "Your detailed feedback here..."
}

Do not include any text before or after the JSON object. Do not use markdown code blocks.`;

      // Log prompt selection and combination
      if (customPrompt && customPrompt.trim()) {
        console.log(
          "✅ [REANALYSIS] APPENDING custom analysis prompt to default for workspace:",
          interview.workspaceId,
        );
        console.log(
          "📝 [REANALYSIS] Custom prompt preview:",
          customPrompt.substring(0, 200) + "...",
        );
      } else {
        console.log("🔹 [REANALYSIS] Using default analysis prompt");
      }

      // Combine prompts: always start with default, then append custom if exists
      let finalPrompt = defaultPrompt;
      if (customPrompt && customPrompt.trim()) {
        finalPrompt = `${defaultPrompt}\n\nAdditional analysis requirements:\n${customPrompt}`;
      }

      // Replace the placeholder with actual interview content
      finalPrompt = finalPrompt.replace(
        "{INTERVIEW_CONTENT}",
        interview.content,
      );

      console.log("🚀 [REANALYSIS] Starting AI analysis...");
      console.log(
        "📊 [REANALYSIS] Interview content length:",
        interview.content.length,
      );

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: finalPrompt,
          },
        ],
      });

      let score = 0;
      let feedback = "";

      const aiResponse = response.choices[0]?.message?.content || "";

      try {
        const parsed = jsonParser(aiResponse);
        score = parsed.score || 0;
        feedback = parsed.feedback || "";

        console.log("🎯 [REANALYSIS] Analysis completed:");
        console.log("🔹 Score:", score);
        console.log("🔹 Feedback length:", feedback?.length || 0);
        console.log(
          "🔹 Feedback preview:",
          feedback?.substring(0, 150) + "..." || "No feedback",
        );
      } catch (error) {
        console.error(
          "❌ [REANALYSIS] Failed to parse AI response as JSON:",
          error,
        );
        console.log(
          "🔍 [REANALYSIS] Raw AI response:",
          aiResponse?.substring(0, 500) + "...",
        );

        // Attempt to extract feedback from raw text if JSON parsing fails
        const rawText = aiResponse?.trim();
        if (rawText && rawText.length > 10) {
          // Try to find score in text (e.g., "score: 75" or "Score: 75")
          const scoreMatch = rawText.match(/(?:score|Score):\s*(\d+)/);
          if (scoreMatch) {
            score = parseInt(scoreMatch[1]) || 0;
          }

          // Use the raw text as feedback if it's meaningful
          feedback =
            rawText.length > 50
              ? rawText
              : "The AI provided a response but it couldn't be properly parsed. Please try running the analysis again.";
        } else {
          feedback =
            "The AI didn't provide a valid response. This might be due to insufficient interview content or a temporary service issue. Please try again.";
        }
      }

      await db.interviews.update(input.interviewId as any, {
        score: score,
        feedback:
          feedback ||
          "Unable to generate feedback at this time. Please try again.",
      });

      console.log("✅ [REANALYSIS] Interview analysis saved to database");
      return { success: true, score, feedback };
    }),
});
