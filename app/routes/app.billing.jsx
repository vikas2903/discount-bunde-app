import { authenticate } from "../shopify.server";
import {
  checkSubscription,
  requireSubscription,
} from "../utils/billing.server";

export const loader = async ({ request }) => {
  const { billing, redirect } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);

  if (subscription) {
    throw redirect("/app");
  }

  await requireSubscription(billing, request);

  return null;
};

export default function BillingPage() {
  return (
    <s-page heading="Redirecting to billing">
      <s-paragraph>
        Shopify billing approval is opening for this app subscription.
      </s-paragraph>
    </s-page>
  );
}
