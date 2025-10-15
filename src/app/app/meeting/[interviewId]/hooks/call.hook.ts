import { useCallback, useEffect, useRef, useState } from "react";
import { useRoom } from "./room.hook";
import { api } from "@root/trpc/react";
import { useRouter } from "next/navigation";

// Configuration for WebRTC
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export const useCall = (agentId: string) => {
  const {
    setRoomMessages,
    interview,
    setError,
    roomMessages,
    workspaceSettings,
    jobProfile,
  } = useRoom();
  const { roomName } = useRoom();
  const [callStatus, setCallStatus] = useState<
    "idle" | "connecting" | "connected" | "ended"
  >("idle");
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(
    null
  );
  const [remoteAudioStream, setRemoteAudioStream] =
    useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isUsingGoogleLive, setIsUsingGoogleLive] = useState<boolean>(false);
  const router = useRouter();
  const [finalTranscript, _setFinalTranscript] = useState("");
  const finalTranscriptRef = useRef(""); // <- always up-to-date
  const lastProcessedMessageCountRef = useRef(0); // Track processed messages to prevent duplicates

  // helper so we update both places
  const setFinalTranscript = (newVal: string | ((prev: string) => string)) => {
    finalTranscriptRef.current =
      typeof newVal === "function"
        ? newVal(finalTranscriptRef.current)
        : newVal;
    _setFinalTranscript(finalTranscriptRef.current);
  };

  // Get global prompts from admin settings
  const { data: adminSettingsData } = api.admin.getAdminSettings.useQuery();

  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const saveMessageHistoryMutation =
    api.interviews.saveMessageHistory.useMutation({
      onSuccess: (data) => {
        console.log("Message history saved: ", data);
      },
      onError: (error) => {
        console.error("Error saving message history: ", error);
        setError(error.message);
      },
    });

  const { data: applicantData } = api.applicants.get.useQuery(
    {
      id:
        (interview?.workspaceId || "") +
        "-" +
        (interview?.intervieweeEmail || ""),
    },
    {
      enabled: !!interview?.workspaceId && !!interview?.intervieweeEmail,
    }
  );

  const interviewEndedMutation = api.interviews.interviewEnded.useMutation({
    onSuccess: (data) => {
      console.log("Interview ended: ", data);
      router.push(
        `/app/meeting/${
          roomName?.endsWith("-owner") ? roomName?.split("-")[0] : roomName
        }/result`
      );
      setCallStatus("ended");
    },
    onError: (error) => {
      console.error("Error ending interview: ", error);
      setError(error.message);
    },
  });

  const companyContextPrompt = () => {
    // Build company context section
    const companyContext = workspaceSettings?.interviewConfig?.companyContext;
    let companyContextPrompt = "";

    if (companyContext) {
      companyContextPrompt = "\n\n**COMPANY CONTEXT:**\n";

      if (companyContext.companyName) {
        companyContextPrompt += `Company: ${companyContext.companyName}\n`;
      }

      if (companyContext.companyWebsite) {
        companyContextPrompt += `Website: ${companyContext.companyWebsite}\n`;
      }

      if (companyContext.companyDescription) {
        companyContextPrompt += `\nAbout the Company:\n${companyContext.companyDescription}\n`;
      }

      if (companyContext.companyValues) {
        companyContextPrompt += `\nCompany Values & Culture:\n${companyContext.companyValues}\n`;
      }

      if (companyContext.additionalContext) {
        companyContextPrompt += `\nAdditional Context:\n${companyContext.additionalContext}\n`;
      }

      companyContextPrompt +=
        "\nUse this company information to provide more relevant questions and better assess candidate fit for our organization.\n";
    }

    return companyContextPrompt;
  };

  const addUserMessage = useCallback(
    (message: string) => {
      console.log("ADDING USER MESSAGE ", message);
      setRoomMessages((prev) => {
        const newMessages = [
          ...prev,
          { content: message, role: "user" as "user" | "assistant" },
        ];
        saveMessageHistoryMutation.mutate({
          interviewId: interview?.id || "",
          messageHistory: newMessages.map((message) => ({
            role: message.role as "user" | "assistant",
            content: message.content,
          })),
        });
        setFinalTranscript("");
        return newMessages;
      });
    },
    [finalTranscript, interview?.id]
  );

  const handleConversationUpdate = useCallback(
    (messagesHistory: Array<{ content: string; role: string }>) => {
      // Filter to only include user and assistant messages
      const filteredMessages = messagesHistory.filter(
        (msg) =>
          (msg.role === "user" || msg.role === "assistant") &&
          // Exclude the system instruction message
          !(
            msg.role === "user" &&
            msg.content ===
              "THIS IS THE BEGINNING OF THE CONVERSATION WITH THE USER, FOLLOW THE INSTRUCTIONS GIVEN TO YOU."
          )
      );

      // Check if we have new messages to process
      if (filteredMessages.length > lastProcessedMessageCountRef.current) {
        // Get only the new messages since last processed
        const newMessages = filteredMessages.slice(
          lastProcessedMessageCountRef.current
        );

        console.log("Processing new conversation messages:", newMessages);

        // Update room messages with the new messages
        setRoomMessages((prev) => {
          const updatedMessages = [
            ...prev,
            ...newMessages.map((msg) => ({
              content: msg.content,
              role: msg.role as "user" | "assistant",
            })),
          ];

          // Save the updated message history
          saveMessageHistoryMutation.mutate({
            interviewId: interview?.id || "",
            messageHistory: updatedMessages.map((message) => ({
              role: message.role as "user" | "assistant",
              content: message.content,
            })),
          });

          return updatedMessages;
        });

        // Update the last processed count
        lastProcessedMessageCountRef.current = filteredMessages.length;
      }
    },
    [interview?.id, saveMessageHistoryMutation]
  );

  const handleWebsocketConnection = () => {
    return new Promise((resolve, reject) => {
      const webscokerUrl = `wss://na-api.v2v.live/webrtc-call`;
      const ws = new WebSocket(webscokerUrl);
      ws.onopen = () => {
        console.log("WebSocket opened");
        resolve(ws);
      };
      ws.onerror = (event) => {
        console.error("WebSocket error: ", event);
        resolve(null);
      };
    });
  };

  // Starts the actual connection with call-service
  async function startWebRTC() {
    setCallStatus("connecting");
    console.log(
      `CURRENT NODE ENV IN FRONTEND:`,
      process.env.NEXT_PUBLIC_NODE_ENV
    );
    let ws = (await handleWebsocketConnection()) as WebSocket | null;
    if (!ws) {
      console.error("Failed to connect to WebSocket");
      setCallStatus("idle");
      return;
    }
    wsRef.current = ws;

    const peer = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });
    peerRef.current = peer;

    const remoteStream = new MediaStream();

    const audioElement: HTMLAudioElement | null =
      audioRef.current as HTMLAudioElement;
    if (audioElement) {
      audioElement.srcObject = remoteStream;
    }
    ws.onopen = () => {
      console.log("WebSocket opened");
    };
    ws.onclose = () => {
      endCall();
    };
    ws.onmessage = (event) => {
      handleWebsocketMessage(peer, ws as WebSocket, event);
    };
    ws.onerror = (event) => {
      console.error("WebSocket error: ", event);
    };

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        ws?.send(JSON.stringify({ type: "candidate", candidate }));
      }
    };

    peer.ontrack = (event) => {
      remoteStream.addTrack(event.track);
      setRemoteAudioStream(remoteStream);
      if (audioElement) {
        audioElement.play();
      }
    };

    peer.addEventListener("iceconnectionstatechange", () => {
      if (peer.iceConnectionState === "connected") {
        setCallStatus("connected");

        // Build the complete system prompt
        const globalPrompts = adminSettingsData?.globalPrompts || "";
        const generalPrompt = jobProfile?.generalPrompt || "";
        const levelPrompt =
          jobProfile?.levels.find((level) => level.level === interview?.level)
            ?.prompt || "";
        const intervieweeCV = applicantData?.applicant?.cvContent || "";
        const companyContext = companyContextPrompt();

        console.log(
          "JOB PROFILE STARTING MESSAGE: ",
          jobProfile?.startingMessage
        );

        console.log("INTERVIEWEES CV: ", intervieweeCV);
        console.log("APPLICANT DATA: ", applicantData?.applicant);

        // Construct the final prompt with proper spacing
        let systemPrompt = "";

        if (jobProfile?.startingMessage) {
          systemPrompt += `\n\n**BEGINNING OF THE CONVERSATION WITH THE USER — YOU MUST START WITH THIS EXACT MESSAGE (DO NOT SKIP, DO NOT PARAPHRASE):** ${jobProfile.startingMessage}\n\n`;
        }

        if (globalPrompts) {
          systemPrompt += globalPrompts + "\n\n";
        }

        if (generalPrompt) {
          systemPrompt += generalPrompt + "\n\n";
        }

        if (levelPrompt) {
          systemPrompt += levelPrompt + "\n\n";
        }

        if (companyContext) {
          systemPrompt += companyContext;
        }

        const intervieweeCvPrompt = `\n\n **INTERVIEWEE CV:**\n${intervieweeCV}\n\n
        DEPENDING ON THE INTERVIEWEE'S CV, ASK QUESTIONS THAT ARE RELEVANT TO THE INTERVIEWEE'S EXPERIENCE AND SKILLS.
        AND TELL THE INTERVIEWEE THAT YOU HAVE READ THEIR CV AND THANK THEM FOR UPLOADING IT.`;

        systemPrompt += `\n\n
        **INTERVIEWEE NAME:** ${applicantData?.applicant?.firstName} ${
          applicantData?.applicant?.lastName
        }\n\n
        **INTERVIEWEE EMAIL:** ${applicantData?.applicant?.email}\n\n
        **INTERVIEWEE AGE:** ${applicantData?.applicant?.age}\n\n
        **INTERVIEWEE GENDER:** ${applicantData?.applicant?.gender}\n\n
        **INTERVIEWEE PHONE NUMBER:** ${applicantData?.applicant?.phone}\n\n
        ${intervieweeCV ? intervieweeCvPrompt : ""}
        `;

        // Remove trailing whitespace
        systemPrompt = systemPrompt.trim();

        console.log("🤖 COMPLETE SYSTEM PROMPT BEING SENT TO AI:");
        console.log("=====================================");
        console.log(systemPrompt);
        console.log("=====================================");
        console.log("📋 Components breakdown:");
        console.log("- Global Prompts:", globalPrompts ? "✅" : "❌");
        console.log("- General Prompt:", generalPrompt ? "✅" : "❌");
        console.log("- Level Prompt:", levelPrompt ? "✅" : "❌");
        console.log("- Company Context:", companyContext ? "✅" : "❌");

        ws?.send(
          JSON.stringify({
            type: "init",
            agentData: {
              ID: agentId,
            },
            options: {
              messagesHistory: [
                {
                  content: systemPrompt,
                  role: "system",
                },
              ],
            },
            region: "eu",
          })
        );
      } else if (peer.iceConnectionState === "disconnected") {
        endCall();
      }
    });

    peer.addEventListener("connectionstatechange", () => {
      if (
        peer.connectionState === "disconnected" ||
        peer.connectionState === "failed"
      ) {
        endCall();
      }
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setLocalAudioStream(stream);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      ws.send(JSON.stringify({ type: "offer", offer: peer.localDescription }));
    } catch (error) {
      console.error("Error accessing media devices.", error);
      setCallStatus("idle");
    }
  }

  // handle messages sent to websocket
  async function handleWebsocketMessage(
    peer: RTCPeerConnection,
    ws: WebSocket,
    event: any
  ) {
    const eventData = JSON.parse(event.data);
    if (eventData.type === "end-call") {
      endCall();
      return;
    }
    if (eventData.type === "sync_chat_history" && eventData.turns?.length) {
      return;
    }

    // this handle wrtc connection stuff
    const { type, offer, answer, candidate, payload } = eventData;

    if (type === "answer") {
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
    } else if (type === "offer") {
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      ws.send(
        JSON.stringify({ type: "answer", answer: peer.localDescription })
      );
    } else if (type === "candidate") {
      await peer.addIceCandidate(candidate);
    } else if (type === "conversation-update") {
      console.log(`CONVERSATION UPDATE RECEIVED:`, payload);
      if (payload?.messagesHistory && Array.isArray(payload.messagesHistory)) {
        handleConversationUpdate(payload.messagesHistory);
      }
    } else if (type === "final_transcript") {
      console.log("FINAL TRANSCRIPT ", finalTranscriptRef.current);
      setFinalTranscript((prev) => {
        return payload.provider.payload.type === "Results"
          ? `${prev} ${payload.provider.payload.channel.alternatives[0].transcript}`
          : prev;
      });
    } else {
      const debugTypesToCapture = [
        "on_audio_chunk",
        "on_tool_start",
        "chunk",
        "transcript",
        "final_transcript",
      ];
      if (debugTypesToCapture.includes(type)) {
        if (type === "on_audio_chunk") {
          console.log(`ON AUDIO CHUNK `, payload);
        }
        // Removed text_speak_chunk handling - now using conversation-update instead
      }
    }
  }

  // Toggle mute/unmute
  async function toggleMute() {
    if (localAudioStream) {
      localAudioStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }

  // End the call
  async function endCall(
    meetingRecordingId?: string,
    isEndedByInterviewee?: boolean
  ) {
    // Close peer connection
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    // Close WebSocket connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
    }

    console.log("isEndedByInterviewee", isEndedByInterviewee);
    console.log("meetingRecordingId", meetingRecordingId);

    // Update UI state
    setCallStatus("ended");
    interviewEndedMutation.mutate({
      meetingRecordingId: meetingRecordingId,
      content: JSON.stringify(roomMessages),
      interviewId: interview?.id || "",
      isEndedByInterviewee: isEndedByInterviewee || false,
    });
  }

  // Add messages to room messages
  async function addAssistantMessage(message: any) {
    setRoomMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: message,
      },
    ]);
  }

  // Leave the call
  const leaveCall = (
    meetingRecordingId?: string,
    isEndedByInterviewee?: boolean
  ) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "end-call" }));
      endCall(meetingRecordingId, isEndedByInterviewee);
      setCallStatus("ended");
    }
  };

  return {
    startCall: startWebRTC,
    toggleMute,
    endCall,
    remoteAudioStream,
    localAudioStream,
    audioRef,
    leaveCall,
    isMuted,
  };
};
