import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Button } from "@root/components/ui/button";
import { Label } from "@root/components/ui/label";
import { Badge } from "@root/components/ui/badge";
import { NumberInput, Select, Switch, SelectItem } from "@heroui/react";
import { Save, RefreshCw } from "lucide-react";
import { AdminTranscriptionType } from "@root/shared/zod-schemas";

interface TranscriberTabProps {
  transcriberSettings: AdminTranscriptionType;
  hasUnsavedChanges: boolean;
  onUpdateSettings: (key: keyof AdminTranscriptionType, value: any) => void;
  onReset: () => void;
  onSave: () => void;
  addKeyword: () => void;
  removeKeyword: (keyword: string) => void;
}

export function TranscriberTab({
  transcriberSettings,
  hasUnsavedChanges,
  onUpdateSettings,
  onReset,
  onSave,
  addKeyword,
  removeKeyword,
}: TranscriberTabProps) {
  return (
    <div className="space-y-6">
      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Language Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Language</Label>
            <Select
              selectedKeys={[transcriberSettings?.language || ""]}
              onSelectionChange={(value) =>
                onUpdateSettings("language", value.currentKey)
              }
            >
              <SelectItem key="en">English (en)</SelectItem>
              <SelectItem key="es">Spanish (es)</SelectItem>
              <SelectItem key="fr">French (fr)</SelectItem>
              <SelectItem key="de">German (de)</SelectItem>
              <SelectItem key="it">Italian (it)</SelectItem>
              <SelectItem key="pt">Portuguese (pt)</SelectItem>
              <SelectItem key="ru">Russian (ru)</SelectItem>
              <SelectItem key="ja">Japanese (ja)</SelectItem>
              <SelectItem key="ko">Korean (ko)</SelectItem>
              <SelectItem key="zh">Chinese (zh)</SelectItem>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              This is the language 2 character code for the transcriber. This is
              used to set the language of the transcriber. This is an advanced
              option and should be used with caution according to docs of the
              transcriber provider you've chosen.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Speech Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Speech Detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Utterance Threshold */}
          <div>
            <Label>Utterance threshold MS</Label>
            <NumberInput
              placeholder="Enter the utterance threshold in Milliseconds"
              value={transcriberSettings?.utteranceThreshold?.[0]}
              onValueChange={(value) =>
                onUpdateSettings("utteranceThreshold", [value || 150])
              }
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This is the threshold for the transcriber to consider the user's
              speech as ended the good range is between 150 - 500ms anything
              less or more is not recommended. This is an advanced option and
              should be used with caution according to docs of the transcriber
              provider you've chosen.
            </p>
          </div>

          {/* Input Voice Enhancer */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">
                Input Voice Enhancer
              </Label>
              <p className="text-sm text-muted-foreground">
                Remove background noise, normalise and enhance input audio
                before transcribing it.
              </p>
            </div>
            <Switch
              isSelected={transcriberSettings?.inputVoiceEnhancer}
              onValueChange={(checked) =>
                onUpdateSettings("inputVoiceEnhancer", checked)
              }
            />
          </div>

          {/* Silence Detection */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Silence Detection</Label>
              <p className="text-sm text-muted-foreground">
                Detect silence and insert filler phrases during long periods of
                silence.
              </p>
            </div>
            <Switch
              isSelected={transcriberSettings?.silenceDetection}
              onValueChange={(checked) =>
                onUpdateSettings("silenceDetection", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeout & Call Management */}
      <Card>
        <CardHeader>
          <CardTitle>Timeout & Call Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timeout Seconds */}
          <div>
            <Label>Timeout Seconds</Label>
            <NumberInput
              type="number"
              value={transcriberSettings?.timeoutSeconds?.[0]}
              onValueChange={(value) =>
                onUpdateSettings("timeoutSeconds", [value || 10])
              }
              className="mt-1"
            />
          </div>

          {/* End call after N filler phrases */}
          <div>
            <Label>End call after N filler phrases</Label>
            <NumberInput
              type="number"
              value={transcriberSettings?.endCallAfterFillerPhrases?.[0]}
              onValueChange={(value) =>
                onUpdateSettings("endCallAfterFillerPhrases", [value || 1])
              }
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How many consecutive filler phrases utterances to say before
              ending the call if 0 it will end the call instantly after reaching
              the silence timeout.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Keywords</CardTitle>
          <p className="text-sm text-muted-foreground">
            This makes the transcriber focus on the keywords you provide,
            basically acts as hints for it to pronounce harder phrases easily
            and accurately.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {transcriberSettings?.keywords?.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                No Keyword(s)
              </span>
            ) : (
              transcriberSettings?.keywords?.map((keyword, index) => (
                <Badge
                  key={index}
                  color="secondary"
                  variant="default"
                  className="flex items-center gap-1"
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="ml-1 text-xs hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))
            )}
            <Button
              onPress={addKeyword}
              className="bg-white border border-gray-100 text-gray-700 hover:bg-gray-50"
              size="sm"
            >
              +
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button
          onClick={onReset}
          className="flex items-center gap-2 bg-white border border-gray-100 text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Reset to Default
        </Button>
        <Button
          onClick={onSave}
          disabled={!hasUnsavedChanges}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Transcriber Settings
        </Button>
      </div>
    </div>
  );
}
