import { useChat as useAIChat } from "@ai-sdk/react";
import { Message } from "ai";

interface UseChatOptions {
  interviewId?: string;
  shouldWrite?: boolean;
  tone?: string;
  userName?: string;
  interviewContext?: string;
  jobProfileContext?: string;
  workspaceId?: string;
  jobProfileId?: string;
  isVoiceInput?: boolean;
  directContentModification?: boolean;
  selectedText?: string;
  selectionRange?: { start: number; end: number };
  currentContent?: string;
  api?: string;
  initialMessages?: Message[];
  onFinish?: (message: Message) => void;
  onError?: (error: Error) => void;
  onContentUpdate?: (content: string) => void;
  onQuestionsUpdate?: (questions: string[]) => void;
}

export function useChat({
  interviewId,
  shouldWrite = false,
  tone = "professional",
  userName,
  interviewContext,
  jobProfileContext,
  workspaceId,
  jobProfileId,
  isVoiceInput = false,
  directContentModification = false,
  selectedText,
  selectionRange,
  currentContent,
  api = "/api/chat",
  initialMessages = [],
  onFinish,
  onError,
  onContentUpdate,
  onQuestionsUpdate,
}: UseChatOptions = {}) {
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    append,
    setMessages,
    data,
  } = useAIChat({
    api,
    body: {
      interviewId,
      shouldWrite,
      tone,
      userName,
      interviewContext,
      jobProfileContext,
      workspaceId,
      jobProfileId,
      isVoiceInput,
      directContentModification,
      selectedText,
      selectionRange,
      currentContent,
    },
    onFinish,
    onError,
  });

  const sendMessage = async (
    content: string,
    options?: Partial<UseChatOptions>
  ) => {
    return append({
      role: "user",
      content,
    });
  };

  const generateContent = async (prompt: string) => {
    return sendMessage(prompt, {
      shouldWrite: true,
      directContentModification: false,
    });
  };

  const quickEdit = async (text: string, instruction: string) => {
    return sendMessage(instruction, {
      shouldWrite: false,
      directContentModification: true,
      selectedText: text,
      currentContent,
    });
  };

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    append,
    setMessages,
    data,
    sendMessage,
    generateContent,
    quickEdit,
  };
}
