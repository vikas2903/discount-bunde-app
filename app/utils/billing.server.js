export const MONTHLY_PLAN = "Discount Bundle Monthly";

export const SUBSCRIPTION_PLAN = {
  name: MONTHLY_PLAN,
  trialDays: 7,
  amount: 5,
  currencyCode: "USD",
  intervalLabel: "30 days",
};

// Keep billing in Shopify test mode unless the env var is explicitly set to "false".
export const BILLING_TEST_MODE = process.env.SHOPIFY_BILLING_TEST !== "false";

export async function checkSubscription(billing) {
  const result = await billing.check({
    plans: [MONTHLY_PLAN],
    isTest: BILLING_TEST_MODE,
  });

  return result.appSubscriptions?.[0] ?? null;
}

export async function requireSubscription(billing, request, shop) {
  const requestUrl = new URL(request.url);
  const returnUrl = new URL("/app/billing", requestUrl.origin);

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

  // Send unpaid merchants straight to Shopify's hosted billing approval page.
  const result = await billing.require({
    plans: [MONTHLY_PLAN],
    isTest: BILLING_TEST_MODE,
    onFailure: async () =>
      billing.request({
        plan: MONTHLY_PLAN,
        isTest: BILLING_TEST_MODE,
        returnUrl: returnUrl.toString(),
      }),
  });

  return result.appSubscriptions?.[0] ?? null;
}
