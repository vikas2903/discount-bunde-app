/* global process */
import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { requireSubscription } from "../utils/billing.server";
import DiscountList from "../components/volume-discounts/DiscountList";
import VolumeDiscountForm from "../components/volume-discounts/VolumeDiscountForm";

const VOLUME_METAFIELD_NAMESPACE = "$app:volume-discount";
const VOLUME_METAFIELD_KEY = "function-configuration";
const DEFAULT_FUNCTION_HANDLE = "bundle-pack-3-for-999";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  await requireSubscription(billing, request, session.shop);
  const env = typeof process !== "undefined" ? process.env : {};
  const [discountsResult] = await Promise.allSettled([
    admin.graphql(
      `#graphql
        query ExistingVolumeDiscounts {
          automaticDiscountNodes(first: 50) {
            edges {
              node {
                id
                metafield(
                  namespace: "${VOLUME_METAFIELD_NAMESPACE}"
                  key: "${VOLUME_METAFIELD_KEY}"
                ) {
                  value
                }
                automaticDiscount {
                  ... on DiscountAutomaticApp {
                    discountId
                    title
                    status
                    startsAt
                    endsAt
                  }
                }
              }
            }
          }
        }`,
    ),
  ]);

  const discountsResponseJson =
    discountsResult.status === "fulfilled"
      ? await discountsResult.value.json()
      : null;

  const discounts =
    discountsResponseJson?.data?.automaticDiscountNodes?.edges
      ?.map(({ node }) => {
        const configValue = node.metafield?.value;
        const automaticDiscount = node.automaticDiscount;

        if (!configValue || !automaticDiscount?.discountId) {
          return null;
        }

        return {
          nodeId: node.id,
          discountId: automaticDiscount.discountId,
          title: automaticDiscount.title,
          status: automaticDiscount.status,
          startsAt: automaticDiscount.startsAt,
          endsAt: automaticDiscount.endsAt,
          config: parseVolumeConfig(configValue),
        };
      })
      .filter(Boolean) || [];

  const discountsGraphqlError =
    discountsResponseJson?.errors?.map(({ message }) => message).join(" | ") ||
    null;
  const discountsError =
    discountsResult.status === "rejected"
      ? toErrorMessage(discountsResult.reason)
      : discountsGraphqlError;

  return {
    discounts,
    discountsError,
    functionHandle:
      env.SHOPIFY_BUNDLE_FUNCTION_HANDLE || DEFAULT_FUNCTION_HANDLE,
  };
};

