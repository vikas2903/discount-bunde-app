import { authenticate } from "../shopify.server";

// BundleBoost does not store customer or order data. This authenticated
// acknowledgement records that there is no customer-specific data to erase.
export const action = async ({ request }) => {
  await authenticate.webhook(request);

  return new Response(null, { status: 200 });
};
