import { Button } from "@root/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Badge } from "@root/components/ui/badge";
import { Sparkles, CheckCircle, ArrowRight } from "lucide-react";
import {
  JOB_PROFILE_TEMPLATES,
  JobProfileTemplate,
} from "@root/lib/job-profile-templates.lib";
import { useTranslations } from "@root/app/providers/TranslationContext";

import { BUTTON_STYLES, CARD_STYLES } from "./constants";

interface FinalStepProps {
  selectedTemplate: JobProfileTemplate | null;
  workspaceJobProfileId: string | null;
  onCreateInterview: () => void;
}

export const FinalStep = ({
  selectedTemplate,
  workspaceJobProfileId,
  onCreateInterview,
}: FinalStepProps) => {
  const t = useTranslations("onboarding");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          {t("templateReady", "Your Interview Template is Ready!")}
        </h2>
        <p className="text-lg text-gray-600">
          {t(
            "aiEnhancedTemplate",
            "AI-enhanced template created and saved to your workspace"
          )}
        </p>
      </div>

      <div className="">
        {/* Template Summary */}
        <Card className={CARD_STYLES}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("templateSummary", "Template Summary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTemplate && (
              <>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {selectedTemplate.name}
                  </h3>
                  <Badge color="secondary" variant="default" className="mb-3">
                    {selectedTemplate.category}
                  </Badge>
                  {selectedTemplate.description && (
                    <p className="text-sm text-gray-600">
                      {selectedTemplate.description}
                    </p>
                  )}
                </div>

                {!selectedTemplate.description && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                    <p className="text-sm text-primary">
                      <strong>Ready for interviews:</strong>{" "}
                      {t(
                        "readyForInterviews",
                        "This template will guide structured, role-specific conversations"
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Enhancement Explanation */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {t("whatHappensNext", "What happens next?")}
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    {t(
                      "templateSaved",
                      "Your template has been saved to your workspace"
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    {t(
                      "aiInterviewerUse",
                      "AI interviewer will use this enhanced template for structured, role-specific interviews"
                    )}
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>
                    {t(
                      "canEdit",
                      "You can edit or update this template anytime from your profiles page"
                    )}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="text-center">
        <Button
          onPress={onCreateInterview}
          className={`px-8 py-4 text-lg ${BUTTON_STYLES.primary}`}
        >
          <ArrowRight className="w-5 h-5 mr-2" />
          {t("customizeAiInterviewer", "Customize Your AI Interviewer")}
        </Button>
        <p className="text-sm text-gray-500 mt-2">
          {t(
            "nextStep",
            "Next: Choose your AI interviewer's language, voice, and appearance"
          )}
        </p>
      </div>
    </div>
  );
};
