"use client";

import { Button } from "@root/components/ui/button";
import { HelpCircle, Undo2 } from "lucide-react";
import { useTranslations } from "@root/app/providers/TranslationContext";

interface ContentHeaderProps {
  title?: string;
  onShowFAQ?: () => void;
  showFAQButton?: boolean;
  onUndo?: () => void;
  showUndoButton?: boolean;
}

export function ContentHeader({
  title,
  onShowFAQ,
  showFAQButton = false,
  onUndo,
  showUndoButton = false,
}: ContentHeaderProps) {
  const t = useTranslations("mainPage");

  return (
    <div className="bg-primary text-primary-foreground px-5 flex items-center justify-between border-b border-border/30 rounded-t-2xl">
      <div className="flex items-center gap-2 py-4">
        <h1 className="text-lg font-semibold">
          {title || t("interviewSetup", "Interview Setup")}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {showUndoButton && (
          <Button
            variant="ghost"
            size="sm"
            onPress={onUndo}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <Undo2 className="h-4 w-4 mr-2" />
            {t("undo", "Undo")}
          </Button>
        )}

        {showFAQButton && (
          <Button
            variant="ghost"
            size="sm"
            onPress={onShowFAQ}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            {t("faq", "FAQ")}
          </Button>
        )}
      </div>
    </div>
  );
}
