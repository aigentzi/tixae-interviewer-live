import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db } from "@root/server/typedFirestore";
import { KYCSession } from "@root/shared/zod-schemas";

// Clean object for Firestore - removes functions, undefined values, and deeply serializes
function cleanObjectForFirestore(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanObjectForFirestore(item));
  }

  if (typeof obj === "object" && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && typeof value !== "function") {
        cleaned[key] = cleanObjectForFirestore(value);
      }
    }
    return cleaned;
  }

  // For primitive values, dates, etc.
  if (obj instanceof Date) {
    return obj;
  }

  // Convert to JSON and back for other complex objects
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.warn("Failed to serialize object for Firestore:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...body } = await request.json();

    switch (action) {
      case "create_session": {
        const { interviewId, documentType } = body;

        if (!interviewId) {
          return NextResponse.json(
            { success: false, error: "Interview ID is required" },
            { status: 400 }
          );
        }

        // Check if a session already exists for this interview
        let existingSession = null;
        try {
          const existingSessions = await db.kycSessions.query(($) => [
            $.field("interviewId").eq(interviewId),
          ]);
          existingSession = existingSessions[0];
        } catch (error) {
          console.log("Could not query existing sessions:", error);
          // Continue to create new session if query fails
        }

        if (existingSession?.data) {
          console.log(
            "Reusing existing KYC session:",
            existingSession.data.sessionId,
            "for interview:",
            interviewId
          );

          // Reset session status to pending if it was failed/completed for retry
          if (
            existingSession.data.status === "failed" ||
            existingSession.data.status === "completed"
          ) {
            await db.kycSessions.update(existingSession.data.sessionId, {
              status: "pending" as const,
              updatedAt: new Date(),
              result: undefined,
              documentImage: undefined,
              documentImageBack: undefined,
            });
          }

          return NextResponse.json({
            success: true,
            sessionId: existingSession.data.sessionId,
            qrCodeUrl: `${process.env.NEXTAUTH_URL}/app/kyc/mobile/${existingSession.data.sessionId}`,
          });
        }

        // Create new session only if none exists
        const sessionId = uuidv4();
        const now = new Date();

        const kycSession: KYCSession = {
          id: sessionId,
          sessionId,
          interviewId,
          documentType: documentType as
            | "passport"
            | "driver_license"
            | "id_card"
            | undefined,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };

        await db.kycSessions.set(sessionId, kycSession);

        console.log(
          "Created new KYC session:",
          sessionId,
          "for interview:",
          interviewId
        );

        return NextResponse.json({
          success: true,
          sessionId,
          qrCodeUrl: `https://2a500986be6c.ngrok-free.app/app/kyc/mobile/${sessionId}`,
        });
      }

      case "get_session": {
        const { sessionId } = body;

        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: "Session ID is required" },
            { status: 400 }
          );
        }

        const session = await db.kycSessions.get(sessionId);
        if (!session) {
          return NextResponse.json(
            { success: false, error: "Session not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          session: {
            sessionId: session.data.sessionId,
            status: session.data.status,
            documentType: session.data.documentType,
            result: session.data.result,
          },
        });
      }

      case "update_session": {
        const { sessionId, status, documentImage, documentImageBack, result } =
          body;

        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: "Session ID is required" },
            { status: 400 }
          );
        }

        const session = await db.kycSessions.get(sessionId);
        if (!session) {
          return NextResponse.json(
            { success: false, error: "Session not found" },
            { status: 404 }
          );
        }

        const updates: Partial<KYCSession> = {
          updatedAt: new Date(),
        };

        if (status) updates.status = status;
        if (documentImage) updates.documentImage = documentImage;
        if (documentImageBack) updates.documentImageBack = documentImageBack;
        if (result) {
          // Deep serialize and clean result object to avoid Firestore nested entity errors
          // Remove the raw response as it can contain complex nested structures
          const { data, ...resultWithoutRaw } = result;
          const cleanedResult = {
            ...resultWithoutRaw,
            data: data
              ? {
                  ...data,
                  raw: undefined, // Remove raw response to avoid Firestore nested entity errors
                }
              : undefined,
          };
          updates.result = cleanObjectForFirestore(cleanedResult);
        }

        await db.kycSessions.update(sessionId, updates);

        const updatedSession = await db.kycSessions.get(sessionId);
        console.log(
          "Session updated:",
          sessionId,
          "status:",
          updatedSession?.data.status
        );

        return NextResponse.json({
          success: true,
          session: {
            sessionId: updatedSession?.data.sessionId,
            status: updatedSession?.data.status,
            documentType: updatedSession?.data.documentType,
            result: updatedSession?.data.result,
          },
        });
      }

      case "delete_session": {
        const { sessionId } = body;

        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: "Session ID is required" },
            { status: 400 }
          );
        }

        const session = await db.kycSessions.get(sessionId);
        if (!session) {
          return NextResponse.json(
            { success: false, error: "Session not found" },
            { status: 404 }
          );
        }

        await db.kycSessions.remove(sessionId);

        return NextResponse.json({
          success: true,
          message: "Session deleted successfully",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("KYC Session API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await db.kycSessions.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.data.sessionId,
        status: session.data.status,
        documentType: session.data.documentType,
        result: session.data.result,
      },
    });
  } catch (error) {
    console.error("KYC Session GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
