import { EmailsService } from "@root/lib/emails.lib";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@root/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { ServiceError } from "@root/lib/service-error.lib";
import { emailSchema } from "@root/shared/zod-schemas";
import { db } from "@root/server/typedFirestore";

export const emailsRouter = createTRPCRouter({
  getEmails: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/{workspaceId}/emails",
        tags: ["Emails"],
        summary: "Get all emails",
        description: "Get all emails",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        emails: z.array(emailSchema),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);

        if (!workspace || !workspace.data.members.includes(ctx.user.email || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const emails = await EmailsService.getEmails(input.workspaceId);

        return {
          emails,
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[emailsRouter::getEmails()]").formatMessage(),
        });
      }
    }),

  getEmailsByInterviewId: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/{workspaceId}/emails/interview/{interviewId}",
        tags: ["Emails"],
        summary: "Get all emails by interview id",
        description: "Get all emails by interview id",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        emails: z.array(emailSchema),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);

        if (!workspace || !workspace.data.members.includes(ctx.user.email || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const emails = await EmailsService.getEmailsByInterviewId(input.interviewId, input.workspaceId);

        return {
          emails,
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[emailsRouter::getEmailsByInterviewId()]").formatMessage(),
        });
      }
    }),

  getEmailsByJobProfileId: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/{workspaceId}/emails/jobProfile/{jobProfileId}",
        tags: ["Emails"],
        summary: "Get all emails by job profile id",
        description: "Get all emails by job profile id",
      },
    })
    .input(
      z.object({
        jobProfileId: z.string(),
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        emails: z.array(emailSchema),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);

        if (!workspace || !workspace.data.members.includes(ctx.user.email || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const emails = await EmailsService.getEmailsByJobProfileId(input.jobProfileId, input.workspaceId);

        return {
          emails,
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[emailsRouter::getEmailsByJobProfileId()]").formatMessage(),
        });
      }
    }),

  getEmailsWithInterviewAndJobProfile: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/{workspaceId}/emails/interview/{interviewId}/jobProfile/{jobProfileId}",
        tags: ["Emails"],
        summary: "Get all emails with interview and job profile",
        description: "Get all emails with interview and job profile",
      },
    })
    .input(
      z.object({
        interviewId: z.string(),
        jobProfileId: z.string(),
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        emails: z.array(emailSchema),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);

        if (!workspace || !workspace.data.members.includes(ctx.user.email || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const emails = await EmailsService.getEmailsWithInterviewAndJobProfile(input.interviewId, input.jobProfileId, input.workspaceId);

        return {
          emails,
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[emailsRouter::getEmailsWithInterviewAndJobProfile()]").formatMessage(),
        });
      }
    }),

  getEmailById: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/{workspaceId}/emails/{emailId}",
        tags: ["Emails"],
        summary: "Get an email by id",
        description: "Get an email by id",
      },
    })
    .input(
      z.object({
        emailId: z.string(),
        workspaceId: z.string(),
      })
    )
    .output(
      emailSchema.optional()
    )
    .query(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);

        if (!workspace || !workspace.data.members.includes(ctx.user.email || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        return await EmailsService.getEmailById(input.emailId, input.workspaceId);
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[emailsRouter::getEmailById()]").formatMessage(),
        });
      }
    }),

  createEmail: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/{workspaceId}/jobProfile/{jobProfileId}/emails",
        tags: ["Emails"],
        summary: "Create an email",
        description: "Create an email",
      },
    })
    .input(
      z.object({
        email: z.string(),
        jobProfileId: z.string(),
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        emailId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);

        if (!workspace || !workspace.data.members.includes(ctx.user.email || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const emailId = await EmailsService.createEmail({
          email: input.email,
          jobProfileId: input.jobProfileId,
          workspaceId: input.workspaceId,
        });

        return {
          emailId,
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[emailsRouter::createEmail()]").formatMessage(),
        });
      }
    }),

  updateEmail: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/{workspaceId}/emails",
        tags: ["Emails"],
        summary: "Update an email",
        description: "Update an email",
      },
    })
    .input(
      z.object({
        email: z.string(),
        jobProfileId: z.string(),
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        emailId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);

        if (!workspace || !workspace.data.members.includes(ctx.user.email || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const emailId = await EmailsService.updateEmail({
          email: input.email,
          jobProfileId: input.jobProfileId,
          workspaceId: input.workspaceId,
        });

        return {
          emailId,
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[emailsRouter::updateEmail()]").formatMessage(),
        });
      }
    }),

  deleteEmail: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/{workspaceId}/emails/{emailId}",
        tags: ["Emails"],
        summary: "Delete an email",
        description: "Delete an email",
      },
    })
    .input(
      z.object({
        emailId: z.string(),
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        emailId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);

        if (!workspace || !workspace.data.members.includes(ctx.user.email || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const emailId = await EmailsService.deleteEmail(input.emailId, input.workspaceId);

        return {
          emailId,
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[emailsRouter::deleteEmail()]").formatMessage(),
        });
      }
    }),

  bulkCreateEmails: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/{workspaceId}/jobProfile/{jobProfileId}/emails/bulk",
        tags: ["Emails"],
        summary: "Bulk create emails",
        description: "Bulk create emails",
      },
    })
    .input(
      z.object({
        jobProfileId: z.string(),
        emails: z.array(z.string()),
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        emailIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId as any);

        if (!workspace || !workspace.data.members.includes(ctx.user.email || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this workspace",
          });
        }

        const emailIds = await EmailsService.bulkCreateEmails(input.jobProfileId, input.emails, input.workspaceId);

        return {
          emailIds,
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[emailsRouter::bulkCreateEmails()]").formatMessage(),
        });
      }
    }),
});
