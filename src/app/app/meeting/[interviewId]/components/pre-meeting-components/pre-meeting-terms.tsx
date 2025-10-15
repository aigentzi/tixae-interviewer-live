import { Button } from "@root/components/ui/button";
import { FC, useMemo, useState } from "react";
import { useRoom } from "../../hooks/room.hook";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Badge } from "@root/components/ui/badge";
import { Accordion, AccordionItem, Checkbox } from "@heroui/react";
import {
  CheckCircle2,
  HelpCircle,
  FileText,
  ArrowRight,
  ArrowLeft,
  Mail,
} from "lucide-react";

export const PreMeetingTerms: FC<{
  next: () => void;
  prev: () => void;
}> = ({ next, prev }) => {
  const [agreed, setAgreed] = useState(false);
  const { workspaceSettings } = useRoom();

  const helpAndSupportUI = useMemo(() => {
    if (
      !workspaceSettings?.helpAndSupportConfig?.enableShowHelpDuringInterview
    ) {
      return null;
    }

    return (
      <Card
        shadow="none"
        className="border border-default rounded-lg hover:shadow-md transition-all duration-300"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Help and Support</CardTitle>
          </div>
          <CardDescription className="text-sm text-default-600">
            {workspaceSettings?.helpAndSupportConfig?.helpText}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden pt-0">
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-default-700">
                Available support options:
              </p>
              <div className="flex flex-row gap-2 flex-wrap">
                {workspaceSettings.helpAndSupportConfig.supportOptions?.map(
                  (option, index) => (
                    <Badge
                      key={index}
                      color="secondary"
                      variant="default"
                      className="capitalize"
                    >
                      {option}
                    </Badge>
                  )
                )}
              </div>
            </div>
            {workspaceSettings.helpAndSupportConfig.supportOptions?.includes(
              "email"
            ) &&
              workspaceSettings.helpAndSupportConfig.helpEmail && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-default-100/50 border border-default-200">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-default-700">
                      Email Support:
                    </span>
                    <a
                      href={`mailto:${workspaceSettings.helpAndSupportConfig.helpEmail}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {workspaceSettings.helpAndSupportConfig.helpEmail}
                    </a>
                  </div>
                </div>
              )}
            {workspaceSettings.helpAndSupportConfig.supportOptions?.includes(
              "faq"
            ) &&
              workspaceSettings.helpAndSupportConfig.faq && (
                <div className="mt-2">
                  <Accordion variant="bordered" className="rounded-lg">
                    {workspaceSettings.helpAndSupportConfig.faq.map(
                      (faq, index) => (
                        <AccordionItem
                          key={index}
                          aria-label={faq.question}
                          title={faq.question}
                          className="border-none "
                        >
                          <p className="text-default-600 text-sm leading-relaxed">
                            {faq.answer}
                          </p>
                        </AccordionItem>
                      )
                    )}
                  </Accordion>
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    );
  }, [workspaceSettings]);

  const termsAndConditionsUI = useMemo(() => {
    if (
      !workspaceSettings?.termsAndConditionsConfig?.enableTermsAndConditions ||
      !workspaceSettings?.termsAndConditionsConfig?.content
    ) {
      return null;
    }

    return (
      <Card
        shadow="none"
        className="border border-default rounded-lg hover:shadow-md transition-all duration-300"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Terms and Conditions</CardTitle>
          </div>
          <CardDescription className="text-sm text-default-600">
            Please read and accept the terms and conditions to proceed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <div className="flex flex-col gap-3 border-2 border-default-200 rounded-lg p-4 bg-default-50/50 max-h-48 overflow-y-auto">
            <p className="text-sm text-default-700 leading-relaxed whitespace-pre-wrap">
              {workspaceSettings.termsAndConditionsConfig.content}
            </p>
          </div>
          <div className="flex flex-row items-center gap-3 w-full p-3 rounded-lg bg-default-100/50 border border-default-200">
            <Checkbox
              isSelected={agreed}
              onValueChange={(enabled) => {
                setAgreed(enabled);
              }}
              className="flex-shrink-0"
            >
              <span className="text-sm font-medium">
                I have read and agree to the terms and conditions
              </span>
            </Checkbox>
            {agreed && (
              <CheckCircle2 className="w-5 h-5 text-primary ml-auto animate-in fade-in duration-300" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }, [workspaceSettings, agreed]);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {termsAndConditionsUI}
      {helpAndSupportUI}

      <div className="flex flex-row items-center justify-between gap-4 w-full pt-4 border-t border-default-200">
        <Button onPress={prev} variant="bordered">
          Previous
        </Button>
        <Button
          onPress={next}
          variant="solid"
          color="primary"
          isDisabled={
            workspaceSettings?.termsAndConditionsConfig
              ?.enableTermsAndConditions
              ? !agreed
              : false
          }
          endContent={<ArrowRight className="w-4 h-4" />}
          className={`transition-all duration-300 ${
            workspaceSettings?.termsAndConditionsConfig
              ?.enableTermsAndConditions
              ? agreed
                ? ""
                : "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          {workspaceSettings?.termsAndConditionsConfig?.enableTermsAndConditions
            ? agreed
              ? "Continue"
              : "Accept Terms to Continue"
            : "Continue"}
        </Button>
      </div>
    </div>
  );
};
