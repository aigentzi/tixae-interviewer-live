"use client";

import { AppPageHeader } from "@root/app/components/AppPageHeader";
import { Button } from "@root/components/ui/button";
import { CloudUploadIcon, MailIcon, PlusIcon } from "lucide-react";
import { EmailsPageContent } from "./components/content.component";
import { useCallback, useState } from "react";
import { Email } from "@root/shared/zod-schemas";
import { BulkAddEmailsModal } from "./components/BulkAddEmailsModal";
import { api } from "@root/trpc/react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import InlineNotification from "@root/app/components/InlineNotification";

const EmailsPage = () => {
  const { activeWorkspace } = useActiveWorkspace();
  const [isBulkAddEmailsModalOpen, setIsBulkAddEmailsModalOpen] =
    useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  // Queries for getting emails, job profiles and interviewers
  const {
    data: emailsData,
    isLoading: isLoadingEmails,
    isError: isErrorEmails,
    refetch: refetchEmails,
  } = api.emails.getEmails.useQuery(
    {
      workspaceId: activeWorkspace?.id ?? "",
    },
    {
      enabled: !!activeWorkspace?.id,
    }
  );
  const { data: jobProfilesData } = api.jobProfiles.getAll.useQuery({
    workspaceId: activeWorkspace?.id || "",
    limit: 100,
  });

  const { mutate: bulkAddEmails } = api.emails.bulkCreateEmails.useMutation({
    onSuccess: () => {
      refetchEmails();
      setNotification({
        type: "success",
        message: "Emails added successfully",
      });
    },
  });

  return (
    <div className="flex flex-col gap-4 h-full w-full">
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <AppPageHeader
        title="Emails"
        description="Here you can manage your emails."
        icon={<MailIcon size={60} />}
        actions={
          <div className="flex flex-row gap-4">
            <Button
              color="primary"
              size="sm"
              onPress={() => setIsBulkAddEmailsModalOpen(true)}
            >
              <CloudUploadIcon className="w-4 h-4" />
              Bulk Add Emails
            </Button>
          </div>
        }
      />
      <EmailsPageContent
        jobProfiles={jobProfilesData?.jobProfiles || []}
        emails={emailsData?.emails || []}
        refetchEmails={refetchEmails}
      />

      <BulkAddEmailsModal
        isModalOpen={isBulkAddEmailsModalOpen}
        setIsModalOpen={setIsBulkAddEmailsModalOpen}
        onSubmit={(emails: Email[], jobProfileId: string) => {
          bulkAddEmails({
            workspaceId: activeWorkspace?.id || "",
            jobProfileId: jobProfileId,
            emails: emails.map((email) => email.email),
          });
        }}
        jobProfiles={jobProfilesData?.jobProfiles || []}
      />
    </div>
  );
};

export default EmailsPage;
