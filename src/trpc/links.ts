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
        
        // Get the current user's token for auth
        try {
          const auth = getAuth(app);
          const user = auth.currentUser;
          
          if (user) {
            const token = await user.getIdToken();
            headers.append("Authorization", `Bearer ${token}`);
          }
        } catch (error) {
          console.error("Error getting auth token:", error);
        }
        
        return {
          ...Object.fromEntries(headers),
        };
      },
    }),
  ];
} 