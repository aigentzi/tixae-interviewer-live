import { AppModal } from "@root/app/components/AppModal";
import { AppSteps } from "@root/app/components/AppSteps";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { Button } from "@root/components/ui/button";
import { InputTags } from "@root/components/ui/input-tags";
import { Label } from "@root/components/ui/label";
import {
  Input,
  NumberInput,
  Select,
  SelectItem,
  Switch,
  Textarea,
  Tooltip,
  Checkbox,
  DatePicker,
} from "@heroui/react";
import {
  Email,
  Interview,
  JobProfile,
  Level,
  levelsText,
} from "@root/shared/zod-schemas";
import { api } from "@root/trpc/react";
import { CloudUpload, DollarSignIcon, InfoIcon } from "lucide-react";
import moment from "moment";
import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import InlineNotification from "@root/app/components/InlineNotification";
import {
  getLocalTimeZone,
  parseAbsoluteToLocal,
  today,
  now,
} from "@internationalized/date";
import { useLocale } from "@root/app/providers/LocaleContext";

const initialInterviewData: Partial<
  Omit<Interview, "id" | "createdAt" | "updatedAt">
> = {
  jobProfileId: "",
  level: "1",
  content: "",
  score: 0,
  feedback: "",
  dailyRoomUrl: "",
  paid: false,
  price: 0,
  meetLink: "",
  workspaceId: "",
  userId: "",
};

