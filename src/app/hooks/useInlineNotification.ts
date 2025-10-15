"use client";

import { useState, useCallback } from "react";
import type { NotificationType } from "../components/InlineNotification";

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

export function useInlineNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback((message: string) => addNotification("success", message), [addNotification]);
  const error = useCallback((message: string) => addNotification("error", message), [addNotification]);
  const info = useCallback((message: string) => addNotification("info", message), [addNotification]);
  const warning = useCallback((message: string) => addNotification("warning", message), [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    info,
    warning,
  };
}