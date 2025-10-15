import { db } from "@root/server/typedFirestore";
import { Interview, Level, QrInterview } from "@root/shared/zod-schemas";
import { createId } from "@paralleldrive/cuid2";
import { getPrompt } from "./jobProfiles.lib";

export async function createInterview(input: {
  userId: string;
  workspaceId: string;
  jobProfileId: string;
  level?: Level;
  duration: number;
  paid?: boolean;
  price?: number;
  startTime?: Date;
  endTime?: Date;
  intervieweeEmail?: string;
  enableVerification?: boolean;
  analysisPrompt?: string;
  introVideoUrl?: string;
  isDemo?: boolean;
}): Promise<Interview> {
  try {
    const now = new Date();
    const id = createId();

    const newInterview: Interview = {
      id,
      userId: input.userId,
      workspaceId: input.workspaceId,
      jobProfileId: input.jobProfileId,
      level: input.level || undefined,
      duration: input.duration,
      paid: input.paid || false,
      price: input.price || 0,
      isDemo: input.isDemo || false,
      startTime: input.startTime || undefined,
      endTime: input.endTime || undefined,
      intervieweeEmail: input.intervieweeEmail || undefined,
      enableVerification: input.enableVerification || false,
      analysisPrompt: input.analysisPrompt || undefined,
      introVideoUrl: input.introVideoUrl || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const newInterviewRef = await db.interviews.add(newInterview as any);

    return { ...newInterview, id: newInterviewRef.id };
  } catch (error) {
    console.error("Error creating interview:", error);
    throw error;
  }
}

export async function completeInterview(
  interviewId: string,
  content: string,
  score?: number,
  feedback?: string
): Promise<boolean> {
  try {
    const now = new Date();
    const updateData: Partial<Interview> = {
      endTime: now,
      content,
      updatedAt: now,
    };

    if (score !== undefined) {
      updateData.score = score;
    }

    if (feedback) {
      updateData.feedback = feedback;
    }

    await db.interviews.update(interviewId as any, updateData as any);
    return true;
  } catch (error) {
    console.error("Error completing interview:", error);
    return false;
  }
}

export async function getInterview(
  interviewId: string
): Promise<Interview | null> {
  try {
    const doc = await db.interviews.get(interviewId as any);

    if (!doc) {
      const interview = await db.interviews.query(($) =>
        $.field("id").eq(interviewId)
      );

      if (interview.length < 1) {
        return null;
      }

      return { ...interview[0].data, id: interview[0].ref.id };
    }

    return { ...doc.data, id: doc.ref.id };
  } catch (error) {
    console.error("Error getting interview:", error);
    return null;
  }
}

export async function getQrInterview(
  interviewId: string
): Promise<QrInterview | null> {
  try {
    const doc = await db.qrInterviews.get(interviewId as any);

    if (!doc) {
      const interview = await db.qrInterviews.query(($) =>
        $.field("id").eq(interviewId)
      );

      if (interview.length < 1) {
        return null;
      }

      return { ...interview[0].data, id: interview[0].ref.id };
    }

    return { ...doc.data, id: doc.ref.id };
  } catch (error) {
    console.error("Error getting interview:", error);
    return null;
  }
}

export async function getWorkspaceInterviews(
  workspaceId: string,
  limit = 50
): Promise<Interview[]> {
  try {
    const interviews = await db.interviews.query(($) =>
      $.field("workspaceId").eq(workspaceId)
    );

    const sortedInterviews = interviews
      .sort((a, b) => b.data.createdAt.getTime() - a.data.createdAt.getTime())
      .slice(0, limit);

    return sortedInterviews.map((doc) => ({ ...doc.data, id: doc.ref.id }));
  } catch (error) {
    console.error("Error getting workspace interviews:", error);
    throw error;
  }
}

export async function getInterviewPrompt(
  interviewId: string
): Promise<string | null> {
  try {
    const interview = await getInterview(interviewId);

    if (!interview) {
      return null;
    }

    // If no level is specified, get the general prompt instead
    if (!interview.level) {
      return getPrompt(interview.jobProfileId, "3"); // Default to mid-level or handle differently
    }

    return getPrompt(interview.jobProfileId, interview.level);
  } catch (error) {
    console.error("Error getting interview prompt:", error);
    return null;
  }
}
