import { db } from "@root/server/typedFirestore";
import { qrInterviewSchema } from "@root/shared/zod-schemas";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@root/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const qrInterviewsRouter = createTRPCRouter({
  create: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/qr-interviews",
        tags: ["QR Interviews"],
        summary: "Create a QR code interview",
        description: "Create a QR code interview",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        jobProfileId: z.string(),
        qrCode: z.string().url().optional().nullable(),
        interviewData: qrInterviewSchema.shape.interviewData.pick({
          jobProfileId: true,
          level: true,
          startTime: true,
          endTime: true,
          duration: true,
          paid: true,
          price: true,
          enableVerification: true,
          analysisPrompt: true,
        }),
      }),
    )
    .output(
      z.object({
        id: z.string(),
        jobProfileId: z.string(),
        interviewId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { jobProfileId, qrCode } = input;

      const qrCodeInterview = await db.qrInterviews.add({
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaceId: input.workspaceId,
        qrCode: input.qrCode || "",
        interviewData: input.interviewData,
      });

      await db.qrInterviews.update(qrCodeInterview.id, {
        id: qrCodeInterview.id,
      });

      return {
        id: qrCodeInterview.id,
        jobProfileId: input.jobProfileId,
        interviewId: qrCodeInterview.id,
      };
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/qr-interviews/{id}",
        tags: ["QR Interviews"],
        summary: "Update a QR code interview",
        description: "Update a QR code interview",
      },
    })
    .input(
      z.object({
        id: z.string(),
        qrCode: z.string().url(),
      }),
    )
    .output(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, qrCode } = input;

      await db.qrInterviews.update(id, {
        qrCode: qrCode || "",
      });

      return { id };
    }),

  getById: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/qr-interviews/{id}",
        tags: ["QR Interviews"],
        summary: "Get a QR code interview by ID",
        description: "Get a QR code interview by ID",
      },
    })
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .output(qrInterviewSchema)
    .query(async ({ input }) => {
      const { id } = input;

      const qrInterview = await db.qrInterviews.get(id);

      if (!qrInterview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "QR interview not found",
        });
      }

      return qrInterview.data;
    }),
});
