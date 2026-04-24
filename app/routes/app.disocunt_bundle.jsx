import { useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

const BUNDLE_METAFIELD_NAMESPACE = "$app:bundle-discount";
const BUNDLE_METAFIELD_KEY = "function-configuration";
const DEFAULT_FUNCTION_HANDLE = "bundle-pack-3-for-999";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const env = globalThis.process?.env ?? {};
  const [collectionsResult, discountsResult] = await Promise.allSettled([
    admin.graphql(
      `#graphql
        query BundleCollections {
          collections(first: 50) {
            edges {
              node {
                id
                title
                handle
              }
            }
          }
        }`,
    ),
    admin.graphql(
      `#graphql
        query ExistingBundleDiscounts {
          automaticDiscountNodes(first: 25) {
            edges {
              node {
                id
                metafield(
                  namespace: "${BUNDLE_METAFIELD_NAMESPACE}"
                  key: "${BUNDLE_METAFIELD_KEY}"
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

  const collections =
    collectionsResult.status === "fulfilled"
      ? ((await collectionsResult.value.json()).data?.collections?.edges?.map(
          ({ node }) => node,
        ) || [])
      : [];
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
          config: parseBundleConfig(configValue),
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
    collections,
    discounts,
    discountsError,
    functionHandle:
      env.SHOPIFY_BUNDLE_FUNCTION_HANDLE || DEFAULT_FUNCTION_HANDLE,
  };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const env = globalThis.process?.env ?? {};
  const intent = String(formData.get("intent") || "create");

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
            message: "The selected bundle discount could not be updated.",
          },
        ],
        graphqlErrors: [],
      };
    }

    try {
      const response = await admin.graphql(
        `#graphql
          mutation ToggleBundleDiscount($id: ID!) {
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

  const {
    ids: selectedCollectionIds,
    invalid: invalidCollectionIds,
  } = parseCollectionIds(formData.getAll("selectedCollectionIds"));

  const bundleConfig = {
    bundle2Price: toPositiveNumber(formData.get("bundle2Price"), 799),
    bundle3Price: toPositiveNumber(formData.get("bundle3Price"), 999),
    selectedCollectionIds,
    message:
      String(formData.get("message") || "").trim() ||
      "Bundle Discount Applied",
  };

  if (invalidCollectionIds.length > 0) {
    return {
      ok: false,
      userErrors: [
        {
          field: ["selectedCollectionIds"],
          message:
            "Collection IDs must be numeric IDs or Shopify GIDs like gid://shopify/Collection/123.",
        },
      ],
      action: intent,
      graphqlErrors: [],
      invalidCollectionIds,
      config: bundleConfig,
    };
  }

  const automaticAppDiscount = {
    title: String(formData.get("title") || "").trim() || "Bundle Discount",
    startsAt: new Date().toISOString(),
    endsAt: null,
    // Use the stable extension handle so this works across environments
    // without needing to copy a function ID into env vars.
    functionHandle:
      env.SHOPIFY_BUNDLE_FUNCTION_HANDLE || DEFAULT_FUNCTION_HANDLE,
    discountClasses: ["ORDER"],
    combinesWith: {
      productDiscounts: false,
      orderDiscounts: false,
      shippingDiscounts: false,
    },
    metafields: [
      {
        namespace: BUNDLE_METAFIELD_NAMESPACE,
        key: BUNDLE_METAFIELD_KEY,
        type: "json",
        value: JSON.stringify(bundleConfig),
      },
    ],
  };

  // This creates one automatic discount owner. The Shopify Function code is
  // deployed once, then Shopify invokes it dynamically whenever any buyer's
  // cart/checkout is recalculated. The buyer's current cart lines and this
  // metafield config are passed into that one isolated execution.
  try {
    const response = await admin.graphql(
      `#graphql
        mutation CreateBundleDiscount($automaticAppDiscount: DiscountAutomaticAppInput!) {
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
      config: bundleConfig,
    };
  } catch (error) {
    return {
      ok: false,
      action: intent,
      userErrors: [],
      graphqlErrors: [{ message: toErrorMessage(error) }],
      config: bundleConfig,
    };
  }
};

export default function DiscountBundlePage() {
  const createFetcher = useFetcher();
  const toggleFetcher = useFetcher();
  const shopify = useAppBridge();
  const { collections, discounts, discountsError, functionHandle } =
    useLoaderData();
  const isSaving = createFetcher.state !== "idle";
  const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
  const togglingDiscountNodeId = toggleFetcher.formData?.get("discountNodeId");
  const collectionTitleMap = useMemo(
    () =>
      new Map(collections.map((collection) => [collection.id, collection.title])),
    [collections],
  );

  useEffect(() => {
    const savedCollectionIds = createFetcher.data?.config?.selectedCollectionIds;

    if (Array.isArray(savedCollectionIds)) {
      setSelectedCollectionIds(savedCollectionIds);
    }
  }, [createFetcher.data]);

  useEffect(() => {
    if (createFetcher.data?.ok) {
      shopify.toast.show("Bundle discount created");
    }
  }, [createFetcher.data?.ok, shopify]);

  useEffect(() => {
    if (toggleFetcher.data?.ok) {
      shopify.toast.show(
        toggleFetcher.data?.nextStatus === "disable"
          ? "Bundle discount disabled"
          : "Bundle discount enabled",
      );
    }
  }, [shopify, toggleFetcher.data]);

  const selectedCollectionTitles = useMemo(() => {
    const selectedIds = new Set(selectedCollectionIds);

    return collections
      .filter((collection) => selectedIds.has(collection.id))
      .map((collection) => collection.title);
  }, [collections, selectedCollectionIds]);
  const latestResponse = toggleFetcher.data || createFetcher.data;

  return (
    <s-page heading="Bundle discount">
      <s-section heading="Create automatic bundle discount">
        <createFetcher.Form method="post">
          <s-stack direction="block" gap="base">
            <input type="hidden" name="intent" value="create" />
            <s-text-field
              label="Discount title"
              name="title"
              defaultValue="Bundle Discount"
            />
            <s-text-field
              label="Bundle 2 fixed price"
              name="bundle2Price"
              type="number"
              defaultValue="799"
            />
            <s-text-field
              label="Bundle 3 fixed price"
              name="bundle3Price"
              type="number"
              defaultValue="999"
            />
            {/* s-choice-list manages UI state, so hidden inputs carry the
                selected collection IDs through the actual form POST. */}
            {selectedCollectionIds.map((collectionId) => (
              <input
                key={collectionId}
                type="hidden"
                name="selectedCollectionIds"
                value={collectionId}
              />
            ))}
            {collections.length > 0 ? (
              <s-choice-list
                label="Eligible collections"
                details="Leave all unchecked to apply this bundle to every product."
                multiple
                name="selectedCollectionIdsUi"
                values={selectedCollectionIds}
                onInput={(event) =>
                  setSelectedCollectionIds([...event.currentTarget.values])
                }
              >
                {collections.map((collection) => (
                  <s-choice
                    key={collection.id}
                    value={collection.id}
                    details={collection.handle ? `/${collection.handle}` : ""}
                  >
                    {collection.title}
                  </s-choice>
                ))}
              </s-choice-list>
            ) : (
              <s-paragraph>
                No collections found. If you leave this empty, the discount will
                apply to all products.
              </s-paragraph>
            )}
            {selectedCollectionTitles.length > 0 && (
              <s-paragraph>
                Selected collections: {selectedCollectionTitles.join(", ")}
              </s-paragraph>
            )}
            <s-text-field
              label="Discount message"
              name="message"
              defaultValue="Bundle Discount Applied"
            />
            <s-button type="submit" variant="primary" loading={isSaving}>
              Create discount
            </s-button>
          </s-stack>
        </createFetcher.Form>
      </s-section>

      <s-section heading="Saved bundle discounts">
        {discountsError ? (
          <s-paragraph>
            Saved discounts could not be loaded: {discountsError}
          </s-paragraph>
        ) : discounts.length > 0 ? (
          <s-stack direction="block" gap="base">
            {discounts.map((discount) => {
              const isActive = discount.status === "ACTIVE";
              const isToggling =
                toggleFetcher.state !== "idle" &&
                togglingDiscountNodeId === discount.nodeId;
              const discountCollectionTitles = discount.config.selectedCollectionIds
                .map((collectionId) => collectionTitleMap.get(collectionId) || collectionId);

              return (
                <s-box
                  key={discount.nodeId}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <s-stack direction="block" gap="tight">
                    <s-heading>{discount.title}</s-heading>
                    <s-paragraph>Status: {discount.status}</s-paragraph>
                    <s-paragraph>
                      Bundle prices: 2 for {discount.config.bundle2Price}, 3 for{" "}
                      {discount.config.bundle3Price}
                    </s-paragraph>
                    <s-paragraph>
                      Collections:{" "}
                      {discountCollectionTitles.length > 0
                        ? discountCollectionTitles.join(", ")
                        : "All products"}
                    </s-paragraph>
                    <s-paragraph>Message: {discount.config.message}</s-paragraph>
                    <s-paragraph>Starts at: {discount.startsAt}</s-paragraph>
                    <s-paragraph>
                      Ends at: {discount.endsAt || "No end date"}
                    </s-paragraph>
                    <s-paragraph>Discount ID: {discount.discountId}</s-paragraph>
                    <toggleFetcher.Form method="post">
                      <input type="hidden" name="intent" value="toggle-status" />
                      <input
                        type="hidden"
                        name="discountNodeId"
                        value={discount.nodeId}
                      />
                      <input
                        type="hidden"
                        name="nextStatus"
                        value={isActive ? "disable" : "enable"}
                      />
                      <s-button type="submit" variant="secondary" loading={isToggling}>
                        {isActive ? "Disable" : "Enable"}
                      </s-button>
                    </toggleFetcher.Form>
                  </s-stack>
                </s-box>
              );
            })}
          </s-stack>
        ) : (
          <s-paragraph>
            No saved bundle discounts yet. Create one above and it will appear
            here with its current status and configuration.
          </s-paragraph>
        )}
      </s-section>

      {latestResponse && (
        <s-section heading={latestResponse.ok ? "Response" : "GraphQL response"}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            <code>{JSON.stringify(latestResponse, null, 2)}</code>
          </pre>
        </s-section>
      )}

      <s-section slot="aside" heading="Runtime behavior">
        <s-paragraph>
          Function binding: {functionHandle}
        </s-paragraph>
        <s-paragraph>
          Shopify triggers this automatically when a cart or checkout changes.
          The app page creates the discount config once; buyers do not need to
          keep this Remix route open.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

function parseCollectionIds(value) {
  const rawValues = Array.isArray(value) ? value : [value];
  const invalid = [];
  const ids = rawValues
    .flatMap((entry) => String(entry || "").split(/[\n,]+/))
    .map((collectionId) => collectionId.trim())
    .filter(Boolean)
    .map((collectionId) => normalizeCollectionId(collectionId))
    .filter((result) => {
      if (!result.valid) {
        invalid.push(result.input);
      }

      return result.valid;
    })
    .map((result) => result.id);

  return { ids, invalid };
}

function normalizeCollectionId(value) {
  // Accept numeric IDs, correct GIDs, and the common mistyped
  // gid:shopify/... form so existing merchant input can be recovered.
  if (/^\d+$/.test(value)) {
    return { valid: true, id: `gid://shopify/Collection/${value}` };
  }

  if (/^gid:\/\/shopify\/Collection\/\d+$/.test(value)) {
    return { valid: true, id: value };
  }

  if (/^gid:shopify\/Collection\/\d+$/.test(value)) {
    return {
      valid: true,
      id: value.replace("gid:shopify/", "gid://shopify/"),
    };
  }

  return { valid: false, input: value };
}

function parseBundleConfig(value) {
  const fallback = {
    bundle2Price: 799,
    bundle3Price: 999,
    selectedCollectionIds: [],
    message: "Bundle Discount Applied",
  };

  if (!value) {
    return fallback;
  }

  try {
    const config = JSON.parse(value);

    return {
      bundle2Price: toPositiveNumber(config.bundle2Price, fallback.bundle2Price),
      bundle3Price: toPositiveNumber(config.bundle3Price, fallback.bundle3Price),
      selectedCollectionIds: Array.isArray(config.selectedCollectionIds)
        ? config.selectedCollectionIds.filter((id) => typeof id === "string")
        : [],
      message:
        typeof config.message === "string" && config.message.trim()
          ? config.message.trim()
          : fallback.message,
    };
  } catch {
    return fallback;
  }
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
