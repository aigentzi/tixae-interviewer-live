"use client";

import MainNavbar from "@root/components/ui/MainNavbar";
import { useGAuth } from "@root/app/hooks/guath.hook";
import { redirect, usePathname, useRouter } from "next/navigation";
import { UnifiedLoadingScreen } from "../components/UnifiedLoadingScreen";
import { useMemo } from "react";
import { useActiveWorkspace } from "../hooks/workspace.hook";
import { InterviewsOnboarding } from "./interviews/components/InterviewsOnboarding";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { gauthUser, gauthLoading } = useGAuth();
  const pathname = usePathname();
  const { activeWorkspace, loading } = useActiveWorkspace();

  // Check if the pathname starts with `/meeting/` followed by any characters
  const isInMeetingRoom = /^\/app\/meeting\/.+/.test(pathname ?? "");

  // Show loading spinner while checking authentication (except for meeting rooms)
  if (gauthLoading && !isInMeetingRoom) {
    return <UnifiedLoadingScreen stage="authenticating" />;
  }

  // If user is not authenticated and we're not in a meeting room, don't render the app layout
  if (!gauthUser && !isInMeetingRoom) {
    return <>{children}</>;
  }

  // If we're in a meeting room and user is not authenticated, render without navbar
  if (isInMeetingRoom && !gauthUser) {
    return (
      <div className="min-h-screen bg-background">
        <main className="w-full h-full p-5">{children}</main>
      </div>
    );
  }

  const isInSettings = useMemo(() => {
    return pathname?.startsWith("/app/settings");
  }, [pathname]);

  if (!activeWorkspace?.settings?.onboardingCompleted && !loading) {
    redirect("/");
  }

  // Normal authenticated layout with navbar
  return (
    <div className="min-h-screen bg-background font-poppins text-foreground">
      <MainNavbar />
      <main
        className={`${
          isInSettings ? "" : "container mx-auto max-w-7xl px-4 py-6"
        }`}
      >
        <div className="min-h-[calc(100vh-120px)]">{children}</div>
      </main>
    </div>
  );
}
