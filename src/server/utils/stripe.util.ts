import { stripeService, stripeVerificationService } from "@root/lib/stripe.lib";
import { featuresList, StripeCustomPlanModel, StripeProductAddonModel, VerificationImages } from "@root/shared/zod-schemas";
import Stripe from "stripe";
import { sendAntiSpamEmail } from "./resend.util";
import { getPriceIdForAddon } from "@root/shared/utils";

/**
 * Traverse all products from Stripe that match the query with pagination
 *
 * This will be used to get all plans and addons that have the metadata
 * site: "tixae_interviewer"
 *
 * @param query
 *     The query to search for products
 *
 * @param limit
 *     The limit of products to return
 *
 * @returns
 *     All products from Stripe that match the query
 */
export const traverseProducts = async (query: string, limit: number = 100) => {
  let allProducts: Stripe.Product[] = [];
  let hasMore = true;
  let nextPage: string | null = null;

  let productsResponse = await stripeService().searchProducts({
    query,
    limit,
  });
  allProducts = [...allProducts, ...productsResponse.data];
  hasMore = productsResponse.has_more;
  nextPage = productsResponse.next_page;

  while (hasMore && nextPage) {
    productsResponse = await stripeService().searchProducts({
      query,
      limit,
      page: nextPage,
    });
    allProducts = [...allProducts, ...productsResponse.data];
    hasMore = productsResponse.has_more;
    nextPage = productsResponse.next_page;
  }

  return allProducts;
};

/**
 * Format a Stripe product to an addon model for the pricing page
 *
 * @param product
 *     The Stripe product to format
 *
 * @param inputPrices
 *     The input prices to use for the addon (optional) If not provided
 *     it will be fetched from Stripe
 *
 * @param currency
 *     The currency to use for the addon (optional) If not provided
 *     it will be "usd"
 *
 * @returns
 *     The formatted addon
 */
export const formatStripeProductToAddon = async (
  product: Stripe.Product,
  inputPrices: Stripe.Price[] = [],
  currency: string = "usd",
): Promise<StripeProductAddonModel> => {
  const prices = inputPrices?.length > 0
    ? inputPrices
    : await stripeService().getPriceForProduct(product.id, currency).then(res => res.data);
  const addonKey = product.metadata.addon_key_ref as StripeProductAddonModel["key"];

  return {
    key: addonKey,
    name: product.name,
    description: product.description || "",
    stripePrices: prices.map(price => ({
      billingCycle: price.recurring?.interval === "month" ? "monthly" : "yearly",
      priceId: price.id,
      usdAmount: (price.unit_amount || 0) / 100,
      currency: price.currency,
    })),
    step: 1,
    minValue: 0,
    maxValue: addonKey !== "custom-branding" && addonKey !== "mini-whitelabel" ? 10 : 0,
    isFeature: addonKey === "custom-branding",
  }
};

/**
 * Format a Stripe product to a plan model for the pricing page
 *
 * @param product
 *     The Stripe product to format
 *
 * @param inputPrices
 *     The input prices to use for the plan (optional) If not provided
 *     it will be fetched from Stripe
 *
 * @param currency
 *     The currency to use for the plan (optional) If not provided
 *     it will be "usd"
 *
 * @returns
 *     The formatted plan
 */
export const formatStripeProductToPlan = async (
  product: Stripe.Product,
  inputPrices: Stripe.Price[] = [],
  currency: string = "usd",
): Promise<StripeCustomPlanModel> => {
  const prices = inputPrices?.length > 0
    ? inputPrices
    : await stripeService().getPriceForProduct(product.id, currency).then(res => res.data);

  return {
    billingCycle: "monthly",
    userId: product.metadata?.user_id || "",
    key: product.metadata?.internal_key_ref || "",
    name: product.name,
    description: product.description || "",
    limits: {
      maxInterviews: parseInt(product.metadata.included_interviews || "0"),
      maxMinutes: parseInt(product.metadata.included_minutes || "0"),
      maxVerifications: parseInt(product.metadata.included_verifications || "0"),
      maxTeamMembers: parseInt(product.metadata.included_team_members || "0"),
    },
    metadata: {
      includedInterviews: parseInt(product.metadata.included_interviews || "0"),
      includedMinutes: parseInt(product.metadata.included_minutes || "0"),
      includedVerifications: parseInt(product.metadata.included_verifications || "0"),
      includedTeamMembers: parseInt(product.metadata.included_team_members || "0"),
    },
    stripePrices: [
      ...prices.map(price => ({
        billingCycle: price.recurring?.interval === "month" ? "monthly" : "yearly" as "monthly" | "yearly",
        priceId: price.id,
        usdAmount: (price.unit_amount || 0) / 100,
        currency: price.currency,
      }))
    ],
    features: featuresList.filter(feature => feature.freeTier?.enabled === 'always'),
    marketingStatements: product.marketing_features?.map(feature => feature.name || '') || []
  }
};

