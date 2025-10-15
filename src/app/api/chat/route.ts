import { openai } from "@root/lib/openai";
import {
  streamText,
  convertToCoreMessages,
  StreamData,
  generateText,
  tool,
} from "ai";
import { db } from "@root/server/typedFirestore";
import { db as adminDb } from "@root/server/firebase";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages,
      interviewId,
      shouldWrite = false,
      skipStream = false,
      selectedText,
      selectionRange,
      currentContent,
      tone = "professional",
      userName,
      interviewContext,
      isVoiceInput = false,
      directContentModification = false,
      jobProfileContext,
      workspaceId,
      jobProfileId,
    } = body;

    console.log("🎯 Chat API called with:", {
      isVoiceInput,
      messagesCount: messages?.length,
      shouldWrite,
      hasJobProfileContext: !!jobProfileContext,
      directContentModification,
    });

    if (isVoiceInput && messages?.length > 0) {
      console.log(
        "🎙️ Voice content being processed:",
        messages[messages.length - 1]?.content?.substring(0, 200) + "..."
      );
    }

    const data = new StreamData();

    let systemPrompt = "";

    if (interviewId && !jobProfileContext) {
      systemPrompt = await getInterviewContext(
        interviewId,
        shouldWrite,
        userName,
        interviewContext
      );
    } else if (jobProfileContext) {
      systemPrompt = jobProfileContext;
    } else {
      systemPrompt = `You are a helpful AI assistant for the Tixae Interviewer platform. 
      Help users with interview preparation, content creation, and platform guidance.`;
    }

    // If this is a write command with skipStream flag, handle without streaming
    if (shouldWrite && skipStream) {
      try {
        const { text } = await generateText({
          model: openai("gpt-4o"),
          messages: [
            { role: "system", content: systemPrompt },
            ...convertToCoreMessages(messages),
          ],
          temperature: 0.7,
          maxTokens: 5000,
        });

        const cleanContent = text
          .replace(/^(Certainly|Sure|Here|Of course|Yes)[!.].*?\n/i, "")
          .replace(/^That's perfect.*?Here's how.*?:\s*/i, "")
          .replace(/^That's a wonderful.*?Let's add.*?:\s*/i, "")
          .replace(/^Great.*?Here's.*?:\s*/i, "")
          .replace(/^Wonderful.*?Here's.*?:\s*/i, "")
          .replace(/^Based on.*?here's.*?:\s*/i, "")
          .replace(/^Let me.*?:\s*/i, "")
          .replace(/^I'll.*?:\s*/i, "")
          .replace(/^Here's.*?interview.*?:\s*/i, "")
          .replace(/^.*?Here's.*?based on.*?:\s*/i, "")
          .replace(/^.*?could sound.*?:\s*/i, "")
          .replace(/\n*---\n*/, "")
          .replace(/Would you like.*$/, "")
          .replace(/^\*\*.*?\*\*\n/, "")
          .trim();

        // Content would be handled by the frontend, no need to update database

        return new Response(
          JSON.stringify({ success: true, message: "Content updated." }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error generating content:", error);
        return new Response(
          JSON.stringify({ error: "Failed to generate content" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    const streamConfig = {
      temperature: 0.7,
      maxTokens: shouldWrite ? 5000 : 2000,
    };

    // AI Tools for job profile management - these will trigger the frontend updates
    const updateGeneralPrompt = tool({
      description:
        "Update or modify the general prompt/structure of a job profile",
      parameters: z.object({
        action: z
          .enum(["replace", "append"])
          .describe("Whether to replace the entire prompt or append to it"),
        content: z.string().describe("The new content to replace or append"),
        section: z
          .string()
          .optional()
          .describe("Optional section name for organization"),
      }),
      execute: async ({ action, content, section }) => {
        console.log("🔧 Tool executed - updateGeneralPrompt:", {
          action,
          content,
          section,
          workspaceId,
          jobProfileId,
        });

        if (!workspaceId || !jobProfileId) {
          return `Cannot update the job profile - no workspace or job profile ID provided. Please save your job profile first.`;
        }

        try {
          const currentProfileDoc = await adminDb
            .collection("jobProfiles")
            .doc(jobProfileId)
            .get();
          if (!currentProfileDoc.exists) {
            return `Job profile not found.`;
          }

          const currentProfile = currentProfileDoc.data();
          const updatedPrompt =
            action === "replace"
              ? content
              : (currentProfile?.generalPrompt || "") +
                "\n\n" +
                (section ? `**${section}:**\n` : "") +
                content;

          await adminDb.collection("jobProfiles").doc(jobProfileId).update({
            generalPrompt: updatedPrompt,
            updatedAt: new Date(),
          });

          console.log("✅ Job profile updated directly in database");
          return `I've ${
            action === "replace" ? "replaced" : "appended to"
          } the general prompt${
            section ? ` in section "${section}"` : ""
          }. The job profile has been updated in the database.`;
        } catch (error) {
          console.error("❌ Failed to update job profile:", error);
          return `Failed to update the job profile: ${error}`;
        }
      },
    });

    const addInterviewQuestions = tool({
      description: "Add new interview questions to the job profile",
      parameters: z.object({
        questions: z
          .array(z.string())
          .describe("Array of new interview questions to add"),
        category: z.string().optional().describe("Category for the questions"),
      }),
      execute: async ({ questions, category }) => {
        console.log("🔧 Tool executed - addInterviewQuestions:", {
          questions,
          category,
          workspaceId,
          jobProfileId,
        });

        if (!workspaceId || !jobProfileId) {
          return `Cannot add questions - no workspace or job profile ID provided. Please save your job profile first.`;
        }

        try {
          const currentProfileDoc = await adminDb
            .collection("jobProfiles")
            .doc(jobProfileId)
            .get();
          if (!currentProfileDoc.exists) {
            return `Job profile not found.`;
          }

          const currentProfile = currentProfileDoc.data();
          const currentPrompt = currentProfile?.generalPrompt || "";
          const questionsSection = `\n\n**${
            category || "Additional"
          } Interview Questions:**\n${questions
            .map((q, i) => `${i + 1}. ${q}`)
            .join("\n")}`;
          const updatedPrompt = currentPrompt + questionsSection;

          await adminDb.collection("jobProfiles").doc(jobProfileId).update({
            generalPrompt: updatedPrompt,
            updatedAt: new Date(),
          });

          console.log("✅ Questions added directly to database");
          return `I've added ${questions.length} new interview questions${
            category ? ` to the "${category}" category` : ""
          }. The job profile has been updated in the database.`;
        } catch (error) {
          console.error("❌ Failed to add questions:", error);
          return `Failed to add questions: ${error}`;
        }
      },
    });

    const finalSystemPrompt = directContentModification
      ? systemPrompt
      : systemPrompt;

    console.log(
      "🤖 System prompt includes voice instructions:",
      !!isVoiceInput
    );
    if (isVoiceInput) {
      console.log("🎙️ Voice-specific prompts added to system prompt");
    }

    // Use the system prompt as-is since tools handle everything directly
    const enhancedSystemPrompt = finalSystemPrompt;

    const result = streamText({
      model: openai("gpt-4o"),
      ...streamConfig,
      messages: convertToCoreMessages(messages),
      system: enhancedSystemPrompt,
      tools: directContentModification
        ? {} // No tools for direct content modification
        : {
            updateGeneralPrompt,
            addInterviewQuestions,
          },
      toolChoice: directContentModification
        ? "none" // No tools for direct content modification
        : "auto",
      maxSteps: directContentModification ? 1 : 5,
      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta") {
          // Handle chunk processing if needed
        }
      },
      abortSignal: req.signal,
      async onFinish(options) {
        const { text, toolCalls, toolResults } = options;

        console.log("🔄 onFinish called with:", {
          hasJobProfileContext: !!jobProfileContext,
          messagesLength: messages.length,
          hasLastMessage:
            messages.length > 0 ? messages[messages.length - 1]?.role : "none",
          toolCallsCount: toolCalls?.length || 0,
          toolResultsCount: toolResults?.length || 0,
        });

        if (toolCalls && toolCalls.length > 0) {
          console.log(
            "🔧 Tool calls made:",
            toolCalls.map((tc) => tc.toolName)
          );

          // Signal frontend to invalidate cache when tools are used
          data.append({
            type: "tool_executed",
            toolNames: toolCalls.map((tc) => tc.toolName),
            jobProfileId: jobProfileId,
            workspaceId: workspaceId,
          });
        }

        if (toolResults && toolResults.length > 0) {
          console.log("📊 Tool results:", toolResults);
        }

        // Content updates are handled by the frontend through callbacks
        // No need to save to database for job profile setup

        data.append({
          done: true,
          saved: shouldWrite ? true : false,
        });

        await data.close();
      },
    });

    return result.toDataStreamResponse({ data });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function getInterviewContext(
  interviewId: string,
  shouldWrite?: boolean,
  userName?: string,
  interviewContext?: string
) {
  try {
    const interviewDoc = await adminDb
      .collection("interviews")
      .doc(interviewId)
      .get();
    if (!interviewDoc.exists) throw new Error("Interview not found");

    const interviewData = interviewDoc.data();
    if (!interviewData) throw new Error("Interview data not found");

    if (shouldWrite) {
      return `You are an AI interview assistant for Tixae Interviewer.

INTERVIEW CONTEXT:
- Interview ID: ${interviewId}
- User ID: ${interviewData.userId}
- Workspace ID: ${interviewData.workspaceId}
- Job Profile ID: ${interviewData.jobProfileId}
- Level: ${interviewData.level || "not specified"}
- Duration: ${interviewData.duration} minutes
- Interviewee Email: ${interviewData.intervieweeEmail || "not specified"}
- Content: ${interviewData.content ? "Available" : "Not available"}

${interviewContext ? `Additional Context: ${interviewContext}` : ""}

Generate high-quality interview content based on the context. Focus on relevant questions and scenarios for the interview level. Maintain professional tone and structure.`;
    }

    return `You are an AI interview assistant for Tixae Interviewer.

INTERVIEW CONTEXT:
- Interview ID: ${interviewId}
- User ID: ${interviewData.userId}
- Workspace ID: ${interviewData.workspaceId}
- Job Profile ID: ${interviewData.jobProfileId}
- Level: ${interviewData.level || "not specified"}
- Duration: ${interviewData.duration} minutes
- Interviewee Email: ${interviewData.intervieweeEmail || "not specified"}
- Content: ${interviewData.content ? "Available" : "Not available"}

${interviewContext ? `Additional Context: ${interviewContext}` : ""}

You help users improve their interviews by suggesting better questions, analyzing interview structure, providing feedback on content, and offering insights on candidate evaluation.

${userName ? `User: ${userName}` : ""}`;
  } catch (error) {
    return `You are an AI interview assistant for Tixae Interviewer. 
    
I can help you with creating interview questions, improving interview structure, providing interview best practices, analyzing interview content, and offering candidate evaluation guidance.

How can I assist you with your interview today?`;
  }
}

async function updateInterviewContent(interviewId: string, newContent: string) {
  try {
    const interview = await db.interviews.get(interviewId);
    if (!interview) throw new Error("Interview not found");

    const updatedInterview = {
      ...interview.data,
      content: newContent,
      updatedAt: new Date(),
    };

    await db.interviews.set(interviewId, updatedInterview);
    return { success: true };
  } catch (error) {
    console.error("Error updating interview content:", error);
    throw error;
  }
}
