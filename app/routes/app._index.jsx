import { authenticate } from "../shopify.server";
import { DASHBOARD_HOME_PATH } from "../utils/billing.server";

// Shopify opens the embedded app at /app. Keep the landing page available to
// both Free and Pro merchants so billing approval never loops back to billing.
export const loader = async ({ request }) => {
  const { redirect } = await authenticate.admin(request);
  return redirect(DASHBOARD_HOME_PATH);
};
