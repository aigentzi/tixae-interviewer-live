"use client";

import { api } from "@root/trpc/react";
import { Email, JobProfile } from "@root/shared/zod-schemas";
import { AlertCircle } from "lucide-react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { FC, useCallback } from "react";
import { EmailsTable } from "./EmailsTable";

export const EmailsPageContent: FC<{
  jobProfiles: JobProfile[];
  emails: Email[];
  refetchEmails: () => void;
}> = ({ jobProfiles, emails, refetchEmails }) => {
  // Hooks
  const { activeWorkspace } = useActiveWorkspace();

  const {
    data: interviewsData,
    isLoading: isLoadingInterviewers,
    isError: isErrorInterviewers,
    refetch: refetchInterviewers,
  } = api.interviews.getWorkspaceInterviews.useQuery(
    {
      workspaceId: activeWorkspace?.id ?? "",
    },
    {
      enabled: !!activeWorkspace?.id,
    }
  );

  // Mutations for adding, editing and deleting emails
  const { mutate: editEmailFn } = api.emails.updateEmail.useMutation({
    onSuccess: () => {
      refetchEmails();
    },
  });
  const { mutate: deleteEmailFn } = api.emails.deleteEmail.useMutation({
    onSuccess: () => {
      refetchEmails();
    },
  });

  // Loading and error states
  const isLoading = isLoadingInterviewers;
  const isError = isErrorInterviewers;

  const handleEdit = useCallback(
    (email: Email) => {
      if (email.id) {
        editEmailFn({
          workspaceId: activeWorkspace?.id || "",
          email: email.email,
          jobProfileId: jobProfiles?.[0]?.id || "",
        });
      }
    },
    [activeWorkspace?.id, editEmailFn, jobProfiles]
  );

  const handleDelete = useCallback(
    (email: Email) => {
      if (email.id) {
        deleteEmailFn({
          workspaceId: activeWorkspace?.id || "",
          emailId: email.id,
        });
      }
    },
    [activeWorkspace?.id, deleteEmailFn]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-default-900"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <AlertCircle className="text-danger-500 mr-2" />
        <p className="text-danger-500">
          Error loading emails, job profiles or interviewers
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full w-full">
      <EmailsTable
        emails={emails || []}
        jobProfiles={jobProfiles || []}
        interviewers={interviewsData?.interviews.nonQrInterviews || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};
