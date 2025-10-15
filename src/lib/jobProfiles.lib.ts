import { db } from "@root/server/typedFirestore";
import { JobProfile, Level, PromptSet } from "@root/shared/zod-schemas";
import { SAMPLE_QUESTIONS } from "@root/app/app/interviews/components/onboarding/constants";

// Helper function to integrate default questions into prompt
const addDefaultQuestionsToPrompt = (originalPrompt: string): string => {
  if (!originalPrompt) {
    return `**Default Interview Questions:**
${SAMPLE_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Please use these questions as starting points for the interview and expand with follow-up questions based on the candidate's responses.

IMPORTANT: When asking questions during the interview, do NOT state the question numbers out loud. Ask the questions naturally without saying "Question 1", "Question 2", etc.`;
  }

  return `${originalPrompt}

**Default Interview Questions:**
${SAMPLE_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Focus on these core questions while maintaining the role-specific interview approach described above. Use these questions as primary talking points and expand with follow-up questions based on the candidate's responses.

IMPORTANT: When asking questions during the interview, do NOT state the question numbers out loud. Ask the questions naturally without saying "Question 1", "Question 2", etc.`;
};

export async function getPrompt(
  profileId: string,
  level: Level
): Promise<string | null> {
  try {
    const profileRef = await db.jobProfiles.get(profileId as any);

    if (!profileRef) {
      console.error(`Job profile with ID ${profileId} not found`);
      return null;
    }

    const profile = profileRef.data;
    const promptSet = profile.levels.find(
      (p: { level: Level }) => p.level === level
    );

    if (!promptSet) {
      console.warn(
        `No prompt found for level ${level} in profile ${profileId}`
      );
      switch (level) {
        case "1":
          return "Prompt for intern-level candidate";
        case "2":
          return "Prompt for junior-level candidate";
        case "3":
          return "Prompt for senior-level candidate";
        case "4":
          return "Prompt for lead-level candidate";
        case "5":
          return "Prompt for manager-level candidate";
        case "6":
          return "Prompt for director-level candidate";
        case "7":
          return "Prompt for VP-level candidate";
        case "8":
          return "Prompt for C-level candidate";
        case "9":
          return "Prompt for CEO-level candidate";
        case "10":
          return "Prompt for founder-level candidate";

        default:
          return "General prompt";
      }
    }

    return promptSet.prompt;
  } catch (error) {
    console.error("Error getting prompt:", error);
    return null;
  }
}

export async function updateProfilePrompt(
  profileId: string,
  level: Level,
  newPrompt: string
): Promise<boolean> {
  try {
    const profileRef = await db.jobProfiles.get(profileId as any);

    if (!profileRef) {
      console.error(`Job profile with ID ${profileId} not found`);
      return false;
    }

    const profile = profileRef.data;
    const updatedLevels = [...profile.levels];

    const existingIndex = updatedLevels.findIndex(
      (p: { level: Level }) => p.level === level
    );

    if (existingIndex >= 0) {
      updatedLevels[existingIndex] = {
        level,
        prompt: newPrompt,
      };
    } else {
      updatedLevels.push({
        level,
        prompt: newPrompt,
      });
    }

    await db.jobProfiles.update(
      profileId as any,
      {
        levels: updatedLevels,
        updatedAt: new Date(),
      } as any
    );

    return true;
  } catch (error) {
    console.error("Error updating prompt:", error);
    return false;
  }
}

export async function createJobProfile(profile: {
  workspaceId: string;
  name: string;
  description?: string;
  levels?: Array<{ level: Level; prompt: string }>;
  generalPrompt?: string;
  startingMessage?: string;
}): Promise<string> {
  try {
    const now = new Date();

    // Add default questions to the general prompt
    const enhancedGeneralPrompt = addDefaultQuestionsToPrompt(
      profile.generalPrompt || ""
    );

    const newProfile: Omit<JobProfile, "id"> = {
      workspaceId: profile.workspaceId,
      name: profile.name,
      description: profile.description,
      levels: profile.levels || [],
      generalPrompt: enhancedGeneralPrompt,
      startingMessage: profile.startingMessage,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.jobProfiles.add(newProfile as any);
    return ref.id;
  } catch (error) {
    console.error("Error creating job profile:", error);
    throw error;
  }
}

export async function updateJobProfile(
  profileId: string,
  data: Partial<JobProfile>
): Promise<boolean> {
  try {
    const profileRef = await db.jobProfiles.get(profileId as any);

    if (!profileRef) {
      console.error(`Job profile with ID ${profileId} not found`);
      return false;
    }

    const profile = profileRef.data;
    const updatedProfile = { ...profile, ...data, updatedAt: new Date() };

    await db.jobProfiles.update(profileId as any, updatedProfile as any);
    return true;
  } catch (error) {
    console.error("Error updating job profile:", error);
    return false;
  }
}
