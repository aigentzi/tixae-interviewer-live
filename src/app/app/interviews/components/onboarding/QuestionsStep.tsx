import { useState } from "react";
import { Button } from "@heroui/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Textarea } from "@heroui/react";
import { X, Plus, Loader2 } from "lucide-react";
import { BUTTON_STYLES, CARD_STYLES } from "./constants";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { useSampleQuestions } from "./useSampleQuestions";

interface QuestionsStepProps {
  onNext: (questions: string[]) => void;
  isLoading?: boolean;
}

export const QuestionsStep = ({
  onNext,
  isLoading = false,
}: QuestionsStepProps) => {
  const t = useTranslations("onboarding");
  const sampleQuestions = useSampleQuestions();
  const [questions, setQuestions] = useState<string[]>([...sampleQuestions]);

  const addQuestion = () => {
    setQuestions([...questions, ""]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const validQuestions = questions.filter((q) => q.trim().length > 0);
  const canContinue = validQuestions.length > 0;

  const handleNext = () => {
    if (canContinue) {
      onNext(validQuestions);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          {t("questionsHeader", "Customize Your Interview Questions")}
        </h2>
        <p className="text-lg text-gray-600">
          {t(
            "questionsDesc",
            "Edit, add, or remove questions to match your needs",
          )}
        </p>
      </div>

      <Card className={CARD_STYLES}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {t("interviewQuestions", "Interview Questions")}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {t(
              "questionsSubtitle",
              "These questions will be integrated into your interview template. You can edit them or add your own.",
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mt-2">
                <span className="text-sm font-medium text-primary">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1">
                <Textarea
                  value={question}
                  color="primary"
                  variant="bordered"
                  onValueChange={(value) => updateQuestion(index, value)}
                  placeholder={t(
                    "questionPlaceholder",
                    "Enter your interview question...",
                  )}
                  className="w-full min-h-[80px] resize-none"
                />
              </div>
              {questions.length > 1 && (
                <Button
                  onPress={() => removeQuestion(index)}
                  variant="light"
                  isIconOnly
                  className="mt-2 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            onPress={addQuestion}
            variant="bordered"
            className="w-full border-dashed border-2 border-primary/30 text-primary hover:bg-primary/10 py-6"
            isDisabled={isLoading}
            startContent={<Plus size={18} />}
          >
            {t("addAnotherQuestion", "Add Another Question")}
          </Button>

          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <p className="text-sm text-primary">
              <strong>{t("aiEnhancementTitle", "💡 AI Enhancement:")}</strong>{" "}
              {t(
                "aiEnhancementDesc",
                "These questions will be intelligently integrated into your interview template's general prompt, providing context and focus areas for the AI interviewer.",
              )}
            </p>
          </div>

          <Button
            onPress={handleNext}
            isDisabled={!canContinue || isLoading}
            className={`w-full ${BUTTON_STYLES.primary}`}
            isLoading={isLoading}
          >
            {t("continueWith")} {validQuestions.length} {t("questions")}
            {validQuestions.length !== 1 ? "s" : ""}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
