"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useGAuth } from "../hooks/guath.hook";
import { UnifiedLoadingScreen } from "./UnifiedLoadingScreen";
import { FullScreenLoader } from "./FullScreenLoader";

interface AuthWrapperProps {
  children: React.ReactNode;
}

function AuthWrapperComponent({ children }: AuthWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { gauthUser, gauthLoading } = useGAuth();
  const searchParams = useSearchParams();

  // Pages that don't require authentication
  const publicPaths = [
    "/login",
    "/app/interviews/new",
    "/app/kyc/mobile",
    "/pricing-test",
  ];
  const isPublicPath = publicPaths.some((path) => pathname?.startsWith(path));

  // Check if the pathname starts with `/meeting/` followed by any characters
  const isInMeetingRoom = /^\/app\/meeting\/.+/.test(pathname ?? "");

  // Client-side authentication check
  useEffect(() => {
    if (!gauthLoading && !gauthUser?.uid) {
      // User is not authenticated
      if (!isPublicPath && !isInMeetingRoom) {
        // Redirect to login for protected pages (not login or meeting rooms)
        const fullUrl =
          typeof window !== "undefined"
            ? window.location.pathname +
              window.location.search +
              window.location.hash
            : pathname || "/";
        const encodedUrl = encodeURIComponent(fullUrl);
        router.push("/login?redirect=" + encodedUrl);
      }
    } else if (gauthUser?.uid && pathname === "/login") {
      // User is authenticated and trying to access login page
      // Check if there's a redirect parameter
      const redirectParam = searchParams?.get("redirect");
      if (redirectParam) {
        try {
          const decodedRedirect = decodeURIComponent(redirectParam);
          // Ensure it's a relative URL (starts with /) and doesn't contain protocol
          if (
            decodedRedirect.startsWith("/") &&
            !decodedRedirect.includes("://")
          ) {
            router.push(decodedRedirect);
          } else {
            router.push("/");
          }
        } catch (error) {
          console.warn("Invalid redirect URL:", redirectParam);
          router.push("/");
        }
      } else {
        router.push("/");
      }
    }
  }, [
    gauthUser,
    gauthLoading,
    pathname,
    isPublicPath,
    isInMeetingRoom,
    router,
    searchParams,
  ]);

  // Show loading while checking auth (except for public paths and meeting rooms)
  if (gauthLoading && !isPublicPath && !isInMeetingRoom) {
    return <UnifiedLoadingScreen stage="authenticating" />;
  }

  // Just render children - let each page handle its own layout
  return <>{children}</>;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AuthWrapperComponent children={children} />
    </Suspense>
  );
}
