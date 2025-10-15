import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@root/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@root/server/typedFirestore";
import {
  jobProfileSchema,
  levelEnum,
  promptSetSchema,
} from "@root/shared/zod-schemas";
import {
  createJobProfile,
  updateJobProfile,
  updateProfilePrompt,
} from "@root/lib/jobProfiles.lib";
import { JOB_PROFILE_TEMPLATES } from "@root/lib/job-profile-templates.lib";
import { SAMPLE_QUESTIONS } from "@root/app/app/interviews/components/onboarding/constants";

const createJobProfileSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  levels: z.array(promptSetSchema).optional(),
  generalPrompt: z.string().optional(),
  startingMessage: z.string().optional(),
});

const cloneTemplateSchema = z.object({
  workspaceId: z.string(),
  templateId: z.string(),
  customQuestions: z.array(z.string()).optional(),
});

const updateQuestionsSchema = z.object({
  workspaceId: z.string(),
  jobProfileId: z.string(),
  questions: z.array(z.string()),
});

const updatePromptSchema = z.object({
  jobProfileId: z.string(),
  level: levelEnum,
  prompt: z.string().min(1),
  generalPrompt: z.string().optional(),
});

const updateJobProfileSchema = z.object({
  jobProfileId: z.string(),
  data: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    levels: z.array(promptSetSchema).optional(),
    generalPrompt: z.string().optional(),
    startingMessage: z.string().optional(),
  }),
});

