import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../../shopify.server";

// Shopify opens the app at its root URL. Authenticate that launch and hand it
// to /app, which then redirects to the Quantity offers home page.
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const isShopifyLaunch =
    url.searchParams.has("shop") ||
    url.searchParams.has("host") ||
    url.searchParams.get("embedded") === "1" ||
    url.searchParams.has("id_token");

  // A direct local visit has no Shopify context. Show the login screen rather
  // than asking the embedded-auth middleware to validate an incomplete launch.
  if (!isShopifyLaunch) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/auth/login" },
    });
  }

  const { redirect } = await authenticate.admin(request);
  return redirect("/app");
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
