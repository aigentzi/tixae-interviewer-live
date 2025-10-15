"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Send } from "lucide-react";
import { useChat } from "@root/lib/useChat";
import { Message } from "ai";
import { useInterviewSetup } from "../contexts/interview-setup.context";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { api } from "@root/trpc/react";
import { Response } from "./Response";

interface JobProfile {
  id?: string;
  name?: string;
  description?: string;
  levels?: any[];
  generalPrompt?: string;
}

interface InterviewSetup {
  jobProfile?: JobProfile;
  currentContent?: string;
  questions?: string[];
}

interface ChatPanelProps {
  interviewSetup?: InterviewSetup;
  onContentUpdate?: (content: string) => void;
  onQuestionsUpdate?: (questions: string[]) => void;
}

export function ChatPanel({
  interviewSetup,
  onContentUpdate,
  onQuestionsUpdate,
}: ChatPanelProps = {}) {
  const [visitorLanguage, setVisitorLanguage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"write" | "support">("write");
  const [welcomeMessageTranslated, setWelcomeMessageTranslated] =
    useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const currentJobProfileIdRef = useRef<string | undefined>(undefined);

  const {
    selectedJobProfile,
    setSelectedJobProfile,
    setJobProfileData,
    saveToHistory,
    saveConversation,
    getConversation,
    clearConversation,
    getConversationCount,
    hasConversation,
  } = useInterviewSetup();
  const { activeWorkspace } = useActiveWorkspace();
  const utils = api.useUtils();

  // Memoize conversation to prevent unnecessary re-creation
  const currentConversation = useMemo(() => {
    if (!selectedJobProfile?.id) return [];
    return getConversation(selectedJobProfile.id);
  }, [selectedJobProfile?.id, getConversation]);

  /***********************
   * Helper Functions
   **********************/
  const getSystemPrompt = () => {
    const jobName = interviewSetup?.jobProfile?.name || "Software Engineer";
    const jobDescription = interviewSetup?.jobProfile?.description || "";
    const currentContent = interviewSetup?.currentContent || "";
    const questions = interviewSetup?.questions || [];

    // Instruction for language preference
    const languageInstruction = `\n\nCommunication:\n- Respond to the user in the language they are using.`;

    if (activeTab === "write") {
      return `You are an expert AI assistant specializing in creating interview content for ${jobName} positions.

Job Context:
- Position: ${jobName}
- Description: ${jobDescription}
- Current Interview Structure: ${currentContent}
- Existing Questions: ${questions.join(", ")}

Available Tools:
You have access to tools that can directly modify the job profile in the database:
- updateGeneralPrompt: Use this to update or modify the general interview prompt/structure.
- addInterviewQuestions: Use this to add new interview questions to the job profile.

Instructions:
1. Help the user improve their interview content with suggestions and modifications
2. When making changes, use the appropriate tools to update the job profile directly
3. Focus on creating structured, professional interview content
4. Suggest improvements to existing content and questions
5. Ensure all content is relevant to the ${jobName} position

The tools will directly update the job profile in the database.${languageInstruction}`;
    } else {
      return `You are a helpful support assistant for the Tixae Interviewer platform. Help users with technical questions, platform features, and troubleshooting.${languageInstruction}`;
    }
  };

  const createWelcomeMessage = useCallback(
    (): Message => ({
      id: "welcome",
      role: "assistant",
      content:
        activeTab === "write"
          ? `Hello! I'm here to help you with your ${
              interviewSetup?.jobProfile?.name || "Software Engineer"
            } interview setup. I can see your current interview structure and questions. What would you like to work on?`
          : "Hello! I'm here to help you with any questions about the Tixae Interviewer platform. How can I assist you?",
    }),
    [activeTab, interviewSetup?.jobProfile?.name],
  );

  const getInitialMessages = useCallback((): Message[] => {
    if (!selectedJobProfile?.id) {
      return [createWelcomeMessage()];
    }

    if (currentConversation.length > 0) {
      // Use existing conversation but update the welcome message if needed
      const updatedConversation = [...currentConversation];
      if (updatedConversation[0]?.id === "welcome") {
        updatedConversation[0] = createWelcomeMessage();
      }
      return updatedConversation;
    }

    return [createWelcomeMessage()];
  }, [selectedJobProfile?.id, createWelcomeMessage, currentConversation]);

  const handleAddQuestions = async () => {
    saveToHistory(); // Save current state before AI changes
    const jobName = interviewSetup?.jobProfile?.name || "Software Engineer";
    await generateContent(
      `Add 3 new technical questions to my existing ${jobName} interview questions that focus on areas not already covered.`,
    );
  };

  const handleImprovePrompts = async () => {
    saveToHistory(); // Save current state before AI changes
    const jobName = interviewSetup?.jobProfile?.name || "Software Engineer";
    await generateContent(
      `Completely rewrite and improve my current ${jobName} interview prompts. Replace the entire structure with a more effective and modern approach.`,
    );
  };

  const handleRestructureInterview = async () => {
    saveToHistory(); // Save current state before AI changes
    const jobName = interviewSetup?.jobProfile?.name || "Software Engineer";
    await generateContent(
      `Help me restructure my ${jobName} interview flow for better candidate assessment. Suggest a better organization of the existing content.`,
    );
  };

  const handleSubmit = (e: any) => {
    if (input.trim()) {
      saveToHistory(); // Save current state before any AI interaction
    }
    originalHandleSubmit(e);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
    setMessages,
    generateContent,
    data,
  } = useChat({
    // Pass job profile context through jobProfileContext (matching API expectation)
    jobProfileContext: getSystemPrompt(),
    workspaceId: activeWorkspace?.id,
    jobProfileId: selectedJobProfile?.id,
    tone: "professional",
    currentContent: interviewSetup?.currentContent,
    onContentUpdate,
    onQuestionsUpdate,
    onFinish: async (message: any) => {
      if (selectedJobProfile?.id && activeWorkspace?.id) {
        await utils.jobProfiles.getById.invalidate({
          jobProfileId: selectedJobProfile.id,
        });
        await utils.jobProfiles.getAll.invalidate({
          workspaceId: activeWorkspace.id,
        });

        try {
          const updatedProfile = await utils.jobProfiles.getById.fetch({
            jobProfileId: selectedJobProfile.id,
          });

          if (updatedProfile) {
            setSelectedJobProfile(updatedProfile);
            setJobProfileData({
              name: updatedProfile.name,
              description: updatedProfile.description || "",
              generalPrompt: updatedProfile.generalPrompt || "",
            });
          }
        } catch (error) {
          console.error("Failed to fetch updated profile:", error);
        }
      }
    },
  });

  /***********************
   * Custom Effects
   **********************/

  // Save conversation whenever messages change (but not on initial load)
  useEffect(() => {
    // Don't save during initialization or if no job profile
    if (
      !isInitializedRef.current ||
      !selectedJobProfile?.id ||
      messages.length <= 1
    ) {
      return;
    }

    // Don't save if the job profile just changed (to prevent saving stale messages)
    if (currentJobProfileIdRef.current !== selectedJobProfile.id) {
      return;
    }

    // Only save if more than just welcome message
    saveConversation(selectedJobProfile.id, messages);
  }, [messages, selectedJobProfile?.id, saveConversation]);

  // 1️⃣ initialise messages when job profile or tab changes
  useEffect(() => {
    const jobProfileId = selectedJobProfile?.id;
    if (
      currentJobProfileIdRef.current === jobProfileId &&
      isInitializedRef.current
    )
      return;

    currentJobProfileIdRef.current = jobProfileId;
    isInitializedRef.current = true;
    setWelcomeMessageTranslated(false);
    setMessages(getInitialMessages() as any);
  }, [selectedJobProfile?.id, activeTab, getInitialMessages, setMessages]);

  // 2️⃣ translate welcome message whenever the visitorLanguage becomes known
  useEffect(() => {
    if (!visitorLanguage || messages.length === 0 || welcomeMessageTranslated)
      return;

    const translateWelcome = async () => {
      const res = await fetch("/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: messages[0].content,
          targetLang: visitorLanguage,
        }),
      });
      const { translation } = await res.json();

      setMessages((prev) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], content: translation };
        return updated;
      });

      setWelcomeMessageTranslated(true);
    };

    translateWelcome();
  }, [visitorLanguage, setMessages, messages, welcomeMessageTranslated]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for tool execution events to invalidate cache
  useEffect(() => {
    if (data && data.length > 0) {
      const latestData = data[data.length - 1];

      // Type guard to check if latestData is an object with the expected properties
      if (
        latestData &&
        typeof latestData === "object" &&
        "type" in latestData &&
        latestData.type === "tool_executed" &&
        selectedJobProfile?.id &&
        activeWorkspace?.id
      ) {
        console.log("🔧 Tool executed, invalidating job profile cache...", {
          toolNames: (latestData as any).toolNames,
          jobProfileId: selectedJobProfile.id,
          workspaceId: activeWorkspace.id,
        });

        // Invalidate the specific job profile and the list
        utils.jobProfiles.getById.invalidate({
          jobProfileId: selectedJobProfile.id,
        });
        utils.jobProfiles.getAll.invalidate({
          workspaceId: activeWorkspace.id,
        });

        console.log(
          "✅ Cache invalidated - UI should refresh with updated data",
        );
      }
    }
  }, [data, selectedJobProfile?.id, activeWorkspace?.id, utils]);

  // Listen for AI action events from ControlPanel
  useEffect(() => {
    const handleAddQuestionsEvent = () => {
      if (activeTab === "write") {
        handleAddQuestions();
      }
    };

    const handleImprovePromptsEvent = () => {
      if (activeTab === "write") {
        handleImprovePrompts();
      }
    };

    const handleRestructureEvent = () => {
      if (activeTab === "write") {
        handleRestructureInterview();
      }
    };

    window.addEventListener("ai-add-questions", handleAddQuestionsEvent);
    window.addEventListener("ai-improve-prompts", handleImprovePromptsEvent);
    window.addEventListener("ai-restructure", handleRestructureEvent);

    return () => {
      window.removeEventListener("ai-add-questions", handleAddQuestionsEvent);
      window.removeEventListener(
        "ai-improve-prompts",
        handleImprovePromptsEvent,
      );
      window.removeEventListener("ai-restructure", handleRestructureEvent);
    };
  }, [
    activeTab,
    handleAddQuestions,
    handleImprovePrompts,
    handleRestructureInterview,
  ]);

  // Detect visitor language
  useEffect(() => {
    const detectVisitorLanguage = () => {
      // Use browser language directly
      if (typeof navigator !== "undefined" && navigator.language) {
        const browserLanguage = navigator.language.split("-")[0];
        console.log("🔍 Browser language:", browserLanguage);
        setVisitorLanguage(browserLanguage);
      }
    };

    detectVisitorLanguage();
  }, []);

  // Reset initialization when component unmounts
  useEffect(() => {
    return () => {
      isInitializedRef.current = false;
      currentJobProfileIdRef.current = undefined;
    };
  }, []);

  return (
    <div className="w-full xl:w-[360px] h-full flex flex-col overflow-hidden ">
      <div className="flex-1 flex flex-col min-h-0 p-2">
        <div className="h-full bg-content1 rounded-2xl shadow-lg border border-default-100 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-primary text-primary-foreground py-3 px-5 flex items-center justify-between border-b border-default-100 rounded-t-2xl">
            <div className="flex bg-background rounded-[10px] overflow-hidden border border-default-100 shadow-sm">
              <button
                className={`px-3 h-8 text-xs font-medium transition-all duration-200 ${
                  activeTab === "write"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "bg-background text-foreground hover:bg-secondary/60"
                }`}
                onClick={() => setActiveTab("write")}
              >
                Write
              </button>
              <button
                className={`px-3 h-8 text-xs font-medium transition-all duration-200 opacity-50 relative ${
                  activeTab === "support"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "bg-background text-foreground hover:bg-secondary/60"
                }`}
                onClick={() => setActiveTab("support")}
                disabled={true}
                title="Coming soon!"
              >
                Support
              </button>
            </div>

            {/* Small clear chat button - only shown when there's a conversation */}
            {selectedJobProfile?.id &&
              hasConversation(selectedJobProfile.id) && (
                <button
                  onClick={() => {
                    if (selectedJobProfile?.id) {
                      clearConversation(selectedJobProfile.id);
                      const newMessages = [createWelcomeMessage()];
                      setWelcomeMessageTranslated(false);
                      setMessages(newMessages as any);
                    }
                  }}
                  className="text-primary-foreground/70 hover:text-primary-foreground text-xs opacity-60 hover:opacity-100 transition-opacity"
                  title="Clear conversation"
                >
                  Clear
                </button>
              )}
          </div>

          {/* Chat Content */}
          <div className="relative flex-1 overflow-hidden">
            <div
              ref={chatContainerRef}
              className="h-full overflow-auto p-4 space-y-4"
            >
              {messages.map((message) => {
                if (message.id === "welcome" && !welcomeMessageTranslated) {
                  return (
                    <div className="flex items-start gap-3" key={message.id}>
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-xs font-medium">
                          AI
                        </span>
                      </div>
                      <div className="max-w-[85%] rounded-xl px-4 py-3 bg-primary text-primary-foreground text-sm shadow-lg">
                        <div className="flex items-center gap-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                          <span className="text-xs">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={message.id}
                    className={`${
                      message.role === "assistant"
                        ? "justify-start"
                        : "flex justify-end"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary text-xs font-medium">
                            AI
                          </span>
                        </div>
                        <div className="max-w-[85%] rounded-xl px-4 py-3 bg-primary text-primary-foreground text-sm shadow-lg">
                          <Response>{message.content}</Response>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[85%] rounded-xl px-4 py-3 bg-secondary text-secondary-foreground text-sm shadow-lg">
                        <p className="leading-relaxed">{message.content}</p>
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-xs font-medium">AI</span>
                  </div>
                  <div className="max-w-[85%] rounded-xl px-4 py-3 bg-primary text-primary-foreground text-sm shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-xs">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="mx-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">
                    Error: {error.message}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="px-3 py-2">
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                className="w-full min-h-[79px] md:min-h-[79px] lg:min-h-[105px] xl:min-h-[141px] p-4 pr-12 border border-content2/20  text-foreground rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm placeholder:text-muted-foreground/50 backdrop-blur-sm transition-all duration-200"
                placeholder={
                  activeTab === "write"
                    ? `Ask me to work on your ${
                        interviewSetup?.jobProfile?.name || "Software Engineer"
                      } interview questions`
                    : "Ask me about platform features, troubleshooting, or how to use Tixae..."
                }
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Powered by section */}
            <div className="flex items-center justify-center pt-2">
              <img
                src="/Powered_by_Tixae (1).png"
                alt="Powered by Tixae.ai"
                className="h-4 opacity-70 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
