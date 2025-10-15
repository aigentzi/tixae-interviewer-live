import { Stripe } from "stripe";
import { ServiceError } from "./service-error.lib";

/**
 * StripeError class for handling errors from Stripe
 *
 * @Note
 *     This class extends the ServiceError class which includes helper
 *     methods for logging and error handling
 *
 * @param message
 *     The message of the error
 *
 * @param comingFrom
 *     The function where the error occurred
 */
export class StripeError extends ServiceError {
  /**
   * Initialize the StripeError class
   *
   * @param message
   *     The message of the error
   *
   * @param comingFrom
   *     The function where the error occurred
   */
  constructor(message: string, comingFrom: string) {
    super(message, comingFrom);
  }
}

/**
 * StripeService class for making API calls to Stripe
 *
 * @Note
 *     This class is a singleton and can be used to make API calls to Stripe
 */
export class StripeService {
  /**
   * The Stripe instance used to make API calls to Stripe
   */
  private stripe: Stripe;

  /**
   * Initialize the Stripe service
   *
   * @throws
   *     StripeError if the Stripe service cannot be initialized
   */
  constructor(apiKey?: string) {
    this.stripe = new Stripe(apiKey || process.env.STRIPE_SECRET_KEY!);
  }

  /**
   * Get all payment methods for a customer
   *
   * @param customerId
   *     The ID of the customer to get payment methods for
   *
   * @returns
   *     The payment methods for the customer
   *
   * @throws
   *     StripeError if the payment methods cannot be retrieved
   */
  async getPaymentMethods(customerId: string) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });
      return paymentMethods;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::getPaymentMethods()]");
    }
  }

  /**
   * Get customer data from Stripe using the customer ID
   *
   * @param customerId
   *     The ID of the customer to get data for
   *
   * @returns
   *     The customer data
   *
   * @throws
   *     StripeError if the customer data cannot be retrieved
   */
  async getCustomerData(customerId: string) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::getCustomerData()]");
    }
  }

  /**
   * Get all subscriptions for a customer from Stripe using the customer ID
   *
   * @Note
   *     This function will only return active subscriptions
   *
   * @param customerId
   *     The ID of the customer to get subscriptions for
   *
   * @returns
   *     The subscriptions for the customer
   *
   * @throws
   *     StripeError if the subscriptions cannot be retrieved
   */
  async getSubscriptions(customerId: string) {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        expand: ["data.items"],
      });
      return subscriptions;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::getSubscriptions()]");
    }
  }

  /**
   * Get product data from Stripe using the product ID
   *
   * @param productId
   *     The ID of the product to get data for
   *
   * @returns
   *     The product data
   *
   * @throws
   *     StripeError if the product data cannot be retrieved
   */
  async getProductData(productId: string) {
    try {
      const product = await this.stripe.products.retrieve(productId);
      return product;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::getProductData()]");
    }
  }

  /**
   * Get all products from Stripe
   *
   * @param params
   *     The parameters for the products list
   *
   * @returns
   *     The products from Stripe
   *
   * @throws
   *     StripeError if the products cannot be retrieved
   */
  async getProducts(params?: {
    active?: boolean;
    limit?: number;
    expand?: string[];
  }) {
    try {
      const products = await this.stripe.products.list(params);
      return products;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::getProducts()]");
    }
  }

  /**
   * Search for products in Stripe
   *
   * @param params
   *     The parameters for the search
   *
   * @returns
   *     The products from Stripe
   *
   * @throws
   *     StripeError if the products cannot be retrieved
   */
  async searchProducts(params: {
    query: string;
    limit?: number;
    page?: string;
    expand?: string[];
  }) {
    try {
      const products = await this.stripe.products.search(params);
      return products;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::searchProducts()]");
    }
  }

  /**
   * Get the price for a product (with currency options)
   *
   * @param productId
   *     The ID of the product to get the price for
   *
   * @returns
   *     The price for the product
   *
   * @throws
   *     StripeError if the price cannot be retrieved
   */
  async getPriceForProduct(productId: string, currency?: string) {
    try {
      const price = await this.stripe.prices.list({
        product: productId,
        active: true,
        expand: ["data.currency_options"],
        currency: currency?.toLowerCase(),
      });
      return price;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::getPriceForProduct()]");
    }
  }

  /**
   * Retrieve a subscription from Stripe using the subscription ID
   *
   * @param subscriptionId
   *     The ID of the subscription to retrieve
   *
   * @returns
   *     The subscription data
   *
   * @throws
   *     StripeError if the subscription cannot be retrieved
   */
  async retrieveSubscription(subscriptionId: string, expand?: string[]) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
        { expand },
      );
      return subscription;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::retrieveSubscription()]");
    }
  }

  /**
   * Retrieve an invoice using the invoice ID
   *
   * @param invoiceId
   *     The ID of the invoice to retrieve
   *
   * @returns
   *     The invoice data
   *
   * @throws
   *     StripeError if the invoice cannot be retrieved
   */
  async retrieveInvoice(invoiceId: string) {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::retrieveInvoice()]");
    }
  }

  /**
   * Retrieve a coupon from Stripe using the coupon ID
   *
   * @param couponId
   *     The ID of the coupon to retrieve
   *
   * @returns
   *     The coupon data
   *
   * @throws
   *     StripeError if the coupon cannot be retrieved
   */
  async retrieveCoupon(couponId: string) {
    try {
      const coupon = await this.stripe.coupons.retrieve(couponId);
      return coupon;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::retrieveCoupon()]");
    }
  }

  /**
   * Retrieve a checkout session using the session ID
   *
   * @param sessionId
   *     The ID of the session to retrieve
   *
   * @returns
   *     The checkout session
   *
   * @throws
   *     StripeError if the checkout session cannot be retrieved
   */
  async retrieveCheckoutSession(sessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::retrieveCheckoutSession()]");
    }
  }

  /**
   * Retrieve a verification session using the session ID
   *
   * @param sessionId
   *     The ID of the session to retrieve
   *
   * @returns
   *     The verification session
   *
   * @throws
   *     StripeError if the verification session cannot be retrieved
   */
  async retrieveVerificationSession(sessionId: string) {
    try {
      const session = await this.stripe.identity.verificationSessions.retrieve(sessionId);
      return session;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::retrieveVerificationSession()]");
    }
  }

  /**
   * Retrieve a verification report using the report ID
   *
   * @param reportId
   *     The ID of the report to retrieve
   *
   * @returns
   *     The verification report
   *
   * @throws
   *     StripeError if the verification report cannot be retrieved
   */
  async retrieveVerificationReport(reportId: string) {
    try {
      const report = await this.stripe.identity.verificationReports.retrieve(reportId);
      return report;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::retrieveVerificationReport()]");
    }
  }

  /**
   * Create a new customer in Stripe
   *
   * @param email
   *     The email of the customer
   *
   * @param name
   *     The name of the customer
   *
   * @returns
   *     The created customer
   *
   * @throws
   *     StripeError if the customer cannot be created
   */
  async createCustomer(email: string, name?: string) {
    try {
      const customer = await this.stripe.customers.create({ email, name });
      return customer;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::createCustomer()]");
    }
  }

  /**
   * Create a new subscription for a customer
   *
   * @param customerId
   *     The ID of the customer to create the subscription for
   *
   * @param priceId
   *     The ID of the price to create the subscription for
   *
   * @returns
   *     The created subscription
   *
   * @throws
   *     StripeError if the subscription cannot be created
   */
  async createSubscription(customerId: string, priceId: string) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        expand: ["pending_setup_intent"],
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
      });
      return subscription;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::createSubscription()]");
    }
  }

  /**
   * Create a new verification session
   *
   * @param params
   *     The parameters for the verification session
   *
   * @returns
   *     The created verification session
   *
   * @throws
   *     StripeError if the verification session cannot be created
   */
  async createVerificationSession(params: Stripe.Identity.VerificationSessionCreateParams) {
    try {
      const session = await this.stripe.identity.verificationSessions.create(params);
      return session;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::createVerificationSession()]");
    }
  }

  /**
   * Preview an invoice for a customer
   *
   * @param params
   *     The parameters for the invoice preview
   *
   * @returns
   *     The invoice preview
   *
   * @throws
   *     StripeError if the invoice preview cannot be retrieved
   */
  async createInvoicePreview(params: {
    customer: string;
    subscription?: string;
    subscription_items?: { price: string; }[];
    currency?: string;
    discounts?: { coupon: string }[];
    automatic_tax?: { enabled: boolean };
  }) {
    try {
      const invoice = await this.stripe.invoices.createPreview({
        customer: params.customer,
        subscription: params.subscription,
        subscription_details: {
          items: params.subscription_items,
          proration_behavior: "none",
        },
        currency: params.currency,
        discounts: params.discounts,
        automatic_tax: params.automatic_tax,
      });
      return invoice;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::invoicePreview()]");
    }
  }

  /**
   * Create an invoice item for a customer
   *
   * @param params
   *     The parameters for the invoice item
   *
   * @returns
   *     The created invoice item
   *
   * @throws
   *     StripeError if the invoice item cannot be created
   */
  async createInvoiceItem(params: {
    customer: string;
    amount: number;
    currency: string;
    subscription?: string;
    description?: string;
  }) {
    try {
      const invoiceItem = await this.stripe.invoiceItems.create({
        customer: params.customer,
        subscription: params.subscription,
        amount: params.amount,
        currency: params.currency,
        description: params.description,
      });
      return invoiceItem;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::createInvoiceItem()]");
    }
  }

  /**
   * Create an invoice for a customer
   *
   * @param params
   *     The parameters for the invoice creation including the customer, subscription,
   *     description, and coupon (if applicable)
   *
   * @returns
   *     The created invoice
   *
   * @throws
   *     StripeError if the invoice cannot be created
   */
  async createInvoice(params: {
    customer: string;
    subscription?: string;
    description?: string;
    coupon?: string;
  }) {
    try {
      const invoice = await this.stripe.invoices.create({
        automatic_tax: {
          enabled: true,
        },
        customer: params.customer,
        subscription: params.subscription,
        auto_advance: true,
        description: params.description,
        discounts: params.coupon ? [{ coupon: params.coupon }] : undefined,
      });

      return invoice;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::createInvoice()]");
    }
  }

  /**
   * Create a checkout session
   *
   * @param params
   *     The parameters for the checkout session
   *
   * @returns
   *     The created checkout session
   *
   * @throws
   *     StripeError if the checkout session cannot be created
   */
  async createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        consent_collection: {
          terms_of_service: "required",
        },
        automatic_tax: { enabled: true },
        mode: "subscription",
        customer_update: {
          address: "auto",
          name: "auto",
        },
        billing_address_collection: "required",
        ...params,
      });
      return session;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::createCheckoutSession()]");
    }
  }

  /**
   * Create a file link
   *
   * @param params
   *     The parameters for the file link
   *
   * @returns
   *     The created file link
   *
   * @throws
   *     StripeError if the file link cannot be created
   */
  async createFileLink(params: Stripe.FileLinkCreateParams) {
    try {
      const fileLink = await this.stripe.fileLinks.create(params);
      return fileLink;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::createFileLink()]");
    }
  }

  /**
   * Pay an invoice using the invoice ID
   *
   * @param invoiceId
   *     The ID of the invoice to pay
   *
   * @param expand
   *     The expand parameter for the invoice
   *
   * @returns
   *     The paid invoice
   *
   * @throws
   *     StripeError if the invoice cannot be paid
   */
  async payInvoice(invoiceId: string, expand?: string[]) {
    try {
      const invoice = await this.stripe.invoices.pay(invoiceId, {
        expand,
      });
      return invoice;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::payInvoice()]");
    }
  }

  /**
   * Delete an invoice using the invoice ID
   *
   * @param invoiceId
   *     The ID of the invoice to delete
   *
   * @returns
   *     The deleted invoice
   *
   * @throws
   *     StripeError if the invoice cannot be deleted
   */
  async deleteInvoice(invoiceId: string) {
    try {
      const invoice = await this.stripe.invoices.del(invoiceId);
      return invoice;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::deleteInvoice()]");
    }
  }

  /**
   * Delete an invoice item using the invoice item ID
   *
   * @param invoiceItemId
   *     The ID of the invoice item to delete
   *
   * @returns
   *     The deleted invoice item
   *
   * @throws
   *     StripeError if the invoice item cannot be deleted
   */
  async deleteInvoiceItem(invoiceItemId: string) {
    try {
      const invoiceItem = await this.stripe.invoiceItems.del(invoiceItemId);
      return invoiceItem;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::deleteInvoiceItem()]");
    }
  }

  /**
   * Update a subscription using the subscription ID
   *
   * @param params
   *     The parameters for the subscription update including the subscription ID
   *     and the items to update
   *
   * @returns
   *     The updated subscription
   *
   * @throws
   *     StripeError if the subscription cannot be updated
   */
  async updateSubscription(params: Stripe.SubscriptionUpdateParams & { subscriptionId: string }) {
    try {
      const subscription = await this.stripe.subscriptions.update(
        params.subscriptionId,
        params,
      );
      return subscription;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::updateSubscription()]");
    }
  }

  /**
   * Cancel a subscription using the subscription ID
   *
   * @param subscriptionId
   *     The ID of the subscription to cancel
   *
   * @returns
   *     The canceled subscription
   *
   * @throws
   *     StripeError if the subscription cannot be canceled
   */
  async cancelSubscription(subscriptionId: string, params?: Stripe.SubscriptionCancelParams) {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId, params);
      return subscription;
    } catch (error: any) {
      throw new StripeError(error.message, "[Stripe::cancelSubscription()]");
    }
  }
};

export const stripeService = new StripeService();
export const stripeVerificationService = new StripeService(process.env.STRIPE_RESTRICTED_KEY!);
