import { AppModal } from "@root/app/components/AppModal";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { JobProfile } from "@root/shared/zod-schemas";
import { Fragment } from "react";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { useJobProfileTemplates } from "@root/lib/job-profile-templates.lib";

export const ViewProfileModal = (props: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  profileData: Partial<JobProfile> | null;
}) => {
  const { activeWorkspace } = useActiveWorkspace();
  const t = useTranslations("profiles");
  const { translateJobProfile } = useJobProfileTemplates();

  if (!props.profileData) {
    return null;
  }

  const translatedProfile = translateJobProfile(
    props.profileData as JobProfile
  );

  return (
    <AppModal
      isModalOpen={props.isOpen}
      setIsModalOpen={props.setIsOpen}
      title={translatedProfile.name}
      description={t(
        "viewJobProfileDesc",
        "View the job profile for {name}."
      ).replace("{name}", translatedProfile.name)}
      onSubmit={() => props.setIsOpen(false)}
      isDisabled={false}
      footerButtonText={t("close", "Close")}
      classNames={{
        footerBtn: "bg-blue-500 hover:bg-blue-600",
        content: "max-w-[48rem] w-full",
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Description</h2>
          <p className="text-sm text-gray-500">
            {props.profileData.description}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">{t("levels", "Levels")}</h2>
          <div className="flex flex-col gap-4">
            {props.profileData.levels?.map((level, index) => (
              <Fragment key={index}>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold ">
                    {
                      activeWorkspace?.settings?.levels?.find(
                        (l) => l.levelNumber === parseInt(level.level)
                      )?.levelName
                    }
                  </h3>
                  <p className="text-sm text-gray-500 flex-1">{level.prompt}</p>
                </div>
                <div className="h-[1px] bg-gray-200 w-full"></div>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </AppModal>
  );
};
