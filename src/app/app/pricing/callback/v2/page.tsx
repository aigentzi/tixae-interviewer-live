"use client";

import { useActiveWorkspace } from "@root/app/hooks/workspace.hook";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ChargeSuccess from "./components/ChargeSuccess";
import ChargeFailure from "./components/ChargeFailure";
import { FullScreenLoader } from "@root/app/components/FullScreenLoader";

const AccountBillingCheckout = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");
  const [sessionResult, setSessionResult] = useState<any>(null);
  const { activeWorkspace } = useActiveWorkspace();

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    // Send webhook to update the subscription
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe/session-status?session_id=${sessionId
      }&v2=true`).then(async (res) => {
        const data = await res.json();
        setSessionResult(data);
      });
  }, [sessionId]);

  if (!sessionResult || !activeWorkspace?.id) return <FullScreenLoader />;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      {sessionResult?.status === "complete" ? (
        <Suspense fallback={<FullScreenLoader />}>
          <ChargeSuccess orderDetails={sessionResult} />
        </Suspense>
      ) : (
        <Suspense fallback={<FullScreenLoader />}>
          <ChargeFailure orderDetails={sessionResult} />
        </Suspense>
      )}
    </div>
  );
};

const AccountBillingCheckoutPage = () => {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AccountBillingCheckout />
    </Suspense>
  );
};

export default AccountBillingCheckoutPage;
