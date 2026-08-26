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
export const BILLING_SUCCESS_PATH = "/app/disocunt_bundle";

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

function getBillingReturnUrl(session) {
  const appHandle = process.env.SHOPIFY_APP_HANDLE?.trim();

  // Returning to Admin (rather than directly to the Railway URL) makes Shopify
  // launch the embedded app with its shop/host/session-token context.
  if (!appHandle || !session?.shop) {
    return undefined;
  }

  const storeHandle = session.shop.replace(/\.myshopify\.com$/i, "");
  // After Shopify approves the subscription, send the merchant straight to the
  // Pro-only Bundle offers page. Its loader verifies the active subscription
  // before showing any bundle data.
  return `https://admin.shopify.com/store/${encodeURIComponent(storeHandle)}/apps/${encodeURIComponent(appHandle)}${BILLING_SUCCESS_PATH}`;
}

export async function requestSubscription(billing, session) {
  if (BILLING_DISABLED) {
    return getBypassSubscription();
  }

  return billing.request({
    plan: MONTHLY_PLAN,
    isTest: BILLING_TEST_MODE,
    returnUrl: getBillingReturnUrl(session),
  });
}

export async function requireSubscription(billing, session) {
  if (BILLING_DISABLED) {
    return getBypassSubscription();
  }

  // Send unpaid merchants straight to Shopify's hosted billing approval page.
  const result = await billing.require({
    plans: [MONTHLY_PLAN],
    isTest: BILLING_TEST_MODE,
    onFailure: async () => requestSubscription(billing, session),
  });

  return result.appSubscriptions?.[0] ?? null;
}

// Free stores can create one quantity offer. All storefront bundles, flat
// sales, and additional quantity offers require an approved Pro subscription.
export async function requireProSubscription(billing, session) {
  return requireSubscription(billing, session);
}

export function getPlanDetails(subscription) {
  return {
    name: subscription ? "Pro" : "Free",
    isPro: Boolean(subscription),
    trialDays: SUBSCRIPTION_PLAN.trialDays,
  };
}
