"use client";

import { FC, useEffect, memo } from "react";
import { FaRobot } from "react-icons/fa";
import Link from "next/link";
import { DailyAudio, DailyProvider } from "@daily-co/daily-react";
import { VideoCall } from "./VideoCall";
import { Copy, Download, Loader2 } from "lucide-react";
import { useRoom } from "../hooks/room.hook";
import { LiveTranscription } from "./LiveTranscription";
import { useCall } from "../hooks/call.hook";
import { useMeeting } from "../hooks/useMeeting";
import { useTranscription } from "../hooks/useTranscription";

// Memoized loading component
const LoadingScreen = memo(({ style }: { style?: React.CSSProperties }) => (
  <div
    className="flex min-h-screen flex-col items-center justify-center"
    style={style}
  >
    <div className="text-center">
      <Loader2 className="animate-spin text-4xl text-primary mx-auto mb-4" />
      <h2 className="text-xl font-semibold">Joining Meeting...</h2>
    </div>
  </div>
));

LoadingScreen.displayName = "LoadingScreen";

// Memoized error screen component
const ErrorScreen = memo(
  ({ error, style }: { error: string; style?: React.CSSProperties }) => (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-8"
      style={style}
    >
      <div className="text-center p-8 bg-red-50 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
        <p className="mb-2">{error}</p>
        <p className="text-sm text-red-800 mb-6">
          If this keeps happening, please email{" "}
          <a
            href="mailto:interviews-error@tixae.ai"
            className="underline hover:no-underline"
          >
            interviews-error@tixae.ai
          </a>
          .
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
        >
          Back to Home
        </Link>
      </div>
    </div>
  ),
);

ErrorScreen.displayName = "ErrorScreen";

// Memoized missing info screen component
const MissingInfoScreen = memo(({ style }: { style?: React.CSSProperties }) => (
  <div
    className="flex min-h-screen flex-col items-center justify-center p-8"
    style={style}
  >
    <div className="text-center p-8 bg-yellow-50 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-yellow-600 mb-4">
        Missing Information
      </h2>
      <p className="mb-6">Room or username information is missing.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
      >
        Back to Home
      </Link>
    </div>
  </div>
));

MissingInfoScreen.displayName = "MissingInfoScreen";

// Memoized header component
const MeetingHeader = memo(
  ({ workspaceSettings }: { workspaceSettings: any }) => (
    <header className="bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto py-1 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center shadow-md overflow-hidden">
            {workspaceSettings?.brandingConfig?.logo ? (
              <img
                src={workspaceSettings.brandingConfig.logo}
                alt="Company Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <FaRobot className="text-white text-sm" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {workspaceSettings?.brandingConfig?.name || ""}
            </h1>
          </div>
        </div>
      </div>
    </header>
  ),
);

MeetingHeader.displayName = "MeetingHeader";

// Memoized transcription controls
const TranscriptionControls = memo(
  ({
    handleCopy,
    handleDownload,
    hasMessages,
  }: {
    handleCopy: () => void;
    handleDownload: () => void;
    hasMessages: boolean;
  }) => (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleCopy}
        disabled={!hasMessages}
        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 disabled:opacity-40"
      >
        <Copy className="w-4 h-4" />
      </button>
      <button
        onClick={handleDownload}
        disabled={!hasMessages}
        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 disabled:opacity-40"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  ),
);

TranscriptionControls.displayName = "TranscriptionControls";

export const Meeting: FC<{
  roomName: string;
  style?: React.CSSProperties;
}> = memo(({ roomName, style }) => {
  const { username, isOwner, workspaceSettings, agentId, interview } =
    useRoom();
  const { token, isLoading, roomUrl, error, initializeRoom } = useMeeting();
  const { roomMessages, handleCopy, handleDownload, hasMessages } =
    useTranscription();
  const call = useCall(agentId);

  // Handle room initialization when params are available
  useEffect(() => {
    console.log("Meeting component state:", {
      roomName,
      username,
      roomUrl,
      token,
      isLoading,
      error,
      isOwner,
    });

    if (
      roomName &&
      typeof roomName === "string" &&
      username &&
      typeof username === "string"
    ) {
      console.log("Initializing room", roomName, username);
      initializeRoom(roomName, username);
    } else {
      console.log("Missing room initialization data:", { roomName, username });
    }
  }, [roomName, username, initializeRoom]);

  if (isLoading) {
    return <LoadingScreen style={style} />;
  }

  if (error) {
    console.log("Error In Room Meeting:", error);
    return <ErrorScreen error={error} style={style} />;
  }

  if (!roomUrl || !username || typeof username !== "string") {
    return <MissingInfoScreen style={style} />;
  }

  return (
    <DailyProvider>
      <div className="flex flex-col bg-slate-50" style={style}>
        <MeetingHeader workspaceSettings={workspaceSettings} />
        {/* Introduction Video for Admin Users */}
        {isOwner && interview?.introVideoUrl && (
          <div className="bg-white rounded-xl shadow-lg p-4 mb-2">
            <h3 className="text-sm font-medium text-slate-700 mb-2">
              Introduction Video
            </h3>
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                className="w-full max-h-48 object-cover"
                src={interview.introVideoUrl}
                controls
                preload="metadata"
              />
            </div>
          </div>
        )}
        <main>
          <div className="w-full bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="aspect-[16/10] bg-slate-900 relative">
              <VideoCall
                url={roomUrl}
                username={username}
                token={token || ""}
                isMuted={call.isMuted}
                toggleMute={call.toggleMute}
                onLeave={call.leaveCall}
                startCall={call.startCall}
                remoteAudioStream={call.remoteAudioStream}
              />
              <DailyAudio autoSubscribeActiveSpeaker={true} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-3 mt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Live Transcription
              </h2>
              <TranscriptionControls
                handleCopy={handleCopy}
                handleDownload={handleDownload}
                hasMessages={hasMessages}
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-slate-50/50">
              <LiveTranscription
                messages={roomMessages}
                isObserverMode={isOwner}
              />
            </div>
          </div>
        </main>
      </div>
      <audio
        ref={call.audioRef}
        id="remoteAudio"
        className="hidden"
        controls
        autoPlay
        playsInline
      />
    </DailyProvider>
  );
});

Meeting.displayName = "Meeting";
