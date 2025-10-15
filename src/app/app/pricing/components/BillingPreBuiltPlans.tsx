import { Checkbox, Input } from "@heroui/react";
import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { Button } from "@root/components/ui/button";
import { Skeleton } from "@root/components/ui/skeleton";
import { getPriceFromCustomPlan } from "@root/shared/utils";
import {
  addonsKeys,
  StripeCustomPlanModel,
  StripeProductAddonModel,
} from "@root/shared/zod-schemas";
import { api } from "@root/trpc/react";
import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { FaCheck, FaFax } from "react-icons/fa";
import InlineNotification from "@root/app/components/InlineNotification";
import { z } from "zod";
import { CustomAddonSlider } from "./CustomAddonSlider";

export const BillingPreBuiltPlanCard: FC<{
  plan: StripeCustomPlanModel;
  customPlan: StripeCustomPlanModel;
  canEditSubscription: boolean;
  isAlreadySubbedPlan: boolean;
  prebBuildPlans: StripeCustomPlanModel[];
  prebBuildAddons: StripeProductAddonModel[];
  setCustomPlan: Dispatch<SetStateAction<StripeCustomPlanModel>>;
  billingCycle: "monthly" | "yearly";
}> = (props) => {
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);
  const { activeWorkspace } = useActiveWorkspace();
  const isSelected = props.plan.key === props.customPlan.key;

  const planPricePreviewQuery =
    api.stripe.previewUpdateSubscription.useMutation({
      onSuccess: (data) => {
        console.log(`data`, data);
      },
      onError: (error) => {
        console.log(`error`, error);
      },
    });

  useEffect(() => {
    if (props.plan?.stripePrices?.length) {
      planPricePreviewQuery.mutate({
        workspaceId: activeWorkspace?.id || "",
        plan: {
          ...props.plan,
          billingCycle: props.billingCycle || "monthly",
          stripePrices: props.plan.stripePrices?.filter(
            (price) => price.billingCycle === props.billingCycle
          ),
        },
      });
    }
  }, [
    props.billingCycle,
    props.plan?.stripePrices?.length,
    activeWorkspace?.id,
  ]);

  const handleSelectPlan = () => {
    console.log(`props.plan`, props.plan);
    if (props.plan.key === "free" && activeWorkspace?.customPlan?.key) {
      // // cancel subscription if it exists
      // props.handleTryCancelSubscription();
      return;
    }

    const newPlanObj: StripeCustomPlanModel = {
      ...props.plan,
      features: props.plan.features,
      limits: {
        ...props.plan.limits,
        maxInterviews:
          props.plan.metadata?.includedInterviews ||
          props.plan.limits?.maxInterviews,
        maxMinutes:
          props.plan.metadata?.includedMinutes || props.plan.limits?.maxMinutes,
        maxVerifications:
          props.plan.metadata?.includedVerifications ||
          props.plan.limits?.maxVerifications,
        maxTeamMembers:
          props.plan.metadata?.includedTeamMembers ||
          props.plan.limits?.maxTeamMembers,
      },
    };

    console.log(`newPlanObj`, newPlanObj);

    const newStripePrices =
      props.prebBuildPlans
        ?.find((p) => p.key === newPlanObj.key)
        ?.stripePrices?.filter(
          (price) => price.billingCycle === props.billingCycle
        ) || [];

    // console.log(`stripe prices new: `, newStripePrices, `prebuilt plans??`, prebBuildPlans);

    props.setCustomPlan((prev: StripeCustomPlanModel) => {
      return {
        ...prev,
        ...newPlanObj,
        stripePrices: newStripePrices,
        addonsPrices: props.prebBuildAddons,
        billingCycle: props.billingCycle,
      };
    });
  };

  // return (
  //   <div
  //     onClick={() => {
  //       if (props.isAlreadySubbedPlan && !props.canEditSubscription) {
  //         return;
  //       } else {
  //         handleSelectPlan();
  //       }
  //     }}
  //     className={`${isSelected
  //       ? "bg-gradient-to-b from-primary-400 to-primary-600 text-white ring-2 ring-primary ring-offset-2 ring-offset-primary-50 ring-offset-4"
  //       : "from-background/50 to-background/50"
  //       } ${props.plan.key === "free" ? `col-span-full` : ``
  //       } w-auto h-auto relative flex flex-col gap-4 bg-background/50 rounded-large p-4  transition-all border border-foreground-200`}
  //   >
  //     {props.plan.metadata?.mostPopular || props.plan.key === "pro" ? (
  //       <div className="absolute center-absolute-x top-[-15px] bg-primary-50 text-primary-800 px-4 pb-1 rounded-large text-small pt-4 border border-primary">
  //         Most Popular
  //       </div>
  //     ) : null}
  //     <div className="absolute top-5 right-5">
  //       <Checkbox
  //         color="success"
  //         checked={isSelected}
  //         onClick={(e) => e.stopPropagation()}
  //         onChange={handleSelectPlan}
  //       />
  //     </div>
  //     <div className="flex flex-col gap-4 w-full items-start">
  //       <div className="w-full flex flex-col gap-3 items-start">
  //         <div className="font-bold text-2xl leading-none">
  //           {planPricePreviewQuery.isPending ? (
  //             <Skeleton className="w-20 h-8 rounded-large" />
  //           ) : (
  //             <>
  //               {planPricePreviewQuery.data?.invoice?.currency?.toUpperCase() ===
  //                 "USD"
  //                 ? "$"
  //                 : planPricePreviewQuery.data?.invoice?.currency?.toUpperCase() ===
  //                   "EUR"
  //                   ? "€"
  //                   : planPricePreviewQuery.data?.invoice?.currency?.toUpperCase() ===
  //                     "GBP"
  //                     ? "£"
  //                     : ""}
  //               {planPricePreviewQuery.data?.invoice?.total
  //                 ? planPricePreviewQuery.data?.invoice?.total / 100
  //                 : 0}
  //             </>
  //           )}
  //         </div>
  //         <p className="leading-none text-large tracking-tight flex gap-1 items-center justify-center font-bold opacity-100">
  //           {props.plan.icon} {props.plan.name}
  //         </p>
  //         <p className="w-full text-left whitespace-normal text-small leading-[150%] inline gap-1 justify-start items-center opacity-80">
  //           <FaInfo className="w-4 h-4 flex-shrink-0 inline-block mr-1 mb-1" />
  //           {props.plan.description}
  //         </p>
  //       </div>
  //       <div className="py-2 rounded-large flex flex-col gap-2 w-full text-left">
  //         {props.plan.marketingStatements?.map((statement, index) => (
  //           <p
  //             key={index}
  //             className=" text-base flex gap-1 items-center w-full justify-start"
  //           >
  //             <FaCheck className="w-4 h-4 flex-shrink-0 inline-block mr-2" />
  //             <span className="text-base whitespace-normal">{statement}</span>
  //           </p>
  //         ))}
  //       </div>
  //     </div>
  //   </div>
  // );
  return (
    <>
      <div className="w-full">
        <div className="relative z-10 mb-10 overflow-hidden rounded-[10px] border-2 border-default px-8 py-10 shadow-md sm:p-12 lg:px-6 lg:py-10 xl:p-[50px]">
          <span className="mb-3 block text-lg font-semibold text-primary">
            {props.plan.name}
          </span>
          <h2 className="mb-5 text-[42px] font-bold text-foreground">
            {(planPricePreviewQuery.data?.invoice?.total
              ? planPricePreviewQuery.data?.invoice?.total / 100
              : 0
            ).toLocaleString("en-US", {
              style: "currency",
              currency:
                planPricePreviewQuery.data?.invoice?.currency?.toUpperCase() ||
                "USD",
            })}
            <span className="text-base font-medium text-foreground-600">
              {props.plan.billingCycle === "monthly"
                ? `/ ${props.plan.billingCycle}`
                : ""}
            </span>
          </h2>
          <p className="mb-8 border-b border-stroke pb-8 text-base text-body-color dark:border-dark-3 dark:text-dark-6">
            {props.plan.description}
          </p>
          <div className="mb-9 flex flex-col gap-[14px]">
            {props.plan.marketingStatements?.map((statement, index) => (
              <p
                key={index}
                className="text-base flex gap-1 items-center w-full justify-start"
              >
                <FaCheck className="w-4 h-4 flex-shrink-0 inline-block mr-2" />
                <span className="text-base whitespace-normal">{statement}</span>
              </p>
            ))}
          </div>
          <a
            onClick={() => {
              if (props.isAlreadySubbedPlan && !props.canEditSubscription) {
                return;
              } else {
                handleSelectPlan();
              }
            }}
            className={` ${
              isSelected
                ? "block w-full rounded-md border border-primary bg-primary p-3 text-center text-base font-medium text-white transition hover:bg-opacity-90"
                : "block w-full rounded-md border border-stroke bg-transparent p-3 text-center text-base font-medium text-primary transition hover:border-primary hover:bg-primary hover:text-white dark:border-dark-3"
            } `}
          >
            {isSelected ? "Selected" : "Select Plan"}
          </a>
          <div>
            <span className="absolute right-0 top-7 z-[-1]">
              <svg
                width={77}
                height={172}
                viewBox="0 0 77 172"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx={86} cy={86} r={86} fill="url(#paint0_linear)" />
                <defs>
                  <linearGradient
                    id="paint0_linear"
                    x1={86}
                    y1={0}
                    x2={86}
                    y2={172}
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop
                      stopColor={
                        activeWorkspace?.settings?.brandingConfig?.themeColor
                          ?.primary ?? "#3056D3"
                      }
                      stopOpacity="0.09"
                    />
                    <stop
                      offset={1}
                      stopColor={
                        activeWorkspace?.settings?.brandingConfig?.themeColor
                          ?.secondary ?? "#C4C4C4"
                      }
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <span className="absolute right-4 top-4 z-[-1]">
              <svg
                width={41}
                height={89}
                viewBox="0 0 41 89"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="38.9138"
                  cy="87.4849"
                  r="1.42021"
                  transform="rotate(180 38.9138 87.4849)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="38.9138"
                  cy="74.9871"
                  r="1.42021"
                  transform="rotate(180 38.9138 74.9871)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="38.9138"
                  cy="62.4892"
                  r="1.42021"
                  transform="rotate(180 38.9138 62.4892)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="38.9138"
                  cy="38.3457"
                  r="1.42021"
                  transform="rotate(180 38.9138 38.3457)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="38.9138"
                  cy="13.634"
                  r="1.42021"
                  transform="rotate(180 38.9138 13.634)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="38.9138"
                  cy="50.2754"
                  r="1.42021"
                  transform="rotate(180 38.9138 50.2754)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="38.9138"
                  cy="26.1319"
                  r="1.42021"
                  transform="rotate(180 38.9138 26.1319)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="38.9138"
                  cy="1.42021"
                  r="1.42021"
                  transform="rotate(180 38.9138 1.42021)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="26.4157"
                  cy="87.4849"
                  r="1.42021"
                  transform="rotate(180 26.4157 87.4849)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="26.4157"
                  cy="74.9871"
                  r="1.42021"
                  transform="rotate(180 26.4157 74.9871)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="26.4157"
                  cy="62.4892"
                  r="1.42021"
                  transform="rotate(180 26.4157 62.4892)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="26.4157"
                  cy="38.3457"
                  r="1.42021"
                  transform="rotate(180 26.4157 38.3457)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="26.4157"
                  cy="13.634"
                  r="1.42021"
                  transform="rotate(180 26.4157 13.634)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="26.4157"
                  cy="50.2754"
                  r="1.42021"
                  transform="rotate(180 26.4157 50.2754)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="26.4157"
                  cy="26.1319"
                  r="1.42021"
                  transform="rotate(180 26.4157 26.1319)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="26.4157"
                  cy="1.4202"
                  r="1.42021"
                  transform="rotate(180 26.4157 1.4202)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="13.9177"
                  cy="87.4849"
                  r="1.42021"
                  transform="rotate(180 13.9177 87.4849)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="13.9177"
                  cy="74.9871"
                  r="1.42021"
                  transform="rotate(180 13.9177 74.9871)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="13.9177"
                  cy="62.4892"
                  r="1.42021"
                  transform="rotate(180 13.9177 62.4892)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="13.9177"
                  cy="38.3457"
                  r="1.42021"
                  transform="rotate(180 13.9177 38.3457)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="13.9177"
                  cy="13.634"
                  r="1.42021"
                  transform="rotate(180 13.9177 13.634)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="13.9177"
                  cy="50.2754"
                  r="1.42021"
                  transform="rotate(180 13.9177 50.2754)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="13.9177"
                  cy="26.1319"
                  r="1.42021"
                  transform="rotate(180 13.9177 26.1319)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="13.9177"
                  cy="1.42019"
                  r="1.42021"
                  transform="rotate(180 13.9177 1.42019)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="1.41963"
                  cy="87.4849"
                  r="1.42021"
                  transform="rotate(180 1.41963 87.4849)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="1.41963"
                  cy="74.9871"
                  r="1.42021"
                  transform="rotate(180 1.41963 74.9871)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="1.41963"
                  cy="62.4892"
                  r="1.42021"
                  transform="rotate(180 1.41963 62.4892)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="1.41963"
                  cy="38.3457"
                  r="1.42021"
                  transform="rotate(180 1.41963 38.3457)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="1.41963"
                  cy="13.634"
                  r="1.42021"
                  transform="rotate(180 1.41963 13.634)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="1.41963"
                  cy="50.2754"
                  r="1.42021"
                  transform="rotate(180 1.41963 50.2754)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="1.41963"
                  cy="26.1319"
                  r="1.42021"
                  transform="rotate(180 1.41963 26.1319)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
                <circle
                  cx="1.41963"
                  cy="1.4202"
                  r="1.42021"
                  transform="rotate(180 1.41963 1.4202)"
                  fill={
                    activeWorkspace?.settings?.brandingConfig?.themeColor
                      ?.primary ?? "#3056D3"
                  }
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export const BillingPreBuiltPlans: FC<{
  customPlan: StripeCustomPlanModel;
  setCustomPlan: Dispatch<SetStateAction<StripeCustomPlanModel>>;
  onPlanSelect: (plan: StripeCustomPlanModel, coupon: string) => void;
  isLoading: boolean;
  cancelMutation?: typeof api.stripe.cancelSubscription;
}> = (props) => {
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [canEditSubscription, setCanEditSubscription] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [showSliders, setShowSliders] = useState(true);
  const [addons, setAddons] = useState<
    { key: z.infer<typeof addonsKeys>; enabled: boolean }[]
  >([]);

  const { activeWorkspace } = useActiveWorkspace();

  const preBuildPlansQuery = api.stripe.getPlans.useQuery(
    {
      currency: activeWorkspace?.currency || "USD",
    },
    {
      enabled: !!activeWorkspace?.currency,
    }
  );

  const currentPlanPotentialPrice =
    api.stripe.previewUpdateSubscription.useMutation({
      onSuccess: (data) => {
        console.log(`data`, data);
      },
      onError: (error) => {
        console.log(`error`, error);
      },
    });

  const miniWhitelabelAddonPricePreview =
    api.stripe.previewPricesCurrency.useMutation({
      onSuccess: (data) => {
        console.log(`data`, data);
      },
      onError: (error) => {
        console.log(`error`, error);
      },
    });

  const whiteLabelAddonPricePreview =
    api.stripe.previewPricesCurrency.useMutation({
      onSuccess: (data) => {
        console.log(`data`, data);
      },
      onError: (error) => {
        console.log(`error`, error);
      },
    });

  const couponCodeCheck = api.stripe.checkCouponCode.useMutation({
    onSuccess: (data) => {
      console.log(`data`, data);
    },
    onError: (error) => {
      console.log(`error`, error);
    },
  });

  const previewUpdateSubscriptionMutation =
    api.stripe.previewUpdateSubscription.useMutation({
      onSuccess: (data) => {
        console.log(`data`, data);
      },
      onError: (error) => {
        console.log(`error`, error);
      },
    });

  const previewAddonsMutation = api.stripe.previewPricesCurrency.useMutation({
    onSuccess: (data) => {
      console.log(`data`, data);
    },
    onError: (error) => {
      console.log(`error`, error);
    },
  });

  const prebBuildPlans = preBuildPlansQuery.data?.plans || [];
  const prebBuildAddons = preBuildPlansQuery.data?.addons || [];

  const alreadySubbedPlan: StripeCustomPlanModel = activeWorkspace?.customPlan
    ? {
        ...(activeWorkspace?.customPlan as any),
        stripePrices:
          prebBuildPlans?.find(
            (plan) => plan.key === activeWorkspace?.customPlan?.key
          )?.stripePrices || [],
        addonsPrices: prebBuildAddons || [],
      }
    : {};

  useEffect(() => {
    if (activeWorkspace?.stripeSubscriptionId) {
      currentPlanPotentialPrice.mutateAsync({
        workspaceId: activeWorkspace?.id || "",
        plan: alreadySubbedPlan,
        subscriptionId: activeWorkspace?.stripeSubscriptionId,
        isCurrentSubscription: true,
        coupon: coupon,
      });
    }
  }, [activeWorkspace?.stripeSubscriptionId, alreadySubbedPlan?.key, coupon]);

  useEffect(() => {
    if (activeWorkspace?.id || true) {
      preBuildPlansQuery.refetch();
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (props?.customPlan?.key) {
      console.log("previewUpdateSubscriptionMutation", {
        workspaceId: activeWorkspace?.id || "",
        plan: props.customPlan,
        subscriptionId: activeWorkspace?.stripeSubscriptionId,
        isCurrentSubscription: true,
        coupon: coupon,
      });
      previewUpdateSubscriptionMutation.mutate({
        workspaceId: activeWorkspace?.id || "",
        plan: props.customPlan,
        subscriptionId: activeWorkspace?.stripeSubscriptionId || "",
        isCurrentSubscription: true,
        coupon: coupon,
      });
    }
  }, [props?.customPlan, coupon]);

  useEffect(() => {
    if (prebBuildAddons?.length) {
      //  console.log(`prebBuildAddons`, prebBuildAddons);
      miniWhitelabelAddonPricePreview.mutate({
        workspaceId: activeWorkspace?.id || "",
        prices:
          prebBuildAddons
            ?.find((addon) => addon.key === "mini-whitelabel")
            ?.stripePrices?.filter(
              (price: any) =>
                price.billingCycle === props.customPlan.billingCycle
            )
            .map((price: any) => ({
              priceId: price.priceId || "",
              quantity: 1,
            })) || [],
      });
    }
  }, [
    activeWorkspace?.id,
    prebBuildAddons,
    props.customPlan.billingCycle,
    addons,
  ]);

  return (
    <div className="w-full flex flex-col gap-4 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 w-full">
        {preBuildPlansQuery?.isLoading ? (
          <div className="w-full h-full flex gap-4 col-span-full">
            <Skeleton className="w-full h-[350px] rounded-large" />
            <Skeleton className="w-full h-[350px] rounded-large" />
            <Skeleton className="w-full h-[350px] rounded-large" />
          </div>
        ) : null}

        {prebBuildPlans?.map((plan, index) => (
          <BillingPreBuiltPlanCard
            billingCycle={props.customPlan.billingCycle}
            key={index}
            plan={plan}
            customPlan={props.customPlan}
            canEditSubscription={canEditSubscription}
            isAlreadySubbedPlan={!!alreadySubbedPlan?.key}
            prebBuildPlans={prebBuildPlans}
            prebBuildAddons={prebBuildAddons}
            setCustomPlan={props.setCustomPlan}
          />
        ))}
      </div>
      <div className="w-full grid grid-cols-2 gap-10 mt-5">
        <div className="flex flex-col gap-2">
          <div
            id="checkout-area"
            className="col-span-full w-full gap-2 flex flex-col  justify-start text-left rounded-large mt-6"
          >
            <h4 className="m">Checkout</h4>
            <Input
              placeholder="Enter coupon code"
              value={coupon}
              variant="bordered"
              color="primary"
              radius="sm"
              onValueChange={(value) => setCoupon(value)}
            />
            {coupon.length ? (
              <>
                {couponCodeCheck?.isPending ? (
                  <Skeleton className="w-full h-5 rounded-large" />
                ) : couponCodeCheck?.data?.coupon?.percent_off ? (
                  <p className="text-small opacity-80 flex items-center gap-1">
                    Coupon code <FaCheck className="text-success-500" />{" "}
                    {couponCodeCheck?.data?.coupon?.percent_off}% off applied
                  </p>
                ) : (
                  <p className="text-small opacity-80 flex items-center gap-1">
                    Coupon code <FaFax className="text-danger-500" /> is invalid
                  </p>
                )}
              </>
            ) : null}
            <div
              className={`flex gap-2 items-center ${
                alreadySubbedPlan?.key ? "flex-col w-full" : ""
              } `}
            >
              <div className="font-bold text-3xl mb-2 flex flex-col gap-0">
                <span className="leading-none w-48">
                  {previewUpdateSubscriptionMutation?.isPending ? (
                    <Skeleton className="w-48 h-10 rounded-large" />
                  ) : (
                    <>
                      <span className="uppercase">
                        {
                          previewUpdateSubscriptionMutation.data?.invoice
                            ?.currency
                        }
                      </span>{" "}
                      {previewUpdateSubscriptionMutation.data?.invoice?.total
                        ? previewUpdateSubscriptionMutation.data?.invoice
                            ?.total / 100
                        : 0}
                    </>
                  )}
                </span>
                <span className="opacity-80 text-small leading-none">
                  /{props?.customPlan?.billingCycle?.replaceAll(`ly`, ``)}
                </span>
              </div>
              <Button
                size="lg"
                disabled={
                  (coupon && !couponCodeCheck?.data?.coupon?.id) ||
                  props?.customPlan?.key === "free" ||
                  (alreadySubbedPlan?.key &&
                    (!canEditSubscription ||
                      getPriceFromCustomPlan(props.customPlan as any)
                        .priceUsd ===
                        getPriceFromCustomPlan(alreadySubbedPlan as any)
                          .priceUsd))
                    ? true
                    : false
                }
                onClick={() => {
                  if (
                    alreadySubbedPlan?.key &&
                    activeWorkspace?.stripeSubscriptionId
                  ) {
                    setNotification({
                      type: "error",
                      message:
                        "You are already subscribed to a plan. Please cancel your current subscription before subscribing to a new plan.",
                    });
                    return;
                  }
                  console.log(`props.customPlan selected;`, props.customPlan);
                  props.onPlanSelect(props.customPlan, coupon);
                }}
                color="primary"
                className="w-full font-bold mb-2 transition-all"
              >
                {canEditSubscription
                  ? `Change Subscription`
                  : alreadySubbedPlan?.key
                  ? "Already Subscribed"
                  : "Subscribe >"}
              </Button>
            </div>
          </div>
          {showSliders ? (
            prebBuildAddons
              ?.filter(
                (addon) =>
                  addon.key !== "mini-whitelabel" &&
                  addon.key !== "custom-branding" &&
                  addon.key !== "remove-branding"
              )
              ?.map((addon, index) => {
                return (
                  <CustomAddonSlider
                    key={index}
                    addon={addon}
                    customPlan={props.customPlan}
                    setCustomPlan={props.setCustomPlan}
                    prebBuildAddons={prebBuildAddons}
                    alreadySubbedPlan={alreadySubbedPlan}
                    canEditSubscription={canEditSubscription}
                  />
                );
              })
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              <p>Need just 1 more seat?</p>
              <Button
                disabled={props.customPlan.key === "free"}
                className="w-full"
                color="primary"
                variant="bordered"
                onPress={() => {
                  setShowSliders(true);
                }}
              >
                Customize Plan Addons
              </Button>
            </div>
          )}

          {showSliders ? (
            <Button
              variant="light"
              size="sm"
              onPress={() => setShowSliders(false)}
            >
              Hide
            </Button>
          ) : null}
        </div>
        <div
          className={`pl-5 rounded-large ${
            alreadySubbedPlan?.key && !canEditSubscription
              ? "opacity-50 pointer-events-none"
              : ""
          } flex flex-col gap-2`}
        >
          <h3>+ Addons</h3>
          {prebBuildAddons?.find((addon) => addon.key === "mini-whitelabel")
            ?.stripePrices?.length && (
            <div className="flex flex-col gap-2">
              <div className="bg-background border border-foreground-200 hover:border-foreground-300 pl-6 p-4 rounded-large flex flex-col gap-3 w-full">
                <div className="flex items-center gap-2">
                  <h1 className="text-large font-bold">Mini Whitelabel</h1>
                  <p className="text-base opacity-80">
                    {miniWhitelabelAddonPricePreview?.data?.invoice?.currency?.toUpperCase()}{" "}
                    {(miniWhitelabelAddonPricePreview?.data?.invoice?.total ||
                      0) / 100}
                    /{props.customPlan?.billingCycle?.replaceAll("ly", "")}
                  </p>
                  <Button
                    size="sm"
                    color="primary"
                    className="ml-auto"
                    onClick={() => {
                      props.setCustomPlan((prev: any) => {
                        return {
                          ...prev,
                          features: [
                            ...(prev?.features || []),
                            { key: "mini-whitelabel", enabled: true },
                          ],
                        };
                      });
                    }}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-base opacity-80">
                  White label our entire agents' dashboard for 5 clients with
                  your own domain and branding, learn more{" "}
                  <a
                    href="https://docs.tixaeagents.com/whitelabeling/getting-started"
                    target="_blank"
                  >
                    here
                  </a>
                  .
                </p>
                <Checkbox
                  className="p-4 rounded-large bg-content2 w-full max-w-full font-bold"
                  color="primary"
                  isSelected={props.customPlan?.features?.some(
                    (feature) => feature.key === "mini-whitelabel"
                  )}
                  onValueChange={(value) => {
                    // setCanEditSubscription(true);
                    props.setCustomPlan((prev: any) => {
                      return {
                        ...prev,
                        features: [
                          ...(value
                            ? [
                                ...(prev?.features || []),
                                { key: "mini-whitelabel", enabled: value },
                              ]
                            : prev?.features?.filter(
                                (feature: any) =>
                                  feature.key !== "mini-whitelabel"
                              )),
                        ].filter((f: any) => f.key !== "custom-branding"),
                      };
                    });
                  }}
                >
                  Get Addon -{" "}
                  {miniWhitelabelAddonPricePreview?.data?.invoice?.currency?.toUpperCase()}{" "}
                  {(miniWhitelabelAddonPricePreview?.data?.invoice?.total ||
                    0) / 100}
                  /{props.customPlan?.billingCycle?.replaceAll("ly", "")}
                </Checkbox>
                <div className="flex flex-col gap-0">
                  <div className="flex items-center gap-2 ">
                    <FaCheck className="w-4 h-4" />
                    <p>Custom branded dashboard for 5 clients</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {notification && (
        <InlineNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};
