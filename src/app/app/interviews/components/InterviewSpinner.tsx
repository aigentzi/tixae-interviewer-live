import { Loader2 } from "lucide-react";
import { useTranslations } from "@root/app/providers/TranslationContext";

export const LoadingState = () => {
  const t = useTranslations("mainPage");

  return (
    <div className="flex items-center justify-center p-12">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {t("loadingInterviews", "Loading interviews...")}
        </p>
      </div>
    </div>
  );
};
