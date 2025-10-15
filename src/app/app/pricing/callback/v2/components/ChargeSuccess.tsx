"use client";

import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { formatNumCommas } from "@root/shared/utils";
import { GetStripeCustomPlanModel } from "@root/shared/zod-schemas";
import { useSearchParams } from "next/navigation";
import { FC, useState, useMemo } from "react";
import Confetti from "react-confetti";

const ChargeSuccess: FC<{
  orderDetails: GetStripeCustomPlanModel;
}> = ({ orderDetails }) => {
  const { activeWorkspace } = useActiveWorkspace();

  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");

  const [isLoading, setIsLoading] = useState(true);
  const [sessionResult, setSessionResult] = useState<any>(null);

  console.log("orderDetails", orderDetails);

  const confetti = useMemo(() => {
    return (
      <Confetti
        style={{
          zIndex: 1,
          position: "fixed",
          top: 0,
          left: 0,
        }}
        width={window?.innerWidth}
        height={window?.innerHeight}
      />
    );
  }, []);

  return (
    <div className="p-10 relative w-full ">
      {orderDetails?.status === "complete" ? confetti : null}
      <div
        key="you-just-bought-yaay"
        className="bg-background border border-foreground-300 rounded-large p-8 w-full lg:w-[65%] max-w-[650px] shadow mx-auto text-center fcc relative z-20"
      >
        <div className="mb-5">
          <h1 className="font-bold text-3xl mb-4">🎉 Let Your Interviews Shine!</h1>
          {/* <p className='mb-3 opacity-80'>You have earned the supporter badge forever! <strong>you can always replace the branding on all VG products now</strong> and will have early access of some of our experimental features.</p> */}
          <p className="block mb-3 opacity-80">
            You can now fully rebrand all TIXAE Interviews to reflect your own
            branding, don't forget to message Moe (@moe_03) on{" "}
            <a target="_blank" href="https://discord.gg/XfGSgJDPUa">
              Discord
            </a>{" "}
            or{" "}
            <a target="_blank" href="https://t.me/moex03">
              Telegram
            </a>{" "}
            if you ever face any issues, always glad to help :D
          </p>
          <p className="font-bold text-2xl my-5">
            +{formatNumCommas(Number(orderDetails?.limits?.maxInterviews ?? 0))}{" "}
            Interviews{" "}
            +
            {orderDetails?.billingCycle === "monthly" ? "/month" : ""}{" "}
            {orderDetails?.billingCycle === "yearly"
              ? "/month for 12 months"
              : ""}
          </p>
          <p className="font-bold text-2xl my-5">
            +{formatNumCommas(Number(orderDetails?.limits?.maxMinutes ?? 0))}{" "}
            Minutes of AI Interview{" "}
            +
            {orderDetails?.billingCycle === "monthly" ? "/month" : ""}{" "}
            {orderDetails?.billingCycle === "yearly"
              ? "/month for 12 months"
              : ""}
          </p>
          <p className="font-bold text-2xl my-5">
            +{formatNumCommas(Number(orderDetails?.limits?.maxVerifications ?? 0))}{" "}
            Verifications{" "}
            +
            {orderDetails?.billingCycle === "monthly" ? "/month" : ""}{" "}
            {orderDetails?.billingCycle === "yearly"
              ? "/month for 12 months"
              : ""}
          </p>
          {orderDetails?.features?.find(
            (feature) => feature.key === "custom-branding"
          ) ? (
            <p className="text-sm opacity-80">
              You have the whitelabel addon,{" "}
              <strong>
                pleaes join our private discord for extremely fast dev team
                responses, support and tips to take your AI services to the next
                level!{" "}
                <a href="https://discord.gg/XfGSgJDPUa" target="_blank">
                  https://discord.gg/XfGSgJDPUa
                </a>
              </strong>
            </p>
          ) : null}
          <p className="text-sm opacity-80 mt-3">
            InvoiceID: {orderDetails?.id} You can find all your purchase
            history in your account settings, if you need any help feel free to
            contact us.
          </p>
          <p>
            Reminder: Review our Terms of Service (TOS). TL;DR: You have a
            14-day money-back guarantee for paid features and any unused
            credits.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChargeSuccess;