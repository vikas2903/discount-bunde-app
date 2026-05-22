export const SUBSCRIPTION_PLAN = {
  name: "Discount Bundle Monthly",
  trialDays: 7,
  amount: 5,
  currencyCode: "USD",
  intervalLabel: "30 days",
};

const BILLING_TEST_MODE = process.env.SHOPIFY_BILLING_TEST !== "false";

export async function checkSubscription(admin) {
  const response = await admin.graphql(`
    query GetActiveSubscription {
      appInstallation {
        activeSubscriptions {
          id
          name
          status
          trialDays
          currentPeriodEnd
          test
        }
      }
    }
  `);

  const data = await response.json();
  const subscriptions = data?.data?.appInstallation?.activeSubscriptions ?? [];

  return subscriptions.length > 0 ? subscriptions[0] : null;
}

export async function requireSubscription(admin, redirectToBilling) {
  const subscription = await checkSubscription(admin);

  if (!subscription) {
    throw redirectToBilling("/app/billing");
  }

  return subscription;
}

export async function createSubscription(admin, returnUrl) {
  const response = await admin.graphql(
    `
      mutation CreateSubscription($returnUrl: URL!) {
        appSubscriptionCreate(
          name: "${SUBSCRIPTION_PLAN.name}"
          returnUrl: $returnUrl
          trialDays: ${SUBSCRIPTION_PLAN.trialDays}
          test: ${BILLING_TEST_MODE}
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: {
                    amount: ${SUBSCRIPTION_PLAN.amount}
                    currencyCode: ${SUBSCRIPTION_PLAN.currencyCode}
                  }
                  interval: EVERY_30_DAYS
                }
              }
            }
          ]
        ) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `,
    { variables: { returnUrl } },
  );

  const data = await response.json();
  const result = data?.data?.appSubscriptionCreate;

  if (result?.userErrors?.length > 0) {
    throw new Error(result.userErrors.map((error) => error.message).join(", "));
  }

  return result?.confirmationUrl;
}
