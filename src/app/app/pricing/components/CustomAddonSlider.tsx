import { Slider as HerouiSlider } from "@heroui/react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { Skeleton } from "@root/components/ui/skeleton";
import {
  StripeCustomPlanModel,
  StripeProductAddonModel,
  WorkspaceLimits,
} from "@root/shared/zod-schemas";
import { api } from "@root/trpc/react";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";

/** NEW SLIDER COMPONENT **/
export function CustomAddonSlider({
  addon,
  customPlan,
  setCustomPlan,
  prebBuildAddons,
  alreadySubbedPlan,
  canEditSubscription,
}: {
  addon: StripeProductAddonModel;
  customPlan: StripeCustomPlanModel;
  setCustomPlan: Dispatch<SetStateAction<StripeCustomPlanModel>>;
  prebBuildAddons: StripeProductAddonModel[] | undefined;
  alreadySubbedPlan: StripeCustomPlanModel;
  canEditSubscription: boolean;
}) {
  const { activeWorkspace } = useActiveWorkspace();

  const quant: number =
    addon.key === "add-team-member"
      ? customPlan.limits?.maxTeamMembers === "infinity"
        ? 50
        : (customPlan.limits?.maxTeamMembers || 0) -
          (customPlan?.metadata?.includedTeamMembers === "infinity"
            ? 50
            : customPlan?.metadata?.includedTeamMembers || 0)
      : addon.key === "analytics-reporting"
        ? (customPlan.limits?.maxAnalyticsReports === "infinity"
            ? 50
            : customPlan.limits?.maxAnalyticsReports || 0) -
          (customPlan?.metadata?.includedAnalyticsReports === "infinity"
            ? 50
            : customPlan?.metadata?.includedAnalyticsReports || 0)
        : addon.key === "human-follow-up"
          ? (customPlan.limits?.maxHumanFollowUps === "infinity"
              ? 50
              : customPlan.limits?.maxHumanFollowUps || 0) -
            (customPlan?.metadata?.includedHumanFollowUps === "infinity"
              ? 50
              : customPlan?.metadata?.includedHumanFollowUps || 0)
          : addon.key === "hr-workflow-automation"
            ? (customPlan.limits?.maxHrWorkflowAutomations === "infinity"
                ? 50
                : customPlan.limits?.maxHrWorkflowAutomations || 0) -
              (customPlan?.metadata?.includedHrWorkflowAutomations ===
              "infinity"
                ? 50
                : customPlan?.metadata?.includedHrWorkflowAutomations || 0)
            : 0;

  const finalQuantity = quant === 0 ? 1 : quant;

  const properAddonInvoiceQuery = api.stripe.previewPricesCurrency.useMutation({
    onSuccess: (data) => {
      console.log(`data`, data);
    },
    onError: (error) => {
      console.log(`error`, error);
    },
  });

  useEffect(() => {
    if (addon?.stripePrices?.length) {
      properAddonInvoiceQuery.mutate({
        workspaceId: activeWorkspace?.id || "",
        prices: addon?.stripePrices
          ?.filter((price) => price.billingCycle === customPlan.billingCycle)
          .map((price) => ({
            priceId: price.priceId || "",
            quantity: finalQuantity,
          })),
      });
    }
  }, [addon?.stripePrices, customPlan.billingCycle, finalQuantity]);

  const [addonCurrentValue, setAddonCurrentValue] = useState(
    addon.key === "add-team-member"
      ? customPlan.limits?.maxTeamMembers === "infinity"
        ? 50
        : customPlan.limits?.maxTeamMembers || 0
      : addon.key === "analytics-reporting"
        ? customPlan.limits?.maxAnalyticsReports === "infinity"
          ? 50
          : customPlan.limits?.maxAnalyticsReports || 0
        : addon.key === "human-follow-up"
          ? customPlan.limits?.maxHumanFollowUps === "infinity"
            ? 50
            : customPlan.limits?.maxHumanFollowUps || 0
          : addon.key === "hr-workflow-automation"
            ? customPlan.limits?.maxHrWorkflowAutomations === "infinity"
              ? 50
              : customPlan.limits?.maxHrWorkflowAutomations || 0
            : 0,
  );

  const minValue = useMemo(() => {
    if (addon.key === "add-team-member") {
      return (
        parseInt(
          customPlan.metadata?.includedTeamMembers === "infinity"
            ? "50"
            : customPlan.metadata?.includedTeamMembers?.toString() || "0",
        ) ||
        addon.minValue ||
        0
      );
    } else if (addon.key === "analytics-reporting") {
      return (
        parseInt(
          customPlan.metadata?.includedAnalyticsReports === "infinity"
            ? "50"
            : customPlan.metadata?.includedAnalyticsReports?.toString() || "0",
        ) ||
        addon.minValue ||
        0
      );
    } else if (addon.key === "human-follow-up") {
      return (
        parseInt(
          customPlan.metadata?.includedHumanFollowUps === "infinity"
            ? "50"
            : customPlan.metadata?.includedHumanFollowUps?.toString() || "0",
        ) ||
        addon.minValue ||
        0
      );
    } else if (addon.key === "hr-workflow-automation") {
      return (
        parseInt(
          customPlan.metadata?.includedHrWorkflowAutomations === "infinity"
            ? "50"
            : customPlan.metadata?.includedHrWorkflowAutomations?.toString() ||
                "0",
        ) ||
        addon.minValue ||
        0
      );
    }

    return 0;
  }, [addon, customPlan]);

  const setNewLimits = (newvalue: number) => {
    let newLimits: WorkspaceLimits = {
      ...customPlan.limits,
    };
    if (
      customPlan?.features?.find((feature) => feature.key === "custom-branding")
    ) {
      // If custom-branding is selected, we skip
      return;
    }

    if (addon.key === "add-team-member") {
      if (
        newvalue <
        (customPlan?.metadata?.includedTeamMembers === "infinity"
          ? 50
          : customPlan?.metadata?.includedTeamMembers || 0)
      ) {
        return;
      }
      newLimits.maxTeamMembers = newvalue;
    }
    if (addon.key === "analytics-reporting") {
      if (
        newvalue <
        (customPlan?.metadata?.includedAnalyticsReports === "infinity"
          ? 50
          : customPlan?.metadata?.includedAnalyticsReports || 0)
      ) {
        return;
      }
      newLimits.maxAnalyticsReports = newvalue;
    }
    if (addon.key === "human-follow-up") {
      if (
        newvalue <
        (customPlan?.metadata?.includedHumanFollowUps === "infinity"
          ? 50
          : customPlan?.metadata?.includedHumanFollowUps || 0)
      ) {
        return;
      }
      newLimits.maxHumanFollowUps = newvalue;
    }
    if (addon.key === "hr-workflow-automation") {
      if (
        newvalue <
        (customPlan?.metadata?.includedHrWorkflowAutomations === "infinity"
          ? 50
          : customPlan?.metadata?.includedHrWorkflowAutomations || 0)
      ) {
        return;
      }
      newLimits.maxHrWorkflowAutomations = newvalue;
    }
    setCustomPlan({
      ...customPlan,
      limits: newLimits,
      addonsPrices: prebBuildAddons,
    });
  };

  return (
    <div>
      <div>
        <div className="flex flex-row gap-2 w-full ">
          <HerouiSlider
            classNames={{
              label: "text-medium",
            }}
            color="primary"
            label={
              <div>
                {properAddonInvoiceQuery?.isPending ? (
                  <Skeleton className="w-20 h-5 rounded-large" />
                ) : (
                  `${addon.name} - ${
                    properAddonInvoiceQuery.data?.invoice?.currency?.toUpperCase() ===
                    "USD"
                      ? "$"
                      : properAddonInvoiceQuery.data?.invoice?.currency?.toUpperCase() ===
                          "EUR"
                        ? "€"
                        : properAddonInvoiceQuery.data?.invoice?.currency?.toUpperCase() ===
                            "GBP"
                          ? "£"
                          : ""
                  } ${
                    properAddonInvoiceQuery.data?.invoice?.total
                      ? properAddonInvoiceQuery.data?.invoice?.total /
                        100 /
                        finalQuantity
                      : "0"
                  }`
                )}
              </div>
            }
            maxValue={addon.maxValue || 10}
            minValue={minValue}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderValue={({ children, ...props }) => (
              <output {...props}>
                <input
                  aria-label={addon.name}
                  className="size-8 text-center text-small text-default-700 font-medium border-2 border-primary-500 outline-hidden transition-colors rounded-lg"
                  type="text"
                  value={addonCurrentValue}
                  onChange={(e) => {
                    const v = e.target.value;

                    if (Number(v) < minValue) {
                      return;
                    }

                    if (Number(v) > (addon.maxValue || 10)) {
                      return;
                    }

                    setAddonCurrentValue(Number(v));
                  }}
                />
              </output>
            )}
            size="sm"
            // we extract the default children to render the input
            step={addon.step || 1}
            value={addonCurrentValue}
            onChange={(value) => {
              if (isNaN(Number(value))) return;

              setAddonCurrentValue(Number(value));
              setNewLimits(Number(value));
            }}
          />
        </div>
      </div>
      <p className="text-small opacity-80 w-full text-left">
        {addon.key === "add-team-member"
          ? `Free ${customPlan?.metadata?.includedTeamMembers} Team Member(s) with plan`
          : addon.key === "analytics-reporting"
            ? `Free ${customPlan?.metadata?.includedAnalyticsReports === "infinity" ? "50" : customPlan?.metadata?.includedAnalyticsReports?.toString() || "0"} Analytics Report(s) with plan`
            : addon.key === "human-follow-up"
              ? `Free ${customPlan?.metadata?.includedHumanFollowUps === "infinity" ? "50" : customPlan?.metadata?.includedHumanFollowUps?.toString() || "0"} Human Follow Up(s) with plan`
              : addon.key === "hr-workflow-automation"
                ? `Free ${customPlan?.metadata?.includedHrWorkflowAutomations === "infinity" ? "50" : customPlan?.metadata?.includedHrWorkflowAutomations?.toString() || "0"} Hr Workflow Automation(s) with plan`
                : ""}
      </p>
    </div>
  );
}