// Helper function to integrate questions into prompt
const integrateQuestionsIntoPrompt = (
  originalPrompt: string,
  customQuestions: string[],
): string => {
  // Always include default questions
  let enhancedPrompt = originalPrompt;

  // Add default questions if they're not already present
  if (!originalPrompt.includes("**Default Interview Questions:**")) {
    enhancedPrompt = `${originalPrompt}

**Default Interview Questions:**
${SAMPLE_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
  }

  // Add custom questions if provided
  if (customQuestions && customQuestions.length > 0) {
    enhancedPrompt = `${enhancedPrompt}

**Additional Custom Questions:**
${customQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
  }

  // Add instruction
  if (customQuestions && customQuestions.length > 0) {
    enhancedPrompt += `

Focus on both the default and custom questions while maintaining the role-specific interview approach. Use these questions as primary talking points and expand with follow-up questions based on the candidate's responses.

IMPORTANT: When asking questions during the interview, do NOT state the question numbers out loud. Ask the questions naturally without saying "Question 1", "Question 2", etc.`;
  } else {
    enhancedPrompt += `

Focus on these core questions while maintaining the role-specific interview approach described above. Use these questions as primary talking points and expand with follow-up questions based on the candidate's responses.

IMPORTANT: When asking questions during the interview, do NOT state the question numbers out loud. Ask the questions naturally without saying "Question 1", "Question 2", etc.`;
  }

  return enhancedPrompt;
};

export const jobProfilesRouter = createTRPCRouter({
  // Clone a global template to workspace
  cloneTemplate: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/{workspaceId}/jobProfiles/clone",
        tags: ["Job Profiles"],
        summary: "Clone a global template to workspace",
        description:
          "Clone a global job profile template to workspace with optional custom questions",
      },
    })
    .input(cloneTemplateSchema)
    .output(z.object({ id: z.string() }))
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

        // Find the template
        const template = JOB_PROFILE_TEMPLATES.find(
          (t) => t.id === input.templateId,
        );
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }

        // Integrate custom questions into the prompt if provided
        const enhancedPrompt =
          input.customQuestions && input.customQuestions.length > 0
            ? integrateQuestionsIntoPrompt(
                template.generalPrompt,
                input.customQuestions,
              )
            : template.generalPrompt;

        // Create workspace-specific job profile
        const id = await createJobProfile({
          workspaceId: input.workspaceId,
          name: template.name,
          description: template.description,
          generalPrompt: enhancedPrompt,
          startingMessage: template.startingMessage,
        });

        return { id };
      } catch (error) {
        console.error("Error cloning template:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to clone template",
        });
      }
    }),

  // Update workspace template with custom questions
  updateQuestions: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/{workspaceId}/jobProfiles/{jobProfileId}/questions",
        tags: ["Job Profiles"],
        summary: "Update job profile with custom questions",
        description:
          "Update a workspace job profile by integrating custom questions into the general prompt",
      },
    })
    .input(updateQuestionsSchema)
    .output(z.object({ success: z.boolean() }))
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

        const jobProfile = await db.jobProfiles.get(input.jobProfileId as any);
        if (!jobProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Job profile not found",
          });
        }

        if (jobProfile.data.workspaceId !== input.workspaceId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Job profile does not belong to this workspace",
          });
        }

        // Get the original prompt (remove any existing custom questions section)
        let originalPrompt = jobProfile.data.generalPrompt || "";
        const customQuestionsIndex = originalPrompt.indexOf(
          "**Custom Interview Questions:**",
        );
        if (customQuestionsIndex !== -1) {
          originalPrompt = originalPrompt
            .substring(0, customQuestionsIndex)
            .trim();
        }

        // Integrate new questions
        const enhancedPrompt = integrateQuestionsIntoPrompt(
          originalPrompt,
          input.questions,
        );

        // Update the job profile
        const success = await updateJobProfile(input.jobProfileId, {
          generalPrompt: enhancedPrompt,
        });

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update job profile",
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Error updating questions:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update questions",
        });
      }
    }),

  create: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/{workspaceId}/jobProfiles",
        tags: ["Job Profiles"],
        summary: "Create a job profile",
        description: "Create a job profile",
      },
    })
    .input(createJobProfileSchema)
    .output(
      z.object({
        id: z.string(),
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

        const id = await createJobProfile(input);

        return { id };
      } catch (error) {
        console.error("Error creating job profile:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create job profile",
        });
      }
    }),

  getAll: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/{workspaceId}/jobProfiles",
        tags: ["Job Profiles"],
        summary: "Get all job profiles",
        description: "Get all job profiles",
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
        jobProfiles: z.array(jobProfileSchema),
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

        const allJobProfiles = await db.jobProfiles.all();

        // Filter and validate job profiles
        const validJobProfiles = allJobProfiles
          .filter((doc) => {
            // Check if document has valid data structure
            if (!doc.data || !doc.ref?.id) {
              console.warn("Job profile with invalid structure found:", {
                docId: doc.ref?.id || "unknown",
                hasData: !!doc.data,
                hasRef: !!doc.ref,
              });
              return false;
            }

            // Check for required fields
            if (!doc.data.workspaceId || !doc.data.name) {
              console.warn("Job profile with missing required fields found:", {
                docId: doc.ref.id,
                workspaceId: doc.data.workspaceId,
                name: doc.data.name,
                hasWorkspaceId: !!doc.data.workspaceId,
                hasName: !!doc.data.name,
              });
              return false;
            }

            // Validate levels array and its contents
            if (doc.data.levels) {
              const hasInvalidLevels = doc.data.levels.some((level: any) => {
                if (!level || typeof level.prompt !== "string") {
                  console.warn("Job profile with invalid level/prompt found:", {
                    docId: doc.ref.id,
                    level: level,
                    hasLevel: !!level,
                    promptType: typeof level?.prompt,
                  });
                  return true;
                }
                return false;
              });

              if (hasInvalidLevels) {
                return false;
              }
            }

            return doc.data.workspaceId === input.workspaceId;
          })
          .sort((a, b) => a.data.name.localeCompare(b.data.name))
          .slice(0, input.limit);

        return {
          jobProfiles: validJobProfiles.map((doc) => {
            const data = doc.data;
            return {
              id: doc.ref.id,
              workspaceId: data.workspaceId,
              name: data.name,
              description: data.description || undefined,
              levels: Array.isArray(data.levels)
                ? data.levels.filter(
                    (level: any) => level && typeof level.prompt === "string",
                  )
                : [],
              generalPrompt: data.generalPrompt || undefined,
              startingMessage: data.startingMessage || undefined,
              createdAt:
                data.createdAt instanceof Date
                  ? data.createdAt
                  : new Date(data.createdAt),
              updatedAt:
                data.updatedAt instanceof Date
                  ? data.updatedAt
                  : new Date(data.updatedAt),
            };
          }),
        };
      } catch (error) {
        console.error("Error fetching job profiles:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch job profiles",
        });
      }
    }),

  getById: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/jobProfiles/{jobProfileId}",
        tags: ["Job Profiles"],
        summary: "Get a job profile by id",
        description: "Get a job profile by id",
      },
    })
    .input(
      z.object({
        jobProfileId: z.string(),
      }),
    )
    .output(jobProfileSchema)
    .query(async ({ input, ctx }) => {
      try {
        const doc = await db.jobProfiles.get(input.jobProfileId as any);

        if (!doc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Job profile not found",
          });
        }

        return { ...doc.data, id: doc.ref.id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  updatePrompt: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/{workspaceId}/jobProfiles/{jobProfileId}/prompts",
        tags: ["Job Profiles"],
        summary: "Update a job profile prompt",
        description: "Update a job profile prompt",
      },
    })
    .input(
      updatePromptSchema.extend({
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

        const doc = await db.jobProfiles.get(input.jobProfileId as any);

        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (
          !workspace ||
          !workspace.data.members.includes(ctx.user.email || "")
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const success = await updateProfilePrompt(
          input.jobProfileId,
          input.level,
          input.prompt,
        );

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update prompt",
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/{workspaceId}/jobProfiles/{jobProfileId}",
        tags: ["Job Profiles"],
        summary: "Update a job profile",
        description: "Update a job profile",
      },
    })
    .input(
      updateJobProfileSchema.extend({
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

        const doc = await db.jobProfiles.get(input.jobProfileId as any);

        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (
          !workspace ||
          !workspace.data.members.includes(ctx.user.email || "")
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const success = await updateJobProfile(input.jobProfileId, input.data);

        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update job profile",
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update job profile",
        });
      }
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/{workspaceId}/jobProfiles/{jobProfileId}",
        tags: ["Job Profiles"],
        summary: "Delete a job profile",
        description: "Delete a job profile",
      },
    })
    .input(
      z.object({
        jobProfileId: z.string(),
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

        const doc = await db.jobProfiles.get(input.jobProfileId as any);

        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (
          !workspace ||
          !workspace.data.members.includes(ctx.user.email || "")
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        // Check if any interviews use this profile
        const interviews = (await db.interviews.all()).filter(
          (interview) => interview.data.jobProfileId === input.jobProfileId,
        );

        if (interviews.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete job profile with existing interviews",
          });
        }

        await db.jobProfiles.remove(input.jobProfileId as any);

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});