export const action = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  await requireSubscription(billing, request, session.shop);
  const formData = await request.formData();
  const env = typeof process !== "undefined" ? process.env : {};
  const intent = String(formData.get("intent") || "create");

  if (intent === "search-products") {
    const searchTerm = String(formData.get("searchTerm") || "").trim();

    if (!searchTerm) {
      return {
        ok: true,
        action: intent,
        products: [],
      };
    }

    try {
      const response = await admin.graphql(
        `#graphql
          query SearchProducts($query: String!) {
            products(first: 10, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                }
              }
            }
          }`,
        {
          variables: {
            query: buildProductSearchQuery(searchTerm),
          },
        },
      );

      const responseJson = await response.json();

      return {
        ok: true,
        action: intent,
        products:
          responseJson.data?.products?.edges?.map(({ node }) => node) || [],
        graphqlErrors: responseJson.errors || [],
      };
    } catch (error) {
      return {
        ok: false,
        action: intent,
        products: [],
        graphqlErrors: [{ message: toErrorMessage(error) }],
      };
    }
  }

  if (intent === "toggle-status") {
    const discountNodeId = String(formData.get("discountNodeId") || "").trim();
    const nextStatus = String(formData.get("nextStatus") || "").trim();

    if (!discountNodeId || !["enable", "disable"].includes(nextStatus)) {
      return {
        ok: false,
        action: intent,
        userErrors: [
          {
            field: ["discountNodeId"],
            message: "The selected volume discount could not be updated.",
          },
        ],
        graphqlErrors: [],
      };
    }

    try {
      const response = await admin.graphql(
        `#graphql
          mutation ToggleVolumeDiscount($id: ID!) {
            ${
              nextStatus === "disable"
                ? "discountAutomaticDeactivate"
                : "discountAutomaticActivate"
            }(id: $id) {
              automaticDiscountNode {
                automaticDiscount {
                  ... on DiscountAutomaticApp {
                    discountId
                    title
                    status
                    startsAt
                    endsAt
                  }
                }
              }
              userErrors {
                field
                message
              }
            }
          }`,
        {
          variables: {
            id: discountNodeId,
          },
        },
      );

      const responseJson = await response.json();
      const payload =
        nextStatus === "disable"
          ? responseJson.data?.discountAutomaticDeactivate
          : responseJson.data?.discountAutomaticActivate;
      const userErrors = payload?.userErrors || [];

      return {
        ok:
          userErrors.length === 0 &&
          Boolean(payload?.automaticDiscountNode?.automaticDiscount),
        action: intent,
        discount: payload?.automaticDiscountNode?.automaticDiscount,
        userErrors,
        graphqlErrors: responseJson.errors || [],
        nextStatus,
      };
    } catch (error) {
      return {
        ok: false,
        action: intent,
        userErrors: [],
        graphqlErrors: [{ message: toErrorMessage(error) }],
      };
    }
  }

  const rawConfig = String(formData.get("config") || "{}");
  const parsedConfig = parseVolumeConfig(rawConfig);
  const config = normalizeVolumeConfig(parsedConfig);
  const validationErrors = validateVolumeConfig(config);

  if (validationErrors.length > 0) {
    return {
      ok: false,
      action: intent,
      userErrors: validationErrors.map((message) => ({
        field: ["config"],
        message,
      })),
      graphqlErrors: [],
      config,
    };
  }

  const automaticAppDiscount = {
    title: config.title,
    startsAt: new Date().toISOString(),
    endsAt: null,
    functionHandle:
      env.SHOPIFY_BUNDLE_FUNCTION_HANDLE || DEFAULT_FUNCTION_HANDLE,
    discountClasses: ["PRODUCT"],
    combinesWith: {
      productDiscounts: true,
      orderDiscounts: false,
      shippingDiscounts: false,
    },
    metafields: [
      {
        namespace: VOLUME_METAFIELD_NAMESPACE,
        key: VOLUME_METAFIELD_KEY,
        type: "json",
        value: JSON.stringify(config),
      },
    ],
  };

  try {
    const response = await admin.graphql(
      `#graphql
        mutation CreateVolumeDiscount($automaticAppDiscount: DiscountAutomaticAppInput!) {
          discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
            userErrors {
              field
              message
            }
            automaticAppDiscount {
              discountId
              title
              status
              startsAt
              endsAt
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
    const userErrors = payload?.userErrors || [];

    return {
      ok: userErrors.length === 0 && Boolean(payload?.automaticAppDiscount),
      action: intent,
      discount: payload?.automaticAppDiscount,
      userErrors,
      graphqlErrors: responseJson.errors || [],
      config,
    };
  } catch (error) {
    return {
      ok: false,
      action: intent,
      userErrors: [],
      graphqlErrors: [{ message: toErrorMessage(error) }],
      config,
    };
  }
};

const INITIAL_FORM = {
  title: "",
  message: "Buy more & save more",
  status: "ACTIVE",
  products: [],
};

export default function VolumeDiscountsPage() {
  const createFetcher = useFetcher();
  const searchFetcher = useFetcher();
  const toggleFetcher = useFetcher();
  const shopify = useAppBridge();
  const { discounts, discountsError } = useLoaderData();
  const [form, setForm] = useState(INITIAL_FORM);
  const latestResponse = createFetcher.data || toggleFetcher.data;

  useEffect(() => {
    if (createFetcher.data?.config) {
      setForm(createFetcher.data.config);
    }
  }, [createFetcher.data]);

  useEffect(() => {
    if (createFetcher.data?.ok) {
      setForm(INITIAL_FORM);
      shopify.toast.show("Volume discount created");
    }
  }, [createFetcher.data?.ok, shopify]);

  useEffect(() => {
    if (toggleFetcher.data?.ok) {
      shopify.toast.show(
        toggleFetcher.data?.nextStatus === "disable"
          ? "Volume discount disabled"
          : "Volume discount enabled",
      );
    }
  }, [shopify, toggleFetcher.data]);

  return (
    <s-page heading="Volume discounts">
      <s-section heading="Create volume discount">
        <VolumeDiscountForm
          fetcher={createFetcher}
          searchFetcher={searchFetcher}
          form={form}
          setForm={setForm}
        />
      </s-section>

      <s-section heading="Saved volume discounts">
        <DiscountList
          discounts={discounts}
          discountsError={discountsError}
          toggleFetcher={toggleFetcher}
        />
      </s-section>

      {latestResponse && (
        <s-section heading="Save response">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            <code>{JSON.stringify(latestResponse, null, 2)}</code>
          </pre>
        </s-section>
      )}
    </s-page>
  );
}

function parseVolumeConfig(value) {
  const fallback = {
    title: "",
    message: "Buy more & save more",
    status: "ACTIVE",
    products: [],
  };

  if (!value) {
    return fallback;
  }

  try {
    const config = JSON.parse(value);

    return {
      title: typeof config.title === "string" ? config.title : fallback.title,
      message:
        typeof config.message === "string" && config.message.trim()
          ? config.message.trim()
          : fallback.message,
      status:
        config.status === "DRAFT" || config.status === "ACTIVE"
          ? config.status
          : fallback.status,
      products: Array.isArray(config.products)
        ? config.products.map((product) => ({
            productId:
              typeof product?.productId === "string" ? product.productId : "",
            productTitle:
              typeof product?.productTitle === "string"
                ? product.productTitle
                : "",
            tiers: Array.isArray(product?.tiers)
              ? product.tiers.map((tier) => ({
                  minQty: toPositiveInteger(tier?.minQty, 2),
                  discountType: "percentage",
                  discountValue: toPositiveNumber(tier?.discountValue, 10),
                }))
              : [],
          }))
        : fallback.products,
    };
  } catch {
    return fallback;
  }
}

function normalizeVolumeConfig(config) {
  return {
    ...config,
    title: config.title.trim() || "Volume Discount",
    message: config.message.trim() || "Buy more & save more",
    products: config.products
      .map((product) => ({
        ...product,
        productId: product.productId.trim(),
        productTitle: product.productTitle.trim(),
        tiers: [...product.tiers]
          .map((tier) => ({
            ...tier,
            discountType: "percentage",
            minQty: toPositiveInteger(tier.minQty, 2),
            discountValue: toPositiveNumber(tier.discountValue, 10),
            label: `Buy ${toPositiveInteger(tier.minQty, 2)} get ${toPositiveNumber(
              tier.discountValue,
              10,
            )}% off`,
          }))
          .sort((left, right) => right.minQty - left.minQty),
      }))
      .filter((product) => product.productId),
  };
}

function validateVolumeConfig(config) {
  const errors = [];

  if (!config.title.trim()) {
    errors.push("Discount title is required.");
  }

  if (!config.products.length) {
    errors.push("Add at least one product rule.");
  }

  for (const product of config.products) {
    if (!product.productId) {
      errors.push("Every product rule needs a product.");
    }

    if (!product.tiers.length) {
      errors.push(
        `${product.productTitle || "A product"} needs at least one tier.`,
      );
      continue;
    }

    for (const tier of product.tiers) {
      if (tier.minQty < 2) {
        errors.push("Tier quantity must be 2 or more.");
      }

      if (tier.discountValue <= 0) {
        errors.push("Tier discount value must be greater than 0.");
      }
    }
  }

  return errors;
}

function toPositiveInteger(value, fallback) {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}

function toPositiveNumber(value, fallback) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}

function toErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildProductSearchQuery(searchTerm) {
  const normalizedSearchTerm = searchTerm.trim();

  if (!normalizedSearchTerm) {
    return "";
  }

  const exactPhrase = escapeShopifySearchValue(normalizedSearchTerm);
  const tokens = normalizedSearchTerm
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => escapeShopifySearchValue(token));

  const titleClauses = [
    `title:${exactPhrase}*`,
    ...tokens.map((token) => `title:${token}*`),
  ];
  const handleClauses = tokens.map((token) => `handle:${token}*`);

  return [...titleClauses, ...handleClauses].join(" OR ");
}

function escapeShopifySearchValue(value) {
  return value.replace(/([:\\()])/g, "\\$1");
}
