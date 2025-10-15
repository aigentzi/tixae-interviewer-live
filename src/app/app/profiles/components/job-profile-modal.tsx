import { CheckCircle } from "lucide-react";

import {
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { Button } from "@root/components/ui/button";
import { Label } from "@root/components/ui/label";
import { JobProfile } from "@root/shared/zod-schemas";
import { useEffect, useMemo, useState } from "react";
import { api } from "@root/trpc/react";

export const JobProfileComponent = (props: {
  profileData: Partial<JobProfile>;
  setProfileData: (data: Partial<JobProfile>) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  refetchJobProfiles: () => void;
}) => {
  const { activeWorkspace } = useActiveWorkspace();
  const t = useTranslations("profiles");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newStartingMessage, setNewStartingMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const utils = api.useUtils();

  const createJobProfileMutation = api.jobProfiles.create.useMutation({
    onSuccess: async (data) => {
      // Invalidate and refetch job profiles to get the updated data with default questions
      await utils.jobProfiles.getAll.invalidate();
      setNewJobTitle("");
      setNewStartingMessage("");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        props.setIsOpen(false);
      }, 2000);
    },
  });

  const updateJobProfileMutation = api.jobProfiles.update.useMutation({
    onSuccess: async (data) => {
      await utils.jobProfiles.getAll.invalidate();
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        props.setIsOpen(false);
      }, 2000);
    },
  });

  const handleNewProfileSubmit = () => {
    if (!newJobTitle.trim() || !activeWorkspace?.id) return;

    createJobProfileMutation.mutate({
      workspaceId: activeWorkspace.id,
      name: newJobTitle.trim(),
      description: "",
      generalPrompt: "",
      startingMessage: newStartingMessage.trim() || "",
    });
  };

  const handleUpdateProfileSubmit = () => {
    if (!newJobTitle.trim() || !activeWorkspace?.id) return;

    updateJobProfileMutation.mutate({
      jobProfileId: props.profileData.id as string,
      workspaceId: activeWorkspace?.id as string,
      data: {
        name: newJobTitle.trim(),
        startingMessage: newStartingMessage.trim() || "",
      },
    });
  };

  useEffect(() => {
    setNewJobTitle(props.profileData.name || "");
    setNewStartingMessage(props.profileData.startingMessage || "");
  }, [props.profileData.name, props.profileData.startingMessage, props.isOpen]);

  const isUpdate = useMemo(() => !!props.profileData.id, [props.profileData]);

  return (
    <Modal size="lg" isOpen={props.isOpen} onOpenChange={props.setIsOpen}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {isUpdate
                ? t("updatePosition", "Update Position")
                : t("addPosition", "Add Position")}
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label isRequired htmlFor="jobTitle">
                    {t("positionTitle", "Position Title")}
                  </Label>
                  <Input
                    id="jobTitle"
                    variant="bordered"
                    color="primary"
                    placeholder={t(
                      "positionTitlePlaceholder",
                      "e.g. Software Engineer, Data Scientist, Product Manager",
                    )}
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleNewProfileSubmit();
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startingMessage">
                    {t("startingMessage", "Interview Starting Message")}{" "}
                    {t("optional", "(optional)")}
                  </Label>
                  <Textarea
                    id="startingMessage"
                    variant="bordered"
                    color="primary"
                    placeholder={t(
                      "startingMessagePlaceholder",
                      "Welcome to your interview. Let's begin—what interests you about this position?",
                    )}
                    value={newStartingMessage}
                    onChange={(e) => setNewStartingMessage(e.target.value)}
                    minRows={4}
                    maxRows={8}
                    description={t(
                      "startingMessageDescription",
                      "If not provided the AI will generate something on it's own from the job profile instructions.",
                    )}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                size="sm"
                color="secondary"
                variant="light"
                onPress={() => {
                  setNewJobTitle("");
                  setNewStartingMessage("");
                  onClose();
                }}
              >
                {t("close", "Close")}
              </Button>
              <Button
                size="sm"
                color="primary"
                startContent={
                  showSuccess ? <CheckCircle className="w-4 h-4" /> : undefined
                }
                isLoading={
                  createJobProfileMutation.isPending ||
                  updateJobProfileMutation.isPending
                }
                onPress={
                  isUpdate ? handleUpdateProfileSubmit : handleNewProfileSubmit
                }
                isDisabled={
                  !newJobTitle.trim() ||
                  (isUpdate &&
                    props.profileData.name === newJobTitle &&
                    (props.profileData.startingMessage || "") ===
                      newStartingMessage)
                }
              >
                {showSuccess
                  ? isUpdate
                    ? t("profileUpdated", "Profile Updated!")
                    : t("profileCreated", "Profile Created!")
                  : isUpdate
                    ? t("updateProfile", "Update Profile")
                    : t("createProfile", "Create Profile")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
