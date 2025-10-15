"use client";

import {
  useScreenShare,
  useDaily,
  useLocalSessionId,
  useParticipantIds,
  DailyVideo,
  useRecording,
} from "@daily-co/daily-react";
import { api } from "@root/trpc/react";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import {
  FaDesktop,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaRecordVinyl,
  FaRobot,
  FaUserCircle,
  FaClock,
} from "react-icons/fa";
import { useRoom } from "../hooks/room.hook";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { JobProfile } from "@root/shared/zod-schemas";

type videoCallProps = {
  url: string;
  token: string;
  username: string;
  isMuted: boolean;
  toggleMute: () => void;
  onLeave: (recordingId?: string, isEndedByInterviewee?: boolean) => void;
  startCall: () => void;
  remoteAudioStream: MediaStream | null;
};

export const VideoCall: FC<videoCallProps> = ({
  url,
  token,
  username,
  isMuted,
  toggleMute,
  onLeave,
  startCall,
  remoteAudioStream,
}) => {
  const {
    stripeVerificationSessionId,
    workspaceSettings,
    jobProfile,
    interview,
  } = useRoom();
  const callObject = useDaily();
  const localParticipantSessionId = useLocalSessionId();
  const participantIds = useParticipantIds();
  const { screens } = useScreenShare();
  // ===== Waiting room configuration =====
  const GRACE_PERIOD_MS = 2 * 60 * 1000; // 2 minutes before start the room opens
  const POLL_INTERVAL_MS = 20 * 1000; // 20 seconds polling to re-check

  const { error, setError, isOwner } = useRoom();
  const aiAssistantRef = useRef({
    id: "ai-assistant",
    name: "Aria (AI Assistant)",
    isAI: true,
  });
  const recording = useRecording({
    onRecordingStarted: () => {
      console.log("Recording started");
    },
    onRecordingStopped: () => {
      console.log("Recording stopped");
    },
  });

  const [agentTrackId, setAgentTrackId] = useState<string | null>(null);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Waiting room state management
  const [waitingForRoom, setWaitingForRoom] = useState(false);
  const [scheduledStartTime, setScheduledStartTime] = useState<Date | null>(
    null
  );
  const waitingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Combined participants including the AI assistant if active
  const allParticipants = [...participantIds, aiAssistantRef.current.id];

  const { mutate: verifyPersonInMeeting } =
    api.interviews.verifyPersonInMeeting.useMutation({
      onSuccess: (data) => {
        if (data.similarityScore < 70) {
          if (callObject) {
            callObject.leave();
          }
          onLeave(recording.recordingId);
          setError("Person in meeting verification failed. Please try again.");
        }
      },
      onError: (error) => {
        console.error("Error verifying person in meeting", error);
        if (callObject) {
          callObject.leave();
        }
        onLeave(recording.recordingId);
        setError(error.message);
      },
    });

  const takePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 360;
    canvas.height = 360;
    context?.drawImage(videoRef.current, 0, 0, 360, 360);

    const data = canvas.toDataURL("image/png");
    return data;
  };

  // Handle mute/unmute
  const toggleMuteAudio = useCallback(() => {
    if (!callObject) return;

    const shouldMute = !isMuted;
    callObject.setLocalAudio(!shouldMute);
    toggleMute();
  }, [callObject, isMuted, toggleMute]);

  // Handle camera on/off
  const toggleCamera = useCallback(() => {
    if (!callObject) return;

    const shouldDisable = !isCameraOff;
    callObject.setLocalVideo(!shouldDisable);
    setIsCameraOff(shouldDisable);
  }, [callObject, isCameraOff]);

  // Handle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (!callObject) return;

    if (!isScreenSharing) {
      try {
        await callObject.startScreenShare();
        setIsScreenSharing(true);
      } catch (e) {
        console.error("Error starting screen share:", e);
      }
    } else {
      try {
        await callObject.stopScreenShare();
        setIsScreenSharing(false);
      } catch (e) {
        console.error("Error stopping screen share:", e);
      }
    }
  }, [callObject, isScreenSharing]);

  // Handle leaving the call
  const leaveCall = useCallback(
    (isEndedByInterviewee?: boolean) => {
      if (!callObject) return;

      // If we previously published a custom track, stop it *before* leaving the room.
      if (agentTrackId && callObject.meetingState() === "joined-meeting") {
        callObject
          .stopCustomTrack(agentTrackId)
          .catch((err: any) =>
            console.warn(
              "Error stopping custom agent audio track on leave",
              err
            )
          );
      }
      recording.stopRecording();
      // Clear any pending waiting timers when the user leaves manually
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
      }

      callObject.leave();
      console.log("leaving call – recording state", recording);
      onLeave(recording.recordingId, isEndedByInterviewee);
    },
    [callObject, onLeave, agentTrackId, recording]
  );

  /**
   * Helper to attempt joining the Daily room. Wrapped so we can re-use in
   * waiting-room polling and manual refresh.
   */
  const attemptJoinCall = useCallback(async () => {
    if (!callObject) return;

    try {
      if (isOwner) {
        await callObject.join({ url, token, userName: username });
      } else {
        await callObject.join({ url, token, userName: username });
      }
      callObject.setLocalVideo(true).setLocalAudio(true);

      // Any post-join logic
      setWaitingForRoom(false);
      setError(null);
      startCall();
      recording.startRecording();
    } catch (e: any) {
      // If we still get an nbf-room error, remain in waiting room
      if (e?.error && e.error.type === "nbf-room") {
        if (!waitingForRoom) setWaitingForRoom(true);
      } else if (e?.errorMsg) {
        setError(e.errorMsg);
      } else {
        setError("Failed to join the meeting. Please try again.");
      }
    }
  }, [
    callObject,
    isOwner,
    url,
    token,
    username,
    startCall,
    recording,
    waitingForRoom,
    setError,
  ]);

  // Render AI participant
  const renderAIParticipant = () => {
    const aiAssistantAvatar =
      workspaceSettings?.interviewConfig?.aiAssistant?.avatar;
    const aiAssistantName =
      workspaceSettings?.interviewConfig?.aiAssistant?.name || "AI Assistant";

    return (
      <div className="relative h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden border border-slate-700/50">
        {/* Full background image if avatar exists */}
        {aiAssistantAvatar ? (
          <div className="absolute inset-0">
            <img
              src={aiAssistantAvatar}
              alt={aiAssistantName}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error(
                  "Failed to load AI assistant avatar:",
                  aiAssistantAvatar
                );
                // Use fallback image if avatar fails to load
                e.currentTarget.src = "/tixae-logo.png";
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <FaRobot className="text-white text-3xl" />
              </div>
              <div className="text-white/80 text-sm font-medium">
                {aiAssistantName}
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <span className="text-white text-sm font-medium">
            {aiAssistantName}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  };

  /**
   * When the remote audio stream from the agent becomes available, publish it to
   * the Daily call as a custom audio track. This ensures that cloud recordings
   * include both the human participant **and** the agent's voice.
   */
  useEffect(() => {
    if (!callObject) return;

    // We only care about the first audio track of the agent's MediaStream
    const agentAudioTrack = remoteAudioStream?.getAudioTracks()[0];

    // If we already published a custom track or we don't yet have an audio track, do nothing.
    if (agentTrackId || !agentAudioTrack) return;

    let isCancelled = false;

    (async () => {
      try {
        const id = await callObject.startCustomTrack({
          track: agentAudioTrack,
          // Using the "music" mode allows for full bandwidth stereo audio.
          // Daily will ignore it for mono tracks – safe default.
          mode: "music",
          trackName: "ai-agent-audio",
        });
        if (!isCancelled) {
          setAgentTrackId(id);
          console.log("Published agent custom audio track with id", id);
        }
      } catch (err) {
        console.error("Failed to start custom agent audio track", err);
      }
    })();

    // Cleanup function in case the component unmounts before the promise resolves
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callObject, remoteAudioStream, agentTrackId]);

  // Join the call
  useEffect(() => {
    if (!callObject || !url || !jobProfile) return;

    // Determine if we should wait or join immediately based on interview start time
    const startTime =
      interview?.startTime instanceof Date
        ? interview.startTime
        : interview?.startTime
        ? new Date(interview.startTime)
        : null;

    if (startTime) {
      const now = Date.now();
      // If now is earlier than start time minus grace period, enter waiting room
      if (now < startTime.getTime() - GRACE_PERIOD_MS) {
        setWaitingForRoom(true);
        setScheduledStartTime(startTime);
        setRemainingTime(startTime.getTime() - now);
      } else {
        // We are inside the grace period – attempt immediate join
        attemptJoinCall();
      }
    } else {
      // No start time defined – join immediately
      attemptJoinCall();
    }

    return () => {
      if (callObject) {
        callObject.leave();
        onLeave();
      }
      // Clear any timer if component unmounts
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
      }
    };
  }, [callObject, url, token, username, jobProfile, interview]);

  // Countdown timer + polling logic while in waiting room
  useEffect(() => {
    if (!waitingForRoom || !scheduledStartTime) return;

    // Interval to update countdown every second
    const countdownInterval = setInterval(() => {
      setRemainingTime(scheduledStartTime.getTime() - Date.now());
    }, 1000);

    // Poll every POLL_INTERVAL_MS to attempt joining when within grace period
    const pollInterval = setInterval(() => {
      const now = Date.now();
      if (now >= scheduledStartTime.getTime() - GRACE_PERIOD_MS) {
        attemptJoinCall();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(pollInterval);
    };
  }, [waitingForRoom, scheduledStartTime]);

  // Waiting room UI – shown until the scheduled start time is reached and we auto-join
  if (waitingForRoom) {
    // Calculate countdown parts
    const seconds = Math.max(Math.floor(remainingTime / 1000), 0);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-slate-50 rounded-xl shadow-lg max-w-md w-full">
          <div className="flex justify-center mb-4">
            <FaClock className="text-slate-600 text-4xl animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {jobProfile?.name || "Upcoming Interview"}
          </h2>
          <p className="text-slate-600 mb-4">
            Scheduled for {scheduledStartTime?.toLocaleString()}
          </p>
          <p className="mb-6 text-slate-700 font-medium">
            Waiting for interview to begin…
          </p>

          <div className="font-mono text-3xl mb-6">
            {pad(hrs)}:{pad(mins)}:{pad(secs)}
          </div>

          <button
            onClick={attemptJoinCall}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors mr-3"
          >
            Join Now
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
          >
            Refresh / Recheck
          </button>

          <p className="mt-6 text-slate-500 italic text-sm">
            "Success is where preparation and opportunity meet." – Bobby Unser
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-red-50 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            Connection Error
          </h2>
          <p className="mb-4 text-slate-600">{error}</p>
          <button
            onClick={() => onLeave(recording.recordingId)}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-900 rounded-xl overflow-hidden">
      {/* Meeting video grid */}
      <div className="grid grid-cols-2 gap-3 p-4 h-[calc(100%-70px)]">
        {screens.length > 0 && (
          <div className="col-span-2 h-full">
            <div className="relative h-full bg-slate-800 rounded-xl overflow-hidden border border-slate-700/50">
              <DailyVideo
                type="screenVideo"
                sessionId={screens[0].session_id}
                automirror
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-white text-sm font-medium">
                  Screen shared by{" "}
                  {screens[0]?.local
                    ? `${username} (You)`
                    : callObject?.participants()?.[screens[0].session_id]
                        ?.user_name || "Participant"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Participant videos when no screen share - AI Assistant on left, User on right */}
        {screens.length === 0 && (
          <>
            {/* Left side - AI Assistant */}
            <div className="relative">{renderAIParticipant()}</div>

            {/* Right side - Always render self-view */}
            <div className="relative">
              <div className="relative h-full bg-slate-800 rounded-xl overflow-hidden border border-slate-700/50">
                {isCameraOff || !localParticipantSessionId ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                        <FaUserCircle className="text-slate-400 text-3xl" />
                      </div>
                      <div className="text-slate-400 text-sm">
                        {isCameraOff ? "Camera off" : "Connecting camera..."}
                      </div>
                    </div>
                  </div>
                ) : (
                  <DailyVideo
                    ref={videoRef}
                    type="video"
                    sessionId={localParticipantSessionId}
                    automirror
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <span className="text-white text-sm font-medium">{`${username} (You)`}</span>
                </div>
                {!isCameraOff && (
                  <div className="absolute top-3 right-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Enhanced control bar */}
      <div className="flex items-center justify-center gap-3 p-4 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700/50">
        <button
          onClick={toggleMuteAudio}
          className={`p-3 rounded-xl transition-all duration-200 ${
            isMuted
              ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25"
              : "bg-slate-700 hover:bg-slate-600 shadow-lg"
          }`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? (
            <FaMicrophoneSlash className="text-white text-lg" />
          ) : (
            <FaMicrophone className="text-white text-lg" />
          )}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-xl transition-all duration-200 ${
            isScreenSharing
              ? "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25"
              : "bg-slate-700 hover:bg-slate-600 shadow-lg"
          }`}
          title={isScreenSharing ? "Stop screen sharing" : "Share screen"}
        >
          <FaDesktop className="text-white text-lg" />
        </button>

        <button
          onClick={() => leaveCall(true)}
          className="p-3 rounded-xl bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-500/25"
          title="Leave meeting"
        >
          <FaPhoneSlash className="text-white text-lg" />
        </button>
      </div>
    </div>
  );
};
