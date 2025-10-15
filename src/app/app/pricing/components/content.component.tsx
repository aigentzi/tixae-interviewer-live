"use client";

import { featuresList, StripeCustomPlanModel } from "@root/shared/zod-schemas";
import { useState } from "react";
import { useSubscription } from "@root/app/hooks/subscription.hook";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { api } from "@root/trpc/react";
import { Button } from "@root/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { BillingPreBuiltPlans } from "./BillingPreBuiltPlans";
import InlineNotification from "@root/app/components/InlineNotification";

export const PricingContent = () => {
  const { activeWorkspace } = useActiveWorkspace();
  const { currency } = useSubscription();
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

  const [customPlan, setCustomPlan] = useState<StripeCustomPlanModel>({
    userId: activeWorkspace?.id || "",
    name: "custom",
    features: featuresList.slice(0, 1),
    limits: {
      maxInterviews: 2,
      maxMinutes: 30,
      maxVerifications: 1,
      maxTeamMembers: 1,
    },
    billingCycle: "monthly",
  });

  const plansQuery = api.stripe.getPlans.useQuery({
    currency: currency,
  });

  const updateSubscriptionMutation =
    api.stripe.updateCustomerSubscription.useMutation({
      onSuccess: (data) => {
        setNotification({ type: "success", message: `Subscription Updated` });
      },
      onError: (error) => {
        setNotification({ type: "error", message: error.message });
      },
    });

  const subscribeMutation = api.stripe.subscribeToPlan.useMutation({
    onSuccess: (data) => {
      if (data?.session?.url) {
        window.location.href = data?.session?.url;
      } else if (data?.session?.is_update) {
        setNotification({ type: "success", message: `Subscription Updated` });
      } else if (data?.session?.error_message) {
        setNotification({
          type: "error",
          message: data?.session?.error_message,
        });
      }
    },
    onError: (error) => {
      setNotification({ type: "error", message: error.message });
    },
  });

  return (
    <div className="flex flex-wrap w-full justify-center">
      <div className="flex flex-col flex-wrap w-full">
        <div className="w-full max-w-3xl mx-auto mb-2">
          {notification && (
            <InlineNotification
              type={notification.type}
              message={notification.message}
              onClose={() => setNotification(null)}
            />
          )}
        </div>
        <div className="flex flex-col w-full justify-center items-center gap-4 text-center col-span-full relative z-[20] mb-4">
          {activeWorkspace?.customPlan?.key ? (
            <p className="tracking-tight text-4xl font-bold text-center leading-none">
              Current Subscription:
            </p>
          ) : (
            <p className="tracking-tight text-4xl font-bold leading-none">
              Established or starting out, <br /> we got a plan for you.
            </p>
          )}
          <p>
            <span className="font-normal">
              {activeWorkspace?.customPlan?.key
                ? ``
                : `Remove powered by ${process.env.NEXT_PUBLIC_BRAND_NAME} for free in web widget when you become a paid user!`}
            </span>
          </p>
        </div>
        <div className="flex justify-center items-center gap-2 bg-content2 rounded-lg p-1 border border-foreground-200 mx-auto mb-2">
          <Button
            isDisabled={activeWorkspace?.customPlan?.key ? true : false}
            size="sm"
            className="lg:w-32 w-20 font-light"
            variant={
              customPlan.billingCycle === "monthly" ? "solid" : "bordered"
            }
            onPress={() => {
              const planSelected = plansQuery.data?.plans?.find(
                (plan) => plan.key === (customPlan.key || "starter")
              );
              setCustomPlan((prev) => ({
                userId: activeWorkspace?.id || "",
                ...planSelected,
                billingCycle: "monthly",
              }));
            }}
            color={
              customPlan.billingCycle === "monthly" ? "primary" : "default"
            }
          >
            Monthly
          </Button>
          <Button
            isDisabled={activeWorkspace?.customPlan?.key ? true : false}
            size="sm"
            className="lg:w-32 w-20 font-light"
            variant={
              customPlan.billingCycle === "yearly" ? "solid" : "bordered"
            }
            onPress={() => {
              const planSelected = plansQuery.data?.plans?.find(
                (plan) => plan.key === (customPlan.key || "starter")
              );
              setCustomPlan((prev) => ({
                userId: activeWorkspace?.id || "",
                ...planSelected,
                billingCycle: "yearly",
              }));
            }}
            color={customPlan.billingCycle === "yearly" ? "primary" : "default"}
          >
            Yearly
          </Button>
        </div>
        <div className="w-72 mx-auto col-span-full relative z-[20]">
          {activeWorkspace?.customPlan?.key ? (
            <p className="text-small opacity-80 text-center">
              Please contact support to change billing cycle or wait for next
              billing cycle {">"} cancel immediately below {">"} subscribe with
              new selected cycle.
            </p>
          ) : (
            <p className="text-small opacity-80 text-center">
              2 months for free with yearly subscriptions
            </p>
          )}
        </div>
        <div className="w-full min-h-[600px] relative">
          <AnimatePresence>
            <BillingPreBuiltPlans
              customPlan={customPlan}
              setCustomPlan={setCustomPlan}
              onPlanSelect={(plan: StripeCustomPlanModel, coupon: string) => {
                // This function should only be called after confirmation
                if (
                  activeWorkspace?.customPlan?.key &&
                  activeWorkspace?.stripeSubscriptionId
                ) {
                  // updateSubscription is only called after confirmation via the AccountBillingUpdateConfirm component
                  const newPrices =
                    plan.stripePrices?.map((price) => ({
                      billingCycle: price.billingCycle,
                      priceId: price.priceId,
                      usdAmount: price.usdAmount,
                    })) || [];
                  updateSubscriptionMutation.mutate({
                    workspaceId: activeWorkspace?.id || "",
                    customPlan: plan,
                    oldPlan: activeWorkspace?.customPlan,
                    coupon: coupon,
                  });
                } else {
                  // For new subscriptions
                  console.log("I will run this for new subscriptions");
                  subscribeMutation.mutate({
                    workspaceId: activeWorkspace?.id || "",
                    plan: plan,
                    couponId: coupon,
                  });
                }
              }}
              isLoading={plansQuery.isLoading}
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
