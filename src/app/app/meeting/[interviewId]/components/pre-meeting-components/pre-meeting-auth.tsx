import { useRoom } from "@root/app/app/meeting/[interviewId]/hooks/room.hook";
import { Button } from "@root/components/ui/button";
import { CardContent } from "@root/components/ui/card";
import { FC, useEffect, useMemo, useState } from "react";
import InlineNotification from "@root/app/components/InlineNotification";
import { Label } from "@root/components/ui/label";
import { ApplicantType } from "@root/shared/zod-schemas";
import { useUploader } from "@root/app/hooks/uploader.hook";
import { FileText, Upload, X, Check, AlertCircle } from "lucide-react";
import { cn } from "@root/lib/utils";
import { extractTextFromFile } from "@root/app/app/cv/utils/advancedTextExtractor";
import { api } from "@root/trpc/react";
import axios from "axios";
import {
  Form,
  Input,
  NumberInput,
  Progress,
  Select,
  SelectItem,
} from "@heroui/react";
import { z } from "zod";
// @ts-ignore
import validator from "validator";

export const PreMeetingAuth: FC<{
  next: () => void;
}> = ({ next }) => {
  const { interview, setUsername, workspaceSettings } = useRoom();

  // Get field requirements from workspace settings
  const isPhoneRequired =
    workspaceSettings?.interviewConfig?.requiredFields?.phone ?? true;
  const isAgeRequired =
    workspaceSettings?.interviewConfig?.requiredFields?.age ?? true;

  const [applicant, setApplicant] = useState<ApplicantType>({
    firstName: "",
    lastName: "",
    email: interview?.intervieweeEmail || "",
    phone: "",
    age: 0,
    gender: "male",
    interviewIds: [interview?.id || ""],
    workspaceId: interview?.workspaceId || "",
    createdAt: new Date(),
    updatedAt: new Date(),
    cvUrl: "",
  });
  const [uploadedCV, setUploadedCV] = useState<{
    file: File;
    content: string;
    uploadedAt: Date;
    wordCount: number;
    extractionMethod: string;
    confidence: number;
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  useEffect(() => {
    setApplicant({ email: interview?.intervieweeEmail });
  }, [interview]);

  const applicantFormSchema = useMemo(() => {
    const isPhoneRequired =
      workspaceSettings?.interviewConfig?.requiredFields?.phone ?? true;
    const isAgeRequired =
      workspaceSettings?.interviewConfig?.requiredFields?.age ?? true;

    const baseSchema: any = {
      email: z
        .string()
        .min(1, "Email is required")
        .refine((v) => validator.isEmail(v), "Please enter a valid email"),
      firstName: z.string().min(3, "First name must be at least 3 characters"),
      lastName: z.string().min(3, "Last name must be at least 3 characters"),
      gender: z.enum(["male", "female"], {
        required_error: "Gender is required",
      }),
    };

    // Add phone validation if required
    if (isPhoneRequired) {
      baseSchema.phone = z
        .string()
        .min(10, "Phone must be at least 10 digits")
        .max(20, "Phone must be at most 20 digits")
        .refine(
          (v) => validator.isMobilePhone(v, "any", { strictMode: false }),
          "Please enter a valid phone number"
        );
    } else {
      baseSchema.phone = z.string().optional();
    }

    // Add age validation if required
    if (isAgeRequired) {
      baseSchema.age = z
        .number({ invalid_type_error: "Age is required" })
        .int("Age must be a whole number")
        .min(1, "Age is required")
        .max(120, "Please enter a valid age");
    } else {
      baseSchema.age = z.number().optional();
    }

    return z.object(baseSchema);
  }, [workspaceSettings?.interviewConfig?.requiredFields]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    uploading,
    uploadProgress,
    setUploadProgress,
  } = useUploader("cv", {
    customUpload: async (file) => {
      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("folder", "cv");
      const res = (await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) {
            const percent = Math.round((e.loaded * 100) / e.total);
            setUploadProgress(percent);
          }
        },
      })) as { data: { success: boolean; url?: string; error?: string } };
      if (!res.data.success || !res.data.url) {
        throw new Error(res.data.error || "Upload failed");
      }
      return res.data.url;
    },
    onSuccess: async (url: string, file?: File) => {
      try {
        if (file) {
          const extractionResult = await extractTextFromFile(file);

          if (!extractionResult.text.trim()) {
            setNotification({
              type: "error",
              message:
                "No text could be extracted from the file. Please check if the file contains readable text.",
            });
            return;
          }

          setUploadedCV({
            file,
            content: extractionResult.text,
            uploadedAt: new Date(),
            wordCount: extractionResult.wordCount,
            extractionMethod: extractionResult.method,
            confidence: extractionResult.confidence,
          });
          setNotification({
            type: "success",
            message: `CV processed successfully! Extracted ${
              extractionResult.wordCount
            } words (${Math.round(
              extractionResult.confidence * 100
            )}% confidence).`,
          });
          setApplicant({
            ...applicant,
            cvUrl: url,
            cvContent: extractionResult.text,
          });
        }
      } catch (error) {
        console.error("Error processing CV:", error);
        setNotification({
          type: "error",
          message:
            "Failed to process the CV file. Please try again or check the file format.",
        });
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
  });

  const { mutate: createApplicant, isPending } =
    api.applicants.create.useMutation({
      onSuccess: () => {
        setSubmitState("success");
        setTimeout(() => {
          next();
        }, 1000); // Show success state for 1 second before proceeding
      },
      onError: () => {
        setSubmitState("error");
        setTimeout(() => {
          setSubmitState("idle");
        }, 2000); // Show error state for 2 seconds
      },
    });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData: any = {
      email: applicant.email || "",
      firstName: applicant.firstName || "",
      lastName: applicant.lastName || "",
      gender: applicant.gender || "male",
    };

    // Add optional fields only if they're required or have values
    if (isPhoneRequired || applicant.phone) {
      formData.phone = applicant.phone || "";
    }
    if (isAgeRequired || applicant.age) {
      formData.age = Number(applicant.age || 0);
    }

    const parsed = applicantFormSchema.safeParse(formData);

    if (!parsed.success) {
      const zodErrors = parsed.error.issues.reduce<Record<string, string>>(
        (acc, issue) => {
          const key = issue.path[0];
          if (typeof key === "string" && !acc[key]) acc[key] = issue.message;
          return acc;
        },
        {}
      );
      setErrors(zodErrors);
      setSubmitState("error");
      setTimeout(() => {
        setSubmitState("idle");
      }, 2000);
      return;
    }

    setErrors({});
    setSubmitState("idle"); // Reset state before submitting
    setUsername(`${applicant.firstName} ${applicant.lastName}`.trim());

    createApplicant({
      ...applicant,
      cvUrl: applicant.cvUrl || undefined,
      cvContent: uploadedCV?.content || undefined,
      interviewIds: [interview?.id || ""],
      workspaceId: interview?.workspaceId || undefined,
      updatedAt: new Date(),
      createdAt: new Date(),
    });
  };

  const handleRemoveCV = () => {
    setUploadedCV(null);
    setNotification({ type: "info", message: "CV removed successfully" });
  };

  return (
    <CardContent className="flex flex-col gap-4 items-center w-full mx-auto">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <h1 className="text-2xl font-bold">Interviewee Information</h1>
      <Form
        className="w-full flex flex-col gap-4"
        validationErrors={errors}
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2 w-full">
          <Label
            id="email-label"
            className="text-sm text-gray-500"
            htmlFor="email"
            isRequired
          >
            Email
          </Label>
          <Input
            id="email"
            name="email"
            aria-labelledby="email-label"
            placeholder="Enter your email"
            variant="bordered"
            color="primary"
            value={applicant.email}
            onChange={(e) =>
              setApplicant({ ...applicant, email: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div className="flex flex-col gap-2 w-full">
            <Label
              id="firstName-label"
              className="text-sm text-gray-500"
              htmlFor="firstName"
              isRequired
            >
              First Name
            </Label>
            <Input
              id="firstName"
              name="firstName"
              aria-labelledby="firstName-label"
              color="primary"
              variant="bordered"
              placeholder="Enter your first name"
              value={applicant?.firstName}
              onChange={(e) =>
                setApplicant({ ...applicant, firstName: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Label
              id="lastName-label"
              className="text-sm text-gray-500"
              htmlFor="lastName"
              isRequired
            >
              Last Name
            </Label>
            <Input
              id="lastName"
              name="lastName"
              aria-labelledby="lastName-label"
              color="primary"
              variant="bordered"
              placeholder="Enter your last name"
              value={applicant?.lastName}
              onChange={(e) =>
                setApplicant({ ...applicant, lastName: e.target.value })
              }
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <Label
            id="gender-label"
            className="text-sm text-gray-500"
            htmlFor="gender"
            isRequired
          >
            Gender
          </Label>
          <Select
            id="gender"
            name="gender"
            aria-labelledby="gender-label"
            color="primary"
            variant="bordered"
            selectedKeys={[applicant.gender || "male"]}
            onSelectionChange={(value) =>
              setApplicant({
                ...applicant,
                gender: value.currentKey as "male" | "female",
              })
            }
          >
            <SelectItem key="male">Male</SelectItem>
            <SelectItem key="female">Female</SelectItem>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div className="flex flex-col gap-2 w-full">
            <Label
              id="phone-label"
              className="text-sm text-gray-500"
              htmlFor="phone"
              isRequired={isPhoneRequired}
            >
              Phone{" "}
              {!isPhoneRequired && (
                <span className="text-xs text-muted-foreground">
                  (Optional)
                </span>
              )}
            </Label>
            <Input
              id="phone"
              name="phone"
              aria-labelledby="phone-label"
              color="primary"
              variant="bordered"
              placeholder="Enter your phone"
              value={applicant?.phone}
              onChange={(e) =>
                setApplicant({ ...applicant, phone: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Label
              id="age-label"
              className="text-sm text-gray-500"
              htmlFor="age"
              isRequired={isAgeRequired}
            >
              Age{" "}
              {!isAgeRequired && (
                <span className="text-xs text-muted-foreground">
                  (Optional)
                </span>
              )}
            </Label>
            <NumberInput
              id="age"
              name="age"
              aria-labelledby="age-label"
              color="primary"
              variant="bordered"
              type="number"
              classNames={{
                inputWrapper: "h-10",
              }}
              placeholder="Enter your age"
              value={applicant.age || 0}
              onValueChange={(value) =>
                setApplicant({ ...applicant, age: value as number })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 w-full gap-6">
          {!uploadedCV ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors w-full",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5",
                uploading && "pointer-events-none opacity-50"
              )}
            >
              <input {...getInputProps({ "aria-label": "Upload CV file" })} />
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />

              {uploading ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Processing your CV...</p>
                  <Progress
                    aria-label="Upload Progress"
                    color="primary"
                    value={uploadProgress}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {uploadProgress < 90
                      ? "Extracting text..."
                      : "Almost done..."}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium mb-2">
                    {isDragActive
                      ? "Drop your CV here"
                      : "Drag & drop your CV here"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    or click to browse files
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{uploadedCV.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedCV.file.size / 1024 / 1024).toFixed(2)} MB •{" "}
                      {uploadedCV.wordCount} words
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(uploadedCV.confidence * 100)}% confidence
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {uploadedCV.uploadedAt.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  aria-label="Remove uploaded CV"
                  onPress={handleRemoveCV}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onPress={() => setUploadedCV(null)}
                variant="bordered"
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Different CV
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full">
          <Button
            className="w-full"
            isLoading={isPending}
            color="primary"
            type="submit"
            startContent={
              submitState === "success" ? (
                <Check className="h-4 w-4" />
              ) : submitState === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : null
            }
            isDisabled={isPending || submitState === "success"}
          >
            {submitState === "success"
              ? "Success!"
              : submitState === "error"
              ? "Please fix errors"
              : "Proceed"}
          </Button>
        </div>
      </Form>
    </CardContent>
  );
};
