import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  useDaily,
  useLocalSessionId,
  useVideoTrack,
  useAudioTrack,
  useParticipantIds,
  useScreenShare,
  DailyVideo
} from '@daily-co/daily-react';
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaDesktop,
  FaPhoneSlash,
  FaRobot,
} from 'react-icons/fa';

interface VideoCallProps {
  url: string;
  token?: string;
  username: string;
  onLeave: () => void;
  aiAssistantActive?: boolean;
  isMuted: boolean;
  toggleMute: () => void;
}

// AI Assistant participant info
const AI_PARTICIPANT = {
  id: 'ai-assistant',
  name: 'Aria (AI Assistant)',
  isAI: true,
};

const VideoCall: React.FC<VideoCallProps> = ({ url, token, username, onLeave, aiAssistantActive = false, isMuted, toggleMute }) => {
  const callObject = useDaily();
  const localParticipantSessionId = useLocalSessionId();
  const localVideo = useVideoTrack(localParticipantSessionId || '');
  const localAudio = useAudioTrack(localParticipantSessionId || '');
  const participantIds = useParticipantIds();
  const { screens } = useScreenShare();

  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Combined participants including the AI assistant if active
  const allParticipants = aiAssistantActive
    ? [...participantIds, AI_PARTICIPANT.id]
    : participantIds;

  // Join the call
  useEffect(() => {
    if (!callObject || !url) return;

    const joinCall = async () => {
      try {
        console.log('Joining call with url:', url, 'and token:', token);
        await callObject.join({
          url,
          token,
          userName: username,
        });
      } catch (e) {
        console.error('Error joining call:', e);
        setError('Failed to join the meeting. Please try again.');
      }
    };

    joinCall();

    return () => {
      callObject.leave();
    };
  }, [callObject, url, token, username]);

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
        console.error('Error starting screen share:', e);
      }
    } else {
      try {
        await callObject.stopScreenShare();
        setIsScreenSharing(false);
      } catch (e) {
        console.error('Error stopping screen share:', e);
      }
    }
  }, [callObject, isScreenSharing]);

  // Handle leaving the call
  const leaveCall = useCallback(() => {
    if (!callObject) return;

    callObject.leave();
    onLeave();
  }, [callObject, onLeave]);

  // Render AI participant
  const renderAIParticipant = () => {
    return (
      <div className="relative bg-gray-800 rounded-lg overflow-hidden h-60">
        <div className="ai-participant">
          <FaRobot className="ai-participant-icon" />
        </div>
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
          {AI_PARTICIPANT.name}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="call-container bg-gray-900 rounded-lg overflow-hidden">
      {/* Main video area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 h-[calc(100%-80px)]">
        {/* Screen share takes priority if active */}
        {screens.length > 0 && (
          <div className="col-span-full h-full">
            <DailyVideo
              type="screenVideo"
              sessionId={screens[0].session_id}
              automirror
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="mt-2 text-center text-white">
              Screen share by {screens[0]?.local ? `${username} (You)` : callObject?.participants()?.[screens[0].session_id]?.user_name || 'A participant'}
            </div>
          </div>
        )}

        {/* If no screen share, show participant videos */}
        {screens.length === 0 && allParticipants.map((id) => (
          <div key={id} className="relative bg-gray-800 rounded-lg overflow-hidden h-60">
            {id === AI_PARTICIPANT.id ? (
              renderAIParticipant()
            ) : (
              <>
                <DailyVideo
                  type="video"
                  sessionId={id}
                  automirror
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                  {id === localParticipantSessionId ? `${username} (You)` : callObject?.participants()?.[id]?.user_name || 'Participant'}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 p-4 bg-gray-800">
        <button
          onClick={toggleMuteAudio}
          className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-600'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <FaMicrophoneSlash className="text-white" /> : <FaMicrophone className="text-white" />}
        </button>

        <button
          onClick={toggleCamera}
          className={`p-3 rounded-full ${isCameraOff ? 'bg-red-500' : 'bg-gray-600'}`}
          title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isCameraOff ? <FaVideoSlash className="text-white" /> : <FaVideo className="text-white" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full ${isScreenSharing ? 'bg-green-500' : 'bg-gray-600'}`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <FaDesktop className="text-white" />
        </button>

        <button
          onClick={leaveCall}
          className="p-3 rounded-full bg-red-600"
          title="Leave call"
        >
          <FaPhoneSlash className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
