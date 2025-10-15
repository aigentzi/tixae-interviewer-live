"use client";

import { cn } from "@root/lib/utils";
import { FC, useEffect, useRef, useState } from "react";

interface RoomMessage {
  content: string;
  role: "user" | "assistant";
  ts?: Date;
}

interface LiveTranscriptionProps {
  messages: RoomMessage[];
  isObserverMode?: boolean;
}

export const LiveTranscription: FC<LiveTranscriptionProps> = ({
  messages,
  isObserverMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  // Filter messages based on search term
  const filteredMessages = messages.filter((message) =>
    message.content.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCopy = () => {
    if (messages.length > 0) {
      const text = messages
        .map(
          (message) =>
            `${message.role === "user" ? "User" : "Assistant"}: ${
              message.content
            }`,
        )
        .join("\n");
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (messages.length > 0) {
      const text = messages
        .map(
          (message) =>
            `${message.role === "user" ? "User" : "Assistant"}: ${
              message.content
            }`,
        )
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
  };

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(isNearBottom);
    }
  };

  return (
    <div className="h-40 overflow-y-auto p-3 space-y-2">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-400">
          <p className="text-sm">
            Conversation will appear here when the interview starts...
          </p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "py-2 px-3 border-l-2 transition-all duration-200",
              message.role === "user"
                ? "border-l-slate-300 bg-slate-50/30"
                : "border-l-blue-300 bg-blue-50/20",
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  message.role === "user" ? "text-slate-600" : "text-blue-600",
                )}
              >
                {message.role === "user" ? "User" : "Assistant"}
              </span>
              {message.ts && (
                <span className="text-xs text-slate-400">
                  {message.ts.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {message.content}
            </p>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
