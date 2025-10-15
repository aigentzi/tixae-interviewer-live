"use client";

import { QrModal } from "@root/app/components/QrCodeModal";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { JobProfile } from "@root/shared/zod-schemas";
import { api } from "@root/trpc/react";
import { useState } from "react";
import { ContentComponent } from "./components/content.component";
import { HeaderComponent } from "./components/header.component";
import { JobProfileComponent } from "./components/job-profile-modal";
import { ViewProfileModal } from "./components/view-profile-modal";
import { LOADING_MESSAGES } from "../constants/dashboard";
import { LoadingSpinner } from "../components/LoadingSpinner";

const page = () => {
  const { activeWorkspace } = useActiveWorkspace();
  const [selectedProfile, setSelectedProfile] =
    useState<Partial<JobProfile> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewProfileModal, setViewProfileModal] = useState(false);
  const [createProfileModal, setCreateProfileModal] = useState(false);
  const [qrCodeModal, setQrCodeModal] = useState(false);

  const {
    data: jobProfilesData,
    refetch: refetchJobProfiles,
    isLoading,
  } = api.jobProfiles.getAll.useQuery({
    workspaceId: activeWorkspace?.id || "",
  });

  const profileCount = jobProfilesData?.jobProfiles?.length || 0;

  if (isLoading) {
    return <LoadingSpinner message={LOADING_MESSAGES.JOB_PROFILES} />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Header */}
      <HeaderComponent
        profileCount={profileCount}
        setSelectedProfile={setSelectedProfile}
        setCreateProfileModal={setCreateProfileModal}
      />

      {/* Content */}
      <ContentComponent
        setSelectedProfile={setSelectedProfile}
        setCreateProfileModal={setCreateProfileModal}
        setViewProfileModal={setViewProfileModal}
        profileCount={profileCount}
        setError={setError}
        refetchJobProfiles={refetchJobProfiles}
        jobProfiles={jobProfilesData?.jobProfiles || []}
        setQrCodeModal={setQrCodeModal}
      />

      {/* Modals */}
      <JobProfileComponent
        key={selectedProfile?.id || "new"}
        profileData={
          selectedProfile || {
            description: "",
            levels: [],
            name: "",
            workspaceId: activeWorkspace?.id || "",
          }
        }
        refetchJobProfiles={refetchJobProfiles}
        setProfileData={setSelectedProfile}
        isOpen={createProfileModal}
        setIsOpen={setCreateProfileModal}
      />
      <ViewProfileModal
        isOpen={viewProfileModal}
        setIsOpen={setViewProfileModal}
        profileData={selectedProfile}
      />
      <QrModal
        isOpen={qrCodeModal}
        setIsOpen={setQrCodeModal}
        value={
          process.env.NEXT_PUBLIC_BASE_URL +
          "/app/interviews/new?profile=" +
          selectedProfile?.id
        }
      />
    </div>
  );
};

export default page;
