"use client";

import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { Interview } from "@root/shared/zod-schemas";
import { api } from "@root/trpc/react";
import InlineNotification from "@root/app/components/InlineNotification";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState, useEffect } from "react";
import { CreateEditInterviewModal } from "./components/EditInterviewModal";
import { InterviewsHeader } from "./components/InterviewsHeader";
import { SearchBar } from "./components/search-bar.component";
import { BulkActionsBar } from "./components/BulkActions";
import { InterviewsTable } from "./components/InterviewTable";
import { InterviewsPagination } from "./components/InterviewsPagination";
import { DeleteConfirmationModal } from "./components/DeleteInterviewModal";
import { LoadingState } from "./components/InterviewSpinner";
import { InterviewsOnboarding } from "./components/InterviewsOnboarding";
import { levelsText } from "@root/shared/zod-schemas";
import { useGAuth } from "@root/app/hooks/guath.hook";
import { useLocale } from "@root/app/providers/LocaleContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { LOADING_MESSAGES } from "../constants/dashboard";

const initialInterviewData: Partial<
  Omit<Interview, "id" | "createdAt" | "updatedAt">
> = {
  jobProfileId: "",
  level: "1",
  workspaceId: "",
  userId: "",
  paid: false,
  content: "",
  score: 0,
  feedback: "",
};

const ITEMS_PER_PAGE = 12;

