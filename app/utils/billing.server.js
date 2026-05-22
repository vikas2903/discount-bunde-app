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

export async function requireSubscription(billing, request) {
  // Return to the billing route first so the app can confirm the purchase
  // and then redirect the merchant into the embedded dashboard.
  const returnUrl = `${new URL(request.url).origin}/app/billing`;

  // Send unpaid merchants straight to Shopify's hosted billing approval page.
  const result = await billing.require({
    plans: [MONTHLY_PLAN],
    isTest: BILLING_TEST_MODE,
    onFailure: async () =>
      billing.request({
        plan: MONTHLY_PLAN,
        isTest: BILLING_TEST_MODE,
        returnUrl,
      }),
  });

  return result.appSubscriptions?.[0] ?? null;
}
