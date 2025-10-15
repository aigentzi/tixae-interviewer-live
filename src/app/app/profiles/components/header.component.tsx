import { Button } from "@root/components/ui/button";
import { JobProfile } from "@root/shared/zod-schemas";
import { PlusIcon } from "lucide-react";
import { FC } from "react";
import { useTranslations } from "@root/app/providers/TranslationContext";

export const HeaderComponent: FC<{
  profileCount: number;
  setSelectedProfile: (profile: JobProfile | null) => void;
  setCreateProfileModal: (isOpen: boolean) => void;
}> = ({ profileCount, setSelectedProfile, setCreateProfileModal }) => {
  const t = useTranslations("profiles");

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("positions", "Positions")}
        </h1>
        <p className="text-muted-foreground">
          {profileCount === 0
            ? t("noPositionsYet", "No positions yet")
            : `${profileCount} ${
                profileCount === 1
                  ? t("position", "position")
                  : t("positions", "positions")
              } ${t("total", "total")}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          onPress={() => {
            setSelectedProfile(null);
            setCreateProfileModal(true);
          }}
          size="sm"
          startContent={<PlusIcon size={16} />}
          color="primary"
          className="shadow-sm"
        >
          {t("addPosition", "Add Position")}
        </Button>
      </div>
    </div>
  );
};
