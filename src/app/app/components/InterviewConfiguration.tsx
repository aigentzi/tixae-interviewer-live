import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Chip,
  DatePicker,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Progress,
  Switch,
  Textarea,
  Tooltip,
  cn,
  useDisclosure,
} from "@heroui/react";
import {
  getLocalTimeZone,
  now,
  parseAbsoluteToLocal,
  today,
} from "@internationalized/date";
import { InputTags, InputTagsRef } from "@root/components/ui/input-tags";
import { Label } from "@root/components/ui/label";
import { extractEmailsFromCsv } from "@root/shared/utils";
import { JobProfile, Level, SetState } from "@root/shared/zod-schemas";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CloudUpload,
  DollarSign,
  Eye,
  Video,
  FileText,
  InfoIcon,
  Shield,
  Users,
  X,
} from "lucide-react";
import { FC, useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import InlineNotification from "@root/app/components/InlineNotification";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { api } from "@root/trpc/react";

export type InterviewData = {
  jobProfileId: string;
  level: Level | undefined;
  duration: number;
  intervieweeEmails: string[];
  paid: boolean;
  enableVerification: boolean;
  analysisPrompt: string;
  price: number;
  enableLevels: boolean;
  enableSchedule: boolean;
  startTime: Date | undefined;
  endTime: Date | undefined;
  introVideoUrl: string | undefined;
};

// Helper function to validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const InterviewConfiguration: FC<{
  jobProfileData: Partial<JobProfile>;
  setJobProfileData: SetState<Partial<JobProfile>>;
  interviewData: InterviewData;
  setInterviewData: SetState<InterviewData>;
  showQrCodeLogo: boolean;
  setShowQrCodeLogo: SetState<boolean>;
  handleInterviewSubmit: () => Promise<void>;
  isLoading: boolean;
}> = ({
  jobProfileData,
  interviewData,
  setInterviewData,
  showQrCodeLogo,
  setShowQrCodeLogo,
  handleInterviewSubmit,
  isLoading,
}) => {
  const t = useTranslations("mainPage");
  const { activeWorkspace } = useActiveWorkspace();
  const [selectedIntroVideoUrl, setSelectedIntroVideoUrl] = useState<
    string | null
  >(null);
  const introSelectionInitializedRef = useRef(false);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    emailCount?: number;
  } | null>(null);
  const [isGeneratingAnalysisPrompt, setIsGeneratingAnalysisPrompt] =
    useState(false);
  const [showAnalysisPrompt, setShowAnalysisPrompt] = useState(false);
  const [emailValidationErrors, setEmailValidationErrors] = useState<string[]>(
    [],
  );
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  // Default-select the first introduction video once (until user changes it)
  useEffect(() => {
    if (introSelectionInitializedRef.current) return;
    const firstUrl =
      activeWorkspace?.settings?.introductionVideos?.[0]?.url || null;
    if (!selectedIntroVideoUrl && firstUrl) {
      setSelectedIntroVideoUrl(firstUrl);
      setInterviewData((prev) => ({
        ...prev,
        introVideoUrl: firstUrl || undefined,
      }));
    }
    introSelectionInitializedRef.current = true;
  }, [activeWorkspace?.settings?.introductionVideos]);

  // Email validation and duplicate detection
  const emailValidation = useMemo(() => {
    const emails = interviewData.intervieweeEmails;
    const invalid: string[] = [];
    const duplicates: string[] = [];
    const seen = new Set<string>();

    emails.forEach((email) => {
      const trimmed = email.trim().toLowerCase();
      if (!isValidEmail(email)) {
        invalid.push(email);
      }
      if (seen.has(trimmed)) {
        duplicates.push(email);
      }
      seen.add(trimmed);
    });

    return { invalid, duplicates, valid: emails.length - invalid.length };
  }, [interviewData.intervieweeEmails]);

  // Calculate interview slots needed
  const slotCalculation = useMemo(() => {
    const validEmails = Math.max(1, emailValidation.valid || 1);
    const slotsPerInterview = Math.ceil(interviewData.duration / 10);
    const totalSlots = slotsPerInterview * validEmails;

    return {
      slotsPerInterview,
      totalSlots,
      validEmails,
    };
  }, [interviewData.duration, emailValidation.valid]);

  const handleUploadCsv = (file: File) => {
    setIsProcessing(true);
    extractEmailsFromCsv({
      file,
      headers: ["email"],
      onSuccess: (data) => {
        const emails = data.map((row) => row.email);
        setInterviewData((prev) => ({
          ...prev,
          intervieweeEmails: emails,
        }));
        setUploadedFile((prev) => ({
          ...prev!,
          emailCount: emails.length,
        }));
        setIsProcessing(false);
        // Clear validation error when emails are successfully imported
        if (candidateValidationError && emails.length > 0) {
          setCandidateValidationError(false);
        }
        setNotification({
          type: "success",
          message: `Successfully imported ${emails.length} email addresses`,
        });
      },
      onError: (error) => {
        setNotification({
          type: "error",
          message: `Error extracting emails from CSV: ${error.message}`,
        });
        setIsProcessing(false);
      },
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile({
      name: file.name,
      size: file.size,
    });

    handleUploadCsv(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const emailInputRef = useRef<InputTagsRef>(null);
  const candidateManagementRef = useRef<HTMLDivElement>(null);
  const [candidateValidationError, setCandidateValidationError] =
    useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSetTimeToNow = () => {
    const now = new Date();
    const endTime = new Date(now.getTime() + interviewData.duration * 60000);

    setInterviewData((prev) => ({
      ...prev,
      startTime: now,
      endTime: endTime,
    }));
  };

  const generateAnalysisPrompt = async () => {
    if (!jobProfileData.name) {
      setNotification({
        type: "error",
        message: "Please select or create a job profile first",
      });
      return;
    }

    setIsGeneratingAnalysisPrompt(true);

    const prompt = `Generate an analysis prompt for the interview. This will be used to analyze the interview and provide a score and feedback.

Job Title: ${jobProfileData.name}
${
  jobProfileData.description
    ? `Job Description: ${jobProfileData.description}`
    : ""
}

Please create a detailed analysis prompt that includes:
- Assessment criteria and what to look for in responses
- How to evaluate candidate responses and provide feedback
- How to provide a final score and summary
- How to provide a recommendation
`;

    try {
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

      setInterviewData((prev) => ({
        ...prev,
        analysisPrompt: data.generatedPrompt,
      }));
      setNotification({
        type: "success",
        message: "Interview analysis prompt created successfully",
      });
    } catch (error) {
      console.error("Error generating prompt:", error);
      const errorMessage = jobProfileData.generalPrompt?.trim()
        ? "Failed to expand prompt. Please try again."
        : "Failed to generate prompt. Please try again.";
      setNotification({ type: "error", message: errorMessage });
    } finally {
      setIsGeneratingAnalysisPrompt(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setInterviewData((prev) => ({
      ...prev,
      intervieweeEmails: [],
    }));
  };

  const validateCandidates = (): boolean => {
    const hasValidEmails =
      interviewData.intervieweeEmails.length > 0 && emailValidation.valid > 0;

    if (!hasValidEmails) {
      setCandidateValidationError(true);

      // Scroll to candidate management section
      if (candidateManagementRef.current) {
        candidateManagementRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }

      // Clear error after 5 seconds
      setTimeout(() => {
        setCandidateValidationError(false);
      }, 5000);

      return false;
    }

    setCandidateValidationError(false);
    return true;
  };

  const handleSubmitWithValidation = async (
    onClose: () => void,
  ): Promise<boolean> => {
    if (!validateCandidates()) {
      return false;
    }

    try {
      await handleInterviewSubmit();

      // Show success feedback
      setShowSuccess(true);

      // Auto-close modal after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);

      return true;
    } catch (error: any) {
      // Handle specific slot insufficiency errors
      if (error?.message?.includes("Insufficient interview slots")) {
        setNotification({
          type: "error",
          message: error.message,
        });
      } else if (error?.message?.includes("slots")) {
        // Handle any other slot-related errors
        setNotification({
          type: "error",
          message: `Interview slot error: ${error.message}`,
        });
      } else {
        // Handle other general errors
        setNotification({
          type: "error",
          message:
            error?.message || "Failed to create interview. Please try again.",
        });
      }
      return false;
    }
  };

  return (
    <>
      <Button onPress={onOpen} color="primary" size="sm" className="w-full">
        {t("createInterview", "Create Interview")}
      </Button>
      <Modal
        size="4xl"
        scrollBehavior="inside"
        isOpen={isOpen}
        isDismissable={false}
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Interview Configuration</ModalHeader>
              <ModalBody>
                {notification && (
                  <InlineNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                  />
                )}
                <div className="space-y-6 ">
                  {/* Interview Settings Section */}
                  <Card shadow="none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">
                          {t("interviewSettings", "Interview Settings")}
                        </h3>
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Duration */}
                        <div className="space-y-2">
                          <Label
                            htmlFor="duration"
                            className="text-sm font-medium"
                          >
                            {t(
                              "interviewDuration",
                              "Interview Duration (minutes)",
                            )}{" "}
                            *
                          </Label>
                          <NumberInput
                            id="duration"
                            variant="bordered"
                            type="number"
                            color="primary"
                            placeholder="10"
                            size="sm"
                            value={interviewData.duration}
                            onValueChange={(value) =>
                              setInterviewData((prev) => ({
                                ...prev,
                                duration: value as number,
                              }))
                            }
                            minValue={5}
                            maxValue={180}
                            description={t(
                              "interviewDurationDesc",
                              "Interviews come in 10-minute bundles, but you choose how many minutes to give each applicant",
                            )}
                          />

                          {/* Interview Consumption Display */}
                          <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <InfoIcon className="w-4 h-4 text-primary" />
                              <h4 className="text-sm font-medium text-primary">
                                {t(
                                  "interviewConsumption",
                                  "Interview Usage from Your Limits",
                                )}
                              </h4>
                            </div>
                            <div className="text-xs text-primary/80 space-y-1">
                              <div className="flex justify-between items-center">
                                <span>{t("duration", "Duration")}:</span>
                                <span className="font-medium">
                                  {interviewData.duration} minutes
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>
                                  {t(
                                    "interviewsPerCandidate",
                                    "Interviews consumed per candidate",
                                  )}
                                  :
                                </span>
                                <span className="font-medium">
                                  {slotCalculation.slotsPerInterview} interviews
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>
                                  {t("validCandidates", "Valid candidates")}:
                                </span>
                                <span className="font-medium">
                                  {slotCalculation.validEmails}
                                </span>
                              </div>
                              <div className="border-t border-primary/20 pt-1 mt-2">
                                <div className="flex justify-between items-center font-semibold">
                                  <span>
                                    {t(
                                      "totalInterviewsConsumed",
                                      "Total interviews consumed from your limits",
                                    )}
                                    :
                                  </span>
                                  <span className="text-primary font-bold">
                                    {slotCalculation.totalSlots} interviews
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10px] text-primary/60 mt-1">
                                {t(
                                  "consumptionExplanation",
                                  "Every 10 minutes = 1 interview from your limits. This will be deducted from your subscription or bundle credits.",
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Payment Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-primary" />
                            <Label className="text-sm font-medium">
                              {t("paymentSettings", "Payment Settings")}
                            </Label>
                          </div>

                          <div className="space-y-3">
                            <Checkbox
                              id="paidInterview"
                              size="sm"
                              checked={interviewData.paid}
                              onValueChange={(checked) =>
                                setInterviewData((prev) => ({
                                  ...prev,
                                  paid: checked === true,
                                }))
                              }
                              className="data-[selected=true]:text-primary"
                            >
                              {t("paidInterview", "This is a paid interview")}
                            </Checkbox>

                            {interviewData.paid ? (
                              <div className="pl-4.5 ml-1.5 mt-1 space-y-2 border-l-2 border-primary/30">
                                <Label
                                  htmlFor="price"
                                  className="text-sm font-medium"
                                >
                                  {t("priceUsd", "Price (USD)")} *
                                </Label>
                                <NumberInput
                                  id="price"
                                  type="number"
                                  color="primary"
                                  variant="bordered"
                                  placeholder="50"
                                  size="sm"
                                  value={interviewData.price}
                                  onValueChange={(value) =>
                                    setInterviewData((prev) => ({
                                      ...prev,
                                      price: value as number,
                                    }))
                                  }
                                  minValue={0}
                                  description={t(
                                    "amountCharged",
                                    "Amount charged to candidates",
                                  )}
                                />
                              </div>
                            ) : (
                              <div className="pl-4.5 ml-1.5 mt-1 border-l-2 border-primary/30">
                                <div className="bg-primary/10 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                    <h4 className="text-sm text-primary">
                                      {t("freeInterview", "Free Interview")}
                                    </h4>
                                  </div>
                                  <p className="text-xs text-primary/80">
                                    {t(
                                      "perfectForScreenings",
                                      "Perfect for initial screenings and attracting more candidates",
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Security & QR Code Settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card shadow="sm" className="border-default-200">
                          <CardBody className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-primary" />
                                <div>
                                  <h4 className="text-sm font-medium">
                                    {t("idVerification", "ID Verification")}
                                  </h4>
                                  <p className="text-xs text-default-500">
                                    {t(
                                      "ensureCandidateIdentity",
                                      "Ensure candidate identity",
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                size="sm"
                                isSelected={interviewData.enableVerification}
                                onValueChange={(checked) => {
                                  setInterviewData((prev) => ({
                                    ...prev,
                                    enableVerification: checked,
                                  }));
                                }}
                              />
                            </div>
                          </CardBody>
                        </Card>

                        <Card shadow="sm" className="border-default-200">
                          <CardBody className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Eye className="w-5 h-5 text-primary" />
                                <div>
                                  <h4 className="text-sm font-medium">
                                    {t("qrCodeBranding", "QR Code Branding")}
                                  </h4>
                                  <p className="text-xs text-default-500">
                                    {t("showLogoInQr", "Show logo in QR code")}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                size="sm"
                                isSelected={showQrCodeLogo}
                                onValueChange={setShowQrCodeLogo}
                              />
                            </div>
                          </CardBody>
                        </Card>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Scheduling Section */}
                  <Card shadow="none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">
                          {t("scheduling", "Scheduling")}
                        </h3>
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="enableSchedule"
                          size="sm"
                          checked={interviewData.enableSchedule}
                          onValueChange={(checked) => {
                            const isEnabled = checked === true;
                            setInterviewData((prev) => ({
                              ...prev,
                              enableSchedule: isEnabled,
                              startTime: isEnabled ? new Date() : undefined,
                              endTime: isEnabled
                                ? new Date(
                                    new Date().getTime() +
                                      prev.duration * 60000,
                                  )
                                : undefined,
                            }));
                          }}
                        >
                          {t(
                            "scheduleSpecificTime",
                            "Schedule interview for specific time",
                          )}
                        </Checkbox>
                        <Tooltip
                          content={t(
                            "candidatesJoinAnytime",
                            "When disabled, candidates can join anytime using the link",
                          )}
                        >
                          <InfoIcon className="w-4 h-4 text-default-400" />
                        </Tooltip>
                      </div>

                      {interviewData.enableSchedule ? (
                        <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="startTime"
                                className="text-sm font-medium"
                              >
                                {t("startTime", "Start Time")} *
                              </Label>
                              <div className="flex gap-2">
                                <DatePicker
                                  id="startTime"
                                  hideTimeZone
                                  color="primary"
                                  variant="bordered"
                                  onChange={(value) => {
                                    if (!value) return;
                                    const newStartTime = value?.toDate();
                                    setInterviewData((prev) => ({
                                      ...prev,
                                      startTime: newStartTime,
                                      endTime: new Date(
                                        newStartTime.getTime() +
                                          prev.duration * 60000,
                                      ),
                                    }));
                                  }}
                                  showMonthAndYearPickers
                                  defaultValue={now(getLocalTimeZone())}
                                  value={
                                    interviewData.startTime
                                      ? parseAbsoluteToLocal(
                                          interviewData.startTime.toISOString(),
                                        )
                                      : undefined
                                  }
                                  minValue={now(getLocalTimeZone())}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="bordered"
                                  onPress={handleSetTimeToNow}
                                  className="whitespace-nowrap"
                                >
                                  {t("now", "Now")}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="endTime"
                                className="text-sm font-medium"
                              >
                                {t("endTime", "End Time (Auto-calculated)")}
                              </Label>
                              <DatePicker
                                id="endTime"
                                hideTimeZone
                                color="primary"
                                variant="bordered"
                                showMonthAndYearPickers
                                value={
                                  interviewData.endTime
                                    ? parseAbsoluteToLocal(
                                        interviewData.endTime.toISOString(),
                                      )
                                    : undefined
                                }
                                isDisabled
                                className="flex-1"
                              />
                            </div>
                          </div>
                          <div className="flex items-start gap-2 p-3 bg-primary-500/10 rounded-lg mb-2">
                            <AlertCircle className="w-4 h-4 text-primary-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-primary-500">
                                {t("scheduledInterview", "Scheduled Interview")}
                              </p>
                              <p className="text-xs text-primary-400/80">
                                {t(
                                  "candidatesScheduledWindow",
                                  "Candidates will only be able to join during the scheduled time window",
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-primary/10 rounded-lg ">
                          <div className="flex items-start gap-2 ">
                            <CheckCircle className="size-4 text-primary mt-0.5 mb-2" />
                            <div>
                              <h4 className="text-sm font-medium text-primary">
                                {t(
                                  "instantInterviewMode",
                                  "Instant Interview Mode",
                                )}
                              </h4>
                            </div>
                          </div>
                          <p className="text-sm text-primary/80 mb-2">
                            {t(
                              "maximumFlexibility",
                              "Maximum flexibility for candidates",
                            )}
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-primary/50 rounded-full"></div>
                              <span className="text-xs text-primary/90">
                                {t(
                                  "available24x7",
                                  "Available 24/7 - no scheduling constraints",
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-primary/50 rounded-full"></div>
                              <span className="text-xs text-primary/90">
                                {t(
                                  "perfectGlobalRecruitment",
                                  "Perfect for global recruitment",
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-primary/50 rounded-full"></div>
                              <span className="text-xs text-primary/90">
                                {t(
                                  "candidatesJoinImmediately",
                                  "Candidates can join immediately using the link",
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* Candidate Management Section */}
                  <Card
                    ref={candidateManagementRef}
                    shadow="none"
                    className={cn(
                      "transition-all duration-300",
                      candidateValidationError &&
                        "ring-2 ring-danger/50 bg-danger/5",
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Users
                          className={cn(
                            "w-5 h-5",
                            candidateValidationError
                              ? "text-danger"
                              : "text-primary",
                          )}
                        />
                        <h3
                          className={cn(
                            "text-lg font-semibold",
                            candidateValidationError && "text-danger",
                          )}
                        >
                          {t("candidateManagement", "Candidate Management")}
                        </h3>
                        {candidateValidationError && (
                          <Chip
                            size="sm"
                            color="danger"
                            variant="flat"
                            className="ml-2"
                          >
                            {t("required", "Required")}
                          </Chip>
                        )}
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* CSV Upload */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">
                              {t("bulkImportCsv", "Bulk Import (CSV)")}
                            </Label>
                            {uploadedFile && (
                              <Button
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={removeUploadedFile}
                                startContent={<X className="w-4 h-4" />}
                              >
                                {t("remove", "Remove")}
                              </Button>
                            )}
                          </div>

                          {uploadedFile ? (
                            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                              <div className="flex items-center gap-3">
                                <FileText className="w-8 h-8 text-primary" />
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-primary">
                                    {uploadedFile.name}
                                  </h4>
                                  <p className="text-xs text-primary/80">
                                    {formatFileSize(uploadedFile.size)}
                                    {uploadedFile.emailCount &&
                                      ` • ${uploadedFile.emailCount} emails`}
                                  </p>
                                </div>
                                <CheckCircle className="w-5 h-5 text-primary" />
                              </div>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer",
                                isDragActive
                                  ? "border-primary bg-primary/5"
                                  : "border-default-300 hover:border-primary/50 hover:bg-default/50",
                              )}
                              {...getRootProps()}
                            >
                              <input {...getInputProps()} />
                              <div className="flex flex-col items-center gap-2">
                                <CloudUpload
                                  className={cn(
                                    "w-8 h-8 transition-colors",
                                    isDragActive
                                      ? "text-primary"
                                      : "text-default-400",
                                  )}
                                />
                                <div>
                                  <p className="text-sm font-medium">
                                    {isDragActive
                                      ? t("dropCsvHere", "Drop CSV file here")
                                      : t("uploadCsv", "Upload CSV file")}
                                  </p>
                                  <p className="text-xs text-default-500">
                                    {t(
                                      "dragDropBrowse",
                                      "Drag & drop or click to browse (max 5MB)",
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-default-500 space-y-1">
                            <p>
                              •{" "}
                              {t(
                                "csvEmailColumn",
                                'CSV should have an "email" column header',
                              )}
                            </p>
                            <p>
                              •{" "}
                              {t("oneEmailPerRow", "One email address per row")}
                            </p>
                            <p>
                              • {t("maxFileSize", "Maximum file size: 5MB")}
                            </p>
                          </div>
                        </div>

                        {/* Manual Email Input */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium" isRequired>
                              {t("manualEntry", "Manual Entry")}
                            </Label>
                            {interviewData.intervieweeEmails.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Chip
                                  size="sm"
                                  color={
                                    emailValidation.invalid.length > 0
                                      ? "danger"
                                      : "primary"
                                  }
                                  variant="flat"
                                >
                                  {emailValidation.valid} {t("valid", "valid")}
                                </Chip>
                                {emailValidation.invalid.length > 0 && (
                                  <Chip size="sm" color="danger" variant="flat">
                                    {emailValidation.invalid.length}{" "}
                                    {t("invalid", "invalid")}
                                  </Chip>
                                )}
                                {emailValidation.duplicates.length > 0 && (
                                  <Chip
                                    size="sm"
                                    color="warning"
                                    variant="flat"
                                  >
                                    {emailValidation.duplicates.length}{" "}
                                    {t("duplicates", "duplicates")}
                                  </Chip>
                                )}
                              </div>
                            )}
                          </div>

                          <InputTags
                            ref={emailInputRef}
                            value={interviewData.intervieweeEmails}
                            isInvalid={candidateValidationError}
                            onChange={(value) => {
                              // Clear validation error when user starts adding emails
                              setCandidateValidationError(false);
                              setInterviewData((prev) => ({
                                ...prev,
                                intervieweeEmails: value as string[],
                              }));
                            }}
                            placeholder={t(
                              "addEmailAddresses",
                              "Add email addresses...",
                            )}
                            variant="bordered"
                            color="primary"
                            radius="sm"
                          />

                          <div className="text-xs text-default-500 space-y-1">
                            <p>
                              •{" "}
                              {t(
                                "typeEmailEnter",
                                "Type email and press Enter to add",
                              )}
                            </p>
                            <p>
                              •{" "}
                              {t(
                                "clickTagsRemove",
                                "Click on tags to remove them",
                              )}
                            </p>
                            <p>
                              •{" "}
                              {t(
                                "invalidEmailsHighlighted",
                                "Invalid emails will be highlighted",
                              )}
                            </p>
                          </div>

                          {/* Email Validation Summary */}
                          {interviewData.intervieweeEmails.length > 0 && (
                            <div className="p-3 bg-default/50 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-default-600" />
                                <span className="text-sm font-medium">
                                  {interviewData.intervieweeEmails.length}{" "}
                                  {t("totalCandidates", "Total Candidates")}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                  <span>
                                    {emailValidation.valid}{" "}
                                    {t("valid", "Valid")}
                                  </span>
                                </div>
                                {emailValidation.invalid.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                    <span>
                                      {emailValidation.invalid.length}{" "}
                                      {t("invalid", "Invalid")}
                                    </span>
                                  </div>
                                )}
                                {emailValidation.duplicates.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                    <span>
                                      {emailValidation.duplicates.length}{" "}
                                      {t("duplicates", "Duplicates")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Analysis Configuration Section */}
                  <Card shadow="none">
                    <CardHeader className="pb-3">
                      <div className="flex  justify-between w-full items-center">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">
                            {t(
                              "analysisConfiguration",
                              "Analysis Configuration",
                            )}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            color="primary"
                            size="sm"
                            variant="ghost"
                            isLoading={isGeneratingAnalysisPrompt}
                            onPress={generateAnalysisPrompt}
                            isDisabled={isGeneratingAnalysisPrompt}
                            className="hover:scale-105 transition-all duration-200"
                          >
                            {isGeneratingAnalysisPrompt
                              ? t("generating", "Generating...")
                              : t("generateWithAi", "Generate with AI")}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardBody className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="analysis-prompt"
                          className="text-sm font-medium"
                        >
                          {t("analysisPrompt", "Analysis Prompt (optional)")}
                        </Label>
                        <Textarea
                          id="analysis-prompt"
                          classNames={{
                            input: "min-h-32",
                          }}
                          color="primary"
                          variant="bordered"
                          placeholder={t(
                            "analysisPlaceholder",
                            "Evaluate the candidate's technical skills, problem-solving approach, and communication clarity. Provide specific feedback on their coding abilities, system design thinking, and overall fit for the role. Rate on a scale of 1-10 with detailed justification.",
                          )}
                          value={interviewData.analysisPrompt}
                          onChange={(e) =>
                            setInterviewData((prev) => ({
                              ...prev,
                              analysisPrompt: e.target.value,
                            }))
                          }
                          size="sm"
                        />
                        {interviewData.analysisPrompt && (
                          <div className="text-xs text-default-500">
                            {interviewData.analysisPrompt.length}{" "}
                            {t("characters", "characters")}
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg ">
                        <div className="flex items-start gap-2">
                          <InfoIcon className="w-4 h-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-primary">
                              {t("aiPoweredAnalysis", "AI-Powered Analysis")}
                            </p>
                            <p className="text-xs text-primary/80">
                              {t(
                                "promptGuidesAi",
                                "This prompt guides the AI in analyzing candidate responses and providing structured feedback",
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Introduction Videos Section (standalone) */}
                  <Card shadow="none">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Video className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">
                            {t("introductionVideos", "Introduction Videos")}
                          </h3>
                        </div>
                        <Button
                          size="sm"
                          variant="light"
                          onPress={() => {
                            introSelectionInitializedRef.current = true;
                            setSelectedIntroVideoUrl(null);
                            setInterviewData((prev) => ({
                              ...prev,
                              introVideoUrl: undefined,
                            }));
                          }}
                          isDisabled={!selectedIntroVideoUrl}
                        >
                          {t("clearSelection", "Clear selection")}
                        </Button>
                      </div>
                      <div className="mt-1"></div>
                    </CardHeader>
                    <CardBody className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeWorkspace?.settings?.introductionVideos
                          ?.length ? (
                          activeWorkspace.settings.introductionVideos.map(
                            (v, idx) => (
                              <button
                                type="button"
                                key={(v.url || "") + idx}
                                onClick={() => {
                                  const url = v.url || null;
                                  introSelectionInitializedRef.current = true;
                                  if (selectedIntroVideoUrl === url) {
                                    setSelectedIntroVideoUrl(null);
                                    setInterviewData((prev) => ({
                                      ...prev,
                                      introVideoUrl: undefined,
                                    }));
                                  } else {
                                    setSelectedIntroVideoUrl(url);
                                    setInterviewData((prev) => ({
                                      ...prev,
                                      introVideoUrl: url || undefined,
                                    }));
                                  }
                                }}
                                className={cn(
                                  "rounded-lg border bg-content1 overflow-hidden text-left",
                                  selectedIntroVideoUrl === v.url
                                    ? "ring-2 ring-primary"
                                    : "hover:border-primary/50",
                                )}
                              >
                                <div className="relative w-full h-40 bg-black pointer-events-none">
                                  <video
                                    className="w-full h-full object-cover"
                                    src={v.url || undefined}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    controls={false}
                                  />
                                  {v.durationSec ? (
                                    <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded bg-black/60 text-white">
                                      {v.durationSec}s
                                    </span>
                                  ) : null}
                                  {selectedIntroVideoUrl === v.url && (
                                    <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded bg-primary text-primary-foreground">
                                      {t("selected", "Selected")}
                                    </span>
                                  )}
                                </div>
                                <div className="p-2">
                                  <p className="text-xs font-medium truncate">
                                    {v.title || t("untitled", "Untitled")}
                                  </p>
                                </div>
                              </button>
                            ),
                          )
                        ) : (
                          <div className="border-2 border-dashed rounded-lg p-6 min-h-28 flex flex-col items-center justify-center text-center text-default-500">
                            <p className="text-sm">
                              {t(
                                "noVideos",
                                "Your workspace has no introduction videos yet.",
                              )}
                            </p>
                            <a
                              href="/app/settings?tab=introduction-videos"
                              className="mt-2 text-primary text-xs hover:underline"
                            >
                              {t("manageVideos", "Manage Videos in Settings")}
                            </a>
                          </div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="secondary"
                  variant="light"
                  onPress={onClose}
                  isDisabled={isLoading || showSuccess}
                >
                  {t("close", "Close")}
                </Button>
                <Button
                  color="primary"
                  isLoading={isLoading && !showSuccess}
                  isDisabled={showSuccess}
                  startContent={
                    showSuccess ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : undefined
                  }
                  onPress={async () => {
                    // thread selected intro video into interview data for creation
                    if (selectedIntroVideoUrl) {
                      setInterviewData((prev) => ({
                        ...prev,
                        introVideoUrl: selectedIntroVideoUrl || undefined,
                      }));
                    }
                    await handleSubmitWithValidation(onClose);
                  }}
                >
                  {showSuccess
                    ? t("interviewCreated", "Interview Created!")
                    : t("createInterview", "Create Interview")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default InterviewConfiguration;
