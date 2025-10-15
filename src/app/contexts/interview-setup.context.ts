"use client";

import { createContext, useContext } from "react";
import { JobProfile } from "@root/shared/zod-schemas";
import { JobProfileTemplate } from "@root/lib/job-profile-templates.lib";
import { Message } from "ai";

// Per-job-profile conversation storage type
export interface JobProfileConversation {
  jobProfileId: string;
  messages: Message[];
  lastUpdated: Date;
}

export interface InterviewSetupContextType {
  selectedJobProfile: JobProfile | null;
  selectedTemplate: JobProfileTemplate | null;
  setSelectedJobProfile: (profile: JobProfile | null) => void;
  setSelectedTemplate: (template: JobProfileTemplate | null) => void;
  jobProfileData: {
    name: string;
    description: string;
    generalPrompt: string;
    startingMessage?: string;
  };
  setJobProfileData: (
    data:
      | {
          name: string;
          description: string;
          generalPrompt: string;
          startingMessage?: string;
        }
      | ((prev: {
          name: string;
          description: string;
          generalPrompt: string;
          startingMessage?: string;
        }) => {
          name: string;
          description: string;
          generalPrompt: string;
          startingMessage?: string;
        }),
  ) => void;
  undoHistory: Array<{
    jobProfile: JobProfile | null;
    jobProfileData: any;
    timestamp: Date;
  }>;
  saveToHistory: () => void;
  undo: () => boolean;
  // Conversation management per job profile
  conversations: Map<string, JobProfileConversation>;
  saveConversation: (jobProfileId: string, messages: Message[]) => void;
  getConversation: (jobProfileId: string) => Message[];
  clearConversation: (jobProfileId: string) => void;
  clearAllConversations: () => void;
  getConversationCount: (jobProfileId: string) => number;
  hasConversation: (jobProfileId: string) => boolean;
}

export const InterviewSetupContext = createContext<
  InterviewSetupContextType | undefined
>(undefined);

export const useInterviewSetup = () => {
  const context = useContext(InterviewSetupContext);
  if (context === undefined) {
    throw new Error(
      "useInterviewSetup must be used within an InterviewSetupProvider",
    );
  }
  return context;
};
