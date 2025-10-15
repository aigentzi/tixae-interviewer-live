"use client";

import { useEffect } from "react";
import { cn } from "@heroui/react";

export type NotificationType = "success" | "error" | "info" | "warning";

interface InlineNotificationProps {
  type: NotificationType;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  className?: string;
}

const typeStyles: Record<NotificationType, string> = {
  success: "bg-green-50 border-green-200 text-green-700",
  error: "bg-red-50 border-red-200 text-red-700", 
  info: "bg-blue-50 border-blue-200 text-blue-700",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
};

const typeIcons: Record<NotificationType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
  warning: "⚠",
};

export default function InlineNotification({
  type,
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000,
  className,
}: InlineNotificationProps) {
  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 border rounded-md text-sm animate-in slide-in-from-top-2",
        typeStyles[type],
        className
      )}
    >
      <span className="font-medium">{typeIcons[type]}</span>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto text-current hover:opacity-70 font-bold text-lg leading-none"
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  );
}