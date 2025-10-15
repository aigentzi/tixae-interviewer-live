import { Button } from "@root/components/ui/button";

import { Interview, JobProfile, QrInterview } from "@root/shared/zod-schemas";
import { TrashIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { useJobProfileTemplates } from "@root/lib/job-profile-templates.lib";
import InlineNotification from "@root/app/components/InlineNotification";

interface InterviewsTableProps {
  interviews: (Partial<Interview> | QrInterview)[];
  jobProfiles: JobProfile[];
  selectedInterviews: string[];
  isSelectAllChecked: boolean;
  onSelectInterview: (interviewId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onEditInterview: (interview: Interview) => void;
  onViewInterview: (interview: Interview) => void;
  onDeleteInterview: (interviewId: string) => void;
  onGoToInterview: (interview: Interview) => Promise<void>;
  onGoToResults: (interview: Interview) => void;
  searchQuery: string;
  showQrInterviews: boolean;
  setSelectedInterviews: (interviews: string[]) => void;
}

export const InterviewsTable = ({
  interviews,
  jobProfiles,
  selectedInterviews,
  isSelectAllChecked,
  onSelectInterview,
  onSelectAll,
  onDeleteInterview,
  onGoToInterview,
  onGoToResults,
  searchQuery,
  showQrInterviews,
  setSelectedInterviews,
}: InterviewsTableProps) => {
  const t = useTranslations("mainPage");
  const { translateJobProfile } = useJobProfileTemplates();

  const columns = [
    { name: t("jobProfile", "Job Profile"), uid: "jobProfile" },
    showQrInterviews
      ? { name: t("qrCode", "QR Code"), uid: "qrCode" }
      : { name: t("interviewee", "Interviewee"), uid: "interviewee" },
    { name: t("created", "Created"), uid: "createdAt" },
    { name: t("status", "Status"), uid: "status" },
    { name: t("actions", "Actions"), uid: "actions" },
  ];

  const {
    isOpen: isQrCodeModalOpen,
    onOpen: onQrCodeModalOpen,
    onOpenChange: onQrCodeModalOpenChange,
  } = useDisclosure();

  const [selectedInterview, setSelectedInterview] = useState<
    Interview | QrInterview | null
  >(null);

  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState<string | null>(null);

  const rowsPerPage = 12;

  const pages = Math.ceil(interviews.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return interviews.slice(start, end);
  }, [page, interviews]);

  const renderCell = useCallback(
    (interview: Interview | QrInterview, columnKey: string) => {
      switch (columnKey) {
        case "jobProfile":
          const jobProfile = jobProfiles.find(
            (jobProfile) =>
              jobProfile.id === (interview as Interview).jobProfileId
          );

          if (!jobProfile) {
            return (
              <div className="flex flex-col">
                <span className="font-medium">Unknown Profile</span>
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  No description available
                </span>
              </div>
            );
          }

          const translatedJobProfile = translateJobProfile(jobProfile);

          return (
            <div className="flex flex-col">
              <span className="font-medium">{translatedJobProfile.name}</span>
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                {translatedJobProfile.description}
              </span>
            </div>
          );
        case "interviewee":
          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {(interview as Interview).intervieweeEmail}
              </span>
            </div>
          );
        case "qrCode":
          return (
            <Button
              color="primary"
              title={t("showQrCode", "Show QR Code")}
              isIconOnly
              variant="faded"
              className="text-xs justify-self-end text-primary-foreground truncate p-0"
              onPress={() => {
                setSelectedInterview(interview);
                onQrCodeModalOpen();
              }}
            >
              {(interview as QrInterview).qrCode ? (
                <img
                  src={(interview as QrInterview).qrCode}
                  alt={t("qrCodeAlt", "QR Code")}
                  width={36}
                  height={36}
                  className="rounded-md"
                />
              ) : (
                <div className="size-[36px] rounded-md bg-default-100"></div>
              )}
            </Button>
          );
        case "createdAt":
          return (
            <span className="text-sm text-muted-foreground">
              {new Date(interview.createdAt || "").toLocaleDateString()}
            </span>
          );
        case "status":
          return (
            <Chip
              className="capitalize"
              variant="flat"
              color={
                ((interview as Interview).score ?? 0) > 0
                  ? "secondary"
                  : "default"
              }
              size="sm"
            >
              {((interview as Interview).score ?? 0) > 0
                ? t("completed", "Completed")
                : t("pending", "Pending")}
            </Chip>
          );
        case "actions":
          return (
            <div className="flex flex-row gap-0.5 justify-center">
              <Tooltip content={t("deleteInterview", "Delete Interview")}>
                <Button
                  onPress={() => onDeleteInterview(interview.id || "")}
                  isIconOnly
                  variant="light"
                  color="default"
                  size="sm"
                >
                  <TrashIcon size={14} />
                </Button>
              </Tooltip>
              {((interview as Interview).score ?? 0) > 0 ? (
                <Button
                  onPress={() => onGoToResults(interview as Interview)}
                  color="secondary"
                  variant="solid"
                  size="sm"
                  className="min-w-[120px] justify-center"
                >
                  {t("viewReport", "View Report")}
                </Button>
              ) : (
                <Button
                  onPress={async () => {
                    try {
                      setIsJoining((interview as Interview).id || "joining");
                      await onGoToInterview(interview as Interview);
                    } catch (e: any) {
                      setErrorMessage(
                        e?.message || t("joinFailed", "Failed to join as admin")
                      );
                    } finally {
                      setIsJoining(null);
                    }
                  }}
                  size="sm"
                  color="primary"
                  variant="solid"
                  className="min-w-[120px] justify-center"
                  isDisabled={
                    isJoining === ((interview as Interview).id || "joining")
                  }
                >
                  {isJoining === ((interview as Interview).id || "joining")
                    ? t("joiningAsAdmin", "Joining as Admin...")
                    : t("joinAsAdmin", "Join as Admin")}
                </Button>
              )}
            </div>
          );
        default:
          return null;
      }
    },
    [
      jobProfiles,
      onDeleteInterview,
      onGoToInterview,
      onGoToResults,
      t,
      translateJobProfile,
    ]
  );

  return (
    <>
      {errorMessage && (
        <div className="mb-2">
          <InlineNotification
            type="error"
            message={errorMessage}
            onClose={() => setErrorMessage(null)}
          />
        </div>
      )}
      <Table
        selectedKeys={new Set(selectedInterviews)}
        onSelectionChange={(keys) =>
          setSelectedInterviews(
            keys === "all"
              ? interviews.map((i) => i.id || "")
              : Array.from(keys as Set<string>)
          )
        }
        bottomContent={
          <div className="flex w-full justify-center">
            <Pagination
              isCompact
              showControls
              showShadow
              color="primary"
              page={page}
              total={pages}
              onChange={(page) => setPage(page)}
            />
          </div>
        }
        selectionMode="multiple"
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.uid}
              align={column.uid === "actions" ? "center" : "start"}
            >
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody items={items}>
          {(item) => (
            <TableRow key={item.id}>
              {(columnKey) => (
                <TableCell>
                  {renderCell(
                    item as Interview | QrInterview,
                    columnKey as string
                  )}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal isOpen={isQrCodeModalOpen} onOpenChange={onQrCodeModalOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("qrCode", "QR Code")}
              </ModalHeader>
              <ModalBody>
                {selectedInterview &&
                (selectedInterview as QrInterview).qrCode ? (
                  <img
                    src={(selectedInterview as QrInterview).qrCode || ""}
                    alt={t("qrCodeAlt", "QR Code")}
                    width={400}
                    height={400}
                  />
                ) : (
                  <div className="size-[400px] rounded-md bg-default-100"></div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" variant="light" onPress={onClose}>
                  {t("close", "Close")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isQrCodeModalOpen} onOpenChange={onQrCodeModalOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {t("qrCode", "QR Code")}
              </ModalHeader>
              <ModalBody>
                {selectedInterview &&
                (selectedInterview as QrInterview).qrCode ? (
                  <img
                    src={(selectedInterview as QrInterview).qrCode || ""}
                    alt={t("qrCodeAlt", "QR Code")}
                    width={400}
                    height={400}
                  />
                ) : (
                  <div className="size-[400px] rounded-md bg-default-100"></div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" variant="light" onPress={onClose}>
                  {t("close", "Close")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
