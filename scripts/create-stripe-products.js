const Stripe = require('stripe');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

console.log(process.env.STRIPE_SECRET_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const plans = [
  {
    name: 'Starter Plan',
    description: 'Access to all features for 10 interviews, 100 minutes, 2 verifications, 0 team member',
    prices: {
      monthly: 1999, // $19.99
      yearly: 19999, // $199.99
    },
    metadata: {
      site: 'tixae_interviewer',
      internal_key_ref: 'starter',
      included_interviews: 10,
      included_minutes: 100,
      included_verifications: 2,
      included_team_members: 0,
    },
    marketing_features: [
      { name: '10 Interviews' },
      { name: '100 Minutes' },
      { name: '2 Verifications' },
      { name: '0 Team Member' },
    ],
  },
  {
    name: 'Pro Plan',
    description: 'Access to all features for 50 interviews, 500 minutes, 10 verifications, 0 team members',
    prices: {
      monthly: 4999, // $49.99
      yearly: 49999, // $499.99
    },
    metadata: {
      site: 'tixae_interviewer',
      internal_key_ref: 'pro',
      included_interviews: 50,
      included_minutes: 500,
      included_verifications: 10,
      included_team_members: 0,
    },
    marketing_features: [
      { name: '50 Interviews' },
      { name: '500 Minutes' },
      { name: '10 Verifications' },
      { name: '0 Team Members' },
    ],
  },
  {
    name: 'Team Plan',
    description: 'Access to all features for 200 interviews, 2000 minutes, 25 verifications, 3 team members',
    prices: {
      monthly: 14999, // $149.99
      yearly: 149999, // $1499.99
    },
    metadata: {
      site: 'tixae_interviewer',
      internal_key_ref: 'team',
      included_interviews: 200,
      included_minutes: 2000,
      included_verifications: 25,
      included_team_members: 3,
    },
    marketing_features: [
      { name: '200 Interviews' },
      { name: '2000 Minutes' },
      { name: '25 Verifications' },
      { name: '3 Team Members' },
    ],
  },
];

const addons = [
  {
    name: 'Remove Branding',
    description: 'Remove branding from the interviewer and client dashboard',
    prices: {
      monthly: 1000, // $10.00
      yearly: 10000, // $100.00
    },
    metadata: {
      site: 'tixae_interviewer',
      addon_key_ref: 'remove-branding',
    },
  },
  {
    name: 'Add Team Member',
    description: 'Add a team member to the plan',
    prices: {
      monthly: 2500, // $25.00
      yearly: 25000, // $250.00
    },
    metadata: {
      site: 'tixae_interviewer',
      addon_key_ref: 'add-team-member',
    },
  },
  {
    name: 'HR Workflow Automation',
    description: 'Automate the HR workflow for your organisation',
    prices: {
      monthly: 2500, // $25.00
      yearly: 25000, // $250.00
    },
    metadata: {
      site: 'tixae_interviewer',
      addon_key_ref: 'hr-workflow-automation',
    },
  },
  {
    name: 'Analytics & Reporting',
    description: 'Get insights and reports on your organisation',
    prices: {
      monthly: 1500, // $15.00
      yearly: 15000, // $150.00
    },
    metadata: {
      site: 'tixae_interviewer',
      addon_key_ref: 'analytics-reporting',
    },
  },
  {
    name: 'WhiteLabel Add-on',
    description: 'Custom branding & domain name for client dashboard',
    prices: {
      monthly: 20000, // $200.00
      yearly: 200000, // $2000.00
    },
    metadata: {
      site: 'tixae_interviewer',
      addon_key_ref: 'custom-branding',
    },
  },
  {
    name: 'Mini WhiteLabel',
    description: 'Custom domain, logo for the interviewer dashboard',
    prices: {
      monthly: 2000, // $20.00
      yearly: 20000, // $200.00
    },
    metadata: {
      site: 'tixae_interviewer',
      addon_key_ref: 'mini-whitelabel',
    },
  },
];

async function createStripePlans() {
  try {
    return await Promise.all(plans.map(async (plan) => {
      // Create a product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: plan.metadata,
        marketing_features: plan.marketing_features,
      });
      console.log('Created product:', product.id);

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.prices.monthly,
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
      });
      console.log('Created monthly price:', monthlyPrice.id);

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.prices.yearly,
        currency: 'usd',
        recurring: {
          interval: 'year',
        },
      });
      console.log('Created yearly price:', yearlyPrice.id);

      return {
        productId: product.id,
        monthlyPriceId: monthlyPrice.id,
        yearlyPriceId: yearlyPrice.id,
      };
    }));
  } catch (error) {
    console.error('Error creating products and prices:', error);
    throw error;
  }
}

async function createStripeAddons() {
  try {
    return await Promise.all(addons.map(async (addon) => {
      // Create a product
      const product = await stripe.products.create({
        name: addon.name,
        description: addon.description,
        metadata: addon.metadata,
      });
      console.log('Created product:', product.id);

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: addon.prices.monthly,
        recurring: {
          interval: 'month',
        },
        currency: 'usd',
      });
      console.log('Created monthly price:', monthlyPrice.id);

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: addon.prices.yearly,
        recurring: {
          interval: 'year',
        },
        currency: 'usd',
      });
      console.log('Created yearly price:', yearlyPrice.id);

      return {
        productId: product.id,
        monthlyPriceId: monthlyPrice.id,
        yearlyPriceId: yearlyPrice.id,
      };
    }));
  } catch (error) {
    console.error('Error creating addons:', error);
    throw error;
  }
}

function main() {
  createStripePlans()
    .then(() => createStripeAddons())
    .then(() => console.log('Successfully created plans and addons'))
    .catch((error) => {
      console.error('Failed to create plans and addons:', error);
      process.exit(1);
    });
}

main();
