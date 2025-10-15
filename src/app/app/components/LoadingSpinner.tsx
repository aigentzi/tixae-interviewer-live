"use client";

import { LOADING_MESSAGES } from "../constants/dashboard";

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner = ({
  message = LOADING_MESSAGES.DEFAULT,
}: LoadingSpinnerProps) => (
  <div className="min-h-[calc(100vh-70px)] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);