export const CreateEditInterviewModal = (props: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  interview: Partial<Interview>;
  setInterview: (interview: Partial<Interview>) => void;
  refetchInterviews: () => void;
  jobProfiles: JobProfile[];
}) => {
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<number>(1);
  const [isScheduleEnabled, setIsScheduleEnabled] = useState<boolean>(false);
  const [interviewDuration, setInterviewDuration] = useState<number>(0);
  const [intervieweeEmails, setIntervieweeEmails] = useState<string[]>([]);

  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { activeWorkspace } = useActiveWorkspace();
  const { locale } = useLocale();

  const { data: emailsResponse } = api.emails.getEmailsByJobProfileId.useQuery(
    {
      jobProfileId: props.interview.jobProfileId || "",
      workspaceId: activeWorkspace?.id || "",
    },
    {
      enabled: !!props.interview.jobProfileId && !!activeWorkspace?.id,
    }
  );

  const isUpdate = useMemo(() => props.interview.id, [props.interview]);
  const jobProfile = useMemo(
    () =>
      props.jobProfiles.find(
        (profile) => profile.id === props.interview.jobProfileId
      ),
    [props.jobProfiles, props.interview.jobProfileId]
  );

  const createInterviewMutation = api.interviews.create.useMutation({
    onSuccess: () => {
      props.setIsOpen(false);
      props.setInterview(initialInterviewData);
      props.refetchInterviews();
      setError(null);
      setStep(1);
      setIsScheduleEnabled(false);
      setInterviewDuration(0);
      props.setInterview(initialInterviewData);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const updateInterviewMutation = api.interviews.update.useMutation({
    onSuccess: () => {
      props.setIsOpen(false);
      props.setInterview(initialInterviewData);
      props.refetchInterviews();
      setError(null);
      setStep(1);
      setIsScheduleEnabled(false);
      setInterviewDuration(0);
      props.setInterview(initialInterviewData);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const updateInterviewData = (data: Partial<Interview>) => {
    props.setInterview({ ...props.interview, ...data });
  };

  const createInterview = () => {
    createInterviewMutation.mutate({
      jobProfileId: jobProfile?.id || "",
      level: props.interview.level as Level,
      workspaceId: jobProfile?.workspaceId || activeWorkspace?.id || "",
      startTime: props.interview.startTime || undefined,
      endTime: props.interview.endTime || undefined,
      paid: props.interview.paid,
      price: props.interview.price,
      duration: interviewDuration,
      enableSchedule: isScheduleEnabled,
      intervieweeEmails: intervieweeEmails,
      language: locale, // Pass user's selected language
    });
  };

  const updateInterview = () => {
    updateInterviewMutation.mutate({
      interviewId: props.interview.id as string,
      data: {
        ...props.interview,
        enableSchedule: isScheduleEnabled || !!props.interview.startTime,
        startTime: props.interview.startTime || undefined,
        endTime: props.interview.endTime || undefined,
      },
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("acceptedFiles", acceptedFiles);
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile({
      name: file.name,
      size: file.size,
    });

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split("\n");

        if (rows.length < 2) {
          setError("CSV file is invalid or empty");
          setIsProcessing(false);
          return;
        }

        const headers = rows[0].split(",").map((header) => header.trim());
        const requiredHeaders = ["email"];

        const missingHeaders = requiredHeaders.filter(
          (header) => !headers.includes(header)
        );

        if (missingHeaders.length > 0) {
          setError(`Missing required headers: ${missingHeaders.join(", ")}`);
          setIsProcessing(false);
          return;
        }

        const parsedRows = rows
          .slice(1)
          .filter((row) => row.trim())
          .map((row) => {
            const values = row.split(",").map((cell) => cell.trim());
            const email: Email = {} as Email;
            headers.forEach((header, index) => {
              email[header as keyof Email] = values[index] || "";
            });
            return email;
          });

        setIntervieweeEmails(parsedRows.map((row) => row.email));
        setIsProcessing(false);
      } catch (error) {
        setError("Error parsing CSV file");
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setError("Error reading file");
      setIsProcessing(false);
    };

    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <AppModal
      isModalOpen={props.isOpen}
      setIsModalOpen={props.setIsOpen}
      isLoading={
        createInterviewMutation.isPending || updateInterviewMutation.isPending
      }
      title={isUpdate ? "Update Interview" : "Create Interview"}
      description={
        isUpdate
          ? "Update the interview to start interviewing."
          : "Create a new interview to start interviewing."
      }
      onSubmit={
        step !== 3
          ? () => setStep(step + 1)
          : isUpdate
          ? updateInterview
          : createInterview
      }
      footerButtonText={
        step !== 3 ? "Next" : isUpdate ? "Update Interview" : "Create Interview"
      }
      additionalButtons={
        step !== 1 ? (
          <Button
            onPress={() => setStep(step - 1)}
            variant="light"
            color="primary"
            radius="md"
          >
            Back
          </Button>
        ) : null
      }
      showCancelButton={step === 1}
      showAdditionalButtons={step !== 1}
      isDisabled={
        createInterviewMutation.isPending || updateInterviewMutation.isPending
      }
      classNames={{
        footerBtn: "bg-blue-500 hover:bg-blue-600",
        content: "max-w-[48rem] w-full max-h-[90%] h-50%",
      }}
    >
      <div className="flex flex-col gap-2">
        {error && (
          <InlineNotification
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}
        <AppSteps
          stepsNumber={3}
          currentStep={step}
          stepNames={["Details", "Schedule", "Pricing"]}
        />

        {/* Step 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Job Profile</Label>
              <Select
                variant="bordered"
                color="primary"
                items={props.jobProfiles.map((profile) => ({
                  key: profile.id,
                  label: profile.name,
                }))}
                selectedKeys={[jobProfile?.id || ""]}
                onSelectionChange={(value) =>
                  updateInterviewData({ jobProfileId: value.currentKey || "" })
                }
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>
            </div>
            {jobProfile?.levels && (
              <div className="flex flex-col gap-2">
                <Label>Interview Level</Label>
                <Select
                  variant="bordered"
                  color="primary"
                  placeholder="Select Interview Level"
                  items={jobProfile?.levels.map((level) => ({
                    key: level.level,
                    label: levelsText[Number(level.level) - 1],
                  }))}
                  selectedKeys={[props.interview.level || ""]}
                  onSelectionChange={(value) =>
                    updateInterviewData({ level: value.currentKey as Level })
                  }
                >
                  {(item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  )}
                </Select>
              </div>
            )}
            {emailsResponse && emailsResponse.emails.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Predefined Interviewee Emails</Label>
                <p className="text-sm text-muted-foreground">
                  The emails of the interviewees are already provided for this
                  job profile. You can select them to start the interview.
                </p>
                <div className="flex flex-col gap-2">
                  {emailsResponse.emails.map((email) => (
                    <div
                      key={email.id}
                      className="flex flex-row gap-2 items-center"
                    >
                      <Checkbox
                        id={email.id}
                        className="h-6 w-6"
                        isSelected={intervieweeEmails.includes(email.email)}
                        onValueChange={(value) => {
                          if (value) {
                            setIntervieweeEmails([
                              ...intervieweeEmails,
                              email.email,
                            ]);
                          } else {
                            setIntervieweeEmails(
                              intervieweeEmails.filter((e) => e !== email.email)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={email.id}>{email.email}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isUpdate ? (
              <div className="flex flex-col gap-2">
                <Label>Interviewee Email</Label>
                <Input
                  variant="bordered"
                  color="primary"
                  type="email"
                  description="The email of the interviewee has to be provided to start the interview."
                  value={props.interview.intervieweeEmail || ""}
                  onValueChange={(value) =>
                    updateInterviewData({ intervieweeEmail: value })
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col gap-2">
                  <section className="w-full mx-auto transition-all duration-500 text-foreground bg-content3 border border-foreground-300 rounded-lg">
                    <div
                      className={`flex w-full flex-col items-center justify-center gap-3 p-2 rounded-lg border-2 border-dashed ${
                        isDragActive
                          ? "border-primary"
                          : "border-foreground-300"
                      }`}
                      {...getRootProps()}
                    >
                      <input {...getInputProps()} />
                      <CloudUpload className="w-20 h-20 text-primary/60" />
                      <div className="text-center">
                        <p className="text-lg font-medium">
                          Upload your leads as CSV
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Or Add Interviewee Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    You can also add more emails to the interview by uploading a
                    CSV file.
                  </p>
                  <InputTags
                    value={intervieweeEmails}
                    type="email"
                    onChange={(value) =>
                      setIntervieweeEmails(value as string[])
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Analysis Prompt</Label>
              <Textarea
                variant="bordered"
                color="primary"
                placeholder="Analyze the candidate's technical skills, communication abilities, and problem-solving approach..."
                description="The prompt to use for the analysis of the interview."
                value={props.interview.analysisPrompt || ""}
                onValueChange={(value) =>
                  updateInterviewData({ analysisPrompt: value })
                }
                rows={3}
              />
            </div>

            <div className="flex flex-row gap-2 items-center justify-between">
              <Label>Enable Verification</Label>
              <Switch
                size="sm"
                isSelected={props.interview.enableVerification || false}
                onValueChange={(value) =>
                  updateInterviewData({ enableVerification: value })
                }
              />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-row gap-2 items-center">
              <Tooltip
                placement="right"
                color="primary"
                classNames={{
                  content: "max-w-xs",
                }}
                content="Enable schedule to automatically start and end the interview at the scheduled time."
              >
                <Checkbox
                  isSelected={isScheduleEnabled || !!props.interview.startTime}
                  onValueChange={(value) => {
                    if (value) {
                      updateInterviewData({
                        startTime: new Date(),
                        endTime: new Date(),
                      });
                    } else {
                      updateInterviewData({
                        startTime: undefined,
                        endTime: undefined,
                      });
                    }
                    setIsScheduleEnabled(value);
                  }}
                >
                  Enable Schedule
                </Checkbox>
              </Tooltip>
            </div>
            <div className="flex flex-col gap-4">
              {(isScheduleEnabled || !!props.interview.startTime) && (
                <div className="flex flex-col gap-2">
                  <Label>Start Time</Label>
                  <DatePicker
                    id="startTime"
                    hideTimeZone
                    color="primary"
                    variant="bordered"
                    onChange={(value) => {
                      if (!value) return;
                      const newStartTime = value?.toDate();
                      updateInterviewData({
                        startTime: new Date(newStartTime),
                      });
                    }}
                    showMonthAndYearPickers
                    value={
                      props.interview.startTime
                        ? parseAbsoluteToLocal(
                            props.interview.startTime.toISOString()
                          )
                        : undefined
                    }
                    minValue={now(getLocalTimeZone())}
                    className="flex-1"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label>Interview Duration</Label>
                <NumberInput
                  variant="bordered"
                  size="sm"
                  description="The duration of the interview in minutes."
                  color="primary"
                  minValue={5}
                  value={props.interview.duration || interviewDuration}
                  onValueChange={(value) => {
                    setInterviewDuration(Number(value));
                    updateInterviewData({ duration: Number(value) });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-row gap-2 items-center">
              <Tooltip
                placement="right"
                color="primary"
                classNames={{
                  content: "max-w-xs",
                }}
                content="Enable paid interview to automatically charge the user for the interview."
              >
                <Checkbox
                  id="paid-interview"
                  isSelected={props.interview.paid || false}
                  onValueChange={(value) => {
                    updateInterviewData({ paid: value });
                  }}
                >
                  Paid Interview
                </Checkbox>
              </Tooltip>
            </div>
            {props.interview.paid && (
              <div className="flex flex-col gap-2">
                <Label>Price</Label>
                <div className="flex flex-row gap-2 items-center">
                  <NumberInput
                    variant="bordered"
                    color="primary"
                    startContent={<DollarSignIcon className="w-4 h-4" />}
                    size="sm"
                    minValue={0}
                    description="The price of the interview in dollars."
                    value={props.interview.price || 0}
                    onValueChange={(value) =>
                      updateInterviewData({ price: Number(value) })
                    }
                  />
                  {/* <Button variant="faded">
                    <DollarSignIcon className="w-4 h-4" />
                  </Button> */}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppModal>
  );
};
