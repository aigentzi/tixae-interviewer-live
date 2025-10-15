import { Button } from "@root/components/ui/button";
import { Loader2, Trash2Icon, X } from "lucide-react";
import { useTranslations } from "@root/app/providers/TranslationContext";

interface BulkActionsBarProps {
  selectedCount: number;
  isDeleting: boolean;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export const BulkActionsBar = ({
  selectedCount,
  isDeleting,
  onClearSelection,
  onBulkDelete,
}: BulkActionsBarProps) => {
  const t = useTranslations("mainPage");

  if (selectedCount === 0) return null;

  // Helper function to format the selection message
  const getSelectionMessage = () => {
    if (selectedCount === 1) {
      return t("oneInterviewSelected", "1 interview selected");
    }
    const template = t(
      "multipleInterviewsSelected",
      `${selectedCount} interviews selected`,
    );
    return template.replace("{count}", selectedCount.toString());
  };

  return (
    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
          <span className="text-sm font-semibold text-primary">
            {selectedCount}
          </span>
        </div>
        <span className="text-sm font-medium text-foreground">
          {getSelectionMessage()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onPress={onClearSelection}
          startContent={<X className="w-4 h-4" />}
        >
          {t("clear", "Clear")}
        </Button>
        <Button
          size="sm"
          color="secondary"
          onPress={onBulkDelete}
          isDisabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("deleting", "Deleting...")}
            </>
          ) : (
            <>
              <Trash2Icon className="w-4 h-4" />
              {t("deleteSelected", "Delete Selected")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
