import { Button } from "@root/components/ui/button";
import { Label } from "@root/components/ui/label";
import { cn } from "@root/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CircleHelpIcon,
  Lightbulb,
  Mic,
  MicOff,
  Move,
  ShieldUser,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import {
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaInfoCircle } from "react-icons/fa";
import { useMediaDevices } from "../../hooks/useMediaDevices";
import { Alert, Select, SelectItem } from "@heroui/react";

export const MeetingInstructionCard: React.FC<{
  icon: React.ReactNode;
  title?: string;
  description?: string;
}> = ({ icon, title, description }) => {
  return (
    <div className="flex flex-row gap-3 p-3 rounded-lg bg-muted/30 shadow-sm hover:bg-muted/50 transition-all duration-200">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex flex-col gap-1 flex-1">
        {title && (
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        )}
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export const MeetingWarningsCard: React.FC<{
  icon: React.ReactNode;
  description?: string;
  link?: string;
}> = ({ icon, description, link }) => {
  return (
    <div className="flex flex-row gap-4 p-3 rounded-lg bg-amber-50/50 border border-amber-200/50 hover:bg-amber-50 transition-all duration-200">
      <div className="w-8 h-8 rounded-lg bg-amber-100 shadow-sm text-amber-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {description ? (
          link ? (
            <Link
              href={link}
              className="text-sm text-amber-800 font-medium hover:text-amber-900 hover:underline leading-relaxed"
            >
              {description} →
            </Link>
          ) : (
            <p className="text-sm text-amber-800 leading-relaxed">
              {description}
            </p>
          )
        ) : null}
      </div>
    </div>
  );
};

// Memoized audio visualization bars
const AudioVisualizationBars = memo(
  ({
    audioLevel,
    isAudioActive,
  }: {
    audioLevel: number;
    isAudioActive: boolean;
  }) => {
    const bars = useMemo(() => {
      return Array.from({ length: 20 }, (_, i) => {
        const barThreshold = (i + 1) * 5;
        const isActive = audioLevel >= barThreshold;

        let bgColor = "bg-slate-300";
        if (isActive) {
          if (audioLevel > 70) bgColor = "bg-red-400";
          else if (audioLevel > 40) bgColor = "bg-yellow-400";
          else bgColor = "bg-green-400";
        }

        return (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-75",
              bgColor,
              isActive ? "h-6" : "h-2",
            )}
          />
        );
      });
    }, [audioLevel]);

    return (
      <div className="flex items-end justify-center gap-1 h-8">{bars}</div>
    );
  },
);

AudioVisualizationBars.displayName = "AudioVisualizationBars";

