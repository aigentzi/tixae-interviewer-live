import { useContext } from "react";
import { WorkspaceContext } from "../contexts/workspace.context";

export const useActiveWorkspace = () => {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useActiveWorkspace must be used within a WorkspaceProvider"
    );
  }

  // Debug logging for workspace state (only in development)
  if (process.env.NODE_ENV === "development") {
    if (!context.activeWorkspace && !context.loading) {
      console.warn(
        "No active workspace found and not loading. This may indicate a workspace setup issue."
      );
    }
  }

  return context;
};
