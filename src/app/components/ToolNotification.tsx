"use client";

import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface ToolNotificationProps {
  type: "prompt_update" | "questions_update" | null;
  isVisible: boolean;
  onHide: () => void;
}

export function ToolNotification({
  type,
  isVisible,
  onHide,
}: ToolNotificationProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        onHide();
      }, 3000); // Auto-hide after 3 seconds
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!shouldRender) return null;

  const getNotificationConfig = () => {
    switch (type) {
      case "prompt_update":
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          title: "Interview Structure Updated",
          message: "The AI has updated your interview prompts",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      case "questions_update":
        return {
          icon: <CheckCircle className="h-4 w-4 text-blue-500" />,
          title: "Questions Added",
          message: "New interview questions have been added",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4 text-gray-500" />,
          title: "Unknown Update",
          message: "Something was updated",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
        };
    }
  };

  const config = getNotificationConfig();

  return (
    <div
      className={`fixed top-20 right-4 z-50 p-4 rounded-lg border shadow-lg transition-all duration-300 max-w-sm ${
        config.bgColor
      } ${config.borderColor} ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900">{config.title}</p>
          <p className="text-xs text-gray-600 mt-1">{config.message}</p>
        </div>
      </div>
    </div>
  );
}
