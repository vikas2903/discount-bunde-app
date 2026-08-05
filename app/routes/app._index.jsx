import { authenticate } from "../shopify.server";
import { checkSubscription } from "../utils/billing.server";

// Shopify opens the embedded app at /app. Pro stores start with Bundle offers;
// Free stores start with the included Quantity offers page.
export const loader = async ({ request }) => {
  const { billing, redirect } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);

  return redirect(
    subscription ? "/app" : "/app",
  );
};
