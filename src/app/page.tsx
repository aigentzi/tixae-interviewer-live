"use client";

import { MainInterface } from "./components/MainInterface";
import { InterviewsOnboarding } from "./app/interviews/components/InterviewsOnboarding";
import { useDashboardData } from "./app/hooks/useDashboardData";
import { useRouter } from "next/navigation";
import MainNavbar from "@root/components/ui/MainNavbar";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { useGAuth } from "@root/app/hooks/guath.hook";
import { UnifiedLoadingScreen } from "./components/UnifiedLoadingScreen";

const MOBILE_HEIGHT = "h-[calc(100vh-6rem)]";
const DESKTOP_HEIGHT = "md:h-[calc(100vh-5rem)]";

export default function HomePage() {
  const { hasInterviews, isLoading } = useDashboardData();
  const { activeWorkspace, loading: workspaceLoading } = useActiveWorkspace();
  const { gauthUser, gauthLoading } = useGAuth();
  const router = useRouter();

  const handleCreateInterview = () => {
    router.push("/app/interviews");
  };

  // Don't show anything if user is not authenticated
  if (gauthLoading || !gauthUser) {
    return (
      <UnifiedLoadingScreen
        stage="authenticating"
        message={gauthLoading ? undefined : "Redirecting to login..."}
      />
    );
  }

  if (isLoading || workspaceLoading) {
    return (
      <UnifiedLoadingScreen
        stage={workspaceLoading ? "workspace" : "dashboard"}
      />
    );
  }

  if (!activeWorkspace?.settings?.onboardingCompleted) {
    return (
      <div className="h-full flex flex-col bg-background">
        <MainNavbar hideNavigation />
        <div className="flex-1">
          <InterviewsOnboarding onCreateInterview={handleCreateInterview} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainInterface />
    </div>
  );
}
