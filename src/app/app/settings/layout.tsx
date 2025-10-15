"use client";

import { AppTabsWithRoutes } from "@root/app/components/AppTabs";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { api } from "@root/trpc/react";
import { workspaceSettingsScheme } from "@root/shared/zod-schemas";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import InlineNotification from "@root/app/components/InlineNotification";
import { z } from "zod";
import { useGAuth } from "@root/app/hooks/guath.hook";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage({ children }: PropsWithChildren) {
  const t = useTranslations("settings");
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams?.get("tab");
  const isBasePath = !currentTab; // true when at /app/settings without tab param

  const tabs = [
    {
      label: t("companyProfile", "Company Profile"),
      value: "company-context",
      href: "/app/settings?tab=company-context",
    },
    {
      label: t("branding", "Branding"),
      value: "branding",
      href: "/app/settings?tab=branding",
    },
    {
      label: t("interviewSettings", "Interview Settings"),
      value: "interview-settings",
      href: "/app/settings?tab=interview-settings",
    },

    {
      label: t("emails", "Emails"),
      value: "emails",
      href: "/app/settings?tab=emails",
    },
    {
      label: t("teamManagement", "Team Management"),
      value: "workspace-management",
      href: "/app/settings?tab=workspace-management",
    },
    {
      label: t("helpAndSupport", "Help And Support"),
      value: "help-and-support",
      href: "/app/settings?tab=help-and-support",
    },
    {
      label: t("termsAndConditions", "Terms And Conditions"),
      value: "terms-and-conditions",
      href: "/app/settings?tab=terms-and-conditions",
    },
    {
      label: t("introductionVideos", "Introduction Videos"),
      value: "introduction-videos",
      href: "/app/settings?tab=introduction-videos",
    },
  ];

  const { activeWorkspace } = useActiveWorkspace();
  const { gauthUser } = useGAuth();

  const [settings, setSettings] = useState<
    z.infer<typeof workspaceSettingsScheme>
  >(activeWorkspace?.settings || {});
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const updateWorkspaceSettings = api.workspace.update.useMutation({
    onSuccess: () => {
      console.log("✅ [SETTINGS] Settings saved successfully!");
      setNotification({
        type: "success",
        message: t("settingsSavedSuccessfully", "Settings saved successfully!"),
      });
    },
    onError: (error) => {
      console.error("❌ [SETTINGS] Failed to save settings:", error.message);
      setNotification({ type: "error", message: error.message });
    },
  });

  const updateSettings = (
    settings: z.infer<typeof workspaceSettingsScheme>
  ) => {
    console.log("💾 [SETTINGS] Saving workspace settings:");
    console.log("🔹 Workspace ID:", activeWorkspace?.id);
    console.log("🔹 Interview Config:", settings.interviewConfig);

    // Log analysis prompt specifically
    const analysisPrompt = settings.interviewConfig?.analysisPrompt;
    if (analysisPrompt && analysisPrompt.trim()) {
      console.log("🎯 [SETTINGS] Additional analysis instructions detected:");
      console.log("🔹 Length:", analysisPrompt.length);
      console.log("🔹 Preview:", analysisPrompt.substring(0, 200) + "...");
      console.log(
        "📋 [SETTINGS] These will be APPENDED to the default analysis prompt"
      );
    } else {
      console.log(
        "⚙️ [SETTINGS] No additional instructions - will use default analysis prompt only"
      );
    }

    updateWorkspaceSettings.mutate({
      workspaceId: activeWorkspace?.id || "",
      settings: {
        ...settings,
        brandingConfig: settings.brandingConfig,
        interviewConfig: settings.interviewConfig,
        termsAndConditionsConfig: settings.termsAndConditionsConfig,
        helpAndSupportConfig: settings.helpAndSupportConfig,
        emailTemplate: settings.emailTemplate,
        levels: settings.levels,
      },
    });
    setSettings(settings);
  };

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(activeWorkspace?.settings) !== JSON.stringify(settings)
    );
  }, [activeWorkspace?.settings, settings]);

  return (
    <div className="flex h-full w-full relative">
      {notification && (
        <div className="absolute top-2 left-2 right-2 z-50">
          <InlineNotification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
      {/* Desktop Sidebar - Hidden on mobile when viewing specific tab */}
      <div
        className={`
            flex-shrink-0 border-r fixed left-0 top-[65px] p-6 z-50 h-full border-default-100 bg-background
            w-full md:w-72
            md:block
            ${isBasePath ? "block" : "hidden"}
          `}
      >
        <div className="h-full">
          <AppTabsWithRoutes tabs={tabs} />
        </div>
      </div>

      {/* Content Area */}
      <div
        className={`
        flex-1 overflow-y-auto
        ${isBasePath ? "md:ml-72" : "md:ml-72"}
        ${!isBasePath ? "ml-0" : "ml-0 md:ml-72"}
      `}
      >
        {/* Mobile Back Button - Only show on mobile when viewing specific tab */}
        {!isBasePath && (
          <div className="lg:hidden p-4 border-b border-default-100 bg-background sticky top-0 z-10">
            <Button
              variant="light"
              size="sm"
              startContent={<ArrowLeft size={16} />}
              onPress={() => router.push("/app/settings")}
              className="text-default-600"
            >
              {t("backToSettings", "Back to Settings")}
            </Button>
          </div>
        )}

        {/* Main Content */}
        <div className="p-8">
          {/* Mobile: Show tabs when at base path, hide on desktop */}
          {isBasePath && (
            <div className="md:hidden mb-8">
              <h1 className="text-2xl font-semibold mb-6">
                {t("settings", "Settings")}
              </h1>
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <Button
                    key={tab.value}
                    variant="flat"
                    className="w-full justify-start h-12"
                    onPress={() => router.push(tab.href)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Desktop: Always show children, Mobile: Only show when not at base path */}
          <div className={`${isBasePath ? "hidden md:block" : "block"}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
