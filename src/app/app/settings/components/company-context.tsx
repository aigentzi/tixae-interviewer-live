"use client";

import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { api } from "@root/trpc/react";
import InlineNotification from "@root/app/components/InlineNotification";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { useState } from "react";
import { EditableField } from "./EditableField";

export default function CompanyContextSettings() {
  const { activeWorkspace, setActiveWorkspace } = useActiveWorkspace();
  const t = useTranslations("settings");
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const updateWorkspaceMutation = api.workspace.update.useMutation({
    onSuccess: () => {
      console.log("✅ [COMPANY_CONTEXT] Settings saved successfully!");
      setNotification({
        type: "success",
        message: t(
          "companyContextSavedSuccessfully",
          "Company context saved successfully!"
        ),
      });
    },
    onError: (error: { message: string }) => {
      console.error(
        "❌ [COMPANY_CONTEXT] Failed to save settings:",
        error.message
      );
      setNotification({ type: "error", message: error.message });
    },
  });

  const updateCompanyContext = async (
    data: Partial<{
      companyName: string;
      companyDescription: string;
      companyValues: string;
      companyWebsite: string;
      additionalContext: string;
    }>
  ) => {
    console.log("🏢 [COMPANY_CONTEXT] Update requested:", data);
    console.log("🔹 Workspace ID:", activeWorkspace?.id);

    if (!activeWorkspace?.id) {
      console.error("❌ [COMPANY_CONTEXT] No workspace ID available");
      setNotification({
        type: "error",
        message: t(
          "noWorkspaceSelected",
          "No workspace selected. Please refresh the page."
        ),
      });
      throw new Error("No workspace selected");
    }

    // Update via API
    await updateWorkspaceMutation.mutateAsync({
      workspaceId: activeWorkspace.id,
      settings: {
        ...activeWorkspace.settings,
        interviewConfig: {
          ...activeWorkspace.settings?.interviewConfig,
          companyContext: {
            ...activeWorkspace.settings?.interviewConfig?.companyContext,
            ...data,
          },
        },
      },
    });

    // Update local state
    const updatedWorkspace = {
      ...activeWorkspace,
      settings: {
        ...activeWorkspace.settings,
        interviewConfig: {
          ...activeWorkspace.settings?.interviewConfig,
          companyContext: {
            ...activeWorkspace.settings?.interviewConfig?.companyContext,
            ...data,
          },
        },
      },
      updatedAt: new Date(),
    };

    setActiveWorkspace(updatedWorkspace);
  };

  const companyContext =
    activeWorkspace?.settings?.interviewConfig?.companyContext;

  return (
    <div className="flex flex-col gap-6">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div>
        <h1 className="text-2xl font-bold">
          {t("companyDetails", "Company Details")}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t(
            "companyContextDesc",
            "Provide company details that will be shared with the AI assistant during interviews. This helps the AI provide more relevant and personalized interview experiences."
          )}
        </p>
      </div>

      <div className="w-full">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EditableField
              value={companyContext?.companyName || ""}
              label={t("companyName", "Company Name")}
              placeholder="Enter company name"
              onSave={async (value) => {
                await updateCompanyContext({ companyName: value });
              }}
            />

            <EditableField
              value={companyContext?.companyWebsite || ""}
              label={t("companyWebsite", "Company Website")}
              type="text"
              placeholder="https://example.com"
              onSave={async (value) => {
                await updateCompanyContext({ companyWebsite: value });
              }}
            />
          </div>

          <EditableField
            value={companyContext?.companyDescription || ""}
            label={t("companyDescription", "Company Description")}
            placeholder={t(
              "companyDescriptionPlaceholder",
              "Brief description of what your company does, its mission, and key products/services..."
            )}
            onSave={async (value) => {
              await updateCompanyContext({ companyDescription: value });
            }}
            isTextArea
          />

          <EditableField
            value={companyContext?.companyValues || ""}
            label={t("companyValuesCulture", "Company Values & Culture")}
            placeholder={t(
              "companyValuesCulturePlaceholder",
              "Core values, company culture, work environment, team dynamics..."
            )}
            onSave={async (value) => {
              await updateCompanyContext({ companyValues: value });
            }}
            isTextArea
          />

          <EditableField
            value={companyContext?.additionalContext || ""}
            label={t("additionalContext", "Additional Context")}
            placeholder={t(
              "additionalContextPlaceholder",
              "Any additional information you'd like the AI assistant to know about your company, recent news, specific interview focus areas..."
            )}
            onSave={async (value) => {
              await updateCompanyContext({ additionalContext: value });
            }}
            isTextArea
          />

          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-primary mt-0.5">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-primary mb-1">
                  {t(
                    "howThisHelpsInterviews",
                    "How this helps your interviews"
                  )}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "howThisHelpsInterviewsDesc",
                    "The AI assistant will use this company context to provide more relevant questions, better understand candidate fit, and give more personalized feedback during interviews."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
