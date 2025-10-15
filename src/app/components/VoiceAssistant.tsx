import { useState, useRef, RefObject } from 'react';
import {
  FaRobot,
  FaVolumeMute,
  FaVolumeUp,
  FaMicrophone,
  FaBug,
  FaPhoneAlt,
} from 'react-icons/fa';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface VoiceAssistantProps {
  isActive: boolean;
  callStatus: 'idle' | 'connecting' | 'connected' | 'ended';
  isMuted: boolean;
  toggleMute: () => void;
  startWebRTC: () => void;
  endCall: () => void;
  audioElement: RefObject<HTMLAudioElement | null>;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ isActive, callStatus, isMuted, toggleMute, startWebRTC, endCall, audioElement }) => {
  // UI states
  const [response, setResponse] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [currentLevel, setCurrentLevel] = useState({ avg: 0, max: 0 });
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // WebRTC and audio refs
  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  // Speech detection configuration
  const SPEECH_DETECTION_THRESHOLD = 0.01;
  const VOLUME_LOGGING_INTERVAL = 1000;

  if (!isActive) return null;

  return (
    <div className="ai-assistant">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold flex items-center">
          <FaRobot className="mr-2" /> AI Assistant
        </h3>
        <div className="flex items-center">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="mr-2 text-gray-300 hover:text-white"
            title="Toggle debug view"
          >
            <FaBug />
          </button>
          <div className={`mr-2 flex items-center ${callStatus === 'connected'
            ? isMuted ? 'text-yellow-500' : 'text-green-500'
            : 'text-gray-500'
            }`}>
            <FaMicrophone className="mr-1" />
            <span className="text-xs">
              {callStatus === 'connected'
                ? isMuted ? 'Muted' : 'Active'
                : callStatus === 'connecting' ? 'Connecting...' : 'Inactive'}
            </span>
          </div>
          <button
            onClick={toggleMute}
            className={`text-white hover:text-gray-300 ${callStatus !== 'connected' ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isMuted ? 'Unmute' : 'Mute'}
            disabled={callStatus !== 'connected'}
          >
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
        </div>
      </div>

      {/* Audio level meter (debug view) */}
      {showDebug && callStatus === 'connected' && (
        <div className="mb-4 p-2 bg-gray-800 rounded">
          <div className="text-xs text-gray-300 mb-1">Audio Levels:</div>
          <div className="flex items-center">
            <span className="text-xs w-10">Max:</span>
            <div className="h-4 bg-gray-700 flex-1 rounded overflow-hidden">
              <div
                className={`h-full ${currentLevel.max > SPEECH_DETECTION_THRESHOLD ? 'bg-green-500' : 'bg-gray-500'}`}
                style={{ width: `${Math.min(currentLevel.max * 500, 100)}%` }}
              />
            </div>
            <span className="text-xs ml-2">{currentLevel.max.toFixed(3)}</span>
          </div>
          <div className="flex items-center mt-1">
            <span className="text-xs w-10">Thresh:</span>
            <div className="h-4 bg-gray-700 flex-1 rounded overflow-hidden">
              <div
                className="h-full bg-red-500"
                style={{ width: `${SPEECH_DETECTION_THRESHOLD * 500}%` }}
              />
            </div>
            <span className="text-xs ml-2">{SPEECH_DETECTION_THRESHOLD}</span>
          </div>

          {transcription && (
            <div className="mt-2">
              <div className="text-xs text-gray-300 mb-1">Current transcription:</div>
              <div className="text-xs p-1 bg-gray-700 rounded">{transcription}</div>
            </div>
          )}
        </div>
      )}

      {response && (
        <div className="my-3 p-2 bg-gray-800 rounded">
          {response}
        </div>
      )}

      {isProcessing && (
        <div className="mt-4 text-center text-sm text-gray-300">
          Processing your request...
        </div>
      )}

      {/* Call controls */}
      <div className="mt-4 flex justify-center space-x-4">
        {callStatus === 'idle' || callStatus === 'ended' ? (
          <button
            onClick={startWebRTC}
            className="px-4 py-2 bg-green-600 text-white rounded flex items-center"
          >
            <FaPhoneAlt className="mr-2" /> Start Voice Chat
          </button>
        ) : callStatus === 'connected' ? (
          <button
            onClick={endCall}
            className="px-4 py-2 bg-red-600 text-white rounded flex items-center"
          >
            <FaPhoneAlt className="mr-2" /> End Voice Chat
          </button>
        ) : (
          <button disabled className="px-4 py-2 bg-gray-600 text-white rounded flex items-center opacity-70">
            Connecting...
          </button>
        )}
      </div>

      {/* Hidden audio element for remote stream */}
      {/* <audio ref={(el) => { audioPlayerRef.current = el; }} className="hidden" /> */}
      <audio
        id="remoteAudio"
        className="hidden"
        controls
        autoPlay
        playsInline
        ref={audioElement}
      ></audio>
    </div>
  );
};

export default VoiceAssistant;
