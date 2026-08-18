import { authenticate } from "../shopify.server";

// BundleBoost does not persist customer profiles, contact details, or order
// records. This authenticated acknowledgement confirms no data is held.
export const action = async ({ request }) => {
  await authenticate.webhook(request);

  return new Response(null, { status: 200 });
};
