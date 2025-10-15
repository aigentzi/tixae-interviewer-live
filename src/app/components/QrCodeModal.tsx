import { AppModal } from "./AppModal";
import { Loader2 } from "lucide-react";
import { FC, useState } from "react";
import { QrCode } from "./QrCode";
import { SetState } from "@root/shared/zod-schemas";
import { Spinner } from "@heroui/react";

export const QrModal: FC<{
  isOpen: boolean;
  setIsOpen: SetState<boolean>;
  value: string;
  onSuccess?: (imageDataUrl: string) => void;
  logoSrc?: string;
  showLogo?: boolean;
}> = ({ isOpen, setIsOpen, value, onSuccess, logoSrc, showLogo = true }) => {
  const [isCreatingQRCode, setIsCreatingQRCode] = useState(false);

  return (
    <AppModal
      isModalOpen={isOpen}
      setIsModalOpen={setIsOpen}
      classNames={{
        content: "max-w-[600px]! w-full! mx-auto",
      }}
      showSubmitButton={false}
      showCancelButton={false}
    >
      <div className="flex justify-center items-center relative">
        <QrCode
          value={value}
          logoSrc={logoSrc || "/tixae-logo.png"}
          setIsCreatingQRCode={setIsCreatingQRCode}
          onSuccess={onSuccess}
          showLogo={showLogo}
        />
        {isCreatingQRCode && (
          <div className="flex flex-col items-center justify-center gap-2 absolute top-0 left-0 w-full h-full bg-white/50 backdrop-blur-sm rounded-lg">
            <p className="text-sm text-foreground">Creating QR Code...</p>
            <p className="text-xs text-foreground">
              This may take a few seconds
            </p>
            <Spinner color="primary" />
          </div>
        )}
      </div>
    </AppModal>
  );
};
