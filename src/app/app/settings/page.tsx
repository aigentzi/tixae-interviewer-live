"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import BrandingSettings from "./components/branding";
import InterviewSettings from "./components/interview-settings";
import CompanyContextSettings from "./components/company-context";
import { EmailSettings } from "./components/email-settings";
import WorkspaceManagement from "./components/workspace-management";
import HelpAndSupport from "./components/help-and-support";
import TermsAndConditions from "./components/terms-and-conditions";
import { useTranslations } from "@root/app/providers/TranslationContext";
import IntroductionVideos from "./components/introduction-videos";

const SearchParams = () => {
  const params = useSearchParams();
  const tab = params?.get("tab");

  const CurrentActiveComponent = useMemo(() => {
    // If no tab is specified, show default content for desktop
    // (mobile will handle this in layout.tsx)
    if (!tab) {
      return <CompanyContextSettings />;
    }

    switch (tab) {
      case "company-context":
        return <CompanyContextSettings />;
      case "branding":
        return <BrandingSettings />;
      case "interview-settings":
        return <InterviewSettings />;
      case "emails":
        return <EmailSettings />;
      case "workspace-management":
        return <WorkspaceManagement />;
      case "help-and-support":
        return <HelpAndSupport />;
      case "terms-and-conditions":
        return <TermsAndConditions />;
      case "introduction-videos":
        return <IntroductionVideos />;
      default:
        return <CompanyContextSettings />;
    }
  }, [tab]);

  return <div>{CurrentActiveComponent}</div>;
};

export default function SettingsPage() {
  const t = useTranslations("settings");

  return (
    <Suspense fallback={<div>{t("loading", "Loading...")}</div>}>
      <SearchParams />
    </Suspense>
  );
}
