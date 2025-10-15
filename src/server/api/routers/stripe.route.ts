import {
  createTRPCRouter,
  protectedProcedure,
} from "@root/trpc/trpc";
import { z } from "zod";
import {
  addonsToAddToPlan,
  formatStripeProductToAddon,
  formatStripeProductToPlan,
  traverseProducts,
  tryChargeCustomerAmount,
} from "@root/server/utils/stripe.util";
import {
  stripeCustomPlanSchema,
  stripeProductAddonSchema,
} from "@root/shared/zod-schemas";
import { TRPCError } from "@trpc/server";
import { ServiceError } from "@root/lib/service-error.lib";
import { db } from "@root/server/typedFirestore";
import { stripeService } from "@root/lib/stripe.lib";
import { createId } from "@paralleldrive/cuid2";
import Stripe from "stripe";
import { getAppUrl, getPriceFromCustomPlan } from "@root/shared/utils";
import moment from "moment";

export const stripeRouter = createTRPCRouter({
  checkCouponCode: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/stripe/check-coupon-code",
        tags: ["Stripe", "Check Coupon Code"],
        summary: "Check coupon code",
        description: "Check coupon code",
        protect: true,
      },
    })
    .input(
      z.object({
        couponCode: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
        coupon: z.custom<Stripe.Coupon>(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const coupon = await stripeService.retrieveCoupon(input.couponCode);

        return {
          success: true,
          message: "Coupon code checked successfully",
          coupon,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[stripeRouter::checkCouponCode()]").formatMessage(),
        });
      }
    }),

  previewPricesCurrency: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/stripe/preview-prices-currency",
        tags: ["Stripe", "Preview Prices Currency"],
        summary: "Preview prices currency",
        description: "Preview prices currency",
        protect: true,
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        prices: z.array(
          z.object({
            priceId: z.string(),
            quantity: z.number(),
          })
        )
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
        invoice: z.custom<Stripe.Invoice>(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId);
        if (!workspace || workspace.data.ownerId !== ctx.user.uid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to preview prices currency",
          });
        }

        const currency = workspace.data.currency || "usd";
        const prices = input.prices;

        console.log(`prices`, prices);

        const previewInvoice = await stripeService.createInvoicePreview({
          customer: workspace.data.stripeCustomerId || "",
          currency,
          subscription_items: prices.map(price => ({ price: price.priceId, quantity: price.quantity })),
        });

        return {
          success: true,
          message: "Prices currency previewed successfully",
          invoice: previewInvoice,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[stripeRouter::previewPricesCurrency()]").formatMessage(),
        });
      }
    }),

  previewUpdateSubscription: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/stripe/preview-update-subscription",
        tags: ["Stripe", "Preview Update Subscription"],
        summary: "Preview update subscription",
        description: "Preview update subscription",
        protect: true,
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        plan: stripeCustomPlanSchema,
        isCurrentSubscription: z.boolean().optional(),
        subscriptionId: z.string().optional(),
        coupon: z.string().optional(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
        invoice: z.custom<Stripe.Invoice>(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId);
        if (!workspace || workspace?.data?.ownerId !== ctx.user.uid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to update this workspace's subscription",
          });
        }

        const workspaceData = workspace?.data;
        const currency = workspaceData?.currency || "usd";
        const proration_date = Math.floor(Date.now() / 1000);

        let subscription: Stripe.Subscription | null = null;
        if (input.subscriptionId) {
          subscription = await stripeService.retrieveSubscription(
            input.subscriptionId || "",
            ["items.data.price"],
          );
          console.log(`subscription we got??`, subscription);
        }

        const { additionalAddons } = addonsToAddToPlan(input.plan);
        const subItems = subscription?.items?.data;

        const invoice = await stripeService.createInvoicePreview({
          discounts: input.coupon ? [{ coupon: input.coupon }] : undefined,
          currency,
          subscription_items: subItems
            ? subItems.map(item => ({ price: item.price.id }))
            : [
              ...(input
                .plan
                .stripePrices
                ?.filter(price => price.billingCycle === input.plan.billingCycle)
                ?.map(price => ({
                  price: price.priceId,
                })) || []
              ),
              ...(additionalAddons
                ?.map(addon => ({
                  price: addon.price,
                  quantity: addon.quantity,
                })) || []
              ),
            ],
          automatic_tax: { enabled: workspaceData.stripeCustomerId ? true : false },
          customer: workspaceData?.stripeCustomerId || "",
        });

        console.log("subItems to use with prices to preview", subItems
          ? subItems.map(item => ({ price: item.price.id }))
          : [
            ...(input
              .plan
              .stripePrices
              ?.filter(price => price.billingCycle === input.plan.billingCycle)
              ?.map(price => ({
                price: price.priceId,
              })) || []
            ),
            ...(additionalAddons
              ?.map(addon => ({
                price: addon.price,
                quantity: addon.quantity,
              })) || []
            ),
          ]);

        return {
          success: true,
          message: "Invoice preview created successfully",
          invoice,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[stripeRouter::previewUpdateSubscription()]").formatMessage(),
        });
      }
    }),

  getPlans: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/stripe/plans",
        tags: ["Stripe", "Plans", "Get Plans"],
        summary: "Get all plans",
        description: "Get all plans",
        protect: true,
      },
    })
    .input(
      z.object({
        currency: z.string().optional(),
      })
    )
    .output(
      z.object({
        plans: z.array(stripeCustomPlanSchema),
        addons: z.array(stripeProductAddonSchema),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const currency = input.currency || "usd";
        const allProducts = await traverseProducts(`metadata["site"]:"tixae_interviewer"`, 100);
        const addonProducts = allProducts.filter(p => p.metadata.addon_key_ref);
        const planProducts = allProducts.filter(p => p.metadata.internal_key_ref);

        const addonPlans = await Promise.all(
          addonProducts.map(async p => await formatStripeProductToAddon(p, [], currency))
        );
        const subscriptionPlans = await Promise.all(
          planProducts.map(async p => await formatStripeProductToPlan(p, [], currency))
        );

        const returnValue = {
          plans: subscriptionPlans
            .filter((plan) => plan.key !== "pay_as_you_go")
            .map((plan) => ({
              ...plan,
              addonsPrices: addonPlans,
            }))
            .sort(
              (a, b) =>
                (a.stripePrices?.find(
                  (price) => price.billingCycle === "monthly"
                )?.usdAmount || 0) -
                (b.stripePrices?.find(
                  (price) => price.billingCycle === "monthly"
                )?.usdAmount || 0)
            ),
          addons: addonPlans,
        };
        returnValue.plans.map((plan) => {
          plan.stripePrices?.map((price) => {
            price.usdAmount = price.usdAmount * 100;
          });
        })

        // console.log(`returnValue`, returnValue);
        console.log("Parsed returnValue", z.object({
          plans: z.array(stripeCustomPlanSchema),
          addons: z.array(stripeProductAddonSchema),
        }).safeParse(returnValue).error);

        return returnValue;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[stripeRouter::getPlans()]").formatMessage(),
        });
      }
    }),

  updateCustomerSubscription: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/stripe/update-customer-subscription",
        tags: ["Stripe", "Update Customer Subscription"],
        summary: "Update customer subscription",
        description: "Update customer subscription",
        protect: true,
      },
    })
    .input(
      z.object({
        oldPlan: stripeCustomPlanSchema,
        customPlan: stripeCustomPlanSchema,
        coupon: z.string().optional(),
        viewOnly: z.boolean().optional(),
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
        subscription: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 0. Check if the user is the owner of the workspace
        const workspace = await db.workspaces.get(input.workspaceId);
        const user = ctx.user.uid;
        if (!workspace || workspace.data.ownerId !== user) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to update this workspace's subscription",
          });
        }

        // 1. Check if the workspace has a subscription
        if (!workspace.data.stripeSubscriptionId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Workspace does not have a subscription",
          });
        }

        // 3. Retrieve the current subscription
        const currentSubscription = await stripeService.retrieveSubscription(
          workspace.data.stripeSubscriptionId,
          ["items.data.price", "items.data.plan.product"],
        );

        // 4. Check if the subscription is active
        if (currentSubscription.items.data.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Subscription does not exist on Stripe",
          });
        }

        // 5. Determine the items to update
        const subItemsToUpdate = currentSubscription.items.data;
        const { additionalAddons: addonsToAddToPlanItems } = addonsToAddToPlan(input.customPlan);
        const newSubItems = [
          ...(input
            .customPlan
            .stripePrices
            ?.filter(price => price.billingCycle === input.customPlan.billingCycle)
            ?.map(price => ({
              price: price.priceId,
            })) || []),
          ...(addonsToAddToPlanItems
            ?.map(addon => ({
              price: addon.price,
              quantity: addon.quantity,
            })) || []),
        ];

        // 6. Calculate the new price & old price & the difference
        const previewInvoiceForOldPlan = await stripeService.createInvoicePreview({
          customer: workspace.data.stripeCustomerId as string,
          subscription: currentSubscription.id,
        });
        const previewInvoiceForNewPlan = await stripeService.createInvoicePreview({
          customer: workspace.data.stripeCustomerId as string,
          subscription_items: newSubItems,
        });
        const differenceBetweenNewAndCurrentAmount = previewInvoiceForNewPlan.total - previewInvoiceForOldPlan.total;
        if (differenceBetweenNewAndCurrentAmount > 0) {
          // 7. If the new plan is more expensive, we need to charge the user the difference
          const paidInvoice = await tryChargeCustomerAmount({
            coupon: input.coupon,
            customerId: workspace.data.stripeCustomerId || "",
            customerEmail: ctx.user.email || "",
            amount: differenceBetweenNewAndCurrentAmount,
            currency: workspace.data.currency || "usd",
            subscriptionId: currentSubscription.id,
            why: `Updating subscription to new plan and paying the difference of ${differenceBetweenNewAndCurrentAmount / 100
              }.00 ${workspace.data.currency || "usd"}`,
          });

          // 8. If the invoice is not paid, we need to throw an error
          if (!paidInvoice.id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Failed to charge customer for the difference",
            });
          }
        }

        // 9. Update the subscription with the new items
        const newFinalItems = [
          ...subItemsToUpdate.map((item) => ({
            id: item.id,
            deleted: true,
          })),
          ...newSubItems,
        ];

        // 10. Update the subscription with the new items
        const updatedSubscription = await stripeService.updateSubscription({
          subscriptionId: currentSubscription.id,
          items: newFinalItems,
        });

        // 11. Return the updated subscription
        return {
          success: true,
          message: "Subscription updated successfully",
          subscription: updatedSubscription,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[stripeRouter::updateCustomerSubscription()]").formatMessage(),
        });
      }
    }),

  subscribeToPlan: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/stripe/subscribe-to-plan",
        tags: ["Stripe", "Subscribe to Plan"],
        summary: "Subscribe to plan",
        description: "Subscribe to plan",
        protect: true,
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
        couponId: z.string().optional(),
        plan: stripeCustomPlanSchema,
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
        session: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 0. Check if the user is the owner of the workspace
        const workspace = await db.workspaces.get(input.workspaceId);
        if (!workspace || workspace.data.ownerId !== ctx.user.uid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to subscribe to this workspace's plan",
          });
        }

        // 1. Get the additional addons
        const { additionalAddons } = addonsToAddToPlan(input?.plan);

        // 2. Get the customer
        const customer = workspace.data.stripeCustomerId ? {
          id: workspace.data.stripeCustomerId,
        } : await stripeService.createCustomer(
          ctx.user.email || "",
          ctx.user.displayName || ""
        );

        // 3. Update the workspace with the customer id
        await db.workspaces.update(input.workspaceId, {
          stripeCustomerId: customer.id,
        });

        // 4. Get the base price id to use
        let basePriceIdToUse = "";
        const newPricingBasePriceFind =
          input?.plan?.stripePrices?.find(
            (price) => price.billingCycle === input?.plan.billingCycle
          )?.priceId || "";
        if (newPricingBasePriceFind) {
          basePriceIdToUse = newPricingBasePriceFind;
        }

        if (!basePriceIdToUse) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No base price id found for the plan",
          });
        }

        // 5. Create a custom plan id
        const customPlanId = createId();

        // 6. Create the checkout session and create an order
        const session = await stripeService.createCheckoutSession({
          discounts: input?.couponId
            ? [{ coupon: input?.couponId || "" }]
            : undefined,
          currency: workspace.data.currency || "usd",
          customer: customer.id,
          line_items: [
            {
              price: basePriceIdToUse,
              quantity: 1,
            },
            ...(basePriceIdToUse ? additionalAddons : []),
          ],
          metadata: {
            customPlanId,
          },
          success_url: `${getAppUrl()}/pricing/callback/v2?success=true&session_id=${customPlanId}`,
          cancel_url: `${getAppUrl()}/pricing?success=false&session_id=${customPlanId}`,
          allow_promotion_codes: input?.couponId ? undefined : true,
        });

        await db.orders.add({
          id: customPlanId,
          ...input.plan,
          status: "pending",
          USDToPay: getPriceFromCustomPlan(input.plan).priceUsd,
          createdAt: moment().toISOString(),
          ts: moment().unix(),
          stripe: {
            sessionId: session.id,
            customerId: customer.id,
          },
          userId: ctx.user.uid,
          currency: workspace.data.currency || "usd",
        });

        // 7. Return the session
        return {
          success: true,
          message: "Subscription created successfully",
          session,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[stripeRouter::subscribeToPlan()]").formatMessage(),
        });
      }
    }),

  cancelSubscription: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/stripe/cancel-subscription",
        tags: ["Stripe", "Cancel Subscription"],
        summary: "Cancel subscription",
        description: "Cancel subscription",
        protect: true,
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
        subscription: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId);
        if (!workspace || workspace.data.ownerId !== ctx.user.uid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to cancel this workspace's subscription",
          });
        }

        // 1. Cancel the subscription
        const subscriptionId = workspace.data.stripeSubscriptionId || "";
        const canceledSubscription = await stripeService.cancelSubscription(subscriptionId);

        await db.workspaces.update(workspace.ref.id, {
          stripeSubscriptionId: undefined,
          customPlan: undefined,
        });

        // 2. Return the canceled subscription
        return {
          success: true,
          message: "Subscription canceled successfully",
          subscription: canceledSubscription,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[stripeRouter::cancelSubscription()]").formatMessage(),
        });
      }
    }),

  unCancelSubscription: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/stripe/un-cancel-subscription",
        tags: ["Stripe", "Un-Cancel Subscription"],
        summary: "Un-cancel subscription",
        description: "Un-cancel subscription",
        protect: true,
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .output(z.object({
      success: z.boolean(),
      message: z.string(),
      subscription: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await db.workspaces.get(input.workspaceId);
        if (!workspace || workspace.data.ownerId !== ctx.user.uid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to un-cancel this workspace's subscription",
          });
        }

        // 1. Un-cancel the subscription
        const unCanceledSubscription = await stripeService.updateSubscription({
          subscriptionId: workspace.data.stripeSubscriptionId || "",
          cancel_at_period_end: false,
          cancel_at: undefined,
        });

        // 2. Return the un-canceled subscription
        return {
          success: true,
          message: "Subscription un-canceled successfully",
          subscription: unCanceledSubscription,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(error, "[stripeRouter::unCancelSubscription()]").formatMessage(),
        });
      }
    })
});
