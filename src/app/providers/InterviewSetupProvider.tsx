"use client";

import React, { useState, useCallback } from "react";
import { InterviewSetupContext } from "../contexts/interview-setup.context";
import { JobProfile } from "@root/shared/zod-schemas";
import { JobProfileTemplate } from "@root/lib/job-profile-templates.lib";
import { Message } from "ai";
import { useJobProfileConversations } from "../hooks/useJobProfileConversations";

interface InterviewSetupProviderProps {
  children: React.ReactNode;
}

export const InterviewSetupProvider: React.FC<InterviewSetupProviderProps> = ({
  children,
}) => {
  const [selectedJobProfile, setSelectedJobProfile] =
    useState<JobProfile | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<JobProfileTemplate | null>(null);
  const [jobProfileData, setJobProfileData] = useState<{
    name: string;
    description: string;
    generalPrompt: string;
    startingMessage?: string;
  }>({
    name: "",
    description: "",
    generalPrompt: "",
    startingMessage: "",
  });
  const [undoHistory, setUndoHistory] = useState<
    Array<{
      jobProfile: JobProfile | null;
      jobProfileData: any;
      timestamp: Date;
    }>
  >([]);

  // Use the custom hook for conversation management
  const {
    conversations,
    saveConversation,
    getConversation,
    clearConversation,
    clearAllConversations,
    getConversationCount,
    hasConversation,
  } = useJobProfileConversations();

  const saveToHistory = () => {
    if (selectedJobProfile || jobProfileData.name) {
      setUndoHistory((prev) => [
        ...prev.slice(-4), // Keep only last 5 states
        {
          jobProfile: selectedJobProfile,
          jobProfileData: { ...jobProfileData },
          timestamp: new Date(),
        },
      ]);
    }
  };

  const undo = () => {
    if (undoHistory.length > 0) {
      const lastState = undoHistory[undoHistory.length - 1];
      setSelectedJobProfile(lastState.jobProfile);
      setJobProfileData(lastState.jobProfileData);
      setUndoHistory((prev) => prev.slice(0, -1));
      return true;
    }
    return false;
  };

  return (
    <InterviewSetupContext.Provider
      value={{
        selectedJobProfile,
        selectedTemplate,
        setSelectedJobProfile,
        setSelectedTemplate,
        jobProfileData,
        setJobProfileData,
        undoHistory,
        saveToHistory,
        undo,
        conversations,
        saveConversation,
        getConversation,
        clearConversation,
        clearAllConversations,
        getConversationCount,
        hasConversation,
      }}
    >
      {children}
    </InterviewSetupContext.Provider>
  );
};
