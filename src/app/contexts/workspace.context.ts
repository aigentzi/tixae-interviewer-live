import { Workspace } from "@root/shared/zod-schemas";
import { api } from "@root/trpc/react";
import { UseTRPCMutationResult } from "@trpc/react-query/shared";
import { createContext } from "react";

export type WorkspaceContextType = {
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  loading: boolean;
  workspaces: Workspace[];
  refetchWorkspaces: () => void;
  createWorkspace: UseTRPCMutationResult<
    typeof api.workspace.create,
    unknown,
    unknown,
    unknown
  >;
};

export const WorkspaceContext = createContext<WorkspaceContextType>({
  activeWorkspace: null,
  setActiveWorkspace: () => {},
  loading: true,
  workspaces: [],
  refetchWorkspaces: () => {},
  createWorkspace: {} as UseTRPCMutationResult<
    typeof api.workspace.create,
    unknown,
    unknown,
    unknown
  >,
});
