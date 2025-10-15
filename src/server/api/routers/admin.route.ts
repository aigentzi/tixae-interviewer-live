import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@root/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { AdminService } from "@root/lib/admin.lib";
import { ServiceError } from "@root/lib/service-error.lib";
import {
  adminSettingsSchema,
  AdminVoiceConfigScheme,
  AdminTranscriptionConfigScheme,
  userSchema,
  userRoleEnum,
} from "@root/shared/zod-schemas";
import { db } from "@root/server/typedFirestore";
import { db as firebaseDb } from "@root/server/firebase";
import { stripeService } from "@root/lib/stripe.lib";
import { Stripe } from "stripe";

const isLiveMode = process.env.STRIPE_MODE === "live";
const stripe = new Stripe(
  isLiveMode
    ? process.env.STRIPE_SECRET_KEY!
    : process.env.STRIPE_SECRET_KEY_TEST!,
);

export const adminRouter = createTRPCRouter({
  // Get admin settings
  getAdminSettings: adminProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/admin/settings",
        tags: ["Admin"],
        summary: "Get admin settings",
        description: "Get admin settings including global prompts (Admin only)",
      },
    })
    .input(
      z
        .object({
          language: z.string().optional(),
        })
        .optional(),
    )
    .output(adminSettingsSchema)
    .query(async ({ input, ctx }) => {
      try {
        const settings = await AdminService.getAdminSettings(input?.language);
        return settings;
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "[adminRouter::getAdminSettings()]",
          ).formatMessage(),
        });
      }
    }),

  // Get voice profiles (public access for all authenticated users)
  getVoiceProfiles: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/admin/voice-profiles",
        tags: ["Admin"],
        summary: "Get voice profiles",
        description:
          "Get voice profiles for interview configuration (authenticated users)",
      },
    })
    .input(
      z
        .object({
          language: z.string().optional(),
        })
        .optional(),
    )
    .output(
      z.object({
        voiceProfiles: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            gender: z.enum(["male", "female"]),
            language: z.string(),
            image: z.any().optional(),
            voiceConfig: AdminVoiceConfigScheme,
            transcriptionConfig: AdminTranscriptionConfigScheme,
          }),
        ),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const settings = await AdminService.getAdminSettings(input?.language);
        // Return only voice profiles for public access
        return { voiceProfiles: settings.voiceProfiles || [] };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "[adminRouter::getVoiceProfiles()]",
          ).formatMessage(),
        });
      }
    }),

  // Update admin settings (general)
  updateAdminSettings: adminProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/admin/settings",
        tags: ["Admin"],
        summary: "Update admin settings",
        description: "Update admin settings (Admin only)",
      },
    })
    .input(
      z.object({
        globalPrompts: z.string().optional(),
        greetingMessage: z.string().optional(),
        voiceProfiles: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            gender: z.enum(["male", "female"]),
            language: z.string(),
            image: z.any().optional(),
            voiceConfig: AdminVoiceConfigScheme,
            transcriptionConfig: AdminTranscriptionConfigScheme,
          }),
        ),
        syncVoiceSettings: z.boolean().optional(),
      }),
    )
    .output(adminSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const updatedSettings = await AdminService.updateAdminSettings(
          input,
          input.syncVoiceSettings || false,
        );

        return updatedSettings;
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "[adminRouter::updateAdminSettings()]",
          ).formatMessage(),
        });
      }
    }),

  // Get current user role
  getCurrentUserRole: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/admin/current-user-role",
        tags: ["Admin"],
        summary: "Get current user role",
        description: "Get the role of the currently authenticated user",
      },
    })
    .input(z.void())
    .output(z.object({ role: userRoleEnum, userId: z.string() }))
    .query(async ({ ctx }) => {
      try {
        const userDoc = await db.users.get(ctx.user.uid as any);

        if (!userDoc || !userDoc.data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User data not found",
          });
        }

        return { role: userDoc.data.role, userId: ctx.user.uid };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "[adminRouter::getCurrentUserRole()]",
          ).formatMessage(),
        });
      }
    }),

  // Get all admins (admin only)
  getAllAdmins: adminProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/admin/admins",
        tags: ["Admin"],
        summary: "Get all admin users",
        description:
          "Get all users with ADMIN or SUPER_ADMIN roles (Admin only)",
      },
    })
    .input(z.void())
    .output(z.array(userSchema))
    .query(async ({ ctx }) => {
      try {
        const usersSnapshot = await firebaseDb
          .collection("users")
          .where("role", "in", ["ADMIN", "SUPER_ADMIN"])
          .get();
        const admins = usersSnapshot.docs.map((doc) => {
          const userData = doc.data();
          return {
            id: doc.id,
            email: userData.email || "",
            name: userData.name || userData.displayName || "",
            role: userData.role || "USER",
            workspaceIds: userData.workspaceIds || [],
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
          };
        });
        return admins;
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "[adminRouter::getAllAdmins()]",
          ).formatMessage(),
        });
      }
    }),

  // Add admin by email (super admin only)
  addAdminByEmail: adminProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/admin/add-admin",
        tags: ["Admin"],
        summary: "Add admin by email",
        description:
          "Promote a user to admin by their email address (Super Admin only)",
      },
    })
    .input(
      z.object({
        email: z.string().email(),
        role: userRoleEnum.refine(
          (role) => role !== "USER",
          "Cannot set role to USER",
        ),
      }),
    )
    .output(z.object({ success: z.boolean(), message: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { email, role } = input;

        // Find user by email in Firebase Auth
        let firebaseUser;
        try {
          const { getAuth } = await import("firebase-admin/auth");
          const { serverApp } = await import("@root/server/firebase");
          firebaseUser = await getAuth(serverApp).getUserByEmail(email);
        } catch (error) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `User with email ${email} not found. They must sign up first.`,
          });
        }

        // Check if user document exists in Firestore
        const userDocRef = firebaseDb.collection("users").doc(firebaseUser.uid);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
          // Create user document if it doesn't exist
          const now = new Date();
          await userDocRef.set({
            id: firebaseUser.uid,
            email: firebaseUser.email || email,
            name: firebaseUser.displayName || "",
            role,
            workspaceIds: [],
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // Update existing user role
          await userDocRef.update({
            role,
            updatedAt: new Date(),
          });
        }

        return {
          success: true,
          message: `${email} promoted to ${role} successfully`,
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "[adminRouter::addAdminByEmail()]",
          ).formatMessage(),
        });
      }
    }),

  // Remove admin role (super admin only)
  removeAdmin: adminProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/admin/remove-admin",
        tags: ["Admin"],
        summary: "Remove admin role",
        description: "Demote an admin back to USER role (Super Admin only)",
      },
    })
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .output(z.object({ success: z.boolean(), message: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { userId } = input;

        // Prevent users from demoting themselves if they're the only super admin
        if (ctx.user.uid === userId) {
          const adminsSnapshot = await firebaseDb
            .collection("users")
            .where("role", "==", "SUPER_ADMIN")
            .get();

          if (adminsSnapshot.docs.length === 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Cannot demote the only super admin. Please promote another user to super admin first.",
            });
          }
        }

        // Update user role to USER
        await firebaseDb.collection("users").doc(userId).update({
          role: "USER",
          updatedAt: new Date(),
        });

        return {
          success: true,
          message: "Admin role removed successfully",
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "[adminRouter::removeAdmin()]",
          ).formatMessage(),
        });
      }
    }),
  // Get users with plan info (admin only)
  getUsersWithPlans: adminProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/admin/users-with-plans",
        tags: ["Admin"],
        summary: "Get users with plan info",
        description:
          "List users along with their active plan name/key from Stripe",
      },
    })
    .input(
      z.object({
        limit: z.number().min(1).max(500).default(100),
        search: z.string().optional().nullable(),
      }),
    )
    .output(
      z.object({
        users: z.array(
          z.object({
            id: z.string(),
            email: z.string(),
            name: z.string().optional(),
            createdAt: z.date().optional(),
            lastSignIn: z.date().optional(),
            plan: z
              .object({
                name: z.string().nullable(),
                key: z.string().nullable(),
                status: z.string().nullable(),
              })
              .optional(),
          }),
        ),
        total: z.number(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { getAuth } = await import("firebase-admin/auth");
        const { serverApp } = await import("@root/server/firebase");

        const authUsers = await getAuth(serverApp).listUsers(input.limit);
        const firestoreUsers = await db.users.all();

        const firestoreUserMap = new Map(
          firestoreUsers.map((user) => [user.ref.id, user.data]),
        );

        const baseUsers = authUsers.users.map((authUser) => {
          const firestoreData = firestoreUserMap.get(authUser.uid);
          return {
            id: authUser.uid,
            email: authUser.email || "",
            name:
              authUser.displayName ||
              firestoreData?.name ||
              authUser.email?.split("@")[0] ||
              "",
            createdAt: new Date(authUser.metadata.creationTime),
            lastSignIn: authUser.metadata.lastSignInTime
              ? new Date(authUser.metadata.lastSignInTime)
              : undefined,
            _stripeCustomerId: firestoreData?.stripeCustomerId as
              | string
              | undefined,
          } as any;
        });

        const filtered = input.search
          ? baseUsers.filter(
              (u) =>
                u.email.toLowerCase().includes(input.search!.toLowerCase()) ||
                (u.name || "")
                  .toLowerCase()
                  .includes(input.search!.toLowerCase()),
            )
          : baseUsers;

        const usersWithPlans = await Promise.all(
          filtered.map(async (u) => {
            const customerId = u._stripeCustomerId;
            if (!customerId) {
              const { _stripeCustomerId, ...rest } = u;
              return { ...rest, plan: { name: null, key: null, status: null } };
            }

            try {
              const subs = await stripeService().getSubscriptions(customerId);
              const activeSub = subs.data[0];
              if (!activeSub) {
                const { _stripeCustomerId, ...rest } = u;
                return {
                  ...rest,
                  plan: { name: null, key: null, status: null },
                };
              }

              const productId = (activeSub.items.data[0]?.plan.product ||
                null) as unknown as string | null;
              if (!productId) {
                const { _stripeCustomerId, ...rest } = u;
                return {
                  ...rest,
                  plan: { name: null, key: null, status: activeSub.status },
                };
              }

              const product = await stripeService().getProductData(productId);
              const { _stripeCustomerId, ...rest } = u;
              return {
                ...rest,
                plan: {
                  name: product.name || null,
                  key: (product.metadata as any)?.internal_key_ref || null,
                  status: activeSub.status || null,
                },
              };
            } catch {
              const { _stripeCustomerId, ...rest } = u;
              return { ...rest, plan: { name: null, key: null, status: null } };
            }
          }),
        );

        return { users: usersWithPlans, total: authUsers.users.length };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "[adminRouter::getUsersWithPlans()]",
          ).formatMessage(),
        });
      }
    }),

  // Get Stripe products (admin only)
  getStripeProducts: adminProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/admin/stripe/products",
        tags: ["Admin"],
        summary: "Get Stripe products",
        description: "Get all active Stripe products with prices (Admin only)",
      },
    })
    .input(z.void())
    .output(
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          metadata: z.record(z.string()),
          prices: z.array(
            z.object({
              id: z.string(),
              unit_amount: z.number().nullable(),
              currency: z.string(),
              recurring: z
                .object({
                  interval: z.string(),
                  interval_count: z.number(),
                })
                .nullable(),
            }),
          ),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      try {
        // Get all active products
        const products = await stripe.products.list({
          active: true,
          expand: ["data.default_price"],
        });

        // Get prices for each product and filter for recurring plans only
        const allProductsWithPrices = await Promise.all(
          products.data.map(async (product) => {
            const prices = await stripe.prices.list({
              product: product.id,
              active: true,
              type: "recurring", // Only get recurring prices
            });

            return {
              product,
              prices: prices.data,
            };
          }),
        );

        // Filter to only products with recurring prices and transform
        const productsWithPrices = allProductsWithPrices
          .filter(({ prices }) => prices.length > 0)
          .map(({ product, prices }) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            metadata: product.metadata,
            prices: prices.map((price) => ({
              id: price.id,
              unit_amount: price.unit_amount,
              currency: price.currency,
              recurring: price.recurring
                ? {
                    interval: price.recurring.interval,
                    interval_count: price.recurring.interval_count,
                  }
                : null,
            })),
          }))
          // Sort products from least expensive to most expensive
          .sort((a, b) => {
            const priceA = a.prices[0]?.unit_amount || 0;
            const priceB = b.prices[0]?.unit_amount || 0;
            return priceA - priceB;
          });

        return productsWithPrices;
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "[adminRouter::getStripeProducts()]",
          ).formatMessage(),
        });
      }
    }),

  // Create user subscription with 100% coupon (admin only)
  createUserSubscription: adminProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/admin/stripe/create-subscription",
        tags: ["Admin"],
        summary: "Create user subscription",
        description:
          "Create a subscription for a user with 100% coupon (Admin only)",
      },
    })
    .input(
      z.object({
        userId: z.string(),
        priceId: z.string(),
        couponCode: z.string().default("100OFF"),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        subscriptionId: z.string().optional(),
        message: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        const { userId, priceId, couponCode } = input;

        // Get user document from Firestore
        const userDoc = await db.users.get(userId as any);
        if (!userDoc || !userDoc.data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const userData = userDoc.data;
        let customerId = userData.stripeCustomerId;

        // Create Stripe customer if doesn't exist
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: userData.email,
            name: userData.name || userData.email.split("@")[0],
            metadata: {
              userId: userId,
            },
          });
          customerId = customer.id;

          // Update user with Stripe customer ID
          await db.users.update(userId as any, {
            stripeCustomerId: customerId,
            updatedAt: new Date(),
          });
        }

        // Cancel existing active subscriptions first
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
        });

        for (const sub of existingSubscriptions.data) {
          await stripe.subscriptions.cancel(sub.id);
        }

        // Verify coupon exists and is valid
        let validCoupon = null;
        try {
          validCoupon = await stripe.coupons.retrieve(couponCode);
        } catch (error) {
          // If coupon doesn't exist, create a 100% off coupon
          try {
            validCoupon = await stripe.coupons.create({
              id: couponCode,
              percent_off: 100,
              duration: "forever",
              name: "Admin 100% Off Coupon",
            });
          } catch (createError) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Failed to create or retrieve coupon",
            });
          }
        }

        // Create subscription with 100% coupon
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          discounts: [{ coupon: couponCode }],
          expand: ["latest_invoice", "customer"],
        });

        // Update user with subscription ID
        await db.users.update(userId as any, {
          stripeSubscriptionId: subscription.id,
          updatedAt: new Date(),
        });

        return {
          success: true,
          subscriptionId: subscription.id,
          message: "Subscription created successfully with 100% discount",
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ServiceError.fromError(
            error,
            "[adminRouter::createUserSubscription()]",
          ).formatMessage(),
        });
      }
    }),
});
