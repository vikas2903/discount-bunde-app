/* global process */
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { checkSubscription } from "../utils/billing.server";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);

  // eslint-disable-next-line no-undef
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    hasSubscription: Boolean(subscription),
  };
};

export default function App() {
  const { apiKey, hasSubscription } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        {/* {hasSubscription ? <s-link href="/app">Dashboard</s-link> : null} */}
        {hasSubscription ? (
          <s-link href="/app/disocunt_bundle">Bundle discounts</s-link>
        ) : null}
        {hasSubscription ? (
          <s-link href="/app/volume_discounts">Volume discounts</s-link>
        ) : null}
        <s-link href="/app/billing">Plan</s-link>
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
