import { Button } from "@root/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface NavigationButtonsProps {
  currentStep: number;
  onPrevious: () => void;
}

export const NavigationButtons = ({
  currentStep,
  onPrevious,
}: NavigationButtonsProps) => {
  if (currentStep === 0) return null;

  return (
    <div className="flex justify-center mt-8">
      <Button
        variant="ghost"
        onPress={onPrevious}
        color="primary"
        startContent={<ArrowLeft size={18} />}
      >
        Back
      </Button>
    </div>
  );
};
