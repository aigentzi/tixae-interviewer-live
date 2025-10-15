import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { Button } from "@root/components/ui/button";
import { Label } from "@root/components/ui/label";
import { Switch, Input, Textarea, Checkbox, cn } from "@heroui/react";
import { helpAndSupportConfigurationScheme } from "@root/shared/zod-schemas";
import { CheckIcon, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "@root/app/providers/TranslationContext";
import { api } from "@root/trpc/react";

export default function HelpAndSupport() {
  const t = useTranslations("settings");
  const { activeWorkspace, setActiveWorkspace } = useActiveWorkspace();
  const [editFAQIndex, setEditFAQIndex] = useState<number | null>(null);

  const [settings, setSettings] = useState<
    z.infer<typeof helpAndSupportConfigurationScheme>
  >(
    activeWorkspace?.settings?.helpAndSupportConfig || {
      enableShowHelpDuringInterview: false,
      helpText: "",
      supportOptions: [],
      helpEmail: null,
      faq: [],
    },
  );

  const [saveSuccess, setSaveSuccess] = useState(false);

  const utils = api.useUtils();

  const updateWorkspaceSettings = api.workspace.update.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      if (!activeWorkspace) return;
      setActiveWorkspace({
        ...activeWorkspace,
        settings: {
          ...activeWorkspace?.settings,
          helpAndSupportConfig: settings,
        },
      });
      // Reset success state after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    },
  });

  useEffect(() => {
    setSettings(
      activeWorkspace?.settings?.helpAndSupportConfig || {
        enableShowHelpDuringInterview: false,
        helpText: "",
        supportOptions: [],
        helpEmail: null,
        faq: [],
      },
    );
  }, [activeWorkspace]);

  const hasChanges = useMemo(
    () =>
      JSON.stringify(activeWorkspace?.settings?.helpAndSupportConfig) !==
      JSON.stringify(settings),
    [activeWorkspace?.settings?.helpAndSupportConfig, settings],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-4 items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">
            {t("helpAndSupport", "Help And Support")}
          </h1>
          <p className="text-sm text-foreground-700">
            {t(
              "getHelpAndSupportDesc",
              "Get help and support for your workspace.",
            )}
          </p>
        </div>
        <Button
          color="primary"
          size="sm"
          isDisabled={!hasChanges}
          isLoading={updateWorkspaceSettings.isPending}
          startContent={saveSuccess ? <CheckIcon className="w-4 h-4" /> : null}
          onPress={() => {
            if (!activeWorkspace?.id) return;
            updateWorkspaceSettings.mutate({
              workspaceId: activeWorkspace?.id,
              settings: {
                ...activeWorkspace?.settings,
                helpAndSupportConfig: {
                  ...settings,
                },
              },
            });
          }}
        >
          {t("save", "Save")}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="w-full">
          <div>
            <div className="flex flex-col gap-6">
              <div className="flex flex-row gap-3 items-center justify-between">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="show-help-link" className="">
                    {t("showHelpLink", "Show Help Link")}
                  </Label>
                  <p className="text-sm text-foreground-600">
                    {t(
                      "showHelpLinkDesc",
                      "When enabled, interviewees will see a help link during the interview.",
                    )}
                  </p>
                </div>
                <Switch
                  id="show-help-link"
                  isSelected={settings?.enableShowHelpDuringInterview || false}
                  onValueChange={(value) => {
                    setSettings((prev) => ({
                      ...prev,
                      enableShowHelpDuringInterview: value,
                    }));
                  }}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label
                  htmlFor="help-text"
                  className={cn(
                    "text-foreground-600",
                    !settings?.enableShowHelpDuringInterview &&
                      "opacity-disabled",
                  )}
                >
                  {t("helpText", "Help Text")}
                </Label>
                <Input
                  id="help-text"
                  variant="bordered"
                  color="primary"
                  placeholder={t("helpTextPlaceholder", "Help Text")}
                  isDisabled={!settings?.enableShowHelpDuringInterview}
                  value={settings?.helpText || ""}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      helpText: e.target.value,
                    }));
                  }}
                />
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-foreground-600">
                  {t("supportOptions", "Support Options")}
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-3 items-center justify-start">
                    <Checkbox
                      id="email-support"
                      isSelected={settings?.supportOptions?.includes("email")}
                      onValueChange={(value) => {
                        setSettings((prev) => ({
                          ...prev,
                          supportOptions: value
                            ? [...(prev.supportOptions || []), "email"]
                            : (prev.supportOptions || []).filter(
                                (option) => option !== "email",
                              ),
                        }));
                      }}
                    />
                    <Label
                      htmlFor="email-support"
                      className="text-foreground-600"
                    >
                      {t("emailSupport", "Email Support")}
                    </Label>
                  </div>
                  <div className="flex flex-row gap-3 items-center justify-start">
                    <Checkbox
                      id="faq-support"
                      isSelected={settings?.supportOptions?.includes("faq")}
                      onValueChange={(value) => {
                        setSettings((prev) => ({
                          ...prev,
                          supportOptions: value
                            ? [...(prev.supportOptions || []), "faq"]
                            : (prev.supportOptions || []).filter(
                                (option) => option !== "faq",
                              ),
                        }));
                      }}
                    />
                    <Label
                      htmlFor="faq-support"
                      className="text-foreground-600"
                    >
                      {t("faqSupport", "FAQ Support")}
                    </Label>
                  </div>
                  <div className="flex flex-row gap-3 items-center justify-start">
                    <Checkbox
                      id="chat-support"
                      isSelected={settings?.supportOptions?.includes("chat")}
                      onValueChange={(value) => {
                        setSettings((prev) => ({
                          ...prev,
                          supportOptions: value
                            ? [...(prev.supportOptions || []), "chat"]
                            : (prev.supportOptions || []).filter(
                                (option) => option !== "chat",
                              ),
                        }));
                      }}
                    />
                    <Label
                      htmlFor="chat-support"
                      className="text-foreground-600"
                    >
                      {t("chatSupport", "Chat Support")}
                    </Label>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="support-email" className="text-foreground-600">
                  {t("supportEmail", "Support Email")}
                </Label>
                <Input
                  id="support-email"
                  placeholder={t("supportEmailPlaceholder", "Support Email")}
                  isDisabled={!settings?.supportOptions?.includes("email")}
                  variant="bordered"
                  color="primary"
                  value={settings?.helpEmail || ""}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      helpEmail:
                        e.target.value.trim() === "" ? null : e.target.value,
                    }));
                  }}
                  type="email"
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 relative p-2 border border-default-200 rounded-lg">
                  <h3 className="text-foreground-600">
                    {t("faqItems", "FAQ Items")}
                  </h3>
                  {!settings?.supportOptions?.includes("faq") && (
                    <div className="absolute top-0 left-0 w-full h-full bg-content3/90 dark:bg-content2/90 z-10 p-2 rounded-md flex flex-col items-center justify-center gap-2">
                      <p className="text-foreground-600 text-center">
                        {t(
                          "toEnableFaqSupport",
                          "To enable FAQ support, please enable the FAQ support option above.",
                        )}
                        <br />
                        <Button
                          variant="bordered"
                          className="w-full bg-primary-500 text-white mt-2 hover:bg-primary-600 hover:text-white"
                          onPress={() => {
                            setSettings((prev) => ({
                              ...prev,
                              supportOptions: [
                                ...(prev.supportOptions || []),
                                "faq",
                              ],
                            }));
                          }}
                        >
                          {t("enableFaqSupport", "Enable FAQ Support")}
                        </Button>
                      </p>
                    </div>
                  )}
                  {settings?.faq?.map((faq, index) => (
                    <div
                      key={index}
                      className="flex flex-row gap-3 items-center justify-between w-full"
                    >
                      {editFAQIndex === index ? (
                        <div className="flex flex-row gap-3 items-center justify-start w-full border border-default-200 px-2 py-3 rounded-md">
                          <div className="flex flex-col gap-2 w-full">
                            <Input
                              placeholder={t("questionPlaceholder", "Question")}
                              variant="bordered"
                              color="primary"
                              value={faq.question}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  faq: prev.faq?.map((f, i) =>
                                    i === index
                                      ? { ...f, question: e.target.value }
                                      : f,
                                  ),
                                }))
                              }
                            />
                            <Textarea
                              placeholder={t("answerPlaceholder", "Answer")}
                              value={faq.answer}
                              variant="bordered"
                              color="primary"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  faq: prev.faq?.map((f, i) =>
                                    i === index
                                      ? { ...f, answer: e.target.value }
                                      : f,
                                  ),
                                }))
                              }
                              rows={4}
                            />
                          </div>
                          <div className="flex flex-row  items-center justify-end">
                            <Button
                              variant="light"
                              isIconOnly
                              onPress={() => {
                                setEditFAQIndex(null);
                              }}
                            >
                              <X className="w-4 h-4 text-foreground-600" />
                            </Button>
                            <Button
                              variant="light"
                              isIconOnly
                              onPress={() => {
                                setSettings((prev) => ({
                                  ...prev,
                                  faq: prev.faq?.map((f, i) =>
                                    i === index
                                      ? {
                                          ...f,
                                          question: faq.question,
                                          answer: faq.answer,
                                        }
                                      : f,
                                  ),
                                }));
                                setEditFAQIndex(null);
                              }}
                            >
                              <Save className="w-4 h-4 text-primary-500" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-row gap-3 items-center justify-between w-full border border-default-400 px-2 py-1 rounded-md cursor-pointer dark:bg-content2">
                          <div className="flex flex-col gap-2 w-full">
                            <p className="text-foreground font-medium text-sm">
                              {faq.question}
                            </p>
                          </div>
                          <div className="flex flex-row items-center justify-end">
                            <Button
                              variant="light"
                              isIconOnly
                              onPress={() => {
                                if (editFAQIndex === index) {
                                  setSettings((prev) => ({
                                    ...prev,
                                    faq: prev.faq?.map((f, i) =>
                                      i === index
                                        ? {
                                            ...f,
                                            question: faq.question,
                                            answer: faq.answer,
                                          }
                                        : f,
                                    ),
                                  }));
                                }
                                setEditFAQIndex(
                                  editFAQIndex === index ? null : index,
                                );
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="light"
                              isIconOnly
                              onPress={() => {
                                setSettings((prev) => ({
                                  ...prev,
                                  faq: prev.faq?.filter((_, i) => i !== index),
                                }));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="light"
                    className="w-full flex items-center gap-2  rounded-lg mt-2"
                    startContent={<Plus className="w-4 h-4" />}
                    onPress={() => {
                      setSettings((prev) => ({
                        ...prev,
                        faq: [
                          ...(prev.faq || []),
                          { question: "", answer: "" },
                        ],
                      }));
                    }}
                  >
                    {t("addFaqItem", "Add FAQ Item")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
