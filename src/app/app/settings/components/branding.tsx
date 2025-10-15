"use client";

import { Input, Progress, Switch } from "@heroui/react";
import ColorPicker from "@root/app/components/ColorPicker";
import { useUploader } from "@root/app/hooks/uploader.hook";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { Button } from "@root/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Label } from "@root/components/ui/label";
import { cn } from "@root/lib/utils";
import {
  brandingConfigurationScheme,
  presetColors,
  WorkspaceSettingsColors,
} from "@root/shared/zod-schemas";
import { api } from "@root/trpc/react";
import {
  Building,
  CheckIcon,
  GlobeIcon,
  Loader2,
  Palette,
  RotateCcw,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import InlineNotification from "@root/app/components/InlineNotification";
import { z } from "zod";
import { useTranslations } from "@root/app/providers/TranslationContext";

export default function BrandingSettings() {
  const { activeWorkspace, setActiveWorkspace } = useActiveWorkspace();
  const t = useTranslations("settings");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const updateWorkspaceSettings = api.workspace.update.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      if (!activeWorkspace) return;
      setActiveWorkspace({
        ...activeWorkspace,
        settings: {
          ...activeWorkspace?.settings,
          brandingConfig: {
            ...activeWorkspace?.settings?.brandingConfig,
            customBranding: useClientBranding,
            name: companyName,
            url: websiteUrl,
            logo: logo,
            useStyleFromUrl: useStyleFromUrl,
            themeColor: colorScheme,
          },
        },
      });
      // Reset success state after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    },
  });
  const [importingBranding, setImportingBranding] = useState(false);

  // Local state for form inputs
  const [useClientBranding, setUseClientBranding] = useState(
    activeWorkspace?.settings?.brandingConfig?.customBranding || false
  );
  const [companyName, setCompanyName] = useState(
    activeWorkspace?.settings?.brandingConfig?.name || ""
  );
  const [websiteUrl, setWebsiteUrl] = useState(
    activeWorkspace?.settings?.brandingConfig?.url || ""
  );
  const [logo, setLogo] = useState<string | undefined>(
    activeWorkspace?.settings?.brandingConfig?.logo || undefined
  );
  const [colorScheme, setColorScheme] =
    useState<WorkspaceSettingsColors | null>(
      (activeWorkspace?.settings?.brandingConfig
        ?.themeColor as WorkspaceSettingsColors) || null
    );
  const [useStyleFromUrl, setUseStyleFromUrl] = useState(
    activeWorkspace?.settings?.brandingConfig?.useStyleFromUrl || false
  );

  const { mutateAsync: useBrandingFromUrl } =
    api.workspace.useBrandingFromUrl.useMutation({
      onError: (error) => {
        setNotification({ type: "error", message: error.message });
      },
      onSuccess: (data) => {
        setCompanyName(data.brandingConfig?.name || "");
        setLogo(data.brandingConfig?.logo || undefined);
        setColorScheme(data.brandingConfig?.themeColor || presetColors["blue"]);
        setWebsiteUrl(data.brandingConfig?.url || "");
        setUseStyleFromUrl(true);
      },
    });

  const { getRootProps, getInputProps, uploading, uploadProgress } =
    useUploader("branding-logos", {
      onSuccess: (url: string, file?: File) => {
        setLogo(url);
      },
      accept: {
        "image/*": [".png", ".jpg", ".jpeg"],
      },
      maxSize: 10 * 1024 * 1024,
      maxFiles: 1,
      directUpload: true,
    });

  // Keep local state synchronized with active workspace
  useEffect(() => {
    if (activeWorkspace?.settings?.brandingConfig) {
      setColorScheme(
        activeWorkspace.settings.brandingConfig
          .themeColor as WorkspaceSettingsColors
      );
      setUseClientBranding(
        activeWorkspace.settings.brandingConfig.customBranding || false
      );
      setCompanyName(activeWorkspace.settings.brandingConfig.name || "");
      setWebsiteUrl(activeWorkspace.settings.brandingConfig.url || "");
      setLogo(activeWorkspace.settings.brandingConfig.logo || undefined);
      setUseStyleFromUrl(
        activeWorkspace.settings.brandingConfig.useStyleFromUrl || false
      );
    }
  }, [activeWorkspace?.settings?.brandingConfig]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    const currentConfig = activeWorkspace?.settings?.brandingConfig;

    // If no config exists, check if any field has non-default values
    if (!currentConfig) {
      return (
        useClientBranding !== false ||
        companyName !== "" ||
        websiteUrl !== "" ||
        logo !== undefined ||
        useStyleFromUrl !== false ||
        colorScheme !== null
      );
    }

    // Compare current values with saved config
    const savedCustomBranding = currentConfig.customBranding ?? false;
    const savedName = currentConfig.name ?? "";
    const savedUrl = currentConfig.url ?? "";
    const savedLogo = currentConfig.logo ?? undefined;
    const savedUseStyleFromUrl = currentConfig.useStyleFromUrl ?? false;
    const savedThemeColor = currentConfig.themeColor ?? null;

    // Deep comparison for color scheme
    const colorSchemeChanged =
      JSON.stringify(savedThemeColor) !== JSON.stringify(colorScheme);

    return (
      savedCustomBranding !== useClientBranding ||
      savedName !== companyName ||
      savedUrl !== websiteUrl ||
      savedLogo !== logo ||
      savedUseStyleFromUrl !== useStyleFromUrl ||
      colorSchemeChanged
    );
  }, [
    activeWorkspace?.settings?.brandingConfig,
    useClientBranding,
    companyName,
    websiteUrl,
    logo,
    useStyleFromUrl,
    colorScheme,
  ]);

  const updateBrandingThemeColorSettings = (
    key: keyof WorkspaceSettingsColors,
    value: string | undefined
  ) => {
    setColorScheme((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveAllChanges = () => {
    if (!activeWorkspace?.id || !hasChanges) {
      return;
    }

    updateWorkspaceSettings.mutate({
      workspaceId: activeWorkspace.id,
      settings: {
        ...activeWorkspace.settings,
        brandingConfig: {
          ...activeWorkspace.settings?.brandingConfig,
          customBranding: useClientBranding,
          name: companyName,
          url: websiteUrl,
          logo: logo,
          useStyleFromUrl: useStyleFromUrl,
          themeColor: colorScheme,
        },
      },
    });
  };

  const resetAllChanges = () => {
    const currentConfig = activeWorkspace?.settings?.brandingConfig;
    if (currentConfig) {
      setUseClientBranding(currentConfig.customBranding || false);
      setCompanyName(currentConfig.name || "");
      setWebsiteUrl(currentConfig.url || "");
      setLogo(currentConfig.logo || undefined);
      setUseStyleFromUrl(currentConfig.useStyleFromUrl || false);
      setColorScheme(
        (currentConfig.themeColor as WorkspaceSettingsColors) || null
      );
    } else {
      // Reset to default values if no config exists
      setUseClientBranding(false);
      setCompanyName("");
      setWebsiteUrl("");
      setLogo(undefined);
      setUseStyleFromUrl(false);
      setColorScheme(null);
    }
  };

  const updateWorkspaceSiteUrl = async (checked: boolean, siteUrl: string) => {
    if (!activeWorkspace?.id) {
      return;
    }
    setImportingBranding(true);
    if (checked) {
      if (!siteUrl) {
        setNotification({
          type: "error",
          message: t(
            "pleaseEnterWebsiteUrl",
            "Please enter a website URL to use branding from URL"
          ),
        });
        return;
      }
      const data = await useBrandingFromUrl({
        workspaceId: activeWorkspace?.id,
        url: siteUrl,
      });
      if (data.success) {
        setCompanyName(data.brandingConfig?.name || "");
        setLogo(data.brandingConfig?.logo || undefined);
        setColorScheme(data.brandingConfig?.themeColor || presetColors["blue"]);
        setWebsiteUrl(data.brandingConfig?.url || siteUrl);
        setUseStyleFromUrl(true);
        setNotification({
          type: "success",
          message: t(
            "brandingUpdatedFromUrl",
            "Branding updated from URL successfully!"
          ),
        });
        setImportingBranding(false);
      } else {
        setNotification({
          type: "error",
          message:
            data.error ||
            t("errorUsingBrandingFromUrl", "Error using branding from URL"),
        });
        setImportingBranding(false);
      }
    } else {
      setUseStyleFromUrl(false);
      setImportingBranding(false);
    }
  };

  return (
    <div className="flex flex-col">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="flex flex-row gap-4 items-center justify-between">
        <div className="flex flex-col ">
          <h1 className="text-2xl font-bold">
            {t("clientBrandingOptions", "Client Branding Options")}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t(
              "clientBrandingDesc",
              "Customize the interview experience to match your brand or use our default options."
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="bordered"
            size="sm"
            onPress={resetAllChanges}
            isDisabled={!hasChanges}
            startContent={<RotateCcw className="w-4 h-4" />}
          >
            {t("undoChanges", "Undo Changes")}
          </Button>
          <Button
            color="primary"
            size="sm"
            onPress={saveAllChanges}
            isLoading={updateWorkspaceSettings.isPending}
            isDisabled={!hasChanges}
            startContent={
              saveSuccess ? <CheckIcon className="w-4 h-4" /> : null
            }
          >
            {t("save", "Save")}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div
          onClick={() => setUseClientBranding(true)}
          className={cn(
            "flex flex-row gap-2 items-center justify-start w-full border border-default-300/50 p-4 rounded-lg cursor-pointer",
            useClientBranding
              ? "border-primary-100 bg-primary/10"
              : "bg-content3/50 border-default-300/50"
          )}
        >
          <Building
            size={50}
            className={cn(
              "text-content3-foreground bg-content3-foreground/50 p-3 rounded-full",
              useClientBranding
                ? "bg-primary/30 text-primary/80"
                : "bg-content3-foreground/50"
            )}
          />
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-bold">
              {t("customBrandingEnabled", "Custom Branding Enabled")}
            </h4>
            <p className="text-sm text-foreground-600">
              {t(
                "customBrandingEnabledDesc",
                "Upload your logo and customize colors."
              )}
            </p>
          </div>
        </div>
        <div
          onClick={() => setUseClientBranding(false)}
          className={cn(
            "flex flex-row gap-2 items-center justify-start w-full border border-default-300/50 p-4 rounded-lg cursor-pointer",
            !useClientBranding
              ? "border-primary-100 bg-primary/10"
              : "bg-content3/50 border-default-300/50"
          )}
        >
          <Palette
            size={50}
            className={cn(
              "text-content3-foreground p-3 rounded-full bg-content3-foreground/50",
              !useClientBranding
                ? "bg-primary/30 text-primary/80"
                : "bg-content3-foreground/50"
            )}
          />
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-bold">
              {t("defaultBranding", "Default Branding")}
            </h4>
            <p className="text-sm text-foreground-600">
              {t(
                "defaultBrandingDesc",
                "Use our Professional interview interface."
              )}
            </p>
          </div>
        </div>
      </div>
      {useClientBranding && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card shadow="none" className="w-full">
            <CardHeader>
              <CardTitle>{t("colorScheme", "Color Scheme")}</CardTitle>
              <CardDescription>
                {t(
                  "colorSchemeDesc",
                  "Customize the color scheme of your application."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Label className="text-foreground-600">
                  {t("primaryColor", "Primary Color")}
                </Label>
                <ColorPicker
                  id="primary-color"
                  value={colorScheme?.primary ?? "#000000"}
                  onChange={(value) =>
                    updateBrandingThemeColorSettings("primary", value)
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-foreground-600">
                  {t("secondaryColor", "Secondary Color")}
                </Label>
                <ColorPicker
                  id="secondary-color"
                  value={colorScheme?.secondary ?? "#000000"}
                  onChange={(value) =>
                    updateBrandingThemeColorSettings("secondary", value)
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-foreground-600">
                  {t("defaultColor", "Default Color")}
                </Label>
                <ColorPicker
                  id="default-color"
                  value={colorScheme?.default ?? "#000000"}
                  onChange={(value) =>
                    updateBrandingThemeColorSettings("default", value)
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-foreground-600">
                  {t("warningColor", "Warning Color")}
                </Label>
                <ColorPicker
                  id="warning-color"
                  value={colorScheme?.warning ?? "#000000"}
                  onChange={(value) =>
                    updateBrandingThemeColorSettings("warning", value)
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-foreground-600">
                  {t("successColor", "Success Color")}
                </Label>
                <ColorPicker
                  id="success-color"
                  value={colorScheme?.success ?? "#000000"}
                  onChange={(value) =>
                    updateBrandingThemeColorSettings("success", value)
                  }
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-foreground-600">
                  {t("dangerColor", "Danger Color")}
                </Label>
                <ColorPicker
                  id="danger-color"
                  value={colorScheme?.danger ?? "#000000"}
                  onChange={(value) =>
                    updateBrandingThemeColorSettings("danger", value)
                  }
                />
              </div>
            </CardContent>
          </Card>
          <Card shadow="none" className="w-full">
            <CardHeader>
              <CardTitle>{t("logoAndBranding", "Logo & Branding")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-row gap-2 items-center justify-between">
                  <Label className="text-foreground-600">
                    {t("useClientBranding", "Use Client Branding")}
                  </Label>
                  <Switch
                    isSelected={useClientBranding}
                    onValueChange={setUseClientBranding}
                  />
                </div>
                <p className="text-sm text-foreground-600 tracking-wider">
                  {t(
                    "useClientBrandingDesc",
                    "When enabled, your logo and colors will be used throughout the interview process."
                  )}
                </p>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <div className="w-[100px] h-[100px] rounded-sm overflow-hidden">
                  <img
                    src={logo || "https://placehold.co/100x100"}
                    alt={t("logoAlt", "Logo")}
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex flex-col gap-2 items-center">
                  {logo && (
                    <Button
                      variant="bordered"
                      className="w-full flex flex-row gap-2 items-center justify-center border-none bg-primary/10 text-primary/80 hover:bg-primary/20 hover:text-primary/90"
                      onPress={() => {
                        setLogo(undefined);
                      }}
                    >
                      <TrashIcon className="w-4 h-4" />
                      {t("removeLogo", "Remove Logo")}
                    </Button>
                  )}
                  <div className="flex flex-col gap-3" {...getRootProps()}>
                    {uploading && (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-foreground-600 tracking-wider">
                          {t("uploading", "Uploading...")}
                        </p>
                        <Progress
                          aria-label="Upload Progress"
                          color="primary"
                          value={uploadProgress}
                        />
                      </div>
                    )}
                    <Button
                      variant="bordered"
                      className="w-full flex flex-row gap-2 items-center justify-center border-none bg-primary/10 text-primary/80 hover:bg-primary/20 hover:text-primary/90"
                      onPress={() => {
                        const fileInput = document.getElementById(
                          "logo-upload"
                        ) as HTMLInputElement;
                        fileInput?.click();
                      }}
                    >
                      <UploadIcon className="w-4 h-4" />
                      {t("uploadLogo", "Upload Logo")}
                    </Button>
                    <p className="text-sm text-foreground-600 tracking-wider">
                      {t(
                        "logoRecommendedSize",
                        "Recommended size: 200x60px, PNG or SVG."
                      )}
                    </p>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      {...getInputProps()}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-foreground-600">
                  {t("companyName", "Company Name")}
                </Label>
                <Input
                  variant="bordered"
                  color="primary"
                  value={companyName}
                  className="w-full"
                  onValueChange={setCompanyName}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-foreground-600">
                  {t("websiteUrl", "Website URL")}
                </Label>
                <div className="relative flex flex-row gap-2 items-center">
                  <Input
                    value={websiteUrl}
                    radius="none"
                    startContent={
                      <div className="rounded-l-md flex items-center justify-center h-full py-1 px-3 bg-primary text-primary/80">
                        <span className="text-sm text-white">https://</span>
                      </div>
                    }
                    endContent={
                      <Button
                        variant="bordered"
                        className="rounded-l-none absolute right-0 bg-primary/10 text-primary/80 hover:bg-primary/20 hover:text-primary/90"
                        onPress={() => updateWorkspaceSiteUrl(true, websiteUrl)}
                        isDisabled={
                          !websiteUrl ||
                          websiteUrl.length === 0 ||
                          importingBranding
                        }
                      >
                        {importingBranding ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <GlobeIcon className="w-4 h-4" />
                        )}
                        {importingBranding
                          ? t("importing", "Importing...")
                          : t("importBranding", "Import Branding")}
                      </Button>
                    }
                    className="w-full"
                    classNames={{
                      inputWrapper: "px-0!",
                    }}
                    onValueChange={setWebsiteUrl}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
