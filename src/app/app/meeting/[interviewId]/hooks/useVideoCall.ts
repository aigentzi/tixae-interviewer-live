import { useState, useRef, useCallback } from "react";
import { useDaily, useScreenShare, useRecording } from "@daily-co/daily-react";
import { api } from "@root/trpc/react";
import { useRoom } from "./room.hook";

export const useVideoCall = (onLeave?: (recordingId?: string) => void) => {
  const { setError } = useRoom();
  const callObject = useDaily();
  const { screens } = useScreenShare();
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
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const { mutate: verifyPersonInMeeting } = api.interviews.verifyPersonInMeeting.useMutation({
    onSuccess: (data) => {
      if (data.similarityScore < 70) {
        if (callObject) {
          callObject.leave();
        }
        onLeave?.(recording.recordingId);
        setError("Person in meeting verification failed. Please try again.");
      }
    },
    onError: (error) => {
      console.error("Error verifying person in meeting", error);
      if (callObject) {
        callObject.leave();
      }
      onLeave?.(recording.recordingId);
      setError(error.message);
    },
  });

  /**
   * Take a photo from the video stream for verification
   */
  const takePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 360;
    canvas.height = 360;
    context?.drawImage(videoRef.current, 0, 0, 360, 360);

    const data = canvas.toDataURL("image/png");
    return data;
  }, []);

  /**
   * Toggle mute/unmute audio
   */
  const toggleMuteAudio = useCallback(() => {
    if (!callObject) return;

    const shouldMute = !isMuted;
    callObject.setLocalAudio(!shouldMute);
    setIsMuted(shouldMute);
  }, [callObject, isMuted]);

  /**
   * Toggle camera on/off
   */
  const toggleCamera = useCallback(() => {
    if (!callObject) return;

    const shouldDisable = !isCameraOff;
    callObject.setLocalVideo(!shouldDisable);
    setIsCameraOff(shouldDisable);
  }, [callObject, isCameraOff]);

  /**
   * Toggle screen sharing
   */
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

  /**
   * Leave the call with cleanup
   */
  const leaveCall = useCallback(() => {
    if (!callObject) return;

    // Stop custom track if exists
    if (agentTrackId && callObject.meetingState() === "joined-meeting") {
      callObject
        .stopCustomTrack(agentTrackId)
        .catch((err: any) =>
          console.warn("Error stopping custom agent audio track on leave", err)
        );
    }

    recording.stopRecording();
    callObject.leave();
    console.log("leaving call – recording state", recording);
    onLeave?.(recording.recordingId);
  }, [callObject, agentTrackId, recording, onLeave]);

  return {
    // State
    agentTrackId,
    isCameraOff,
    isScreenSharing,
    isMuted,
    screens,
    recording,
    videoRef,

    // Actions
    takePhoto,
    toggleMuteAudio,
    toggleCamera,
    toggleScreenShare,
    leaveCall,
    setAgentTrackId,

    // For external use
    verifyPersonInMeeting,
  };
};
