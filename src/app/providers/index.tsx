"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { FirebaseAuthProvider } from "./FirebaseAuthContext";
import { TRPCProvider } from "./TRPCProvider";
import { WorkspaceProvider } from "./WorkspaceProvider";
import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";

function ProvidersWithWorkspace({ children }: { children: ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <TRPCProvider>
      <ThemeProvider>
        <HeroUIProvider navigate={router.push}>
          <FirebaseAuthProvider>
            <ProvidersWithWorkspace>{children}</ProvidersWithWorkspace>
          </FirebaseAuthProvider>
        </HeroUIProvider>
      </ThemeProvider>
    </TRPCProvider>
  );
}
