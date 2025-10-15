import { Badge } from "@root/components/ui/badge";
import { Button } from "@root/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { levelsText } from "@root/shared/zod-schemas";
import {
  Edit,
  Eye,
  MoreVertical,
  PencilIcon,
  PlusIcon,
  QrCodeIcon,
  Trash2,
  TrashIcon,
} from "lucide-react";
import { api } from "@root/trpc/react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { JobProfile } from "@root/shared/zod-schemas";
import { FC, useState } from "react";
import { QrModal } from "@root/app/components/QrCodeModal";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { useJobProfileTemplates } from "@root/lib/job-profile-templates.lib";
import { motion } from "framer-motion";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from "@heroui/react";
import moment from "moment";

export const ContentComponent: FC<{
  setSelectedProfile: (profile: JobProfile | null) => void;
  setCreateProfileModal: (isOpen: boolean) => void;
  setViewProfileModal: (isOpen: boolean) => void;
  profileCount: number;
  setQrCodeModal: (isOpen: boolean) => void;
  setError: (error: string | null) => void;
  refetchJobProfiles: () => void;
  jobProfiles: JobProfile[];
}> = ({
  setSelectedProfile,
  setCreateProfileModal,
  setViewProfileModal,
  profileCount,
  setError,
  refetchJobProfiles,
  jobProfiles,
  setQrCodeModal,
}) => {
  const { activeWorkspace } = useActiveWorkspace();
  const t = useTranslations("profiles");
  const { translateJobProfile } = useJobProfileTemplates();

  const deleteProfileMutation = api.jobProfiles.delete.useMutation({
    onSuccess: () => {
      refetchJobProfiles();
      setError(null);
    },
    onError: (error) => {
      console.error(error);
      setError(error.message);
    },
  });

  const deleteProfile = (profile: JobProfile) => {
    deleteProfileMutation.mutate({
      workspaceId: activeWorkspace?.id || "",
      jobProfileId: profile.id || "",
    });
  };

  const editProfile = (profile: JobProfile) => {
    console.log("Editing profile", profile);
    setSelectedProfile(profile);
    setCreateProfileModal(true);
  };

  const viewProfile = (profile: JobProfile) => {
    console.log("Viewing profile", profile);
    setSelectedProfile(profile);
    setViewProfileModal(true);
  };

  return (
    <>
      {/* Profiles Grid/List */}
      <div className={`grid gap-6 grid-cols-1 md:grid-cols-2`}>
        {jobProfiles.map((profile) => {
          const translatedProfile = translateJobProfile(profile);

          return (
            <motion.div
              key={profile.id}
              whileHover={{ y: -2 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="group relative rounded-xl bg-card border-[1.5px] border-gray-200/60 p-4 sm:p-5 md:p-6 hover:shadow-lg transition-all hover:border-primary/20 cursor-pointer"
            >
              <div
                className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-4 md:right-4"
                onClick={(e) => e.stopPropagation()}
              >
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      variant="light"
                      size="sm"
                      className="p-1 text-muted-foreground/60 hover:text-foreground"
                      isIconOnly
                    >
                      <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownSection className="p-2 rounded-lg">
                      <DropdownItem
                        key="edit"
                        startContent={
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4 md:h-4 md:w-4" />
                        }
                        onPress={() => editProfile(profile)}
                        className="text-foreground hover:bg-secondary/80 cursor-pointer mb-1 px-2 py-1.5 rounded-md"
                      >
                        {t("edit", "Edit")}
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        onPress={() => deleteProfile(profile)}
                        startContent={
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 md:h-4 md:w-4" />
                        }
                        className="text-secondary hover:text-secondary/80 hover:bg-secondary/10 cursor-pointer mt-1 px-2 py-1.5 rounded-md"
                      >
                        {t("delete", "Delete")}
                      </DropdownItem>
                    </DropdownSection>
                  </DropdownMenu>
                </Dropdown>
              </div>
              <h3 className="text-lg sm:text-xl md:text-xl font-semibold mb-2 pr-6 sm:pr-8 md:pr-8 text-foreground group-hover:text-primary/90 transition-colors break-words">
                {translatedProfile.name}
              </h3>
              {translatedProfile.description && (
                <p className="text-muted-foreground/80 mb-3 sm:mb-4 md:mb-4 line-clamp-2 text-xs sm:text-sm md:text-sm">
                  {translatedProfile.description}
                </p>
              )}

              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 xl:gap-0 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200/40">
                <span className="text-xs sm:text-sm text-muted-foreground/70">
                  {t("created", "Created")}{" "}
                  {moment(profile.createdAt).fromNow()}
                </span>
                <div className="flex items-center gap-2 w-full xl:w-auto">
                  <Button
                    variant="light"
                    size="sm"
                    className="flex items-center gap-2 rounded-lg hover:bg-primary/10 text-primary flex-1 xl:flex-none"
                    onPress={() => setQrCodeModal(true)}
                    startContent={
                      <QrCodeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    }
                  >
                    <span>{t("qrCode", "QR Code")}</span>
                  </Button>
                  <Button
                    variant="light"
                    size="sm"
                    className="flex items-center gap-2 rounded-lg hover:bg-primary/10 text-primary flex-1 xl:flex-none"
                    onPress={() => viewProfile(profile)}
                    startContent={<Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                  >
                    <span>{t("view", "View")}</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {profileCount === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
            <PlusIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t("noPositionsYet", "No positions yet")}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t(
              "createFirstPositionDesc",
              "Add your first position to start conducting interviews",
            )}
          </p>
          <Button
            onPress={() => {
              setSelectedProfile(null);
              setCreateProfileModal(true);
            }}
            startContent={<PlusIcon size={16} />}
            color="primary"
            className="shadow-sm"
          >
            {t("addPosition", "Add Position")}
          </Button>
        </div>
      )}
    </>
  );
};
