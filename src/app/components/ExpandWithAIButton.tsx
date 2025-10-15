"use client";

import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import InlineNotification from "@root/app/components/InlineNotification";
import { Button, ButtonProps } from "@heroui/react";

interface ExpandWithAIButtonProps {
  jobProfileData: {
    name: string;
    description: string;
    generalPrompt: string;
  };
  onPromptUpdate: (updatedPrompt: string) => void;
  disabled?: boolean;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
  mode?: "expand" | "regenerate";
}

export const ExpandWithAIButton: React.FC<ExpandWithAIButtonProps> = ({
  jobProfileData,
  onPromptUpdate,
  disabled = false,
  size = "sm",
  variant = "default",
  className = "",
  mode = "expand",
}) => {
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const generateGeneralPromptWithAI = async () => {
    if (!jobProfileData.name) {
      setNotification({
        type: "error",
        message: "Please select or create a job profile first",
      });
      return;
    }

    setIsGeneratingPrompt(true);

    try {
      const existingPrompt = jobProfileData.generalPrompt || "";
      const hasExistingContent = existingPrompt.trim().length > 0;

      const prompt =
        mode === "regenerate"
          ? `Generate a completely new and comprehensive interview prompt for AI interviewer for the following position:

Job Title: ${jobProfileData.name}
${
  jobProfileData.description
    ? `Job Description: ${jobProfileData.description}`
    : ""
}

Please create a detailed interview prompt that includes:
- Introduction and role overview
- Key technical skills and competencies to assess
- Behavioral questions and scenarios
- Problem-solving challenges appropriate for this role
- Assessment criteria and what to look for in responses
- Guidelines for follow-up questions
- How to evaluate candidate responses

Format this as a clear, comprehensive prompt that an AI interviewer can use to conduct effective interviews for this position. The prompt should be professional, thorough, and adaptable to different candidate levels.`
          : hasExistingContent
          ? `Analyze the existing interview prompt below and enhance it WITHOUT duplicating existing content. Only add genuinely new, non-repetitive content that complements what's already there.

Job Title: ${jobProfileData.name}
${
  jobProfileData.description
    ? `Job Description: ${jobProfileData.description}`
    : ""
}

Existing Prompt:
${existingPrompt}

IMPORTANT INSTRUCTIONS:
1. DO NOT repeat or duplicate any existing questions, skills, or assessment criteria
2. DO NOT create new numbered sections if similar ones already exist
3. ONLY add content that is genuinely different and complementary
4. If technical skills are already listed, add different/advanced skills, not similar ones
5. If behavioral questions exist, add unique scenarios, not variations of existing ones
6. Focus on filling gaps or adding depth to areas that are underdeveloped

Please provide ONLY the new, non-duplicate content that should be added. Be concise and avoid redundancy.`
          : `Generate a comprehensive interview prompt for AI interviewer for the following position:

Job Title: ${jobProfileData.name}
${
  jobProfileData.description
    ? `Job Description: ${jobProfileData.description}`
    : ""
}

Please create a detailed interview prompt that includes:
- Introduction and role overview
- Key technical skills and competencies to assess
- Behavioral questions and scenarios
- Problem-solving challenges appropriate for this role
- Assessment criteria and what to look for in responses
- Guidelines for follow-up questions
- How to evaluate candidate responses

Format this as a clear, comprehensive prompt that an AI interviewer can use to conduct effective interviews for this position. The prompt should be professional, thorough, and adaptable to different candidate levels.`;

      const response = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`Failed to generate prompt: ${response.status}`);
      }

      const responseText = await response.text();

      if (!responseText) {
        throw new Error("Empty response from server");
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        throw new Error("Invalid response format from server");
      }

      if (!data.generatedPrompt) {
        throw new Error("No prompt returned from server");
      }

      // Handle content based on mode
      const newContent =
        mode === "regenerate" || !hasExistingContent
          ? data.generatedPrompt
          : `${existingPrompt}\n\n${data.generatedPrompt}`;

      onPromptUpdate(newContent);

      const successMessage =
        mode === "regenerate"
          ? "Interview prompt regenerated successfully!"
          : hasExistingContent
          ? "Interview prompt expanded successfully!"
          : "Interview prompt generated successfully!";
      setNotification({ type: "success", message: successMessage });
    } catch (error) {
      console.error("Error generating prompt:", error);
      const errorMessage = jobProfileData.generalPrompt?.trim()
        ? "Failed to expand prompt. Please try again."
        : "Failed to generate prompt. Please try again.";
      setNotification({ type: "error", message: errorMessage });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  return (
    <>
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <Button
        type="button"
        color="primary"
        size={size as ButtonProps["size"]}
        variant={variant as ButtonProps["variant"]}
        onPress={generateGeneralPromptWithAI}
        isDisabled={disabled || isGeneratingPrompt || !jobProfileData.name}
        className={`flex items-center gap-2 hover:scale-105 transition-all duration-200 ${className}`}
        isLoading={isGeneratingPrompt}
      >
        {isGeneratingPrompt ? (
          <>
            {mode === "regenerate"
              ? "Regenerating..."
              : jobProfileData.generalPrompt?.trim()
              ? "Expanding..."
              : "Generating..."}
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            {mode === "regenerate" ? "Regenerate with AI" : "Expand with AI"}
          </>
        )}
      </Button>
    </>
  );
};
