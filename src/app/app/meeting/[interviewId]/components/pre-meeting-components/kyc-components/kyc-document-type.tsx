import { FC } from "react";
import { Button } from "@root/components/ui/button";
import { Card, CardContent } from "@root/components/ui/card";
import { Badge } from "@root/components/ui/badge";
import {
  CreditCard,
  FileText,
  Plane,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { KYCStepProps, KYCDocumentType } from "@root/types/kyc";

const documentTypes: Array<{
  type: KYCDocumentType;
  title: string;
  description: string;
  icon: React.ReactNode;
  popular?: boolean;
}> = [
  {
    type: "passport",
    title: "Passport",
    description: "International passport document",
    icon: <Plane className="h-8 w-8" />,
    popular: true,
  },
  {
    type: "driver_license",
    title: "Driver's License",
    description: "Government-issued driving license",
    icon: <CreditCard className="h-8 w-8" />,
    popular: true,
  },
  {
    type: "id_card",
    title: "National ID Card",
    description: "Government-issued identity card",
    icon: <FileText className="h-8 w-8" />,
  },
];

export const KYCDocumentTypeStep: FC<KYCStepProps> = ({
  onNext,
  onPrev,
  state,
  updateState,
}) => {
  const handleSelectDocumentType = (type: KYCDocumentType) => {
    updateState({ documentType: type });
    setTimeout(onNext, 100); // Small delay for better UX
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Select Document Type</h2>
        <p className="text-muted-foreground text-sm">
          Choose the type of identification document you'd like to verify
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {documentTypes.map((docType) => (
          <Card
            key={docType.type}
            isPressable
            className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] duration-300 border-primary-50 border hover:border-primary/50"
            onPress={() => handleSelectDocumentType(docType.type)}
          >
            <CardContent className="p-6 text-center space-y-4">
              <div className="relative">
                <div className="text-primary mx-auto w-fit">{docType.icon}</div>
                {docType.popular && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 text-xs"
                  >
                    Popular
                  </Badge>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-lg">{docType.title}</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {docType.description}
                </p>
              </div>

              <div className="mt-auto">
                <div className="text-primary text-sm font-medium flex items-center justify-center gap-2">
                  Select
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <Button
          variant="bordered"
          onClick={onPrev}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="text-sm text-muted-foreground flex items-center">
          Step 1 of 3
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium text-sm mb-2">Supported Documents</h4>
        <p className="text-xs text-muted-foreground">
          We support identity documents from 190+ countries. Your document
          should be:
        </p>
        <ul className="text-xs text-muted-foreground mt-2 space-y-1">
          <li>• Clear and well-lit</li>
          <li>• Not expired</li>
          <li>• All text clearly visible</li>
          <li>• No damage or tampering</li>
        </ul>
      </div>
    </div>
  );
};
