"use client";

import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Button } from "@root/components/ui/button";
import { api } from "@root/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import InlineNotification from "@root/app/components/InlineNotification";
import { useLocale } from "@root/app/providers/LocaleContext";
import { Input } from "@heroui/react";

export const ContentComponent = () => {
  const { activeWorkspace } = useActiveWorkspace();
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams?.get("profile");
  const qrInterviewId = searchParams?.get("qrInterview");

  const [email, setEmail] = useState("");
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const { data: profile } = api.jobProfiles.getById.useQuery({
    jobProfileId: profileId || "",
  });

  const { data: qrInterview } = api.qrInterviews.getById.useQuery(
    {
      id: qrInterviewId || "",
    },
    {
      enabled: !!qrInterviewId,
    },
  );

  const createInterviewMutation = api.interviews.create.useMutation({
    onSuccess: (data) => {
      setNotification({
        type: "success",
        message: "Interview created successfully! Redirecting...",
      });
      router.push(`/app/meeting/${data?.interviews?.[0]?.id}`);
      setIsCreatingInterview(false);
    },
    onError: (error) => {
      let customerMessage = "";

      // Handle specific interview limit errors with customer-friendly messages
      if (error?.message?.includes("Insufficient interview slots")) {
        customerMessage =
          "We're sorry, but the organization has reached their interview limit for this period. Please contact the organization directly to schedule your interview or try again later.";
      } else if (error?.message?.includes("slots")) {
        customerMessage =
          "There's an issue with interview availability. Please contact the organization to resolve this or try again later.";
      } else if (error?.message?.includes("workspace")) {
        customerMessage =
          "There seems to be an issue with the interview setup. Please contact the organization for assistance.";
      } else if (
        error?.message?.includes("job profile") ||
        error?.message?.includes("Invalid")
      ) {
        customerMessage =
          "The interview configuration appears to be invalid. Please contact the organization to get a new interview link.";
      } else {
        // Generic customer-friendly message for other errors
        customerMessage =
          "We're experiencing a technical issue. Please try again in a few moments or contact the organization for assistance.";
      }

      setNotification({
        type: "error",
        message: customerMessage,
      });
      setIsCreatingInterview(false);
    },
  });

  const createInterview = useCallback(() => {
    if (!qrInterview) {
      setNotification({
        type: "error",
        message:
          "Interview setup not found. Please check your link or contact the organization for a new interview invitation.",
      });
      return;
    }

    if (!email || !email.trim()) {
      setNotification({
        type: "warning",
        message: "Please enter your email address to continue.",
      });
      return;
    }

    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setNotification({
        type: "warning",
        message: "Please enter a valid email address.",
      });
      return;
    }

    setIsCreatingInterview(true);

    createInterviewMutation.mutate({
      jobProfileId: qrInterview?.interviewData.jobProfileId || "",
      workspaceId: qrInterview?.workspaceId || "",
      duration: qrInterview?.interviewData.duration || 10,
      level: qrInterview?.interviewData.level || "1",
      analysisPrompt: qrInterview?.interviewData.analysisPrompt || undefined,
      paid: qrInterview?.interviewData.paid || false,
      enableVerification:
        qrInterview?.interviewData.enableVerification || false,
      price: qrInterview?.interviewData.price || 0,
      intervieweeEmails: [email],
      startTime: qrInterview?.interviewData.startTime || undefined,
      endTime: qrInterview?.interviewData.endTime || undefined,
      language: locale, // Pass user's selected language
    });
  }, [qrInterview, email]);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold text-primary">
            Start Your Interview
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Please enter your email address to begin your interview session.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {profile && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <h3 className="font-medium text-primary">Position:</h3>
                <p className="text-sm text-muted-foreground">{profile.name}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address *</label>
              <Input
                type="email"
                value={email}
                onValueChange={(value) => setEmail(value)}
                placeholder="Enter your email address"
                variant="bordered"
                color="primary"
                size="lg"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                We'll use this email to send you interview details and results.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onPress={createInterview}
            isLoading={isCreatingInterview}
            isDisabled={isCreatingInterview || !email.trim()}
            className="w-full"
            color="primary"
            size="lg"
          >
            {isCreatingInterview
              ? "Setting up your interview..."
              : "Start Interview"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
