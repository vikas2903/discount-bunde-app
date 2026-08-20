export const MONTHLY_PLAN = "Discount Bundle Pro";

export const SUBSCRIPTION_PLAN = {
  name: MONTHLY_PLAN,
  trialDays: 14,
  amount: 10,
  currencyCode: "USD",
  intervalLabel: "30 days",
};

// Production billing is the safe default. Enable test charges explicitly for a development store.
export const BILLING_TEST_MODE = process.env.SHOPIFY_BILLING_TEST === "true";
export const BILLING_DISABLED = process.env.SHOPIFY_SKIP_BILLING === "true";
export const DASHBOARD_HOME_PATH = "/app/analytics";

function getBypassSubscription() {
  return {
    name: MONTHLY_PLAN,
    status: "ACTIVE",
  };
}

export async function checkSubscription(billing) {
  if (BILLING_DISABLED) {
    return getBypassSubscription();
  }

  const result = await billing.check({
    plans: [MONTHLY_PLAN],
    isTest: BILLING_TEST_MODE,
  });

  return result.appSubscriptions?.[0] ?? null;
}

export async function requestSubscription(billing) {
  if (BILLING_DISABLED) {
    return getBypassSubscription();
  }

  // Let Shopify's React Router package choose the billing return URL. Its
  // default return keeps the merchant inside Shopify Admin and preserves the
  // embedded authentication context. A hand-built Railway return URL caused
  // intermittent session loss after the approval screen.
  return billing.request({
    plan: MONTHLY_PLAN,
    isTest: BILLING_TEST_MODE,
  });
}

export async function requireSubscription(billing) {
  if (BILLING_DISABLED) {
    return getBypassSubscription();
  }

  // Send unpaid merchants straight to Shopify's hosted billing approval page.
  const result = await billing.require({
    plans: [MONTHLY_PLAN],
    isTest: BILLING_TEST_MODE,
    onFailure: async () => requestSubscription(billing),
  });

  return result.appSubscriptions?.[0] ?? null;
}

// Free stores can create one quantity offer. All storefront bundles, flat
// sales, and additional quantity offers require an approved Pro subscription.
export async function requireProSubscription(billing) {
  return requireSubscription(billing);
}

export function getPlanDetails(subscription) {
  return {
    name: subscription ? "Pro" : "Free",
    isPro: Boolean(subscription),
    trialDays: SUBSCRIPTION_PLAN.trialDays,
  };
}