/**
 * Determine the addons to add to a plan
 *
 * @param plan
 *     The plan to determine the addons for
 *
 * @returns
 *     The addons to add to the plan
 */
export const addonsToAddToPlan = (
  plan: StripeCustomPlanModel
): { additionalAddons: { price: string; quantity: number }[] } => {
  const additionalAddons: { price: string; quantity: number }[] = [];

  const needWhiteLabel = plan.features?.find(feat => feat.key === "custom-branding");
  if (needWhiteLabel) {
    const whiteLabelAddonPriceId = plan
      .addonsPrices
      ?.find(price => price.key === "custom-branding")
      ?.stripePrices
      ?.find(price => price.billingCycle === plan.billingCycle)
      ?.priceId || "";
    if (whiteLabelAddonPriceId) {
      additionalAddons.push({ price: whiteLabelAddonPriceId, quantity: 1 });
    }
  } else {
    if (
      (plan?.metadata?.includedTeamMembers || 0) <
      (plan?.limits?.maxTeamMembers || 0)
    ) {
      const priceIdToUse = getPriceIdForAddon(plan, "add-team-member");
      if (priceIdToUse) {
        additionalAddons.push({
          price: priceIdToUse,
          quantity:
            (plan?.limits?.maxTeamMembers === "infinity" ? 50 : plan?.limits?.maxTeamMembers || 0) -
            (plan?.metadata?.includedTeamMembers === "infinity" ? 50 : plan?.metadata?.includedTeamMembers || 0),
        });
      }
    }

    if (
      (plan?.metadata?.includedAnalyticsReports || 0) <
      (plan?.limits?.maxAnalyticsReports || 0)
    ) {
      const priceIdToUse = getPriceIdForAddon(plan, "analytics-reporting");
      if (priceIdToUse) {
        additionalAddons.push({
          price: priceIdToUse,
          quantity:
            (plan?.limits?.maxAnalyticsReports === "infinity" ? 50 : plan?.limits?.maxAnalyticsReports || 0) -
            (plan?.metadata?.includedAnalyticsReports === "infinity" ? 50 : plan?.metadata?.includedAnalyticsReports || 0),
        });
      }
    }

    if (
      (plan?.metadata?.includedHumanFollowUps || 0) <
      (plan?.limits?.maxHumanFollowUps || 0)
    ) {
      const priceIdToUse = getPriceIdForAddon(plan, "human-follow-up");
      if (priceIdToUse) {
        additionalAddons.push({
          price: priceIdToUse,
          quantity:
            (plan?.limits?.maxHumanFollowUps === "infinity" ? 50 : plan?.limits?.maxHumanFollowUps || 0) -
            (plan?.metadata?.includedHumanFollowUps === "infinity" ? 50 : plan?.metadata?.includedHumanFollowUps || 0),
        });
      }
    }

    if (
      (plan?.metadata?.includedHrWorkflowAutomations || 0) <
      (plan?.limits?.maxHrWorkflowAutomations || 0)
    ) {
      const priceIdToUse = getPriceIdForAddon(plan, "hr-workflow-automation");
      if (priceIdToUse) {
        additionalAddons.push({
          price: priceIdToUse,
          quantity:
            (plan?.limits?.maxHrWorkflowAutomations === "infinity" ? 50 : plan?.limits?.maxHrWorkflowAutomations || 0) -
            (plan?.metadata?.includedHrWorkflowAutomations === "infinity" ? 50 : plan?.metadata?.includedHrWorkflowAutomations || 0),
        });
      }
    }
  }

  const needsMiniWhiteLabel = plan.features?.find(feat => feat.key === "mini-whitelabel");
  if (needsMiniWhiteLabel) {
    const miniWhiteLabelAddonPriceId = plan
      .addonsPrices
      ?.find(price => price.key === "mini-whitelabel")
      ?.stripePrices
      ?.find(price => price.billingCycle === plan.billingCycle)
      ?.priceId || "";
    if (miniWhiteLabelAddonPriceId) {
      additionalAddons.push({ price: miniWhiteLabelAddonPriceId, quantity: 1 });
    }
  }

  return { additionalAddons };
};

