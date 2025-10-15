import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Button } from "@root/components/ui/button";
import { RefreshCw, Save } from "lucide-react";
import { Textarea } from "@heroui/react";

interface GeneralPromptsTabProps {
  systemPrompt: string;
  greetingMessage: string;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  onPromptChange: (value: string) => void;
  onGreetingChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
}

export function GeneralPromptsTab({
  systemPrompt,
  greetingMessage,
  hasUnsavedChanges,
  isLoading,
  onPromptChange,
  onGreetingChange,
  onSave,
  onReset,
}: GeneralPromptsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Prompts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Greeting Message */}
        <div className="space-y-3">
          <label htmlFor="greetingMessage" className="text-sm font-medium">
            Greeting Message
          </label>
          <Textarea
            id="greetingMessage"
            value={greetingMessage}
            color="primary"
            variant="bordered"
            onValueChange={(e) => onGreetingChange(e)}
            placeholder="Enter the greeting message that will be shown at the start of each interview..."
            classNames={{
              input: "min-h-[150px] font-mono text-sm",
            }}
            rows={8}
          />
        </div>

        {/* System Prompt */}
        <div className="space-y-3">
          <label htmlFor="systemPrompt" className="text-sm font-medium">
            System Prompt
          </label>
          <Textarea
            id="systemPrompt"
            value={systemPrompt}
            color="primary"
            variant="bordered"
            onValueChange={(e) => onPromptChange(e)}
            placeholder="Enter the default system prompt for new agents..."
            classNames={{
              input: "min-h-[300px] font-mono text-sm",
            }}
            rows={15}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            onPress={onReset}
            startContent={<RefreshCw className="w-4 h-4" />}
            color="default"
            size="sm"
            className="flex items-center gap-2 hover:scale-105 transition-all duration-300"
          >
            Reset to Default
          </Button>
          <Button
            onPress={onSave}
            startContent={<Save className="w-4 h-4" />}
            isDisabled={!hasUnsavedChanges || isLoading}
            isLoading={isLoading}
            color="primary"
            size="sm"
            className="flex items-center gap-2 hover:scale-105 transition-all duration-300"
          >
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
