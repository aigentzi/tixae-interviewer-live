import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { Loader2, Trash2Icon } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
  isDeleting: boolean;
}

export const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isDeleting,
}: DeleteConfirmationModalProps) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onClose}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Delete Interviews
            </ModalHeader>
            <ModalBody>
              <p>
                Are you sure you want to delete {selectedCount} interview(s)?
                This action cannot be undone and will permanently remove all
                associated data.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose} isDisabled={isDeleting}>
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={onConfirm}
                isDisabled={isDeleting}
                startContent={<Trash2Icon className="w-4 h-4" />}
                isLoading={isDeleting}
              >
                Delete {selectedCount} Interview{selectedCount !== 1 ? "s" : ""}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
