"use client";

import { DashboardStats } from "./components/DashboardStats";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { QuickActions } from "./components/QuickActions";
import { RecentInterviews } from "./components/RecentInterviews";
import { useDashboardData } from "./hooks/useDashboardData";
import { LOADING_MESSAGES } from "./constants/dashboard";

const DashboardPage = () => {
  const { jobProfiles, interviews, stats, isLoading, activeWorkspace } =
    useDashboardData();

  if (isLoading || !activeWorkspace) {
    return <LoadingSpinner message={LOADING_MESSAGES.WORKSPACE} />;
  }

  return (
    <div className="max-h-[calc(100vh-70px)] p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardStats {...stats} />
        <QuickActions />
        <RecentInterviews interviews={interviews} jobProfiles={jobProfiles} />
      </div>
    </div>
  );
};

export default DashboardPage;