export const PreMeetingCamera: React.FC<{
  next: () => void;
  prev: () => void;
}> = ({ next, prev }) => {
  const [stepError, setStepError] = useState<string | null>(null);

  const {
    // Camera
    cameraStatus,
    cameras,
    selectedCameraId,
    cameraRef,
    handlePreviewCamera,
    selectCamera,
    stopCamera,

    // Audio
    audioStatus,
    audioLevel,
    audioInputDevices,
    selectedDeviceId,
    isAudioActive,
    startAudioVisualization,
    stopAudioVisualization,
    selectMicrophone,

    // General
    requestPermissions,
  } = useMediaDevices();

  const proceedToNextStep = useCallback(() => {
    setStepError(null);

    if (cameraStatus === "disconnected") {
      setStepError("Please enable your camera before proceeding.");
      return;
    }

    if (audioStatus === "disconnected") {
      setStepError("Please enable your microphone before proceeding.");
      return;
    }

    stopCamera();
    stopAudioVisualization();
    next();
  }, [cameraStatus, audioStatus, stopCamera, stopAudioVisualization, next]);

  // Memoized level color calculation
  const levelColor = useMemo(() => {
    if (audioLevel > 70) return "text-red-500";
    if (audioLevel > 40) return "text-yellow-500";
    return "text-green-500";
  }, [audioLevel]);

  const getBars = useCallback(() => {
    const bars = [];
    for (let i = 0; i < 10; i++) {
      bars.push(Math.round(audioLevel * 10));
    }
    return bars;
  }, [audioLevel]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-2 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:items-stretch">
        {/* Left Column - Instructions */}
        <div className="space-y-3 flex flex-col h-full">
          {/* Camera Instructions */}
          <div className="bg-white shadow-sm p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg shadow-sm bg-primary/10 text-primary flex items-center justify-center">
                <Camera size={18} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Camera Setup Guide
              </h3>
            </div>
            <div className="space-y-4">
              <MeetingInstructionCard
                icon={<Camera size={24} />}
                title="Enable Camera Access"
                description="We need permission to access your camera for the interview. This allows the interviewer to see you during the session."
              />
              <MeetingInstructionCard
                icon={<Lightbulb size={24} />}
                title="Check your Lighting"
                description="Ensure you're in a well lit environment. Avoid strong backlighting that can make it difficult to see your face clearly."
              />
              <MeetingInstructionCard
                icon={<Move size={24} />}
                title="Position yourself"
                description="Sit at eye level with your camera. Position yourself so your head and shoulder are visible in the frame."
              />
              <MeetingInstructionCard
                icon={<ShieldUser size={24} />}
                title="Privacy Assurance"
                description="Your video will only be shared during the interview. We'll notify you when recording begins and you can disable your camera at any time."
              />
            </div>
          </div>

          {/* Troubleshooting Tips */}
          <div className="bg-white shadow-sm p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg shadow-sm bg-amber-100 text-amber-600 flex items-center justify-center">
                <FaInfoCircle size={18} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Troubleshooting Tips
              </h3>
            </div>
            <div className="space-y-3">
              <MeetingWarningsCard
                icon={<FaInfoCircle className="text-amber-500" size={24} />}
                description="If your browser prompts with permission, Click 'Allow' when asked to access your camera."
              />
              <MeetingWarningsCard
                icon={<FaInfoCircle className="text-amber-500" size={24} />}
                description="If you don't see yourself in the preview, check if another application is using your camera."
              />
              <MeetingWarningsCard
                icon={<FaInfoCircle className="text-amber-500" size={24} />}
                description="Make sure your camera is properly connected and not covered."
              />
              <MeetingWarningsCard
                icon={<FaInfoCircle className="text-blue-500" size={24} />}
                description="Need More help?"
                link="/app/meeting/camera-help"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Preview & Controls */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Camera Preview */}
          <div className="bg-card rounded-xl overflow-hidden shadow-sm">
            <div className="flex flex-row justify-between items-center bg-slate-800 text-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                  <Camera size={14} />
                </div>
                <h3 className="text-lg font-semibold">Camera Preview</h3>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <div
                  className={`w-2 h-2 rounded-full ${
                    cameraStatus === "connected"
                      ? "bg-green-400"
                      : cameraStatus === "disconnected"
                        ? "bg-red-400"
                        : "bg-yellow-400"
                  }`}
                ></div>
                <p className="text-sm opacity-90">
                  {cameraStatus === "connected"
                    ? "Connected"
                    : cameraStatus === "disconnected"
                      ? "Not Connected"
                      : "Connecting..."}
                </p>
              </div>
            </div>
            <div className="relative h-80 flex items-center justify-center p-6 bg-muted/20">
              <video
                ref={cameraRef}
                className={cn(
                  "w-full h-full object-cover absolute top-0 left-0",
                  cameraStatus === "connected" && "z-10",
                  cameraStatus === "disconnected" && "hidden",
                )}
              />

              {/* Camera Controls - Only show when connected */}
              {cameraStatus === "connected" && (
                <Button
                  className="absolute bottom-4 left-1/2 w-12 h-12 rounded-full -translate-x-1/2 z-20 shadow-lg bg-white/90 hover:bg-white border-2 border-white/50"
                  variant="bordered"
                  isIconOnly
                  aria-label="Stop camera preview"
                  onPress={stopCamera}
                >
                  <Camera size={20} className="text-slate-700" />
                </Button>
              )}

              {/* Camera Access Required State */}
              {cameraStatus !== "connected" && (
                <div className="flex flex-col items-center gap-6 text-center max-w-sm mx-auto">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20">
                    <CircleHelpIcon size={36} className="text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      Camera Access Required
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      We need permission to access your camera for the interview
                      preview.
                    </p>
                  </div>
                  <Button
                    variant="solid"
                    onPress={handlePreviewCamera}
                    className="px-6 py-2.5 font-medium shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Camera size={16} className="mr-2" />
                    Enable Camera
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Audio Preview */}
          <div className="bg-card rounded-xl overflow-hidden shadow-sm">
            <div className="flex flex-row justify-between items-center bg-slate-800 text-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                  <Mic size={14} />
                </div>
                <h3 className="text-lg font-semibold">Audio Preview</h3>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <div
                  className={`w-2 h-2 rounded-full ${
                    audioStatus === "connected"
                      ? "bg-green-400"
                      : audioStatus === "disconnected"
                        ? "bg-red-400"
                        : "bg-yellow-400"
                  }`}
                ></div>
                <p className="text-sm opacity-90">
                  {audioStatus === "connected"
                    ? "Connected"
                    : audioStatus === "disconnected"
                      ? "Not Connected"
                      : "Connecting..."}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 items-center justify-center py-6 px-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  Audio Setup
                </h3>
                <p className="text-sm text-muted-foreground">
                  Test your microphone to ensure clear audio
                </p>
              </div>
              {/* Audio Visualization */}
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-6 min-h-[200px] flex flex-col justify-center">
                  <div className="text-center mb-4">
                    <div className={cn("text-2xl font-bold", levelColor)}>
                      {Math.round(audioLevel)}%
                    </div>
                    <p className="text-sm text-slate-600">Audio Level</p>
                  </div>

                  <AudioVisualizationBars
                    audioLevel={audioLevel}
                    isAudioActive={isAudioActive}
                  />

                  <div className="text-center mt-4">
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm",
                        isAudioActive
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {isAudioActive ? (
                        <Mic className="w-4 h-4" />
                      ) : (
                        <MicOff className="w-4 h-4" />
                      )}
                      {isAudioActive ? "Audio Detected" : "No Audio"}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={
                    audioStatus === "connected"
                      ? stopAudioVisualization
                      : startAudioVisualization
                  }
                  className="w-full"
                  color={audioStatus === "connected" ? "primary" : "danger"}
                >
                  {audioStatus === "connected"
                    ? "Stop Microphone"
                    : "Start Microphone"}
                </Button>
              </div>

              <Button
                onClick={
                  isAudioActive
                    ? stopAudioVisualization
                    : startAudioVisualization
                }
                variant={isAudioActive ? "bordered" : "solid"}
                className={cn(
                  "flex items-center gap-2",
                  isAudioActive &&
                    "border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700",
                )}
              >
                {isAudioActive ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    Stop Test
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Start Test
                  </>
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {isAudioActive
                  ? "Speak to test your microphone. The bars indicate audio level."
                  : "Click 'Start Test' to begin testing your microphone."}
              </p>
            </div>
          </div>

          {/* Device Selection */}
          <div className="bg-card p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Volume2 size={18} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Device Selection
              </h3>
            </div>
            <div className="space-y-4">
              {/* Camera Selection */}
              <div>
                <Label className="block text-sm font-medium mb-2">
                  Select Camera
                </Label>
                {cameras.length > 0 ? (
                  <Select
                    key={`camera-${cameras.length}-${cameras[0]?.deviceId}`}
                    placeholder="Select Camera"
                    selectedKeys={selectedCameraId ? [selectedCameraId] : []}
                    onSelectionChange={(value) =>
                      selectCamera(value.currentKey || "")
                    }
                  >
                    {cameras.map((camera, index) =>
                      camera.deviceId ? (
                        <SelectItem key={camera.deviceId}>
                          {camera.label || `Camera ${index + 1}`}
                        </SelectItem>
                      ) : null,
                    )}
                  </Select>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Select placeholder="No cameras detected" isDisabled>
                      <SelectItem key="none">No cameras available</SelectItem>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Enable camera access to see available devices
                    </p>
                  </div>
                )}
              </div>

              {/* Microphone Selection */}
              <div>
                <Label className="block text-sm font-medium mb-2">
                  Select Microphone
                </Label>
                {audioInputDevices.length > 0 ? (
                  <Select
                    key={`mic-${audioInputDevices.length}-${audioInputDevices[0]?.deviceId}`}
                    placeholder="Select Microphone"
                    selectedKeys={selectedDeviceId ? [selectedDeviceId] : []}
                    onSelectionChange={(value) =>
                      selectMicrophone(value.currentKey || "")
                    }
                  >
                    {audioInputDevices.map((device, index) =>
                      device.deviceId ? (
                        <SelectItem key={device.deviceId}>
                          {device.label || `Microphone ${index + 1}`}
                        </SelectItem>
                      ) : null,
                    )}
                  </Select>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Select placeholder="No microphones detected" isDisabled>
                      <SelectItem key="none">
                        No microphones available
                      </SelectItem>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Enable microphone access to see available devices
                    </p>
                  </div>
                )}
              </div>

              {/* Permission Request Button - Show when no devices or no labels */}
              {(cameras.length === 0 ||
                audioInputDevices.length === 0 ||
                (cameras.length > 0 && !cameras[0]?.label) ||
                (audioInputDevices.length > 0 &&
                  !audioInputDevices[0]?.label)) && (
                <div className="pt-2">
                  <Button
                    variant="bordered"
                    color="primary"
                    className="w-full"
                    onPress={requestPermissions}
                  >
                    <Volume2 size={16} className="mr-2" />
                    Refresh Device List
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Click to refresh the device list after granting permissions
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {stepError && (
        <Alert variant="bordered" className="mt-4" color="danger">
          {stepError}
        </Alert>
      )}

      {/* Navigation Buttons - Centered */}
      <div className="mt-3 flex justify-center w-full">
        <div className="flex flex-row items-center justify-between gap-4 w-full">
          <Button variant="bordered" onPress={prev}>
            Previous
          </Button>
          <Button
            color="primary"
            endContent={<ArrowRight size={18} />}
            variant="solid"
            onPress={proceedToNextStep}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};
