import { useTranslations } from "@root/app/providers/TranslationContext";
import { Button } from "@root/components/ui/button";
import { Card, CardContent } from "@root/components/ui/card";
import { JobProfileTemplate } from "@root/lib/job-profile-templates.lib";
import { Briefcase, Loader2, Building2 } from "lucide-react";
import { useState } from "react";
import { BUTTON_STYLES, CARD_STYLES } from "./constants";
import { Input, Select, SelectItem, Textarea } from "@heroui/react";
import InlineNotification from "@root/app/components/InlineNotification";

// Industry options for the select dropdown
const INDUSTRIES = [
  "Technology & Software",
  "Healthcare & Medical",
  "Finance & Banking",
  "Education",
  "Manufacturing",
  "Retail & E-commerce",
  "Consulting",
  "Marketing & Advertising",
  "Real Estate",
  "Transportation & Logistics",
  "Energy & Utilities",
  "Media & Entertainment",
  "Food & Beverage",
  "Non-profit & NGO",
  "Government & Public Sector",
  "Agriculture",
  "Construction",
  "Automotive",
  "Telecommunications",
  "Insurance",
  "Legal Services",
  "Hospitality & Tourism",
  "Sports & Recreation",
  "Other",
];

interface TemplateSelectionStepProps {
  onNext: (template: JobProfileTemplate) => void;
  isLoading?: boolean;
}

export const TemplateSelectionStep = ({
  onNext,
  isLoading = false,
}: TemplateSelectionStepProps) => {
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);
  const [jobData, setJobData] = useState({
    industry: "",
    otherIndustry: "",
    name: "",
    startingMessage:
      "Hello, welcome to your interview, who am I speaking with today?",
  });

  const [isGeneratingJobDescription, setIsGeneratingJobDescription] =
    useState(false);

  const generateAnalysisPrompt = async () => {
    if (
      !jobData.name ||
      !jobData.industry ||
      (jobData.industry === "Other" && !jobData.otherIndustry)
    ) {
      setNotification({
        type: "error",
        message:
          "Please select an industry (and specify it if 'Other') and job title first",
      });
      return;
    }
    const selectedIndustry =
      jobData.industry === "Other" ? jobData.otherIndustry : jobData.industry;
    const prompt = `Generate a job description for the job title ${jobData.name} in the industry ${selectedIndustry}.`;

    try {
      const response = await fetch("/api/generate-job-description", {
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

      return data.generatedPrompt;
    } catch (error) {
      console.error("Error generating job description:", error);
      setNotification({
        type: "error",
        message: "Failed to generate job description. Please try again.",
      });
    }
  };

  const t = useTranslations("onboarding");

  const handleNext = async () => {
    const selectedIndustry =
      jobData.industry === "Other" ? jobData.otherIndustry : jobData.industry;
    if (jobData.name && selectedIndustry) {
      setIsGeneratingJobDescription(true);
      const jobDescription = await generateAnalysisPrompt();
      setIsGeneratingJobDescription(false);

      const newTemplate: JobProfileTemplate = {
        id: `custom-${Date.now()}`,
        name: jobData.name,
        description: jobDescription || "",
        category: selectedIndustry,
        startingMessage:
          jobData.startingMessage ||
          "Welcome to your interview. Let's begin—what interests you about this position?",
        generalPrompt: `You are conducting an interview for a ${
          jobData.name
        } position in the ${selectedIndustry} industry. ${
          jobDescription
            ? `This role focuses on: ${jobDescription}.`
            : "Focus on the specific requirements and skills needed for this position."
        }`,
      };
      onNext(newTemplate);
    }
  };

  const renderJobForm = () => (
    <div className="mb-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
          <Building2 className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          Create Job Profile
        </h3>
        <p className="text-gray-600 text-base">
          Select your industry and provide job details to create a customized
          interview profile
        </p>
      </div>

      <div className="space-y-6 mb-8">
        {/* Industry Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Industry *
          </label>
          <Select
            placeholder="Select your industry"
            selectedKeys={jobData.industry ? [jobData.industry] : []}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0] as string;
              setJobData((prev) => ({
                ...prev,
                industry: selectedKey,
                otherIndustry:
                  selectedKey === "Other" ? prev.otherIndustry : "",
              }));
            }}
            className="w-full"
            variant="bordered"
            color="primary"
            isDisabled={isLoading}
          >
            {INDUSTRIES.map((industry) => (
              <SelectItem key={industry}>{industry}</SelectItem>
            ))}
          </Select>
        </div>

        {jobData.industry === "Other" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Please specify industry *
            </label>
            <Input
              value={jobData.otherIndustry}
              onValueChange={(value) =>
                setJobData((prev) => ({ ...prev, otherIndustry: value }))
              }
              placeholder="e.g., Biotechnology, EdTech, FinTech"
              className="w-full"
              variant="bordered"
              color="primary"
              isDisabled={isLoading}
              isRequired
            />
          </div>
        )}

        {/* Job Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Title *
          </label>
          <Input
            value={jobData.name}
            onValueChange={(value) =>
              setJobData((prev) => ({ ...prev, name: value }))
            }
            placeholder="e.g., Senior Software Engineer, Marketing Manager, Data Analyst"
            className="w-full"
            variant="bordered"
            color="primary"
            isDisabled={isLoading}
          />
        </div>

        {/* Starting Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("startingMessage", "Interview Starting Message")}{" "}
            <span className="text-gray-500 font-normal">
              {t("optional", "(optional)")}
            </span>
          </label>
          <Textarea
            value={jobData.startingMessage}
            onValueChange={(value) =>
              setJobData((prev) => ({ ...prev, startingMessage: value }))
            }
            placeholder={t(
              "startingMessagePlaceholder",
              "Welcome to your interview. Let's begin—what interests you about this position?"
            )}
            className="w-full"
            variant="bordered"
            color="primary"
            minRows={3}
            maxRows={6}
            isDisabled={isLoading}
            description={t(
              "startingMessageDescription",
              "If not provided, the AI will generate an appropriate opening message from the job profile instructions."
            )}
          />
        </div>
      </div>

      <Button
        className={BUTTON_STYLES.primary}
        onPress={handleNext}
        isDisabled={
          isLoading ||
          !jobData.name ||
          !jobData.industry ||
          (jobData.industry === "Other" && !jobData.otherIndustry)
        }
      >
        {isLoading || isGeneratingJobDescription ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Creating Profile...
          </>
        ) : (
          <>
            <Briefcase className="w-5 h-5 mr-2" />
            Continue with {jobData.name || "Job Profile"}
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {notification && (
        <div className="mb-4">
          <InlineNotification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
      <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
        Create Job Profile
      </h1>
      <p className="text-lg text-center text-gray-600 mb-12">
        Define your job position by selecting an industry and providing details
        about the role
      </p>

      <Card className={CARD_STYLES}>
        <CardContent className="p-6">{renderJobForm()}</CardContent>
      </Card>
    </div>
  );
};
