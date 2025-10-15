import { daily, DailyError } from "@root/lib/daily.lib";
import { ServiceError } from "@root/lib/service-error.lib";
import { db } from "@root/server/typedFirestore";
import {
  createRoomRequestBodySchema,
  dailyCoRoomSchema,
  getMeetingTokenRequestBodySchema,
} from "@root/shared/zod-schemas";
import { createTRPCRouter, publicProcedure } from "@root/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const dailyCoRouter = createTRPCRouter({
  createRoom: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/daily/createRoom",
        tags: ["DailyCo"],
        summary: "Create a new meeting room",
        description: "Create a new meeting room",
      },
    })
    .input(createRoomRequestBodySchema)
    .output(dailyCoRoomSchema)
    .mutation(async ({ input }) => {
      try {
        return await daily.createRoom({ ...input });
      } catch (error) {
        if (!(error instanceof DailyError)) {
          throw new TRPCError({
            message: "Failed to create Room",
            code: "INTERNAL_SERVER_ERROR",
          });
        }
        throw new TRPCError({
          message: error.formatMessage(),
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  validateRoom: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/daily/validateRoom",
        tags: ["DailyCo"],
        summary: "Validate a meeting room",
        description: "Validate a meeting room",
      },
    })
    .input(
      z.object({
        roomName: z.string(),
      }),
    )
    .output(
      z.union([
        dailyCoRoomSchema,
        z.object({
          rescheduleNeeded: z.boolean(),
        }),
      ]),
    )
    .mutation(async ({ input }) => {
      try {
        const interview = await db.interviews.get(input.roomName);

        if (interview?.data?.isEndedByInterviewee) {
          throw new ServiceError(
            `This interview has ended by the interviewee.<br> You can view the result of the interview <a href='/app/meeting/${input.roomName}/result' class='text-foreground-700 font-bold'>here</a>.`,
            "validateRoom",
          );
        }

        // Check if interview has actually started by looking at the score
        const interviewHasStarted =
          interview?.data?.score !== undefined &&
          interview?.data?.score !== null;

        // Only check timing if interview has a valid scheduled time
        if (interview?.data?.startTime) {
          const scheduledEndTime =
            interview.data.startTime.getTime() +
            (interview?.data?.duration || 0) * 60 * 1000;

          // If interview has started and ended, show results
          if (interviewHasStarted && scheduledEndTime < Date.now()) {
            throw new ServiceError(
              `This interview has ended.<br> You can view the result of the interview <a href='/app/meeting/${input.roomName}/result' class='text-foreground-700 font-bold'>here</a>.`,
              "validateRoom",
            );
          }

          // If interview hasn't started but scheduled time has passed, allow rescheduling
          if (!interviewHasStarted && scheduledEndTime < Date.now()) {
            return { rescheduleNeeded: true };
          }
        }

        return await daily.validateRoom(input.roomName);
      } catch (error) {
        console.log(`error`, error);
        if (!(error instanceof ServiceError)) {
          throw new TRPCError({
            message: "Failed to validate Room",
            code: "INTERNAL_SERVER_ERROR",
          });
        }
        throw new TRPCError({
          message: error.serialize().message,
          cause: error.serialize().comingFrom,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  getRoomToken: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/daily/getRoomToken",
        tags: ["DailyCo"],
        summary: "Get a room token",
        description: "Get a room token",
      },
    })
    .input(getMeetingTokenRequestBodySchema)
    .output(
      z.object({
        token: z.string().jwt(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await daily.getRoomToken({ ...input });
      } catch (error) {
        if (!(error instanceof DailyError)) {
          throw new TRPCError({
            message: "Failed to create Room",
            code: "INTERNAL_SERVER_ERROR",
          });
        }
        throw new TRPCError({
          message: error.formatMessage(),
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),
});
