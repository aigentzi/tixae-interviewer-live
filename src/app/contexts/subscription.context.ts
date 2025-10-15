import { createContext } from "react";

export interface SubscriptionItem {
  id: string;
  price: {
    id: string;
    product: string;
    unit_amount: number;
    currency: string;
  };
  quantity: number;
};

export interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  cancel_at?: number | null;
  items: {
    data: SubscriptionItem[];
  };
  metadata: Record<string, string>;
};

export interface Customer {
  id: string;
  name?: string;
  email?: string;
  metadata: Record<string, string>;
};

export interface PaymentMethod {
  id: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
};

export interface SubscriptionContextType {
  isLoading: boolean;
  error: string | null;
  customer: Customer | null;
  subscriptions: Subscription[];
  activeSubscription: Subscription | null;
  paymentMethod: PaymentMethod | null;
  internalKeyRef: string;
  currency: string;
  subscriptionItems: Array<{
    productName: string;
    productMetadata: Record<string, string>;
    quantity: number;
  }>;
  refreshSubscriptionData: () => Promise<void>;
};

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);
