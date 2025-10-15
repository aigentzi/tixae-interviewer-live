import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@root/trpc/trpc";
import { TRPCError } from "@trpc/server";
import { getAuth, UserRecord } from "firebase-admin/auth";
import { serverApp, db } from "@root/server/firebase";
import { sendAntiSpamEmail, generateOTP } from "@root/server/utils/resend.util";
import { stripeService } from "@root/lib/stripe.lib";
import { addonsKeys, User } from "@root/shared/zod-schemas";
import Stripe from "stripe";
import { db as typedDb } from "@root/server/typedFirestore";
import { workspace } from "@root/lib/workspace.lib";

export const authRouter = createTRPCRouter({
  // Request an OTP to be sent to the email
  requestEmailOTP: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/auth/requestEmailOTP",
        tags: ["auth"],
        summary: "Request an OTP to be sent to the email",
        description: "Request an OTP to be sent to the email",
        protect: false,
      },
    })
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { email } = input;

      try {
        // Generate a new OTP
        const otp = generateOTP();

        // Store OTP in Firestore with expiration (10 minutes)
        const otpRef = db.collection("otps").doc(email);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await otpRef.set({
          otp,
          email,
          expiresAt,
          createdAt: new Date(),
          attempts: 0,
        });

        await sendAntiSpamEmail({
          to: email,
          emailTemplate: "requestOTP",
          locals: { otp },
          minutes: 10,
        });

        return {
          success: true,
          message: "Verification code sent to your email",
        };
      } catch (error) {
        console.error("Error sending OTP:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send verification code",
        });
      }
    }),

  // Verify OTP and sign in
  verifyEmailOTP: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/auth/verifyEmailOTP",
        tags: ["auth"],
        summary: "Verify OTP and sign in",
        description: "Verify OTP and sign in",
        protect: false,
      },
    })
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().length(6),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        customToken: z.string(),
        userId: z.string(),
        isNewUser: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const { email, otp } = input;

      try {
        // Get OTP document from Firestore
        const otpRef = db.collection("otps").doc(email);
        const otpDoc = await otpRef.get();

        // Check if OTP exists
        if (!otpDoc.exists) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Verification code not found or expired",
          });
        }

        const otpData = otpDoc.data();

        // Check if OTP is expired
        if (otpData?.expiresAt.toDate() < new Date()) {
          // Delete expired OTP
          await otpRef.delete();

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Verification code has expired",
          });
        }

        // Check if OTP matches
        if (otpData?.otp !== otp) {
          // Increment attempts
          await otpRef.update({
            attempts: (otpData?.attempts || 0) + 1,
          });

          // If too many attempts, invalidate OTP
          if ((otpData?.attempts || 0) >= 4) {
            await otpRef.delete();

            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "Too many failed attempts. Please request a new code.",
            });
          }

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid verification code",
          });
        }

        // OTP is valid - delete it so it can't be reused
        await otpRef.delete();

        // Create or get Firebase user
        let firebaseUser;
        try {
          // Check if user exists
          firebaseUser = await getAuth(serverApp).getUserByEmail(email);
        } catch (error) {
          // User doesn't exist, create a new one
          firebaseUser = await getAuth(serverApp).createUser({
            email,
            emailVerified: true,
          });

          // Create user document in Firestore
          const stripeCustomer = await stripeService().createCustomer(
            email,
            firebaseUser.displayName || "",
          );
          await db.collection("users").doc(firebaseUser.uid).set({
            email,
            role: "USER", // Default role for new users
            createdAt: new Date(),
            lastSignIn: new Date(),
            stripeCustomerId: stripeCustomer.id,
          });

          await new Promise((resolve) => setTimeout(resolve, 1000));

          let attemps = 0;
          while (attemps < 3) {
            try {
              console.log("Creating workspace...");
              await workspace.createWorkspace({
                name: "My Workspace",
                email: email,
                ownerId: firebaseUser.uid,
                stripeCustomerId: stripeCustomer.id,
              });
              console.log("Workspace created successfully");
              break;
            } catch (error) {
              attemps++;
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }

        // Create a custom token for this user
        const customToken = await getAuth(serverApp).createCustomToken(
          firebaseUser.uid,
        );
        console.log(`ALL GOOD.`);
        return {
          success: true,
          customToken,
          userId: firebaseUser.uid,
          isNewUser: !firebaseUser.metadata.lastSignInTime,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Error verifying OTP:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify code",
        });
      }
    }),

  // Get current user (protected route example)
  me: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/auth/me",
        tags: ["auth"],
        summary: "Get current user",
        description: "Get current user",
        protect: true,
      },
    })
    .input(z.void())
    .output(
      z.object({
        user: z.custom<UserRecord>(),
      }),
    )
    .query(async ({ ctx }) => {
      return {
        user: ctx.user,
      };
    }),

  getStripeUserDate: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/auth/getStripeUserDate",
        tags: ["auth"],
        summary: "Get Stripe user data",
        description: "Get Stripe user data",
        protect: true,
      },
    })
    .input(
      z.object({
        workspaceId: z.string().optional(),
      }),
    )
    .output(
      z.object({
        paymentMethod: z.custom<Stripe.PaymentMethod>().nullable(),
        customer: z
          .custom<Stripe.Customer | Stripe.DeletedCustomer>()
          .nullable(),
        subscriptions: z.array(z.custom<Stripe.Subscription>()),
        internalKeyRef: z.string().nullable(),
        productsDetails: z.array(
          z.custom<{
            product: Stripe.Product;
            prices: Stripe.Price[];
            keyType: string;
            requestedCurrency: string;
            availableCurrencies: string[];
          }>(),
        ),
        currency: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userData = ctx.user;
      const workspace = await typedDb.workspaces.get(input.workspaceId as any);
      const currency = workspace?.data.currency || "usd";

      // Check if user exists in firebase
      if (!userData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in database",
        });
      }

      // Check if user has a stripe customer id and if not, return null for all data
      if (!workspace?.data.stripeCustomerId) {
        return {
          paymentMethod: null,
          customer: null,
          subscriptions: [],
          internalKeyRef: null,
          productsDetails: [],
          currency,
        };
      }

      // Get payment methods, customer data, and subscriptions using stripe customer id from user data
      const [paymentMethods, customer, subscriptions] = await Promise.all([
        stripeService().getPaymentMethods(workspace?.data.stripeCustomerId || ""),
        stripeService().getCustomerData(workspace?.data.stripeCustomerId || ""),
        stripeService().getSubscriptions(workspace?.data.stripeCustomerId || ""),
      ]);

      // Get internal key ref from subscription items
      let internalKeyRef = null;
      if (
        subscriptions.data.length > 0 &&
        subscriptions.data[0].items.data.length > 0
      ) {
        const productId = subscriptions.data[0].items.data[0].plan
          .product as string;
        const productData = await stripeService().getProductData(productId);
        internalKeyRef = productData.metadata?.internal_key_ref;
      }

      // Get all products from stripe (addons and subscription products)
      const addonKeysToGetDetailsFor = addonsKeys.options.map((addon) =>
        addon.valueOf(),
      );
      const products = await stripeService().getProducts({
        active: true,
        limit: 10,
      });

      const filteredAddonProducts = products.data.filter(
        (product) =>
          product.metadata?.addon_key_ref &&
          addonKeysToGetDetailsFor.includes(product.metadata.addon_key_ref),
      );

      const payAsYouGoProducts = await stripeService().searchProducts({
        query: `metadata['internal_key_ref']:'pay_as_you_go'`,
      });

      const allFilteredProducts = [
        ...filteredAddonProducts,
        ...payAsYouGoProducts.data,
      ];

      // Get details for all products
      // Process prices for each product (convert to requested currency if needed)
      // Filter prices for requested currency (if no prices in requested currency, use all prices)
      // Return all products details (product, prices, keyType, requestedCurrency, availableCurrencies)
      const allProductsDetails = await Promise.all(
        allFilteredProducts.map(async (product) => {
          const prices = await stripeService().getPriceForProduct(product.id);
          const processedPrices = prices.data.map((price) => {
            if (price.currency.toLowerCase() === currency.toLowerCase()) {
              return price;
            }

            const currencyOptions = price.currency_options;
            const userCurrencyLower = currency.toLowerCase();

            if (
              currencyOptions &&
              currencyOptions[userCurrencyLower] &&
              currencyOptions[userCurrencyLower].unit_amount
            ) {
              return {
                ...price,
                currency: userCurrencyLower,
                unit_amount: currencyOptions[userCurrencyLower].unit_amount,
                unit_amount_decimal:
                  currencyOptions[userCurrencyLower].unit_amount.toString(),
              };
            }

            return price;
          });
          const currencyPrices = processedPrices.filter(
            (price) => price.currency.toLowerCase() === currency.toLowerCase(),
          );
          const finalPrices =
            currencyPrices.length > 0 ? currencyPrices : processedPrices;
          return {
            product,
            prices: finalPrices,
            keyType: product.metadata?.addon_key_ref ? "addon" : "product",
            requestedCurrency: currency.toLowerCase(),
            availableCurrencies: [
              ...new Set(processedPrices.map((price) => price.currency)),
            ],
          };
        }),
      );

      return {
        paymentMethod: paymentMethods.data[0],
        customer,
        subscriptions: subscriptions.data,
        internalKeyRef,
        productsDetails: allProductsDetails,
        currency,
      };
    }),

  // Get all users (admin only)
  getAllUsers: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/auth/users",
        tags: ["auth"],
        summary: "Get all users (admin only)",
        description: "Get all users for analytics - admin only",
        protect: true,
      },
    })
    .input(
      z.object({
        limit: z.number().min(1).max(1000).default(100),
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
          }),
        ),
        total: z.number(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        // Admin check - you may want to implement proper admin role checking
        const userWorkspaces = await typedDb.workspaces.query(($) => [
          $.field("ownerId").eq(ctx.user.uid),
        ]);

        if (userWorkspaces.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Admin access required",
          });
        }

        // Get users from Firebase Auth (source of truth) and supplement with Firestore data
        const authUsers = await getAuth(serverApp).listUsers(input.limit);
        const firestoreUsers = await typedDb.users.all();

        // Create a map of Firestore users for quick lookup
        const firestoreUserMap = new Map(
          firestoreUsers.map((user) => [user.ref.id, user.data]),
        );

        const limitedUsers = authUsers.users.map((authUser) => {
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
          };
        });

        // Get total count from Firebase Auth
        const totalUsers = authUsers.users.length;

        return {
          users: input.search
            ? limitedUsers.filter(
                (user) =>
                  user.email
                    .toLowerCase()
                    .includes(input.search?.toLowerCase() || "") ||
                  user.name
                    .toLowerCase()
                    .includes(input.search?.toLowerCase() || ""),
              )
            : limitedUsers,
          total: totalUsers,
        };
      } catch (error) {
        console.error("Error fetching all users:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch users",
        });
      }
    }),

  // Sync Firebase Auth users to Firestore (admin only)
  syncUsersToFirestore: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/auth/sync-users",
        tags: ["auth"],
        summary: "Sync Firebase Auth users to Firestore (admin only)",
        description:
          "Sync all Firebase Auth users to Firestore users collection",
        protect: true,
      },
    })
    .input(z.void())
    .output(
      z.object({
        success: z.boolean(),
        syncedCount: z.number(),
        skippedCount: z.number(),
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx }) => {
      try {
        // Admin check
        const userWorkspaces = await typedDb.workspaces.query(($) => [
          $.field("ownerId").eq(ctx.user.uid),
        ]);

        if (userWorkspaces.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Admin access required",
          });
        }

        // Get all users from Firebase Auth
        let allAuthUsers: any[] = [];
        let nextPageToken: string | undefined;

        do {
          const result = await getAuth(serverApp).listUsers(
            1000,
            nextPageToken,
          );
          allAuthUsers = allAuthUsers.concat(result.users);
          nextPageToken = result.pageToken;
        } while (nextPageToken);

        // Get existing Firestore users
        const firestoreUsers = await typedDb.users.all();
        const existingUserIds = new Set(
          firestoreUsers.map((user) => user.ref.id),
        );

        let syncedCount = 0;
        let skippedCount = 0;

        // Sync users to Firestore
        for (const authUser of allAuthUsers) {
          if (existingUserIds.has(authUser.uid)) {
            skippedCount++;
            continue;
          }

          try {
            await db
              .collection("users")
              .doc(authUser.uid)
              .set({
                email: authUser.email || "",
                name:
                  authUser.displayName || authUser.email?.split("@")[0] || "",
                role: "USER",
                id: authUser.uid,
                lastSignIn: authUser.metadata.lastSignInTime
                  ? new Date(authUser.metadata.lastSignInTime)
                  : new Date(authUser.metadata.creationTime),
                createdAt: new Date(authUser.metadata.creationTime),
                updatedAt: authUser.metadata.lastSignInTime
                  ? new Date(authUser.metadata.lastSignInTime)
                  : new Date(authUser.metadata.creationTime),
                workspaceIds: [], // Initialize as empty array
              });
            syncedCount++;
          } catch (error) {
            console.error(`Failed to sync user ${authUser.uid}:`, error);
          }
        }

        return {
          success: true,
          syncedCount,
          skippedCount,
          message: `Synced ${syncedCount} users, skipped ${skippedCount} existing users`,
        };
      } catch (error) {
        console.error("Error syncing users:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync users",
        });
      }
    }),

  getUserByEmail: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/auth/getUserByEmail",
        tags: ["auth"],
        summary: "Get user by email",
        description: "Get user by email",
        protect: false,
      },
    })
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .output(
      z.object({
        user: z.custom<UserRecord>().nullable(),
      }),
    )
    .query(async ({ input }) => {
      const user = await getAuth(serverApp).getUserByEmail(input.email);

      if (!user) {
        return { user: null };
      }

      return { user };
    }),

  addUserToFirebaseUsersCollection: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/auth/addUserToFirebaseUsersCollection",
        tags: ["auth"],
        summary: "Add user to Firebase users collection",
        description: "Add user to Firebase users collection",
        protect: true,
      },
    })
    .input(
      z.object({
        uid: z.string(),
        email: z.string().email(),
        displayName: z.string().optional(),
        role: z.enum(["USER", "ADMIN"]).optional(),
        workspaceIds: z.array(z.string()).optional(),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const { uid, email, displayName, role, workspaceIds } = input;

      const user = await db.collection("users").doc(uid).get();

      if (user.exists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already exists in Firestore",
        });
      }

      const stripeCustomer = await stripeService().createCustomer(
        email,
        displayName || "",
      );

      await db.collection("users").doc(uid).set({
        email,
        displayName,
        role,
        workspaceIds,
        createdAt: new Date(),
        lastSignIn: new Date(),
        updatedAt: new Date(),
        id: uid,
        stripeCustomerId: stripeCustomer.id,
      });

      return { success: true };
    }),

  getUserLimits: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/auth/getUserLimits",
        tags: ["auth"],
        summary: "Get current user's subscription limits and usage",
        description: "Get current user's subscription limits and usage",
      },
    })
    .input(
      z.object({
        workspaceId: z.string(),
      }),
    )
    .output(
      z.object({
        recurringUsage: z
          .object({
            interviewsUsed: z.number(),
            interviewsLimit: z.number(),
            lastResetAt: z.date(),
          })
          .optional(),
        bundles: z
          .array(
            z.object({
              id: z.string(),
              interviewsLimit: z.number(),
              expiresAt: z.date(),
            }),
          )
          .optional(),
        totalAvailable: z.number(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        // Get workspace to find owner
        const workspace = await typedDb.workspaces.get(
          input.workspaceId as any,
        );
        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace not found",
          });
        }

        // Get workspace owner's data
        const ownerUser = await typedDb.users.get(
          workspace.data.ownerId as any,
        );
        if (!ownerUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workspace owner not found",
          });
        }

        const { recurringUsage, bundles } = ownerUser.data;
        const now = new Date();

        // Calculate total available interviews
        let totalAvailable = 0;

        // Add available from recurring usage
        if (recurringUsage) {
          totalAvailable += Math.max(
            0,
            recurringUsage.interviewsLimit - recurringUsage.interviewsUsed,
          );
        }

        // Add available from valid bundles
        if (bundles) {
          totalAvailable += bundles
            .filter((bundle) => bundle.expiresAt > now)
            .reduce((sum, bundle) => sum + bundle.interviewsLimit, 0);
        }

        return {
          recurringUsage,
          bundles: bundles?.filter(
            (bundle) => bundle.expiresAt > now && bundle.interviewsLimit > 0,
          ),
          totalAvailable,
        };
      } catch (error) {
        console.error("Error getting user limits:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get user limits",
        });
      }
    }),
});
