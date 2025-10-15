import { Button } from "@root/components/ui/button";
import { GridIcon, ListIcon, PlusIcon, QrCodeIcon } from "lucide-react";
import { useTranslations } from "@root/app/providers/TranslationContext";

interface InterviewsHeaderProps {
  totalCount: number;
  onCreateInterview: () => void;
  showQrInterviews: boolean;
  setShowQrInterviews: (show: boolean) => void;
}

export const InterviewsHeader = ({
  totalCount,
  onCreateInterview,
  showQrInterviews,
  setShowQrInterviews,
}: InterviewsHeaderProps) => {
  const t = useTranslations("mainPage");

  return (
    <div className="flex flex-col gap-2 md:flex-row items-center justify-between mb-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("interviews", "Interviews")}
        </h1>
        <p className="text-muted-foreground">
          {totalCount === 0
            ? t("noInterviewsYet", "No interviews yet")
            : `${totalCount} ${
                totalCount === 1
                  ? t("interview", "interview")
                  : t("interviews", "interviews")
              } ${t("total", "total")}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          color="primary"
          size="sm"
          startContent={<PlusIcon size={16} />}
          onPress={onCreateInterview}
          className="shadow-sm"
        >
          {t("sendInterviewInvitation", "Send Interview Invitation")}
        </Button>
        <Button
          color="primary"
          size="sm"
          onPress={() => {
            setShowQrInterviews(!showQrInterviews);
          }}
          startContent={<QrCodeIcon size={16} />}
          className="shadow-sm"
        >
          {showQrInterviews
            ? t("hideQrInterviews", "Hide QR Interviews")
            : t("showQrInterviews", "Show QR Interviews")}
        </Button>
      </div>
    </div>
  );
};
