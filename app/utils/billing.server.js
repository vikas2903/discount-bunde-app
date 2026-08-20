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

function buildReturnUrl(request, shop) {
  const requestUrl = new URL(request.url);
  // The billing flow is initiated on the active deployment, so always return
  // to that same origin. This avoids a stale SHOPIFY_APP_URL environment value
  // sending merchants to a previous host, where no Shopify session exists.
  // Shopify's Node adapter builds request.url from the public request URL.
  const appUrl = requestUrl.origin;
  // Return directly to a dashboard route that is available to every plan.
  // Going through /app used to immediately redirect to the Pro-only bundle
  // page, which could send merchants back to billing before Shopify's
  // subscription status had refreshed.
  const returnUrl = new URL(DASHBOARD_HOME_PATH, appUrl);

  // Preserve the shop and embed context so Shopify can re-enter the app cleanly
  // after the hosted billing approval page closes.
  if (shop) {
    returnUrl.searchParams.set("shop", shop);
  }

  if (requestUrl.searchParams.get("host")) {
    returnUrl.searchParams.set("host", requestUrl.searchParams.get("host"));
  }

  if (requestUrl.searchParams.get("embedded")) {
    returnUrl.searchParams.set("embedded", requestUrl.searchParams.get("embedded"));
  }

  return returnUrl.toString();
}

export async function requestSubscription(billing, request, shop) {
  if (BILLING_DISABLED) {
    return getBypassSubscription();
  }

  return billing.request({
    plan: MONTHLY_PLAN,
    isTest: BILLING_TEST_MODE,
    returnUrl: buildReturnUrl(request, shop),
  });
}

export async function requireSubscription(billing, request, shop) {
  if (BILLING_DISABLED) {
    return getBypassSubscription();
  }

  // Send unpaid merchants straight to Shopify's hosted billing approval page.
  const result = await billing.require({
    plans: [MONTHLY_PLAN],
    isTest: BILLING_TEST_MODE,
    onFailure: async () => requestSubscription(billing, request, shop),
  });

  return result.appSubscriptions?.[0] ?? null;
}

// Free stores can create one quantity offer. All storefront bundles, flat
// sales, and additional quantity offers require an approved Pro subscription.
export async function requireProSubscription(billing, request, shop) {
  return requireSubscription(billing, request, shop);
}

export function getPlanDetails(subscription) {
  return {
    name: subscription ? "Pro" : "Free",
    isPro: Boolean(subscription),
    trialDays: SUBSCRIPTION_PLAN.trialDays,
  };
}
