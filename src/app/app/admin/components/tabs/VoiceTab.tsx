import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Button } from "@root/components/ui/button";
import { Label } from "@root/components/ui/label";
import { Badge } from "@root/components/ui/badge";
import {
  Input,
  NumberInput,
  Select,
  SelectItem,
  Slider,
  Switch,
} from "@heroui/react";
import { Save, RefreshCw } from "lucide-react";
import { AdminVoiceType } from "@root/shared/zod-schemas";
import { VoicesSelection } from "../partials/voicesSelection";

interface VoiceTabProps {
  voiceSettings: AdminVoiceType;
  hasUnsavedChanges: boolean;
  onUpdateSettings: (key: keyof AdminVoiceType, value: any) => void;
  onReset: () => void;
  onSave: () => void;
  addPunctuationBreak: (character: string) => void;
  removePunctuationBreak: (character: string) => void;
  addWordReplacement: () => void;
  updateWordReplacement: (
    index: number,
    field: "original" | "replacement",
    value: string
  ) => void;
  removeWordReplacement: (index: number) => void;
}

export function VoiceTab({
  voiceSettings,
  hasUnsavedChanges,
  onUpdateSettings,
  onReset,
  onSave,
  addPunctuationBreak,
  removePunctuationBreak,
  addWordReplacement,
  updateWordReplacement,
  removeWordReplacement,
}: VoiceTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Voice Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <VoicesSelection
              onUpdateSettings={(key, value) =>
                onUpdateSettings(key as keyof AdminVoiceType, value)
              }
              selectedVoice={voiceSettings?.selectedVoice || ""}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">
                Long message backchanneling
              </Label>
              <p className="text-sm text-muted-foreground">
                Whether to say umm, sure, etc., when the user is talking for too
                long
              </p>
            </div>
            <Switch
              isSelected={voiceSettings?.longMessageBackchanneling}
              onValueChange={(checked) =>
                onUpdateSettings("longMessageBackchanneling", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ElevenLabs Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Speed</Label>
              <span className="text-sm text-muted-foreground">
                {voiceSettings?.speed?.[0]}
              </span>
            </div>
            <Slider
              value={voiceSettings?.speed}
              onVolumeChange={(value) => onUpdateSettings("speed", value)}
              maxValue={1.2}
              minValue={0.7}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Adjust the speed of the speech generation. 0.7 is the slowest and
              1.2 is the fastest.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Stability</Label>
              <span className="text-sm text-muted-foreground">
                {voiceSettings?.stability?.[0]}
              </span>
            </div>
            <Slider
              value={voiceSettings?.stability}
              onVolumeChange={(value) => onUpdateSettings("stability", value)}
              maxValue={1}
              minValue={0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Controls how closely the voice matches the original voice sample.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Similarity Boost</Label>
              <span className="text-sm text-muted-foreground">
                {voiceSettings?.similarityBoost?.[0]}
              </span>
            </div>
            <Slider
              value={voiceSettings?.similarityBoost}
              onVolumeChange={(value) =>
                onUpdateSettings("similarityBoost", value)
              }
              maxValue={1}
              minValue={0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Controls how closely the voice matches the original voice sample.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Style Exaggeration</Label>
              <span className="text-sm text-muted-foreground">
                {voiceSettings?.styleExaggeration?.[0]}
              </span>
            </div>
            <Slider
              value={voiceSettings?.styleExaggeration}
              onVolumeChange={(value) =>
                onUpdateSettings("styleExaggeration", value)
              }
              maxValue={2}
              minValue={0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Adjust the style of the speech generation. 0 is the most natural
              and 2 is the most robotic.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Speaker Boost</Label>
              <p className="text-sm text-muted-foreground">
                Boost the voice generated at the cost of speed.
              </p>
            </div>
            <Switch
              isSelected={voiceSettings?.speakerBoost}
              onValueChange={(checked) =>
                onUpdateSettings("speakerBoost", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Background Noise</Label>
            <Select
              selectedKeys={[voiceSettings?.backgroundNoise || ""]}
              onSelectionChange={(value) =>
                onUpdateSettings("backgroundNoise", value.currentKey)
              }
            >
              <SelectItem key="none">None</SelectItem>
              <SelectItem key="restaurant">Restaurant</SelectItem>
              <SelectItem key="cafe">Cafe</SelectItem>
              <SelectItem key="office">Office</SelectItem>
            </Select>
          </div>

          <div>
            <Label>Punctuation breaks</Label>
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                {voiceSettings?.punctuationBreaks?.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    No Punctuation break(s)
                  </span>
                ) : (
                  voiceSettings?.punctuationBreaks?.map((char, index) => (
                    <Badge
                      key={index}
                      color="secondary"
                      variant="default"
                      className="flex items-center gap-1"
                    >
                      {char}
                      <button
                        onClick={() => removePunctuationBreak(char)}
                        className="ml-1 text-xs hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                )}
                <Button
                  variant="bordered"
                  size="sm"
                  onPress={() => {
                    const char = prompt("Enter punctuation character:");
                    if (char) addPunctuationBreak(char);
                  }}
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add punctuation breaks to the speech generation.
              </p>
              <Button
                size="sm"
                onClick={() => onUpdateSettings("punctuationBreaks", [])}
                className="bg-white border border-gray-100 text-gray-700 hover:bg-gray-50"
              >
                Reset to default
              </Button>
            </div>
          </div>

          <div>
            <Label>Minimum words to stop speaking</Label>
            <NumberInput
              value={voiceSettings?.minWordsToStop?.[0]}
              onValueChange={(value) =>
                onUpdateSettings("minWordsToStop", [value || 0])
              }
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the minimum words transcribed from the user to speak before
              the agent stops speaking.
            </p>
          </div>

          <div>
            <Label>Minimum characters to start speaking</Label>
            <NumberInput
              value={voiceSettings?.minCharsToStart?.[0]}
              onValueChange={(value) =>
                onUpdateSettings("minCharsToStart", [value || 140])
              }
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the minimum characters to start speaking, default is 5.
            </p>
          </div>

          <div>
            <Label>Maximum length without punctuation</Label>
            <NumberInput
              type="number"
              value={voiceSettings?.maxLengthWithoutPunctuation?.[0]}
              onValueChange={(value) =>
                onUpdateSettings("maxLengthWithoutPunctuation", [value || 250])
              }
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the maximum length without punctuation, default is 100.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Words Replacement</CardTitle>
          <p className="text-sm text-muted-foreground">
            Replace specific words with their correct pronunciation during
            speech generation
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {voiceSettings?.wordReplacements?.map((replacement, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                placeholder="Original word"
                value={replacement.original}
                onChange={(e) =>
                  updateWordReplacement(index, "original", e.target.value)
                }
                className="flex-1"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                placeholder="Replacement"
                value={replacement.replacement}
                onChange={(e) =>
                  updateWordReplacement(index, "replacement", e.target.value)
                }
                className="flex-1"
              />
              <Button
                variant="bordered"
                size="sm"
                onPress={() => removeWordReplacement(index)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            onPress={addWordReplacement}
            className="bg-white border border-gray-100 text-gray-700 hover:bg-gray-50"
          >
            Add Words Replacement
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4">
        <Button
          onPress={onReset}
          className="flex items-center gap-2 bg-white border border-gray-100 text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Reset to Default
        </Button>
        <Button
          onPress={onSave}
          isDisabled={!hasUnsavedChanges}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Voice Settings
        </Button>
      </div>
    </div>
  );
}
