"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@root/components/ui/button";
import { Label } from "@root/components/ui/label";
import { EditableField } from "./EditableField";
import { Badge } from "@root/components/ui/badge";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { Check, Copy } from "lucide-react";
import {
  Input,
  NumberInput,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { api } from "@root/trpc/react";
interface EmailTemplate {
  subject: string;
  greeting: string;
  introText: string;
  closingText: string;
  buttonText: string;
  preparationTips: string[];
}

// Default template now uses translation keys
const getDefaultTemplate = (t: any): EmailTemplate => ({
  subject: t("emailSubject", "Interview Invitation: {{jobTitle}}"),
  greeting: t("emailGreeting", "Hello,"),
  introText: t(
    "emailIntroText",
    "You have been invited to participate in an interview for the {{jobTitle}} position."
  ),
  closingText: t("emailClosingText", "We look forward to speaking with you!"),
  buttonText: t("emailButtonText", "Join Interview →"),
  preparationTips: [
    t("emailTip1", "Test your camera and microphone"),
    t("emailTip2", "Find a quiet, well-lit space"),
    t("emailTip3", "Ensure you have a stable internet connection"),
    t("emailTip4", "Keep your resume handy for reference"),
  ],
});

export const EmailSettings = () => {
  const { activeWorkspace, setActiveWorkspace } = useActiveWorkspace();
  const t = useTranslations("mainPage");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  const updateWorkspaceSettings = api.workspace.update.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      // Reset success state after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    },
  });

  const [previewData, setPreviewData] = useState({
    jobTitle: "Software Engineer",
    interviewerName: "Sarah Johnson",
    level: "Senior Level",
    duration: 45,
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  });
  const {
    isOpen: isPreviewOpen,
    onOpen: onPreviewOpen,
    onOpenChange: onPreviewOpenChange,
  } = useDisclosure();
  const [newTip, setNewTip] = useState("");
  const [previewStep, setPreviewStep] = useState<"data" | "preview">("data");

  // Reset preview step when modal opens/closes
  const handlePreviewModalChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPreviewStep("data");
    }
    onPreviewOpenChange();
  };

  const handleNextStep = () => {
    setPreviewStep("preview");
  };

  const handlePreviousStep = () => {
    setPreviewStep("data");
  };

  // Get default template with translations
  const defaultTemplate = getDefaultTemplate(t);

  // Get current email template or use default
  const currentTemplate =
    activeWorkspace?.settings?.emailTemplate || defaultTemplate;

  const updateEmailTemplate = (
    field: keyof EmailTemplate,
    value: string | string[]
  ) => {
    if (!activeWorkspace?.settings) return;

    // Create updated workspace with new email template
    const updatedWorkspace = {
      ...activeWorkspace,
      settings: {
        ...activeWorkspace.settings,
        emailTemplate: {
          ...currentTemplate,
          [field]: value,
        },
      },
    };

    setActiveWorkspace(updatedWorkspace);
  };

  const handleResetTemplate = () => {
    if (!activeWorkspace?.settings) return;

    const updatedWorkspace = {
      ...activeWorkspace,
      settings: {
        ...activeWorkspace.settings,
        emailTemplate: defaultTemplate,
      },
    };

    setActiveWorkspace(updatedWorkspace);
  };

  const addPreparationTip = () => {
    if (newTip.trim()) {
      const newTips = [
        ...(currentTemplate.preparationTips || []),
        newTip.trim(),
      ];
      updateEmailTemplate("preparationTips", newTips);
      setNewTip("");
    }
  };

  const removePreparationTip = (index: number) => {
    const newTips = (currentTemplate.preparationTips || []).filter(
      (_, i) => i !== index
    );
    updateEmailTemplate("preparationTips", newTips);
  };

  const copyToClipboard = async (variable: string) => {
    try {
      await navigator.clipboard.writeText(variable);
      setCopiedVariable(variable);
      // Reset success state after 2 seconds
      setTimeout(() => {
        setCopiedVariable(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy variable:", err);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const generatePreviewHtml = () => {
    const brandLogo = activeWorkspace?.settings?.brandingConfig?.logo;
    const brandName = activeWorkspace?.settings?.brandingConfig?.name;

    const replaceVariables = (text: string) => {
      return text
        .replace(/\{\{jobTitle\}\}/g, previewData.jobTitle)
        .replace(/\{\{interviewerName\}\}/g, previewData.interviewerName)
        .replace(/\{\{level\}\}/g, previewData.level)
        .replace(/\{\{duration\}\}/g, previewData.duration.toString());
    };

    const headerSection = brandLogo
      ? `
      <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #eee;">
        <img src="${brandLogo}" alt="${brandName} Logo" style="max-height: 80px; max-width: 250px; margin-bottom: 20px;" />
        <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">${t(
          "emailInvitationTitle",
          "Interview Invitation"
        )}</h1>
        ${
          brandName
            ? `<p style=\"color: #666; margin: 12px 0 0 0; font-size: 16px;\">${brandName}</p>`
            : ""
        }
      </div>
      `
      : `
      <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #eee;">
        <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">${t(
          "emailInvitationTitle",
          "Interview Invitation"
        )}</h1>
        ${
          brandName
            ? `<p style=\"color: #666; margin: 12px 0 0 0; font-size: 16px;\">${brandName}</p>`
            : ""
        }
      </div>
      `;

    const scheduledInfo = `
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #e9ecef;">
        <h3 style="color: #333; margin: 0 0 12px 0; font-size: 18px;">📅 ${t(
          "emailScheduledInterview",
          "Scheduled Interview"
        )}</h3>
        <p style="margin: 0; color: #666; font-size: 15px;"><strong>${t(
          "emailDateTime",
          "Date & Time"
        )}:</strong> ${formatDateTime(previewData.startTime)}</p>
        <p style="margin: 8px 0 0 0; color: #666; font-size: 15px;"><strong>${t(
          "emailDuration",
          "Duration"
        )}:</strong> ${previewData.duration} ${t("emailMinutes", "minutes")}</p>
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${t("emailInvitationTitle", "Interview Invitation")}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 30px; background-color: #fff;">

        ${headerSection}

        <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); margin-bottom: 20px; border: 1px solid #f0f0f0;">

          <p style="font-size: 17px; margin-bottom: 25px; color: #333;">${
            currentTemplate.greeting || defaultTemplate.greeting
          }</p>

          <p style="font-size: 17px; margin-bottom: 25px; color: #333; line-height: 1.6;">
            ${replaceVariables(
              currentTemplate.introText || defaultTemplate.introText
            )}
          </p>

          ${scheduledInfo}

          <div style="background-color: #fafafa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e9ecef;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">📋 ${t(
              "emailInterviewDetails",
              "Interview Details"
            )}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 600; width: 120px;">${t(
                  "emailPosition",
                  "Position"
                )}:</td>
                <td style="padding: 8px 0; color: #333;">${
                  previewData.jobTitle
                }</td>
              </tr>
              
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 600;">${t(
                  "emailLevel",
                  "Level"
                )}:</td>
                <td style="padding: 8px 0; color: #333;">${
                  previewData.level
                }</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: 600;">${t(
                  "emailInterviewer",
                  "Interviewer"
                )}:</td>
                <td style="padding: 8px 0; color: #333;">${
                  previewData.interviewerName
                }</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <div style="background-color: #333; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px; border: none; box-shadow: 0 3px 8px rgba(0,0,0,0.15);">
              ${currentTemplate.buttonText}
            </div>
          </div>

          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e9ecef;">
            <h4 style="color: #333; margin: 0 0 15px 0; font-size: 16px;">💡 ${t(
              "emailBeforeInterview",
              "Before Your Interview"
            )}:</h4>
            <ul style="color: #666; margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.7;">
              ${(currentTemplate.preparationTips || [])
                .map((tip) => `<li>${tip}</li>`)
                .join("")}
            </ul>
          </div>

          <p style="font-size: 15px; color: #666; margin-top: 30px; text-align: center;">
            ${currentTemplate.closingText}
          </p>

        </div>

        <div style="text-align: center; color: #999; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 0 0 8px 0;">${t(
            "emailPoweredBy",
            "This interview is powered by"
          )} <strong style="color: #666;">${brandName}</strong></p>
          <p style="margin: 0;">${t(
            "emailContactNote",
            "If you have any questions, please contact your interviewer or the hiring team."
          )}</p>
        </div>

      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {t("emailTemplatesTitle", "Email Templates")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {t(
              "emailTemplatesDesc",
              "Customize the interview invitation emails sent to candidates"
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Modal
            size="lg"
            scrollBehavior="inside"
            isOpen={isPreviewOpen}
            onOpenChange={handlePreviewModalChange}
          >
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    {previewStep === "data"
                      ? t("previewDataStep", "Step 1: Preview Data")
                      : t("emailPreviewStep", "Step 2: Email Preview")}
                  </ModalHeader>
                  <ModalBody className="scrollbar-thin">
                    {previewStep === "data" ? (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground mb-4">
                          {t(
                            "previewDataDescription",
                            "Enter sample data to see how your email template will look:"
                          )}
                        </p>

                        <div>
                          <Label htmlFor="previewJobTitle">
                            {t("jobTitle", "Job Title")}
                          </Label>
                          <Input
                            variant="bordered"
                            color="primary"
                            id="previewJobTitle"
                            value={previewData.jobTitle}
                            onChange={(e) =>
                              setPreviewData((prev) => ({
                                ...prev,
                                jobTitle: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="previewInterviewerName">
                            {t("emailInterviewerName", "Interviewer Name")}
                          </Label>
                          <Input
                            variant="bordered"
                            color="primary"
                            id="previewInterviewerName"
                            value={previewData.interviewerName}
                            onChange={(e) =>
                              setPreviewData((prev) => ({
                                ...prev,
                                interviewerName: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="previewLevel">
                            {t("emailLevel", "Level")}
                          </Label>
                          <Input
                            variant="bordered"
                            color="primary"
                            id="previewLevel"
                            value={previewData.level}
                            onChange={(e) =>
                              setPreviewData((prev) => ({
                                ...prev,
                                level: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="previewDuration">
                            {t("emailDurationLabel", "Duration (minutes)")}
                          </Label>
                          <NumberInput
                            variant="bordered"
                            color="primary"
                            id="previewDuration"
                            value={previewData.duration}
                            onValueChange={(value) =>
                              setPreviewData((prev) => ({
                                ...prev,
                                duration: value || 45,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        className="border rounded-lg p-4 bg-white"
                        dangerouslySetInnerHTML={{
                          __html: generatePreviewHtml(),
                        }}
                      />
                    )}
                  </ModalBody>
                  <ModalFooter>
                    {previewStep === "data" ? (
                      <div className="flex justify-between w-full">
                        <Button variant="light" onPress={onClose}>
                          {t("cancel", "Cancel")}
                        </Button>
                        <Button color="primary" onPress={handleNextStep}>
                          {t("previewEmail", "Preview Email")}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-between w-full">
                        <Button variant="light" onPress={handlePreviousStep}>
                          {t("back", "Back")}
                        </Button>
                        <Button color="primary" onPress={onClose}>
                          {t("done", "Done")}
                        </Button>
                      </div>
                    )}
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>

          <Button
            variant="light"
            size="sm"
            onPress={handleResetTemplate}
            className="flex items-center gap-2"
          >
            {t("reset", "Reset")}
          </Button>
          <Button
            variant="light"
            size="sm"
            onPress={onPreviewOpen}
            className="flex items-center gap-2"
          >
            Preview
          </Button>
          <Button
            color="primary"
            size="sm"
            isLoading={updateWorkspaceSettings.isPending}
            className="flex items-center gap-2"
            startContent={saveSuccess ? <Check className="w-4 h-4" /> : null}
            onPress={() => {
              if (!activeWorkspace?.id) return;
              updateWorkspaceSettings.mutate({
                workspaceId: activeWorkspace?.id,
                settings: {
                  ...activeWorkspace?.settings,
                  emailTemplate: currentTemplate,
                },
              });
            }}
          >
            {t("save", "Save")}
          </Button>
        </div>
      </div>

      <div className=" space-y-8">
        {/* Email Content Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground">
            {t("emailContent", "Email Content")}
          </h3>

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EditableField
                value={currentTemplate.subject || defaultTemplate.subject}
                label={t("emailSubjectLabel", "Email Subject")}
                placeholder={t(
                  "emailSubjectPlaceholder",
                  "Interview Invitation: {{jobTitle}}"
                )}
                onSave={async (value) => {
                  updateEmailTemplate("subject", value);
                }}
                required
              />

              <EditableField
                value={currentTemplate.greeting || defaultTemplate.greeting}
                label={t("emailGreetingLabel", "Greeting")}
                placeholder={t("emailGreetingPlaceholder", "Hello,")}
                onSave={async (value) => {
                  updateEmailTemplate("greeting", value);
                }}
              />
            </div>

            <EditableField
              value={currentTemplate.introText || defaultTemplate.introText}
              label={t("emailIntroLabel", "Introduction Text")}
              placeholder={t(
                "emailIntroPlaceholder",
                "You have been invited to participate in an interview..."
              )}
              onSave={async (value) => {
                updateEmailTemplate("introText", value);
              }}
              isTextArea
            />

            <EditableField
              value={currentTemplate.buttonText || defaultTemplate.buttonText}
              label={t("emailButtonLabel", "Button Text")}
              placeholder={t("emailButtonPlaceholder", "Join Interview →")}
              onSave={async (value) => {
                updateEmailTemplate("buttonText", value);
              }}
            />

            <EditableField
              value={currentTemplate.closingText || defaultTemplate.closingText}
              label={t("emailClosingLabel", "Closing Text")}
              placeholder={t(
                "emailClosingPlaceholder",
                "We look forward to speaking with you!"
              )}
              onSave={async (value) => {
                updateEmailTemplate("closingText", value);
              }}
            />
          </div>
        </div>

        {/* Available Variables Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {t("emailAvailableVariables", "Available Variables")}
          </h3>

          <div className="flex flex-wrap gap-2">
            {[
              "{{jobTitle}}",
              "{{interviewerName}}",
              "{{level}}",
              "{{duration}}",
            ].map((variable) => (
              <div key={variable} className="flex items-center gap-1">
                <Badge
                  variant="default"
                  onClick={() => copyToClipboard(variable)}
                  className="text-xs cursor-pointer px-4 flex items-center gap-1"
                >
                  {variable}
                  {copiedVariable === variable ? (
                    <Check className="w-3 h-3 ml-1" />
                  ) : (
                    <Copy className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              "emailVariablesDescription",
              "Use these variables in your email content to automatically insert interview-specific information."
            )}
          </p>
        </div>

        {/* Preparation Tips Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-foreground">
            {t("emailPreparationTips", "Preparation Tips")}
          </h3>

          <div className="flex gap-2">
            <Input
              variant="bordered"
              color="primary"
              value={newTip}
              onValueChange={(value) => setNewTip(value)}
              placeholder={t(
                "emailAddTipPlaceholder",
                "Add a preparation tip..."
              )}
              onKeyDown={(e) => e.key === "Enter" && addPreparationTip()}
            />
            <Button color="primary" onPress={addPreparationTip}>
              {t("add", "Add")}
            </Button>
          </div>

          <div className="space-y-2">
            {(currentTemplate.preparationTips || []).map((tip, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 px-4 border border-default-200 rounded-xl"
              >
                <span className="text-sm text-foreground">{tip}</span>
                <Button
                  variant="light"
                  size="sm"
                  color="default"
                  onPress={() => removePreparationTip(index)}
                >
                  {t("remove", "Remove")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
