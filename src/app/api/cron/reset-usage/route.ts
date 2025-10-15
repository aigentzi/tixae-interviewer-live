import { NextRequest, NextResponse } from "next/server";
import { db } from "@root/server/typedFirestore";

export async function GET(req: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (optional security check)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting monthly usage reset job...");

    // Get all users
    const users = await db.users.all();
    const now = new Date();
    let resetCount = 0;

    for (const user of users) {
      const { recurringUsage } = user.data;

      // Skip users without recurring usage (no subscription)
      if (!recurringUsage) {
        continue;
      }

      // Calculate if a month has passed since last reset
      const lastReset = new Date(recurringUsage.lastResetAt);
      const nextResetDate = new Date(lastReset);
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);

      // If current date is past the next reset date, reset the usage
      if (now >= nextResetDate) {
        console.log(
          `Resetting usage for user ${user.ref.id}, last reset: ${lastReset.toISOString()}`,
        );

        try {
          await db.users.update(user.ref.id as any, {
            recurringUsage: {
              ...recurringUsage,
              interviewsUsed: 0,
              lastResetAt: now,
            },
          });

          resetCount++;
          console.log(`✅ Reset usage for user ${user.ref.id}`);
        } catch (error) {
          console.error(
            `❌ Failed to reset usage for user ${user.ref.id}:`,
            error,
          );
        }
      }
    }

    console.log(
      `Monthly usage reset job completed. Reset ${resetCount} users.`,
    );

    return NextResponse.json({
      success: true,
      message: `Successfully reset usage for ${resetCount} users`,
      resetCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in usage reset cron job:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
