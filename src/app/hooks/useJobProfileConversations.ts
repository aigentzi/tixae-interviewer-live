import { useState, useEffect, useCallback } from "react";
import { Message } from "ai";

export interface JobProfileConversation {
  jobProfileId: string;
  messages: Message[];
  lastUpdated: Date;
}

export const useJobProfileConversations = () => {
  const [conversations, setConversations] = useState<
    Map<string, JobProfileConversation>
  >(new Map());

  // Load conversations from localStorage on mount
  useEffect(() => {
    try {
      const savedConversations = localStorage.getItem(
        "jobProfileConversations"
      );
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations);
        const conversationMap = new Map();

        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          conversationMap.set(key, {
            ...value,
            lastUpdated: new Date(value.lastUpdated),
          });
        });

        setConversations(conversationMap);
      }
    } catch (error) {
      console.warn("Failed to load conversations from localStorage:", error);
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    try {
      const conversationsObject = Object.fromEntries(conversations);
      localStorage.setItem(
        "jobProfileConversations",
        JSON.stringify(conversationsObject)
      );
    } catch (error) {
      console.warn("Failed to save conversations to localStorage:", error);
    }
  }, [conversations]);

  const saveConversation = useCallback(
    (jobProfileId: string, messages: Message[]) => {
      setConversations((prev) => {
        const newConversations = new Map(prev);
        newConversations.set(jobProfileId, {
          jobProfileId,
          messages: [...messages],
          lastUpdated: new Date(),
        });
        return newConversations;
      });
    },
    []
  );

  const getConversation = useCallback(
    (jobProfileId: string): Message[] => {
      const conversation = conversations.get(jobProfileId);
      return conversation ? [...conversation.messages] : [];
    },
    [conversations]
  );

  const clearConversation = useCallback((jobProfileId: string) => {
    setConversations((prev) => {
      const newConversations = new Map(prev);
      newConversations.delete(jobProfileId);
      return newConversations;
    });
  }, []);

  const clearAllConversations = useCallback(() => {
    setConversations(new Map());
    localStorage.removeItem("jobProfileConversations");
  }, []);

  const getConversationCount = useCallback(
    (jobProfileId: string): number => {
      const conversation = conversations.get(jobProfileId);
      return conversation ? Math.max(0, conversation.messages.length - 1) : 0; // Subtract 1 for welcome message
    },
    [conversations]
  );

  const hasConversation = useCallback(
    (jobProfileId: string): boolean => {
      return getConversationCount(jobProfileId) > 0;
    },
    [getConversationCount]
  );

  return {
    conversations,
    saveConversation,
    getConversation,
    clearConversation,
    clearAllConversations,
    getConversationCount,
    hasConversation,
  };
};
