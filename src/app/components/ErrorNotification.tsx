"use client";

import { useEffect } from "react";
import { cn } from "@heroui/react";

interface ErrorNotificationProps {
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  className?: string;
}

export default function ErrorNotification({
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
  className,
}: ErrorNotificationProps) {
  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 border rounded-md text-sm animate-in slide-in-from-top-2 bg-red-50 border-red-200 text-red-700",
        className
      )}
    >
      <span className="font-medium">✕</span>
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