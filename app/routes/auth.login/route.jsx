/* global process */
import { useEffect, useState } from "react";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

function normalizeShop(shop) {
  return shop.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = normalizeShop(url.searchParams.get("shop") || "");
  const errors = loginErrorMessage(await login(request));

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    errors,
    shop,
  };
};

export const action = async ({ request }) => {
  const formData = await request.clone().formData();
  const shop = normalizeShop(String(formData.get("shop") || ""));
  formData.set("shop", shop);

  const normalizedRequest = new Request(request.url, {
    method: request.method,
    body: formData,
  });

  const errors = loginErrorMessage(await login(normalizedRequest));

  return {
    errors,
    shop,
  };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState(actionData?.shop || loaderData.shop || "");
  const { errors } = actionData || loaderData;

  useEffect(() => {
    setShop(actionData?.shop || loaderData.shop || "");
  }, [actionData?.shop, loaderData.shop]);

  return (
    <AppProvider embedded={false} apiKey={loaderData.apiKey}>
      <s-page>
        <Form method="post">
          <s-section heading="Log in">
            <s-stack direction="block" gap="tight">
              <s-paragraph>
                This screen appears when the app does not have an active Shopify
                admin session yet.
              </s-paragraph>
              <s-paragraph>
                Open the app from your Shopify admin, or enter your
                `myshopify.com` store domain below to continue.
              </s-paragraph>
            </s-stack>
            <label>
              <s-text>Shop domain</s-text>
              <input
                name="shop"
                type="text"
                value={shop}
                onChange={(event) => setShop(event.currentTarget.value)}
                autoComplete="on"
                placeholder="example.myshopify.com"
                aria-invalid={errors?.shop ? "true" : undefined}
                aria-describedby={errors?.shop ? "shop-error" : undefined}
                style={{
                  boxSizing: "border-box",
                  display: "block",
                  marginTop: "0.5rem",
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #8a8a8a",
                  borderRadius: "0.5rem",
                }}
              />
            </label>
            {errors?.shop ? (
              <s-text id="shop-error" tone="critical">
                {errors.shop}
              </s-text>
            ) : null}
            <button type="submit">Log in</button>
          </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}
