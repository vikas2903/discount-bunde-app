/* global process */
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { checkSubscription, getPlanDetails } from "../utils/billing.server";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);

  // eslint-disable-next-line no-undef
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    plan: getPlanDetails(subscription),
  };
};

export default function App() {
  const { apiKey, plan } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Analytics</s-link>
        <s-link href="/app/volume_discounts">Quantity offers(Free)</s-link>
        <s-link href={plan.isPro ? "/app/disocunt_bundle" : "/app/billing"}>
          Bundle offers {plan.isPro ? "" : "(Pro)"}
        </s-link>
        {/* <s-link href="/app/flatoff_disocunt">Simple sale {plan.isPro ? "" : "(Pro)"}</s-link> */}
        <s-link href="/app/help">Help & support</s-link>
        <s-link href="/app/billing">Plans & billing</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
