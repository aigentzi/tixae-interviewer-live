"use client";

import { Interview, RoomMessage } from "@root/shared/zod-schemas";
import { RoomContext } from "../context/room.context";
import { useEffect, useState } from "react";
import { api } from "@root/trpc/react";
import { Loader2 } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { useGAuth } from "@root/app/hooks/guath.hook";
import Link from "next/link";
import { FullScreenLoader } from "@root/app/components/FullScreenLoader";

export const RoomProvider: React.FC<{
  children: React.ReactNode;
  roomName: string;
}> = ({ children, roomName }) => {
  const [roomNameState, setRoomName] = useState<string | null>(roomName);
  const [username, setUsername] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [stripeVerificationSessionId, setStripeVerificationSessionId] =
    useState<string>("");
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [rescheduleNeeded, setRescheduleNeeded] = useState<boolean>(false);
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const { activeWorkspace, loading: isWorkspaceLoading } = useActiveWorkspace();
  const {
    data: interviewData,
    isLoading: interviewLoading,
    error: interviewError,
    refetch: refetchInterview,
  } = api.interviews.getById.useQuery(
    {
      interviewId: roomName || "",
    },
    {
      enabled: !!roomName,
    },
  );

  const { data: jobProfile } = api.jobProfiles.getById.useQuery(
    {
      jobProfileId: interview?.jobProfileId || "",
    },
    {
      enabled: !!interview?.jobProfileId,
    },
  );

  const {
    data: workspaceSettingsData,
    isLoading: workspaceSettingsLoading,
    error: workspaceSettingsError,
  } = api.workspace.getWorkspaceSettingsById.useQuery(
    { workspaceId: interview?.workspaceId || "" },
    { enabled: !!interview?.workspaceId },
  );

  const { gauthUser } = useGAuth();

  const validateRoomMutation = api.daily.validateRoom.useMutation({
    onSuccess: (data) => {
      setError(null);
      // Check if this is a reschedule needed response
      if ("rescheduleNeeded" in data && data.rescheduleNeeded) {
        setRescheduleNeeded(true);
        setIsRescheduling(true);
      }
    },
    onError: (error) => {
      if (interview?.startTime) {
        setError(error.message);
      }
    },
  });

  const createRoomTokenMutation = api.daily.getRoomToken.useMutation({
    onSuccess: (data) => {
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const validateRoom = (roomName: string) => {
    validateRoomMutation.mutate({ roomName });
  };

  const createRoomToken = (roomName: string, username: string) => {
    createRoomTokenMutation.mutate({
      room_name: roomName,
      user_name: username,
    });
  };

  const resetSteps = () => {
    if (typeof window !== "undefined" && interview?.id) {
      localStorage.removeItem(`premeeting_step_${interview.id}`);
    }
    setRescheduleNeeded(false);
    setIsRescheduling(false);
  };

  // Validate interview error
  useEffect(() => {
    if (interviewError) {
      setError(interviewError.message);
    }
  }, [interviewError]);

  useEffect(() => {
    if (workspaceSettingsError) {
      setError(workspaceSettingsError.message);
    }
  }, [workspaceSettingsError]);

  // Set interview data
  useEffect(() => {
    if (interviewData) {
      setInterview(interviewData);
    }
  }, [interviewData]);

  // Validate room name is not empty
  useEffect(() => {
    if (roomName) {
      setRoomName(roomName);
    } else {
      setError("Room name is required");
    }
  }, [roomName]);

  useEffect(() => {
    if (roomName && interview) {
      validateRoom(roomName);
    }
  }, [roomName, interview]);

  useEffect(() => {
    console.log("Interview", interview);
    console.log("Active Workspace", activeWorkspace);

    if (interview?.content) {
      setRoomMessages(JSON.parse(interview?.content) as RoomMessage[]);
    }

    if (
      interview?.workspaceId &&
      interview?.workspaceId === activeWorkspace?.id
    ) {
      setIsOwner(true);
      setUsername(interview?.intervieweeEmail || "Owner");
    }

    if (interview?.intervieweeEmail && gauthUser?.email) {
      if (interview?.intervieweeEmail === gauthUser?.email) {
        setIsOwner(false);
        setUsername(interview?.intervieweeEmail || "Interviewee");
        console.log("I am the interviewee");
      }
    }

    // Fallback: If no username is set and we have an interviewee email, use it
    if (!username && interview?.intervieweeEmail && !isOwner) {
      console.log("Setting fallback username for interviewee");
      setUsername(interview.intervieweeEmail);
    }
  }, [interview, activeWorkspace, gauthUser?.email, username, isOwner]);

  if (error) {
    return (
      <div className="flex flex-col items-center min-h-screen justify-center w-full h-full">
        <div className="bg-red-500/70 p-5 rounded-lg shadow-lg border border-red-500/20">
          <div className="flex flex-col gap-4 items-center">
            <span>
              <AlertCircle className="w-10 h-10 text-foreground/80" />
            </span>
            <div className="text-foreground">
              <div
                className="text-center"
                dangerouslySetInnerHTML={{ __html: error }}
              />
              <div className="text-center text-xs mt-3">
                If this keeps happening, please contact{" "}
                <a
                  href="mailto:interviews-error@tixae.ai"
                  className="underline hover:no-underline"
                >
                  interviews-error@tixae.ai
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show the full-screen loader ONLY during the initial load (when interview data hasn’t arrived yet).
  const isInitialLoading =
    (interviewLoading || workspaceSettingsLoading || isWorkspaceLoading) &&
    !interview;

  if (isInitialLoading) {
    return <FullScreenLoader />;
  }

  return (
    <RoomContext.Provider
      value={{
        roomName: roomNameState,
        setRoomName,
        username,
        setUsername,
        error,
        setError,
        interview,
        setInterview,
        refetchInterview,
        validateRoom,
        createRoomToken,
        interviewLoading,
        stripeVerificationSessionId,
        setStripeVerificationSessionId,
        isOwner,
        roomMessages,
        setRoomMessages,
        workspaceSettings: workspaceSettingsData?.workspaceSettings || null,
        agentId: workspaceSettingsData?.associatedAgent!,
        jobProfile: jobProfile || null,
        rescheduleNeeded,
        resetSteps,
        isRescheduling,
        setIsRescheduling,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};
