import { authenticate } from "../shopify.server";
import {
  DASHBOARD_HOME_PATH,
  checkSubscription,
  requestSubscription,
} from "../utils/billing.server";

// This is a document navigation, initiated directly by the merchant's click.
// The Shopify billing helper creates the AppSubscription and throws Shopify's
// confirmation redirect. For embedded apps it first exits the iframe, then
// opens the hosted billing approval page in Shopify Admin.
export const loader = async ({ request }) => {
  const { billing, redirect, session } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);

  if (subscription) {
    return redirect(DASHBOARD_HOME_PATH);
  }

  try {
    await requestSubscription(billing, session);
  } catch (responseOrError) {
    if (responseOrError instanceof Response) {
      throw responseOrError;
    }

    console.error("[billing] Unable to create subscription", responseOrError);
    const message = getBillingErrorMessage(responseOrError);
    return redirect(`/app/billing?billing_error=${encodeURIComponent(message)}`);
  }
};

function getBillingErrorMessage(error) {
  const details = Array.isArray(error?.errorData)
    ? error.errorData
        .map((entry) => (typeof entry?.message === "string" ? entry.message : ""))
        .filter(Boolean)
    : [];

  return details.join(" ") || "Shopify could not create the subscription. Please try again.";
}
