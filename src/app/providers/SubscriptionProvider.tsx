"use client";

import { FC, PropsWithChildren, useEffect, useMemo, useState } from "react";
import { useActiveWorkspace } from "../hooks/workspace.hook";
import { Customer, PaymentMethod, Subscription } from "../contexts/subscription.context";
import { useGAuth } from "../hooks/guath.hook";
import { api } from "@root/trpc/react";
import { SubscriptionContext } from "../contexts/subscription.context";
import Stripe from "@stripe/stripe-js";

export const SubscriptionProvider: FC<PropsWithChildren> = ({ children }) => {
  // Get active workspace and gauth user
  const { activeWorkspace } = useActiveWorkspace();

  // State for subscription data
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [internalKeyRef, setInternalKeyRef] = useState<string | null>(null);
  const [subscriptionItems, setSubscriptionItems] = useState<any[] | undefined>(undefined);
  const [currency, setCurrency] = useState<string>("usd");

  // Get user data from stripe (if user is logged in)
  const { data: stripeUserDate, refetch: getStripeUserDate } = api.auth.getStripeUserDate.useQuery(
    { workspaceId: activeWorkspace?.id },
    { enabled: !!activeWorkspace?.id }
  );

  const refreshSubscriptionData = async () => {
    // Make sure we have a valid workspaceId
    if (!activeWorkspace?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const stripeUserDate = await getStripeUserDate();

      console.log(stripeUserDate);

      setCustomer(stripeUserDate?.data?.customer as Customer);
      setSubscriptions(stripeUserDate?.data?.subscriptions as unknown as Subscription[]);
      setPaymentMethod(stripeUserDate?.data?.paymentMethod || null);
      setInternalKeyRef(stripeUserDate?.data?.internalKeyRef || null);
      setCurrency(stripeUserDate?.data?.currency || "usd");
      setSubscriptionItems(stripeUserDate?.data?.productsDetails);

      setIsLoading(false);
    } catch (error: any) {
      setError(error.message || "An error occurred while fetching subscription data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (activeWorkspace?.id) {
      refreshSubscriptionData();
    } else {
      setIsLoading(false);
    }
  }, [activeWorkspace]);

  const activeSubscription = useMemo(() => {
    return subscriptions.find(sub => sub.status === 'active') || subscriptions[0] || null;
  }, [subscriptions]);

  return (
    <SubscriptionContext.Provider value={{
      customer,
      subscriptions,
      paymentMethod,
      internalKeyRef: internalKeyRef || "",
      subscriptionItems: subscriptionItems || [],
      currency,
      activeSubscription,
      isLoading,
      error,
      refreshSubscriptionData,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}