/**
 * Try to charge a customer for an amount and send an email to the customer
 * if the invoice is paid successfully and the customer email is provided.
 *
 * @param input
 *     The input for the function including the customer id, subscription id,
 *     amount, currency, stripe account id, description of payment (why),
 *     coupon, and customer email.
 *
 * @returns
 *     The paid invoice.
 */
export const tryChargeCustomerAmount = async (input: {
  customerId: string;
  subscriptionId: string;
  amount: number; // In the smallest currency unit, e.g. 2000 for $20.00 in USD
  currency: string; // e.g. 'usd'
  stripeAccountId?: string;
  why?: string;
  coupon?: string;
  customerEmail: string;
}): Promise<Stripe.Invoice> => {
  // 1. Create an invoice item for a one-time custom amount
  const invoiceItem = await stripeService().createInvoiceItem({
    customer: input.customerId,
    amount: input.amount,
    currency: input.currency,
    description: input.why || "Additional charge for subscription",
  });

  // 2. Create the invoice, linking to the existing subscription
  const invoice = await stripeService().createInvoice({
    customer: input.customerId,
    subscription: input.subscriptionId,
    description: input.why || "Additional charge for subscription",
    coupon: input.coupon,
  });

  let paidInvoice: Stripe.Invoice | null = null;

  try {
    paidInvoice = await stripeService().payInvoice(invoice.id!, ["payment_intent"]);
  } catch (error) {
    await stripeService().deleteInvoiceItem(invoiceItem.id);
    await stripeService().deleteInvoice(invoice.id!);
    throw error;
  }

  const invoicePermanentLink = await stripeService().retrieveInvoice(paidInvoice.id!);

  if (input.customerEmail) {
    sendAntiSpamEmail({
      to: input.customerEmail,
      emailTemplate: "invoicePaid",
      locals: {
        why: input.why || "additional charge for subscription",
        invoicePermanentLink: invoicePermanentLink.hosted_invoice_url || "",
      },
    });
  }

  return paidInvoice;
};

/**
 * Get the verification images from a verification session
 *
 * @param sessionId
 *     The ID of the verification session
 *
 * @returns
 *     The verification images
 */
export const getVerificationImages = async (sessionId: string): Promise<VerificationImages> => {
  try {
    const session = await stripeVerificationService().retrieveVerificationSession(sessionId);

    if (session.status !== "verified") {
      throw new Error("Verification session is not verified");
    }

    const images: VerificationImages = {
      documentFiles: [],
    };

    // Get verification report if available
    if (session.last_verification_report) {
      const report = await stripeVerificationService().retrieveVerificationReport(
        session.last_verification_report as string
      );

      const document = report.document as any;
      if (document?.front) {
        const frontFile = await stripeVerificationService().createFileLink({
          file: document.front as string,
          expires_at: Math.floor(Date.now() / 1000) + 30,
        });
        images.idDocumentFrontUrl = frontFile.url || undefined;
      }

      if (document?.back) {
        const backFile = await stripeVerificationService().createFileLink({
          file: document.back as string,
          expires_at: Math.floor(Date.now() / 1000) + 30,
        });
        images.idDocumentBackUrl = backFile.url || undefined;
      }

      console.log("Document files", document?.files);
      if (document?.files) {
        for (const file of document.files) {
          console.log("Current document file", file);
          const fileLink = await stripeVerificationService().createFileLink({
            file: file as string,
            expires_at: Math.floor(Date.now() / 1000) + 30,
          });
          console.log("Current document file link", fileLink.url);
          images.documentFiles?.push(fileLink.url || "");
          console.log("Images Now", images.documentFiles);
        }
      }

      // Extract selfie image
      const selfie = report.selfie as any;
      if (selfie) {
        const selfieFile = await stripeVerificationService().createFileLink({
          file: selfie.document as string,
          expires_at: Math.floor(Date.now() / 1000) + 30,
        });
        images.selfieUrl = selfieFile.url || undefined;
      }
    }

    return images;
  } catch (error) {
    console.error("Error retrieving verification images:", error);
    throw error;
  }
};
