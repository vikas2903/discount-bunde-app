import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../../../app/shopify.server";

const FUNCTION_HANDLE = "simple-product-discount";
const NAMESPACE = "$app:simple-product-discount";
const KEY = "function-configuration";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const percentage = toPositiveNumber(formData.get("percentage"), 10);
  const message =
    String(formData.get("message") || "").trim() || "10% off from app discount";

  const automaticAppDiscount = {
    title: String(formData.get("title") || "").trim() || "Simple 10% Discount",
    functionHandle: FUNCTION_HANDLE,
    startsAt: new Date().toISOString(),
    discountClasses: ["PRODUCT"],
    combinesWith: {
      productDiscounts: true,
      orderDiscounts: true,
      shippingDiscounts: true,
    },
    metafields: [
      {
        namespace: NAMESPACE,
        key: KEY,
        type: "json",
        value: JSON.stringify({
          percentage,
          message,
        }),
      },
    ],
  };

  const response = await admin.graphql(
    `#graphql
      mutation CreateSimpleProductDiscount($automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          automaticAppDiscount {
            discountId
            title
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        automaticAppDiscount,
      },
    },
  );

  const responseJson = await response.json();
  const payload = responseJson.data?.discountAutomaticAppCreate;

  return {
    ok: Boolean(payload?.automaticAppDiscount) && !payload?.userErrors?.length,
    discount: payload?.automaticAppDiscount ?? null,
    userErrors: payload?.userErrors ?? [],
    graphqlErrors: responseJson.errors ?? [],
    savedConfig: {
      percentage,
      message,
    },
  };
};

export default function SimpleDiscountExamplePage() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Simple product discount created");
    }
  }, [fetcher.data?.ok, shopify]);

  return (
    <s-page heading="Simple product discount example">
      <s-section heading="Create discount">
        <fetcher.Form method="post">
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Discount title"
              name="title"
              defaultValue="Simple 10% Discount"
            />
            <s-text-field
              label="Percentage"
              name="percentage"
              type="number"
              defaultValue="10"
            />
            <s-text-field
              label="Message"
              name="message"
              defaultValue="10% off from app discount"
            />
            <s-button
              type="submit"
              variant="primary"
              loading={fetcher.state !== "idle"}
            >
              Create automatic discount
            </s-button>
          </s-stack>
        </fetcher.Form>
      </s-section>

      {fetcher.data && (
        <s-section heading="Response">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            <code>{JSON.stringify(fetcher.data, null, 2)}</code>
          </pre>
        </s-section>
      )}
    </s-page>
  );
}

function toPositiveNumber(value, fallback) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}
