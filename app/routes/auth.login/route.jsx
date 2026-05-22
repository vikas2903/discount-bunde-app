import { useEffect, useState } from "react";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";

  return { errors: {}, shop };
};

export const action = async ({ request }) => {
  const formData = await request.clone().formData();
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
    shop: String(formData.get("shop") || ""),
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
    <AppProvider embedded={false}>
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
            <s-text-field
              name="shop"
              label="Shop domain"
              details="example.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.currentTarget.value)}
              autocomplete="on"
              error={errors?.shop}
            ></s-text-field>
            <s-button type="submit">Log in</s-button>
          </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}
