import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Label } from "@root/components/ui/label";
import { Button, Checkbox, Switch } from "@heroui/react";
import { termsAndConditionsConfigurationScheme } from "@root/shared/zod-schemas";
import { z } from "zod";
import { Input, Textarea } from "@heroui/react";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { useEffect, useMemo, useState } from "react";
import { api } from "@root/trpc/react";
import { CheckIcon } from "lucide-react";

export default function TermsAndConditions() {
  const { activeWorkspace, setActiveWorkspace } = useActiveWorkspace();
  const t = useTranslations("settings");

  const [settings, setSettings] = useState<
    z.infer<typeof termsAndConditionsConfigurationScheme>
  >(
    activeWorkspace?.settings?.termsAndConditionsConfig || {
      enableTermsAndConditions: false,
      title: "",
      content: "",
      privacyPolicy: "",
      includeDataProcessingAgreement: false,
    }
  );

  useEffect(() => {
    setSettings(
      activeWorkspace?.settings?.termsAndConditionsConfig || {
        enableTermsAndConditions: false,
        title: "",
        content: "",
        privacyPolicy: "",
        includeDataProcessingAgreement: false,
      }
    );
  }, [activeWorkspace?.settings?.termsAndConditionsConfig]);

  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateWorkspaceSettings = api.workspace.update.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      if (!activeWorkspace) return;
      setActiveWorkspace({
        ...activeWorkspace,
        settings: {
          ...activeWorkspace?.settings,
          termsAndConditionsConfig: settings,
        },
      });
      // Reset success state after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    },
  });

  const isTermsAndConditionsEnabled = useMemo(
    () => settings?.enableTermsAndConditions || false,
    [settings?.enableTermsAndConditions]
  );

  const hasChanges = useMemo(
    () =>
      JSON.stringify(activeWorkspace?.settings?.termsAndConditionsConfig) !==
      JSON.stringify(settings),
    [activeWorkspace?.settings?.termsAndConditionsConfig, settings]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-4 items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold">
            {t("termsAndConditionsTitle", "Terms & Conditions")}
          </h2>
          <p className="text-sm text-foreground-700">
            {t(
              "termsAndConditionsDesc",
              "Configure the legal agreements that interviewees must accept before proceeding."
            )}
          </p>
        </div>
        <Button
          color="primary"
          size="sm"
          onPress={() => {
            if (!activeWorkspace?.id || !hasChanges) return;
            updateWorkspaceSettings.mutate({
              workspaceId: activeWorkspace?.id,
              settings: {
                ...activeWorkspace?.settings,
                termsAndConditionsConfig: settings,
              },
            });
          }}
          isDisabled={!hasChanges}
          isLoading={updateWorkspaceSettings.isPending}
          startContent={saveSuccess ? <CheckIcon className="w-4 h-4" /> : null}
        >
          {t("save", "Save")}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="w-full">
          <div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-row gap-2 items-center w-full">
                <div className="flex flex-col gap-2 w-full">
                  <Label htmlFor="enable-terms-and-conditions">
                    {t("requiresTermsAcceptance", "Requires Terms Acceptance")}
                  </Label>
                  <p className="text-sm text-foreground-700">
                    {t(
                      "requiresTermsAcceptanceDesc",
                      "When enabled, interviewees must accept your terms before starting the interview."
                    )}
                  </p>
                </div>
                <Switch
                  id="enable-terms-and-conditions"
                  isSelected={settings?.enableTermsAndConditions || false}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      enableTermsAndConditions: value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="terms-and-conditions-title"
                  className={`${
                    !isTermsAndConditionsEnabled ? "opacity-disabled" : ""
                  }`}
                >
                  {t(
                    "termsAndConditionsTitleLabel",
                    "Terms & Conditions Title"
                  )}
                </Label>
                <Input
                  variant="bordered"
                  isDisabled={!isTermsAndConditionsEnabled}
                  id="terms-and-conditions-title"
                  placeholder={t(
                    "termsAndConditionsTitlePlaceholder",
                    "Enter the terms and conditions title"
                  )}
                  value={settings?.title || ""}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      title: value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="terms-and-conditions-content"
                  className={`${
                    !isTermsAndConditionsEnabled ? "opacity-disabled" : ""
                  }`}
                >
                  {t(
                    "termsAndConditionsContentLabel",
                    "Terms & Conditions Content"
                  )}
                </Label>
                <Textarea
                  isDisabled={!isTermsAndConditionsEnabled}
                  id="terms-and-conditions-content"
                  variant="bordered"
                  color="primary"
                  placeholder={t(
                    "termsAndConditionsContentPlaceholder",
                    "Enter the terms and conditions content"
                  )}
                  className="resize-none"
                  value={settings?.content || ""}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      content: value,
                    }))
                  }
                  rows={10}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="terms-and-conditions-privacy-policy-url"
                  className={`${
                    !isTermsAndConditionsEnabled ? "opacity-disabled" : ""
                  }`}
                >
                  {t("privacyPolicyUrl", "Privacy Policy URL")}
                </Label>
                <Input
                  isDisabled={!isTermsAndConditionsEnabled}
                  id="terms-and-conditions-privacy-policy-url"
                  variant="bordered"
                  color="primary"
                  placeholder={t(
                    "privacyPolicyUrlPlaceholder",
                    "Enter the privacy policy URL"
                  )}
                  value={settings?.privacyPolicy || ""}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      privacyPolicy: value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-row gap-2 items-center">
                <Checkbox
                  id="terms-and-conditions-data-processing-agreement"
                  isDisabled={!isTermsAndConditionsEnabled}
                  classNames={{
                    label: "text-sm",
                  }}
                  isSelected={settings?.includeDataProcessingAgreement || false}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      includeDataProcessingAgreement: value,
                    }))
                  }
                >
                  {t(
                    "includeDataProcessingAgreement",
                    "Include Data Processing Agreement"
                  )}
                </Checkbox>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
