import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@root/trpc/trpc";
import { db } from "@root/server/typedFirestore";
import { applicantSchema } from "@root/shared/zod-schemas";

export const applicantRouter = createTRPCRouter({
  create: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/applicant",
        tags: ["Applicant"],
        summary: "Create an applicant",
        description: "Create an applicant",
      },
    })
    .input(
      applicantSchema.omit({ id: true })
    )
    .output(
      z.object({
        success: z.boolean(),
        id: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.workspaceId || !input.email) {
        throw new Error("Workspace ID or email is required");
      }

      const id = `${input.workspaceId}-${input.email}`;

      // Check if the applicant already exists in same workspace
      const existingApplicant = await db
        .applicants
        .get(id);

      if (existingApplicant) {
        const applicant = existingApplicant.data;
        const updatedApplicant = await db.applicants.update(id, {
          ...input,
          interviewIds: [...new Set([...(applicant.interviewIds || []), ...(input.interviewIds || [])])],
          updatedAt: new Date(),
        });
        return { success: true, id: updatedApplicant.id || "" };
      }

      const applicant = await db.applicants.set(id, {
        ...input,
        interviewIds: [...(input.interviewIds || [])],
      });

      return { success: true, id: applicant.id };
    }),

  get: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/applicant",
        tags: ["Applicant"],
        summary: "Get an applicant",
        description: "Get an applicant",
      },
    })
    .input(
      z.object({ id: z.string() }).optional()
    )
    .output(
      z.object({
        success: z.boolean(),
        applicant: applicantSchema.optional(),
      })
    )
    .query(async ({ input }) => {
      const applicant = await db.applicants.get(input?.id || "");

      if (!applicant) {
        return { success: false, applicant: undefined };
      }

      return {
        success: true, applicant: {
          ...applicant.data,
          id: applicant.ref.id || "",
          firstName: applicant.data.firstName || undefined,
          lastName: applicant.data.lastName || undefined,
          interviewIds: applicant.data.interviewIds || [],
          workspaceId: applicant.data.workspaceId || undefined,
          createdAt: applicant.data.createdAt || undefined,
          updatedAt: applicant.data.updatedAt || undefined,
          cvUrl: applicant.data.cvUrl || undefined,
          cvContent: applicant.data.cvContent || undefined,
          email: applicant.data.email || undefined,
          phone: applicant.data.phone || undefined,
          age: applicant.data.age || undefined,
          gender: applicant.data.gender || undefined,
        }
      };
    }),

  getAll: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/{workspaceId}/applicants",
        tags: ["Applicant"],
        summary: "Get all applicants for a workspace",
        description: "Get all applicants for a workspace",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        applicants: z.array(applicantSchema),
      })
    )
    .query(async ({ input }) => {
      const applicants = await db
        .applicants
        .query(($) => $.field("workspaceId").eq(input.workspaceId));

      console.log(applicants);

      if (!applicants || applicants.length === 0) {
        return { success: false, applicants: [] };
      }

      return {
        success: true,
        applicants: applicants.map((doc) => ({
          ...doc.data,
          id: doc.ref.id || "",
          firstName: doc.data.firstName || undefined,
          lastName: doc.data.lastName || undefined,
          interviewIds: doc.data.interviewIds || [],
          workspaceId: doc.data.workspaceId || undefined,
          createdAt: doc.data.createdAt || undefined,
          updatedAt: doc.data.updatedAt || undefined,
          cvUrl: doc.data.cvUrl || undefined,
          cvContent: doc.data.cvContent || undefined,
          email: doc.data.email || undefined,
          phone: doc.data.phone || undefined,
          age: doc.data.age || undefined,
          gender: doc.data.gender || undefined,
        })),
      };
    }),
});
