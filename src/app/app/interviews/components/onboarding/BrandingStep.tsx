import { useMemo, useState } from "react";
import { Button } from "@root/components/ui/button";
import { Card, CardContent } from "@root/components/ui/card";
import { Input } from "@heroui/react";
import { Label } from "@root/components/ui/label";
import { PlusIcon, Globe, Loader2 } from "lucide-react";
import { api } from "@root/trpc/react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { WorkspaceSettingsColors } from "@root/shared/zod-schemas";
import ColorPicker from "@root/app/components/ColorPicker";
import { BUTTON_STYLES, CARD_STYLES, SECTION_STYLES } from "./constants";
import { useTranslations } from "@root/app/providers/TranslationContext";

interface ExtractedBranding {
  logo?: string;
  name?: string;
  colors?: WorkspaceSettingsColors;
  description?: string;
}

interface BrandingStepProps {
  onNext: () => void;
}

export const BrandingStep = ({ onNext }: BrandingStepProps) => {
  const { activeWorkspace, setActiveWorkspace } = useActiveWorkspace();
  const t = useTranslations("onboarding");
  const [companyDomain, setCompanyDomain] = useState("");
  const [isExtractingBranding, setIsExtractingBranding] = useState(false);
  const [extractedBranding, setExtractedBranding] =
    useState<ExtractedBranding | null>(null);
  const [brandingError, setBrandingError] = useState<string | null>(null);

  // Get current colors from workspace or use defaults
  const currentColors: WorkspaceSettingsColors = useMemo(() => {
    return (
      activeWorkspace?.settings?.brandingConfig?.themeColor ||
      extractedBranding?.colors || {
        primary: "#FF8C00",
        secondary: "#2563EB",
        default: "#1F2937",
        warning: "#F59E0B",
        success: "#10B981",
        danger: "#EF4444",
      }
    );
  }, [
    activeWorkspace?.settings?.brandingConfig?.themeColor,
    extractedBranding?.colors,
  ]);

  // Branding extraction mutation
  const useBrandingFromUrlMutation =
    api.workspace.useBrandingFromUrl.useMutation({
      onSuccess: (data) => {
        setIsExtractingBranding(false);

        if (data.success) {
          const hasValidBranding =
            data.brandingConfig?.logo ||
            data.brandingConfig?.name ||
            data.brandingConfig?.themeColor;

          if (hasValidBranding) {
            setExtractedBranding({
              logo: data.brandingConfig?.logo || undefined,
              name: data.brandingConfig?.name || undefined,
              colors: data.brandingConfig?.themeColor || undefined,
              description: "Extracted from website",
            });

            if (activeWorkspace) {
              setActiveWorkspace({
                ...activeWorkspace,
                settings: {
                  ...activeWorkspace.settings,
                  brandingConfig: {
                    ...activeWorkspace.settings?.brandingConfig,
                    themeColor: data.brandingConfig?.themeColor || undefined,
                    logo: data.brandingConfig?.logo || undefined,
                    name: data.brandingConfig?.name || undefined,
                    url: companyDomain,
                    customBranding: true,
                    useStyleFromUrl: true,
                  },
                },
              });
            }
            setBrandingError(null);
          } else {
            setBrandingError(
              t(
                "noBrandingElementsFound",
                "No branding elements found on this website. You can upload a logo manually.",
              ),
            );
          }
        } else {
          setBrandingError(
            t(
              "unableToExtractBranding",
              "Unable to extract branding from this domain. Please verify the URL or upload your logo manually.",
            ),
          );
        }
      },
      onError: () => {
        setIsExtractingBranding(false);
        setBrandingError(
          t(
            "unableToExtractBranding",
            "Unable to extract branding from this domain. Please verify the URL or upload your logo manually.",
          ),
        );
      },
    });

  // Update brand colors in workspace
  const updateBrandColor = (
    key: keyof WorkspaceSettingsColors,
    value: string,
  ) => {
    if (!activeWorkspace) return;

    const updatedColors = {
      ...currentColors,
      [key]: value,
    };

    setActiveWorkspace({
      ...activeWorkspace,
      settings: {
        ...activeWorkspace.settings,
        brandingConfig: {
          ...activeWorkspace.settings?.brandingConfig,
          themeColor: updatedColors,
          customBranding: true,
        },
      },
    });

    // Also update extracted branding for immediate UI feedback
    setExtractedBranding((prev) => ({
      ...prev,
      colors: updatedColors,
    }));
  };

  // Helper functions
  const validateDomain = (domain: string): boolean => {
    const urlPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return urlPattern.test(cleanDomain);
  };

  const getCompanyName = (): string => {
    return (
      extractedBranding?.name ||
      (companyDomain
        ? companyDomain.split(".")[0].charAt(0).toUpperCase() +
          companyDomain.split(".")[0].slice(1)
        : "Company Name")
    );
  };

  const getCompanyInitial = (): string => {
    return companyDomain ? companyDomain.charAt(0).toUpperCase() : "?";
  };

  const handleExtractBranding = () => {
    setBrandingError(null);

    if (!companyDomain.trim()) {
      setBrandingError(t("pleaseEnterDomain", "Please enter a company domain"));
      return;
    }

    if (!validateDomain(companyDomain)) {
      setBrandingError(
        t(
          "pleaseEnterValidDomain",
          "Please enter a valid domain (e.g., company.com)",
        ),
      );
      return;
    }

    if (!activeWorkspace?.id) {
      setBrandingError(t("noActiveWorkspace", "No active workspace found"));
      return;
    }

    setIsExtractingBranding(true);
    useBrandingFromUrlMutation.mutate({
      workspaceId: activeWorkspace.id,
      url: companyDomain.startsWith("http")
        ? companyDomain
        : `https://${companyDomain}`,
    });
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const logoUrl = event.target?.result as string;
      setExtractedBranding((prev) => ({ ...prev, logo: logoUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "none";
    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
    if (nextElement) nextElement.style.display = "flex";
  };

  const renderLogoSection = () => (
    <div className="space-y-3">
      <h5 className="text-sm font-medium text-gray-700">
        {t("companyLogo", "Company Logo")}
      </h5>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        {extractedBranding?.logo ? (
          <div className="w-24 h-24 mx-auto flex items-center justify-center">
            <img
              src={extractedBranding.logo}
              alt="Company Logo"
              className="max-w-full max-h-full object-contain"
              onError={handleLogoError}
            />
            <div
              className="w-24 h-24 rounded-lg flex items-center justify-center"
              style={{
                display: "none",
                backgroundColor: currentColors.primary || "#FF8C00",
              }}
            >
              <span className="text-white font-bold text-xl">
                {getCompanyInitial()}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="w-24 h-24 rounded-lg mx-auto flex items-center justify-center"
            style={{ backgroundColor: currentColors.primary || "#FF8C00" }}
          >
            <span className="text-white font-bold text-xl">
              {getCompanyInitial()}
            </span>
          </div>
        )}

        <div className="mt-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
            }}
            className="hidden"
            id="logo-upload"
          />
          <label
            htmlFor="logo-upload"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/15 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            {t("uploadLogo", "Upload Logo")}
          </label>
        </div>
      </div>
    </div>
  );

  const renderColorPalette = () => (
    <div className="space-y-4">
      <h5 className="text-sm font-medium text-gray-700">
        {t("brandColors", "Brand Colors")}
      </h5>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-gray-600">
              {t("primaryColor", "Primary Color")}
            </Label>
            <ColorPicker
              id="primary-color-onboarding"
              value={currentColors.primary || "#FF8C00"}
              onChange={(value) => updateBrandColor("primary", value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-gray-600">
              {t("secondaryColor", "Secondary Color")}
            </Label>
            <ColorPicker
              id="secondary-color-onboarding"
              value={currentColors.secondary || "#2563EB"}
              onChange={(value) => updateBrandColor("secondary", value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-gray-600">
              {t("defaultColor", "Default Color")}
            </Label>
            <ColorPicker
              id="default-color-onboarding"
              value={currentColors.default || "#1F2937"}
              onChange={(value) => updateBrandColor("default", value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-gray-600">
              {t("successColor", "Success Color")}
            </Label>
            <ColorPicker
              id="success-color-onboarding"
              value={currentColors.success || "#10B981"}
              onChange={(value) => updateBrandColor("success", value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-gray-600">
              {t("warningColor", "Warning Color")}
            </Label>
            <ColorPicker
              id="warning-color-onboarding"
              value={currentColors.warning || "#F59E0B"}
              onChange={(value) => updateBrandColor("warning", value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-gray-600">
              {t("dangerColor", "Danger Color")}
            </Label>
            <ColorPicker
              id="danger-color-onboarding"
              value={currentColors.danger || "#EF4444"}
              onChange={(value) => updateBrandColor("danger", value)}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {t(
          "brandColorsDesc",
          "Customize your brand colors to match your company's visual identity. These colors will be used throughout the interview interface.",
        )}
      </p>
    </div>
  );

  const renderCompanyInfo = () => (
    <div className="space-y-3">
      <h5 className="text-sm font-medium text-gray-700">
        {t("companyInformation", "Company Information")}
      </h5>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">{t("name", "Name:")}</span>
          <span className="text-sm font-medium text-gray-800">
            {getCompanyName()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">
            {t("industry", "Industry:")}
          </span>
          <span className="text-sm font-medium text-gray-800">
            {extractedBranding
              ? t("detectedFromWebsite", "Detected from website")
              : t("willBeDetected", "Will be detected")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500">
            {t("description", "Description:")}
          </span>
          <span className="text-sm font-medium text-gray-800">
            {extractedBranding?.description ||
              t("willBeExtracted", "Will be extracted")}
          </span>
        </div>
      </div>
    </div>
  );

  const renderInterviewPreview = () => (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h5 className="text-sm font-medium text-gray-700 mb-3">
        {t("interviewInterfacePreview", "Interview Interface Preview")}
      </h5>
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {extractedBranding?.logo ? (
              <div className="w-8 h-8 flex items-center justify-center">
                <img
                  src={extractedBranding.logo}
                  alt="Company Logo"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    (e.currentTarget
                      .nextElementSibling as HTMLElement)!.style.display =
                      "flex";
                  }}
                />
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    display: "none",
                    backgroundColor: currentColors.primary || "#FF8C00",
                  }}
                >
                  <span className="text-white font-bold text-sm">
                    {getCompanyInitial()}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: currentColors.primary || "#FF8C00",
                }}
              >
                <span className="text-white font-bold text-sm">
                  {getCompanyInitial()}
                </span>
              </div>
            )}
            <div>
              <h6 className="font-semibold text-gray-800">
                {getCompanyName()}
                {companyDomain ? " Interview" : ""}
              </h6>
              <p className="text-xs text-gray-500">
                {t("poweredByTixae", "Powered by Tixae")}
              </p>
            </div>
          </div>
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: currentColors.primary || "#FF8C00",
            }}
          />
        </div>
        <div className="space-y-2">
          <div className="w-full h-2 bg-gray-200 rounded" />
          <div className="w-3/4 h-2 bg-gray-200 rounded" />
          <div className="w-1/2 h-2 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={SECTION_STYLES}>
      <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
        {t("brandingHeader", "Personalize with your company's branding")}
      </h1>
      <p className="text-lg text-center text-gray-600 mb-12">
        {t(
          "brandingDesc",
          "We'll extract your company's logo, colors, and branding to customize your interview experience",
        )}
      </p>

      <Card className={CARD_STYLES}>
        <CardContent className="p-0">
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t("companyWebsite", "Company Website")}
            </label>
            <div className="flex gap-3">
              <Input
                value={companyDomain}
                onValueChange={(value) => setCompanyDomain(value)}
                color="primary"
                variant="bordered"
                placeholder={t(
                  "companyWebsitePlaceholder",
                  "Enter your company domain (e.g., company.com)",
                )}
              />
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl"
                onPress={handleExtractBranding}
                isDisabled={isExtractingBranding}
                isLoading={isExtractingBranding}
                startContent={<Globe size={32} />}
              >
                {t("extract", "Extract")}
              </Button>
            </div>

            {brandingError && (
              <div className="mt-3 text-sm text-primary bg-primary/10 border border-primary/30 rounded-lg p-3">
                {brandingError}
              </div>
            )}
          </div>

          <div className="mb-8 bg-gray-50 rounded-xl p-6">
            <h4 className="font-semibold text-gray-800 mb-4">
              {t("extractedBranding", "Extracted Branding")}
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {renderLogoSection()}
                {renderCompanyInfo()}
              </div>

              <div className="space-y-6">
                {renderColorPalette()}

                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-gray-700">
                    {t("typography", "Typography")}
                  </h5>
                  <div className="space-y-2">
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <p
                        className="text-lg font-bold text-gray-800"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {t("primaryFont", "Primary Font: Inter")}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <p
                        className="text-base text-gray-600"
                        style={{ fontFamily: "system-ui, sans-serif" }}
                      >
                        {t("secondaryFont", "Secondary Font: System UI")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {renderInterviewPreview()}
          </div>

          <div className="space-y-3">
            <Button
              className={BUTTON_STYLES.primary}
              onPress={() => {
                // Mark that we're using custom branding even if no colors were changed
                if (activeWorkspace) {
                  setActiveWorkspace({
                    ...activeWorkspace,
                    settings: {
                      ...activeWorkspace.settings,
                      brandingConfig: {
                        ...activeWorkspace.settings?.brandingConfig,
                        customBranding: true,
                        themeColor: currentColors,
                      },
                    },
                  });
                }
                onNext();
              }}
            >
              {t("continueWithBranding", "Continue with Branding")}
            </Button>
            <Button
              variant="bordered"
              className={BUTTON_STYLES.outline}
              onPress={onNext}
            >
              {t("skipBrandingSetup", "Skip Branding Setup")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
