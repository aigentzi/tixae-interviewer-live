"use client";
import type { Workspace } from "@root/shared/zod-schemas";
import React, { useEffect, useMemo, useState } from "react";

import { api } from "@root/trpc/react";
import useLocalStorage from "use-local-storage";
import { WorkspaceContext } from "../contexts/workspace.context";
import { useGAuth } from "../hooks/guath.hook";
import { UnifiedLoadingScreen } from "../components/UnifiedLoadingScreen";
import InlineNotification from "@root/app/components/InlineNotification";

export function WorkspaceProvider(props: { children: React.ReactNode }) {
  const { gauthUser } = useGAuth();
  const [activeWorkspaceState, setActiveWorkspaceState] =
    useState<Workspace | null>(null);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [hasAttemptedAutoCreate, setHasAttemptedAutoCreate] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  // Use localStorage only on the client side
  const [storedWorkspace, setStoredWorkspace] =
    useLocalStorage<Workspace | null>("activeWorkspace", null);

  const {
    data: workspacesData,
    isLoading,
    refetch: refetchWorkspaces,
  } = api.workspace.getByUserId.useQuery(undefined, {
    enabled: !!gauthUser,
  });

  const createWorkspace = api.workspace.create.useMutation({
    onSuccess: (newWorkspace) => {
      setActiveWorkspace(newWorkspace);
      setIsCreatingWorkspace(false);
      refetchWorkspaces(); // Refresh the workspace list
      setNotification({
        type: "success",
        message: "Welcome! Your workspace is ready.",
      });
    },
    onError: (error) => {
      setIsCreatingWorkspace(false);

      // Don't retry on conflict errors (workspace already exists)
      // Only retry on genuine errors like network issues
      if (error.data?.code === "CONFLICT") {
        console.log("Workspace already exists, not retrying");
        // Keep hasAttemptedAutoCreate as true to prevent retries
        setNotification({
          type: "error",
          message: "Workspace already exists. Please try a different name.",
        });
      } else {
        // Only reset attempt flag for genuinely retryable errors
        setHasAttemptedAutoCreate(false);
        console.error("Failed to create workspace:", error);
        setNotification({
          type: "error",
          message: `Failed to create workspace: ${error.message}`,
        });
      }
    },
  });

  const defaultWorkspace = useMemo(() => {
    return (
      workspacesData?.workspaces.find((workspace) => {
        if (storedWorkspace?.id) {
          return workspace.id === storedWorkspace.id;
        }
        return workspace.id === gauthUser?.uid;
      }) || null
    );
  }, [workspacesData, storedWorkspace, gauthUser]);

  const selectedWorkspace = useMemo(() => {
    if (workspacesData?.workspaces.length) {
      return (
        workspacesData.workspaces.find((workspace) => {
          if (storedWorkspace?.id) {
            return workspace.id === storedWorkspace.id;
          }
          return workspace.id === gauthUser?.uid;
        }) || workspacesData.workspaces[0]
      );
    }
    return defaultWorkspace;
  }, [workspacesData, storedWorkspace?.id, gauthUser?.uid]);

  const userHasNoWorkspaces = useMemo(() => {
    return !workspacesData?.workspaces.length && !isLoading && gauthUser?.uid;
  }, [workspacesData?.workspaces.length, isLoading, gauthUser?.uid]);

  // Auto-create workspace for users who don't have any (with duplicate prevention)
  useEffect(() => {
    if (
      userHasNoWorkspaces &&
      !isCreatingWorkspace &&
      !createWorkspace.isPending &&
      !hasAttemptedAutoCreate && // Prevent multiple attempts
      gauthUser?.uid && // Ensure user is loaded
      gauthUser?.displayName // Ensure displayName is loaded to prevent duplicates
    ) {
      console.log("User has no workspaces, creating default workspace...");

      const workspaceName = `${gauthUser.displayName}'s Workspace`;

      // Additional check: verify this workspace name doesn't already exist
      // This prevents duplicates if the user somehow has workspaces with this name
      const hasWorkspaceWithSameName = workspacesData?.workspaces.some(
        (workspace) => workspace.name === workspaceName,
      );

      if (hasWorkspaceWithSameName) {
        console.log(
          "Workspace with same name already exists, skipping creation",
        );
        setHasAttemptedAutoCreate(true);
        return;
      }

      setIsCreatingWorkspace(true);
      setHasAttemptedAutoCreate(true);

      createWorkspace.mutate({
        name: workspaceName,
        ownerId: gauthUser.uid,
      });
    }
  }, [
    userHasNoWorkspaces,
    gauthUser?.uid,
    gauthUser?.displayName,
    workspacesData?.workspaces,
    isCreatingWorkspace,
    createWorkspace.isPending,
    hasAttemptedAutoCreate,
    createWorkspace.isError, // Add this to prevent retries after errors
  ]);

  useEffect(() => {
    if (selectedWorkspace?.id && !isCreatingWorkspace) {
      setActiveWorkspace(selectedWorkspace);
    }
  }, [selectedWorkspace?.id, gauthUser?.uid, isCreatingWorkspace]);

  const setActiveWorkspace = (workspace: Workspace | null) => {
    setActiveWorkspaceState(workspace);
    setStoredWorkspace(workspace);
  };

  const contextValue = {
    activeWorkspace: activeWorkspaceState,
    setActiveWorkspace,
    loading:
      isLoading ||
      isCreatingWorkspace ||
      (workspacesData &&
        !activeWorkspaceState &&
        workspacesData.workspaces.length > 0),
    workspaces: workspacesData?.workspaces || [],
    refetchWorkspaces,
    createWorkspace,
  };

  // Show loading screen while creating workspace
  if (contextValue.loading) {
    return <UnifiedLoadingScreen stage="workspace" />;
  }

  return (
    <WorkspaceContext.Provider value={contextValue as any}>
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      {props.children}
    </WorkspaceContext.Provider>
  );
}
