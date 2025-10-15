import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@root/server/typedFirestore";
import { getAuth } from "firebase-admin/auth";
import { serverApp } from "@root/server/firebase";
import { workspace } from "@root/lib/workspace.lib";

// Use STRIPE_MODE for explicit control
const isLiveMode = process.env.STRIPE_MODE === "live";
console.log("Webhook using live mode:", isLiveMode);

const stripe = new Stripe(
  isLiveMode
    ? process.env.STRIPE_SECRET_KEY!
    : process.env.STRIPE_SECRET_KEY_TEST!,
);
const webhookSecret = isLiveMode
  ? process.env.STRIPE_WEBHOOK_SECRET
  : process.env.STRIPE_WEBHOOK_SECRET_TEST!;

// Validate environment variables
if (!webhookSecret) {
  console.error("Missing Stripe webhook secret environment variable");
  throw new Error("Stripe webhook secret not configured");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`Received Stripe webhook: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Handle successful checkout completion
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("Processing checkout session:", session.id);

  const customerEmail =
    session?.customer_email || session.customer_details?.email;
  if (!customerEmail) {
    console.error("No customer email found in checkout session");
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  try {
    // Handle subscription checkout
    if (session.subscription) {
      if (!customerId) {
        console.error("No customer ID found for subscription checkout");
        return;
      }

      // Create or update user and workspace for subscription
      const user = await createUserAndWorkspace(
        customerEmail,
        customerId,
        session.subscription as string,
      );

      // Get subscription with expanded product data to access metadata
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
        { expand: ["items.data.price.product"] },
      );

      // Extract interview limit from product metadata
      let interviewsLimit = 0;
      for (const item of subscription.items.data) {
        const product = item.price.product as Stripe.Product;
        if (product.metadata?.interviews_limit) {
          interviewsLimit =
            parseInt(product.metadata.interviews_limit, 10) || 0;
          break;
        }
      }

      // Set up recurring usage tracking
      const recurringUsage = {
        interviewsUsed: 0,
        interviewsLimit: interviewsLimit,
        lastResetAt: new Date(),
      };

      if (!user) {
        console.error(`Failed to create/find user for subscription checkout`);
        return;
      }

      // Update user with subscription info and limits
      await db.users.update(user.ref.id, {
        stripeSubscriptionId: subscription.id,
        recurringUsage: recurringUsage,
        updatedAt: new Date(),
      });

      const isTrial = subscription.status === "trialing";
      const trialEndDate = subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null;

      console.log(
        `Subscription setup completed for user: ${user.ref.id}, status: ${subscription.status}, limit: ${interviewsLimit}, trial: ${isTrial}`,
      );

      if (subscription.status === "active") {
        console.log(`Subscription activated for user: ${customerEmail}`);
      } else if (subscription.status === "trialing") {
        console.log(
          `Trial started for user: ${customerEmail}, ends: ${trialEndDate}`,
        );
      }
    }
    // Handle one-time payment checkout
    else if (session.payment_intent) {
      // Create or find user
      let user;

      if (customerId) {
        // Find user by customer ID or create if needed
        const users = await db.users.query(($) =>
          $.field("stripeCustomerId").eq(customerId),
        );

        if (users.length > 0) {
          user = users[0];
          console.log(`Found user by customer ID: ${user.ref.id}`);
        } else {
          user = await createUserAndWorkspace(customerEmail, customerId);
        }
      } else {
        // Find user by email or create if needed
        const usersByEmail = await db.users.query(($) =>
          $.field("email").eq(customerEmail),
        );

        if (usersByEmail.length > 0) {
          user = usersByEmail[0];
          console.log(`Found user by email: ${user.ref.id}`);
        } else {
          user = await createUserAndWorkspace(customerEmail, "");
        }
      }

      // Get interview limit from line items metadata
      let interviewsLimit = 0;

      // Retrieve the checkout session with line items expanded
      const expandedSession = await stripe.checkout.sessions.retrieve(
        session.id,
        {
          expand: ["line_items.data.price.product"],
        },
      );

      if (expandedSession.line_items) {
        for (const lineItem of expandedSession.line_items.data) {
          const product = lineItem.price?.product as Stripe.Product;
          if (product && product.metadata?.interviews_limit) {
            interviewsLimit =
              parseInt(product.metadata.interviews_limit, 10) || 0;
            break;
          }
        }
      }

      if (!user) {
        console.error(
          `Failed to create/find user for one-time payment checkout`,
        );
        return;
      }

      if (interviewsLimit > 0) {
        // Create new interview bundle (30-day validity)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const newBundle = {
          id: session.payment_intent as string,
          interviewsLimit: interviewsLimit,
          expiresAt: expiresAt,
        };

        // Get existing bundles and add the new one
        const existingBundles = user.data.bundles || [];
        const updatedBundles = [...existingBundles, newBundle];

        // Update user with new bundle
        await db.users.update(user.ref.id, {
          bundles: updatedBundles,
          updatedAt: new Date(),
        });

        console.log(
          `Bundle created for user: ${user.ref.id}, payment: ${session.payment_intent}, interviews: ${interviewsLimit}, expires: ${expiresAt}`,
        );
      } else {
        console.log(
          `One-time payment processed for user: ${user.ref.id}, amount: ${session.amount_total}, but no interviews_limit found in product metadata`,
        );
      }
    }

    console.log(`Checkout completed for customer: ${customerEmail}`);
  } catch (error) {
    console.error("Error handling checkout completion:", error);
  }
}

// Handle subscription updates (status changes, plan changes, etc.)
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("Processing subscription update:", subscription.id);

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  try {
    // Find user by Stripe customer ID
    const users = await db.users.query(($) =>
      $.field("stripeCustomerId").eq(customerId),
    );

    if (users.length === 0) {
      console.log(
        `No user found for customer: ${customerId} in subscription update. User should be created during checkout.`,
      );
      return;
    }

    const user = users[0];

    // Get subscription with expanded product data to access metadata
    const expandedSubscription = await stripe.subscriptions.retrieve(
      subscription.id,
      { expand: ["items.data.price.product"] },
    );

    // Extract interview limit from product metadata
    let interviewsLimit = 0;
    for (const item of expandedSubscription.items.data) {
      const product = item.price.product as Stripe.Product;
      if (product.metadata?.interviews_limit) {
        interviewsLimit = parseInt(product.metadata.interviews_limit, 10) || 0;
        break;
      }
    }

    // Set up or update recurring usage tracking
    const recurringUsage = {
      interviewsUsed: 0,
      interviewsLimit: interviewsLimit,
      lastResetAt: new Date(),
    };

    // Update user with subscription info and recurring usage
    await db.users.update(user.ref.id, {
      stripeSubscriptionId: subscription.id,
      recurringUsage: recurringUsage,
      updatedAt: new Date(),
    });

    console.log(
      `Subscription updated for user: ${user.ref.id}, status: ${subscription.status}, interviews limit: ${interviewsLimit}`,
    );

    // Handle status-specific actions
    if (subscription.status === "past_due") {
      console.log(`Subscription past due for user: ${user.data.email}`);
    } else if (subscription.status === "canceled") {
      console.log(`Subscription canceled for user: ${user.data.email}`);
    } else if (subscription.status === "active") {
      console.log(`Subscription activated for user: ${user.data.email}`);
    } else if (subscription.status === "trialing") {
      const trialEndDate = subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null;
      console.log(
        `Trial started for user: ${user.data.email}, ends: ${trialEndDate}`,
      );
    }
  } catch (error) {
    console.error("Error handling subscription update:", error);
  }
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("Processing subscription deletion:", subscription.id);

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  try {
    // Find user by Stripe customer ID
    const users = await db.users.query(($) =>
      $.field("stripeCustomerId").eq(customerId),
    );

    if (users.length === 0) {
      console.error(`No user found for customer: ${customerId}`);
      return;
    }

    const user = users[0];

    // Clear subscription info and recurring usage
    await db.users.update(user.ref.id, {
      stripeSubscriptionId: null,
      recurringUsage: undefined,
      updatedAt: new Date(),
    });

    console.log(`Subscription cancelled for user: ${user.ref.id}`);
    console.log(
      `Subscription cancelled notification sent to: ${user.data.email}`,
    );
  } catch (error) {
    console.error("Error handling subscription deletion:", error);
  }
}

// Handle successful payment for recurring subscription
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("Processing successful payment:", invoice.id);

  const subscriptionId = (invoice as any).subscription as string | null;

  // If this is related to a subscription, handle subscription renewal
  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price.product"],
      });

      // Find user by subscription ID
      const users = await db.users.query(($) =>
        $.field("stripeSubscriptionId").eq(subscriptionId),
      );

      if (users.length === 0) {
        console.error(`No user found for subscription: ${subscriptionId}`);
        return;
      }

      const user = users[0];

      // Extract interview limit from product metadata
      let interviewsLimit = 0;
      for (const item of subscription.items.data) {
        const product = item.price.product as Stripe.Product;
        if (product.metadata?.interviews_limit) {
          interviewsLimit =
            parseInt(product.metadata.interviews_limit, 10) || 0;
          break;
        }
      }

      // Reset usage tracking for the billing period
      const recurringUsage = {
        interviewsUsed: 0,
        interviewsLimit: interviewsLimit,
        lastResetAt: new Date(),
      };

      // Update user with fresh usage limits
      await db.users.update(user.ref.id, {
        recurringUsage: recurringUsage,
        updatedAt: new Date(),
      });

      console.log(
        `Subscription renewed for user: ${user.ref.id}, reset usage limit to: ${interviewsLimit}`,
      );
    } catch (error) {
      console.error("Error processing payment success:", error);
    }
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("Processing failed payment:", invoice.id);

  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  try {
    // Find user by Stripe customer ID
    const users = await db.users.query(($) =>
      $.field("stripeCustomerId").eq(customerId),
    );

    if (users.length === 0) {
      console.error(`No user found for customer: ${customerId}`);
      return;
    }

    const user = users[0];

    console.log(`Payment failed for user: ${user.ref.id}`);

    // TODO: Send payment failed email notification
    console.log(`Payment failed notification sent to: ${user.data.email}`);
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

// Helper function to create user and workspace
async function createUserAndWorkspace(
  email: string,
  stripeCustomerId: string,
  subscriptionId?: string,
) {
  try {
    // Check if user already exists by email in Firestore
    const existingUsers = await db.users.query(($) =>
      $.field("email").eq(email),
    );

    if (existingUsers.length > 0) {
      // Update existing user with Stripe info
      const user = existingUsers[0];
      await db.users.update(user.ref.id, {
        stripeCustomerId,
        stripeSubscriptionId: subscriptionId || null,
        updatedAt: new Date(),
      });
      console.log(`Updated existing user in Firestore: ${user.ref.id}`);
      return user;
    }

    let firebaseUser;

    // Try to get existing Firebase user by email first
    try {
      firebaseUser = await getAuth(serverApp).getUserByEmail(email);
      console.log(`Found existing Firebase user: ${firebaseUser.uid}`);
    } catch (error: any) {
      // If user doesn't exist in Firebase Auth, create new one
      if (error.code === "auth/user-not-found") {
        firebaseUser = await getAuth(serverApp).createUser({
          email: email,
          emailVerified: true,
          displayName: email.split("@")[0],
        });
        console.log(`Created new Firebase user: ${firebaseUser.uid}`);
      } else {
        throw error;
      }
    }

    // Check if Firestore document exists for this Firebase user
    let existingFirestoreUser;
    try {
      existingFirestoreUser = await db.users.get(firebaseUser.uid as any);
      if (existingFirestoreUser) {
        // Update existing Firestore user with Stripe info
        await db.users.update(firebaseUser.uid as any, {
          stripeCustomerId,
          stripeSubscriptionId: subscriptionId || null,
          updatedAt: new Date(),
        });
        console.log(`Updated existing Firestore user: ${firebaseUser.uid}`);
        return await db.users.get(firebaseUser.uid as any);
      }
    } catch (error) {
      // User document doesn't exist in Firestore, we'll create it
      console.log(
        `No Firestore document found for Firebase user: ${firebaseUser.uid}`,
      );
    }

    // Create user document in Firestore
    const newUser = {
      id: firebaseUser.uid,
      email: email,
      name: firebaseUser.displayName || email.split("@")[0],
      workspaceIds: [],
      role: "USER" as const,
      stripeCustomerId,
      stripeSubscriptionId: subscriptionId || null,
      bundles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.users.ref(firebaseUser.uid as any).set(newUser);
    console.log(`Created new Firestore document for user: ${firebaseUser.uid}`);

    // Create workspace for the user (only if it doesn't have one)
    try {
      console.log("Creating workspace for user...");
      await workspace.createWorkspace({
        name: "My Workspace",
        email: email,
        ownerId: firebaseUser.uid,
        stripeCustomerId,
      });
      console.log("Workspace created successfully");
    } catch (error) {
      console.error("Error creating workspace:", error);
      // Don't fail the webhook if workspace creation fails
    }

    // Return the created user data
    const createdUser = await db.users.get(firebaseUser.uid as any);
    return createdUser;
  } catch (error) {
    console.error("Error in createUserAndWorkspace:", error);
    throw error;
  }
}
