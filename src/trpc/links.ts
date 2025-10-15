"use client";

import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { getAuth } from "firebase/auth";
import { app } from "@root/app/firebase/clientFirebaseInit";

export function links() {
  return [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        const headers = new Headers();
        
        // Get the current user's token for auth with better error handling
        try {
          const auth = getAuth(app);
          const user = auth.currentUser;
          
          if (user) {
            // Force refresh the token to avoid expired token issues
            const token = await user.getIdToken(true);
            if (token) {
              headers.append("Authorization", `Bearer ${token}`);
              console.log("[tRPC] Auth token added to request");
            }
          } else {
            console.warn("[tRPC] No authenticated user found");
          }
        } catch (error) {
          console.error("[tRPC] Error getting auth token:", error);
          // Don't add authorization header if there's an error
        }
        
        return {
          ...Object.fromEntries(headers),
        };
      },
    }),
  ];
}
