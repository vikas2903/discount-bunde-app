import { authenticate } from "../shopify.server";
// Shopify opens the embedded app at /app. Bundle offers is the app landing
// page; its own loader sends stores without Pro access to billing.
export const loader = async ({ request }) => {
  const { redirect } = await authenticate.admin(request);
  return redirect("/app/disocunt_bundle");
};
