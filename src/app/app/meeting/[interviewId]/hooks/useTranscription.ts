import { useCallback } from "react";
import { useRoom } from "./room.hook";

export const useTranscription = () => {
  const { roomMessages } = useRoom();

  /**
   * Copy the message history to clipboard
   */
  const handleCopy = useCallback(() => {
    console.log("Copying message history");
    if (roomMessages.length > 0) {
      const text = roomMessages
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n");
      navigator.clipboard.writeText(text);
    }
  }, [roomMessages]);

  /**
   * Download the message history as a text file
   */
  const handleDownload = useCallback(() => {
    if (roomMessages.length > 0) {
      const text = roomMessages
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n");
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transcription_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [roomMessages]);

  return {
    roomMessages,
    handleCopy,
    handleDownload,
    hasMessages: roomMessages.length > 0,
  };
};
