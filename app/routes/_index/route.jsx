import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";

// Shopify opens the app at its root URL. Authenticate that launch and hand it
// to /app, which then redirects to the Quantity offers home page.
export const loader = async ({ request }) => {
  const { redirect } = await authenticate.admin(request);
  return redirect("/app");
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
