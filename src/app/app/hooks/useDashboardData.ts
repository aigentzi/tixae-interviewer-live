import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { api } from "@root/trpc/react";
import { useMemo } from "react";

export const useDashboardData = () => {
  const { activeWorkspace } = useActiveWorkspace();

  const { data: jobProfilesData, isLoading: jobProfilesLoading } =
    api.jobProfiles.getAll.useQuery(
      {
        workspaceId: activeWorkspace?.id || "",
      },
      {
        enabled: !!activeWorkspace?.id,
      },
    );

  const { data: interviewsData, isLoading: interviewsLoading } =
    api.interviews.getWorkspaceInterviews.useQuery(
      {
        workspaceId: activeWorkspace?.id || "",
      },
      {
        enabled: !!activeWorkspace?.id,
      },
    );

  const stats = useMemo(() => {
    const jobProfilesCount = jobProfilesData?.jobProfiles?.length || 0;
    const totalInterviews =
      interviewsData?.interviews.nonQrInterviews.length || 0;

    const monthlyInterviews =
      interviewsData?.interviews.nonQrInterviews?.filter((interview) => {
        if (!interview.createdAt) return false;

        const interviewDate = new Date(interview.createdAt);
        const now = new Date();

        return (
          interviewDate.getMonth() === now.getMonth() &&
          interviewDate.getFullYear() === now.getFullYear()
        );
      }).length || 0;

    return {
      jobProfilesCount,
      totalInterviews,
      monthlyInterviews,
    };
  }, [jobProfilesData?.jobProfiles, interviewsData?.interviews]);

  const hasInterviews =
    interviewsData?.interviews.nonQrInterviews &&
    interviewsData.interviews.nonQrInterviews.length > 0;

  return {
    jobProfiles: jobProfilesData?.jobProfiles || [],
    interviews: interviewsData?.interviews.nonQrInterviews || [],
    stats,
    hasInterviews,
    isLoading: jobProfilesLoading || interviewsLoading,
    activeWorkspace,
  };
};
