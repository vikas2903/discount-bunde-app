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
  // Use the configured public app URL. This prevents Shopify billing from
  // returning to an old deployment hostname after an app URL change.
  const appUrl = process.env.SHOPIFY_APP_URL || requestUrl.origin;
  const returnUrl = new URL("/app", appUrl);

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
