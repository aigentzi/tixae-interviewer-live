"use client";

import { useState, useEffect } from "react";
import { api } from "@root/trpc/react";
import InlineNotification from "@root/app/components/InlineNotification";
import { AdminHeader } from "./components/partials/AdminHeader";
import { GeneralPromptsTab } from "./components/tabs/GeneralPromptsTab";
import { UserManagementTab } from "./components/tabs/UserManagementTab";
import { UsersTab } from "./components/tabs/UsersTab";
import { AdminAccessGuard } from "./components/partials/AdminAccessGuard";
import { AdminSettingsType } from "@root/shared/zod-schemas";
import { VoiceProfilesTab } from "./components/tabs/VoiceProfilesTab";
import { Tab, Tabs } from "@heroui/react";

export default function AdminPanel() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);
  const [adminSettings, setAdminSettings] = useState<
    Pick<
      AdminSettingsType,
      "globalPrompts" | "greetingMessage" | "voiceProfiles"
    >
  >({
    globalPrompts: "",
    greetingMessage: "",
    voiceProfiles: [],
  });

  // TRPC queries and mutations
  const {
    data: adminSettingsData,
    isLoading: isLoadingAdminSettings,
    refetch,
  } = api.admin.getAdminSettings.useQuery();
  const updateAdminSettingsMutation = api.admin.updateAdminSettings.useMutation(
    {
      onSuccess: () => {
        setNotification({
          type: "success",
          message: "Global prompts saved successfully!",
        });
        setHasUnsavedChanges(false);
        refetch();
      },
      onError: (error) => {
        setNotification({
          type: "error",
          message: `Failed to save global prompts: ${error.message}`,
        });
      },
    }
  );

  // Load initial data
  useEffect(() => {
    if (adminSettingsData?.id) {
      setAdminSettings({
        globalPrompts: adminSettingsData.globalPrompts,
        greetingMessage: adminSettingsData.greetingMessage || "",
        voiceProfiles: adminSettingsData.voiceProfiles,
      });
    }
  }, [adminSettingsData]);

  const handlePromptChange = (value: string) => {
    setAdminSettings((prev) => ({ ...prev, globalPrompts: value }));
    setHasUnsavedChanges(true);
  };

  const handleGreetingChange = (value: string) => {
    setAdminSettings((prev) => ({ ...prev, greetingMessage: value }));
    setHasUnsavedChanges(true);
  };

  const saveAdminSettings = async () => {
    try {
      await updateAdminSettingsMutation.mutateAsync({
        globalPrompts: adminSettings.globalPrompts,
        greetingMessage: adminSettings.greetingMessage,
        voiceProfiles: adminSettings.voiceProfiles,
      });
    } catch (error) {
      setNotification({
        type: "error",
        message:
          `Error saving global prompts` +
          (error instanceof Error ? `: ${error.message}` : ""),
      });
    }
  };

  const saveVoiceProfiles = async (
    profiles: AdminSettingsType["voiceProfiles"],
    syncVoiceSettings: boolean = false
  ) => {
    try {
      await updateAdminSettingsMutation.mutateAsync({
        voiceProfiles: profiles,
        syncVoiceSettings,
      });
    } catch (error) {
      setNotification({
        type: "error",
        message:
          `Error saving voice profiles` +
          (error instanceof Error ? `: ${error.message}` : ""),
      });
    }
  };

  const resetGeneralPrompts = () => {
    setAdminSettings((prev) => ({
      ...prev,
      globalPrompts: "",
      greetingMessage: "",
    }));
    setNotification({ type: "info", message: "Default prompts reset" });
    setHasUnsavedChanges(false);
  };

  return (
    <AdminAccessGuard>
      <div className="space-y-6">
        {notification && (
          <InlineNotification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
        <AdminHeader hasUnsavedChanges={hasUnsavedChanges} />

        {/* Main Content */}
        <Tabs radius="full" color="primary" className="space-y-6">
          <Tab key="general-prompts" title="General Prompts">
            <GeneralPromptsTab
              systemPrompt={adminSettings.globalPrompts}
              greetingMessage={adminSettings.greetingMessage}
              hasUnsavedChanges={hasUnsavedChanges}
              isLoading={updateAdminSettingsMutation.isPending}
              onPromptChange={handlePromptChange}
              onGreetingChange={handleGreetingChange}
              onSave={saveAdminSettings}
              onReset={resetGeneralPrompts}
            />
          </Tab>

          <Tab key="voice-profiles" title="Voice Profiles">
            <VoiceProfilesTab
              voiceProfiles={adminSettings.voiceProfiles}
              onSave={saveVoiceProfiles}
            />
          </Tab>

          <Tab key="user-management" title="User Management">
            <UserManagementTab />
          </Tab>

          <Tab key="users" title="Users">
            <UsersTab />
          </Tab>
        </Tabs>
      </div>
    </AdminAccessGuard>
  );
}