const page = () => {
  const { activeWorkspace } = useActiveWorkspace();
  const { gauthUser } = useGAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicantId = searchParams?.get("applicantId");
  const [error, setError] = useState<string | null>(null);
  const [selectedInterview, setSelectedInterview] =
    useState<Partial<Interview> | null>(null);
  const [createInterviewModal, setCreateInterviewModal] = useState(false);
  const [viewInterviewModal, setViewInterviewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInterviews, setSelectedInterviews] = useState<string[]>([]);
  const [isSelectAllChecked, setIsSelectAllChecked] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showQrInterviews, setShowQrInterviews] = useState(false);

  // Queries and Mutations
  const {
    data: interviewsData,
    refetch: refetchInterviews,
    isLoading,
  } = api.interviews.getWorkspaceInterviews.useQuery({
    workspaceId: activeWorkspace?.id || "",
    limit: ITEMS_PER_PAGE,
  });

  const { data: jobProfilesData } = api.jobProfiles.getAll.useQuery({
    workspaceId: activeWorkspace?.id || "",
  });

  // Fetch applicant data if filtering by applicant
  const { data: applicantData } = api.applicants.get.useQuery(
    { id: applicantId! },
    { enabled: !!applicantId }
  );

  // Set search query to applicant's email when filtering by applicant
  useMemo(() => {
    if (applicantId && applicantData?.applicant?.email && !searchQuery) {
      setSearchQuery(applicantData.applicant.email);
    }
  }, [applicantId, applicantData?.applicant?.email, searchQuery]);

  const deleteInterviewMutation = api.interviews.delete.useMutation({
    onSuccess: () => {
      refetchInterviews();
      setError(null);
    },
    onError: (error) => {
      console.error(error);
      setError(error.message);
    },
  });

  const deleteAllMutation = api.interviews.deleteAll.useMutation({
    onSuccess: () => {
      refetchInterviews();
      setError(null);
    },
    onError: (error) => {
      console.error(error);
      setError(error.message);
    },
  });

  const createInterviewMutation = api.interviews.create.useMutation({
    onSuccess: (data) => {
      refetchInterviews();
      router.push(`/app/meeting/${data.interviews?.[0]?.id}`);
      setError(null);
    },
    onError: (error) => {
      console.error(error);
      setError(error.message);
    },
  });

  // Data processing
  const interviews =
    interviewsData?.interviews.nonQrInterviews.filter((i) => !i.isDemo) || [];
  const QRInterviews = interviewsData?.interviews.qrInterviews || [];
  const jobProfiles = jobProfilesData?.jobProfiles || [];

  const filteredInterviews = useMemo(() => {
    if (!interviews.length && !QRInterviews.length) return [];

    if (showQrInterviews) {
      return QRInterviews.filter((interview) => {
        if (!searchQuery) return true;

        const jobProfile = jobProfiles.find(
          (profile) => profile.id === interview.interviewData?.jobProfileId
        );
        const searchLower = searchQuery.toLowerCase();

        return (
          jobProfile?.name?.toLowerCase().includes(searchLower) ||
          (interview.interviewData?.level
            ? levelsText[parseInt(interview.interviewData?.level) - 1]
                ?.toLowerCase()
                .includes(searchLower)
            : "No Level".toLowerCase().includes(searchLower))
        );
      }).map((interview) => ({
        ...interview.interviewData,
        id: interview.id,
        workspaceId: interview.workspaceId,
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt,
        qrCode: interview.qrCode,
      }));
    }

    return interviews.filter((interview) => {
      if (!searchQuery) return true;

      const jobProfile = jobProfiles.find(
        (profile) => profile.id === interview.jobProfileId
      );
      const searchLower = searchQuery.toLowerCase();

      return (
        jobProfile?.name?.toLowerCase().includes(searchLower) ||
        interview.intervieweeEmail?.toLowerCase().includes(searchLower) ||
        (interview.level
          ? levelsText[parseInt(interview.level) - 1]
              ?.toLowerCase()
              .includes(searchLower)
          : "No Level".toLowerCase().includes(searchLower))
      );
    });
  }, [interviews, jobProfiles, searchQuery]);

  // Event handlers
  const handleSelectInterview = (interviewId: string, checked: boolean) => {
    if (checked) {
      setSelectedInterviews((prev) => [...prev, interviewId]);
    } else {
      setSelectedInterviews((prev) => prev.filter((id) => id !== interviewId));
      setIsSelectAllChecked(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredInterviews
        .map((interview) => interview.id || "")
        .filter(Boolean);
      setSelectedInterviews(allIds);
      setIsSelectAllChecked(true);
    } else {
      setSelectedInterviews([]);
      setIsSelectAllChecked(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedInterviews.length === 0) {
      setError("Please select interviews to delete");
      return;
    }
    setShowDeleteConfirmation(true);
  };

  const confirmBulkDelete = async () => {
    setShowDeleteConfirmation(false);
    setIsBulkDeleting(true);

    try {
      const result = await deleteAllMutation.mutateAsync({
        interviewIds: selectedInterviews,
      });

      setSelectedInterviews([]);
      setIsSelectAllChecked(false);

      if (result.failedCount > 0) {
        setError(`Failed to delete ${result.failedCount} interview(s)`);
      }
    } catch (error) {
      setError("Failed to delete interviews");
      console.error(error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedInterviews([]);
    setIsSelectAllChecked(false);
  };

  const deleteInterview = (interviewId: string) => {
    deleteInterviewMutation.mutate({
      workspaceId: activeWorkspace?.id || "",
      interviewId: interviewId || "",
    });
  };

  const editInterview = (interview: Interview) => {
    setSelectedInterview(interview);
    setCreateInterviewModal(true);
  };

  const viewInterview = (interview: Interview) => {
    setSelectedInterview(interview);
    setViewInterviewModal(true);
  };

  const goToInterview = async (interview: Interview) => {
    await createInterviewMutation.mutateAsync({
      workspaceId: activeWorkspace?.id || "",
      jobProfileId: interview.jobProfileId || "",
      level: interview.level || "1",
      duration: interview.duration || 10,
      startTime: interview.startTime || new Date(),
      paid: interview.paid || false,
      isDemo: true,
      intervieweeEmails: [gauthUser?.email || ""],
      analysisPrompt: interview.analysisPrompt || "",
      language: locale, // Pass user's selected language
    });
  };

  const goToResults = (interview: Interview) => {
    router.push(`/app/meeting/${interview.id}/result`);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCreateInterview = () => {
    setSelectedInterview(null);
    router.push("/");
  };

  // Update select all state when interviews change
  React.useEffect(() => {
    const totalVisible = filteredInterviews.length;
    const selectedVisible = selectedInterviews.filter((id) =>
      filteredInterviews.some((interview) => interview.id === id)
    ).length;

    setIsSelectAllChecked(totalVisible > 0 && selectedVisible === totalVisible);
  }, [selectedInterviews, filteredInterviews]);

  if (isLoading) {
    return <LoadingSpinner message={LOADING_MESSAGES.INTERVIEWS} />;
  }

  // Show onboarding only if onboarding is not completed
  if (!activeWorkspace?.settings?.onboardingCompleted) {
    return (
      <div className="flex flex-col gap-4">
        <InterviewsOnboarding onCreateInterview={handleCreateInterview} />

        <CreateEditInterviewModal
          isOpen={createInterviewModal}
          setIsOpen={setCreateInterviewModal}
          interview={
            selectedInterview || {
              ...initialInterviewData,
              workspaceId: activeWorkspace?.id || "",
              userId: activeWorkspace?.ownerId || "",
            }
          }
          setInterview={setSelectedInterview}
          refetchInterviews={refetchInterviews}
          jobProfiles={jobProfiles}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <InlineNotification
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}
      <InterviewsHeader
        totalCount={filteredInterviews.length}
        onCreateInterview={handleCreateInterview}
        showQrInterviews={showQrInterviews}
        setShowQrInterviews={setShowQrInterviews}
      />

      {/* Applicant Filter Indicator */}
      {applicantId && applicantData?.applicant && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-primary/20 rounded-full">
                <svg
                  className="w-4 h-4 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Filtering by Applicant: {applicantData.applicant.firstName}{" "}
                  {applicantData.applicant.lastName}
                </h3>
                <p className="text-sm text-default-600">
                  Showing interviews for {applicantData.applicant.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/app/interviews")}
              className="text-primary hover:text-primary-600 text-sm font-medium underline"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      <BulkActionsBar
        selectedCount={selectedInterviews.length}
        isDeleting={isBulkDeleting}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleBulkDelete}
      />
      <InterviewsTable
        interviews={filteredInterviews}
        jobProfiles={jobProfiles}
        selectedInterviews={selectedInterviews}
        isSelectAllChecked={isSelectAllChecked}
        onSelectInterview={handleSelectInterview}
        onSelectAll={handleSelectAll}
        onEditInterview={editInterview}
        onViewInterview={viewInterview}
        onDeleteInterview={deleteInterview}
        onGoToInterview={goToInterview}
        onGoToResults={goToResults}
        searchQuery={searchQuery}
        setSelectedInterviews={setSelectedInterviews}
        showQrInterviews={showQrInterviews}
      />

      <InterviewsPagination
        filteredCount={filteredInterviews.length}
        totalCount={interviews.length}
        searchQuery={searchQuery}
        itemsPerPage={ITEMS_PER_PAGE}
      />

      <CreateEditInterviewModal
        isOpen={createInterviewModal}
        key={selectedInterview?.id}
        setIsOpen={setCreateInterviewModal}
        interview={
          selectedInterview || {
            ...initialInterviewData,
            workspaceId: activeWorkspace?.id || "",
            userId: activeWorkspace?.ownerId || "",
          }
        }
        setInterview={setSelectedInterview}
        refetchInterviews={refetchInterviews}
        jobProfiles={jobProfiles}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={confirmBulkDelete}
        selectedCount={selectedInterviews.length}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
};

export default page;
