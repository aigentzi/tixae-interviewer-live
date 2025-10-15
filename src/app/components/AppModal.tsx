import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { useTranslations } from "@root/app/providers/TranslationContext";

interface AppModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  onClose?: () => void;
  onSubmit?: () => void;
  isDisabled?: boolean;
  footerButtonText?: string;
  additionalButtons?: ReactNode;
  classNames?: {
    footerBtn?: string;
    content?: string;
    header?: string;
    title?: string;
    description?: string;
  };
  showAdditionalButtons?: boolean;
  showSubmitButton?: boolean;
  isLoading?: boolean;
  showCancelButton?: boolean;
}

export function AppModal({
  isModalOpen,
  setIsModalOpen,
  title,
  description,
  children,
  onSubmit,
  isDisabled,
  footerButtonText,
  classNames,
  additionalButtons,
  showAdditionalButtons = false,
  showSubmitButton = true,
  showCancelButton = true,
  isLoading = false,
}: AppModalProps) {
  const handleOpenChange = (open: boolean) => {
    setIsModalOpen(open);
  };

  const t = useTranslations("mainPage");

  return (
    <Modal
      isOpen={isModalOpen}
      onOpenChange={handleOpenChange}
      className={classNames?.content}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader
              className={`flex flex-row items-center justify-between ${classNames?.header}`}
            >
              <div className="flex flex-col gap-2">
                <h2 className={`text-lg font-semibold ${classNames?.title}`}>
                  {title}
                </h2>
                {description && (
                  <p
                    className={`text-sm text-default-500 ${classNames?.description}`}
                  >
                    {description}
                  </p>
                )}
              </div>
            </ModalHeader>
            <ModalBody className="flex flex-col gap-4">{children}</ModalBody>
            <ModalFooter>
              {showCancelButton && (
                <Button
                  variant="ghost"
                  onPress={onClose}
                  className="border-none bg-default-200 text-default-700 hover:bg-default-300 hover:text-default-800"
                >
                  {t("cancel", "Cancel")}
                </Button>
              )}
              {showAdditionalButtons && additionalButtons}
              {showSubmitButton && (
                <Button
                  onPress={onSubmit}
                  className={`${classNames?.footerBtn} bg-primary hover:bg-primary-600 text-primary-foreground`}
                  isDisabled={isDisabled}
                  color="primary"
                  isLoading={isLoading}
                >
                  {footerButtonText}
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
