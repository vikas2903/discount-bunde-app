import { useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData, useNavigate, useOutlet } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  deleteBundleDiscount,
  getBundleCollections,
  listBundleDiscounts,
  toggleBundleDiscountStatus,
} from "../services/bundle-discount.server";
import { authenticate } from "../shopify.server";
import { toErrorMessage } from "../utils/bundle-discount";
import { requireSubscription } from "../utils/billing.server";

export const loader = async ({ request }) => {
  const { admin, billing } = await authenticate.admin(request);
  await requireSubscription(billing, request);
  const [collectionsResult, discountsResult] = await Promise.allSettled([
    getBundleCollections(admin),
    listBundleDiscounts(admin),
  ]);

  const collections =
    collectionsResult.status === "fulfilled"
      ? collectionsResult.value.collections
      : [];
  const discounts =
    discountsResult.status === "fulfilled" ? discountsResult.value.discounts : [];
  const loadErrors = [
    ...(collectionsResult.status === "rejected"
      ? [toErrorMessage(collectionsResult.reason)]
      : collectionsResult.value.graphqlErrors.map(({ message }) => message)),
    ...(discountsResult.status === "rejected"
      ? [toErrorMessage(discountsResult.reason)]
      : discountsResult.value.graphqlErrors.map(({ message }) => message)),
  ];

  return {
    collections,
    discounts,
    discountsError: loadErrors.join(" | ") || null,
  };
};

export const action = async ({ request }) => {
  const { admin, billing } = await authenticate.admin(request);
  await requireSubscription(billing, request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

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
      return {
        ...(await toggleBundleDiscountStatus(admin, {
          id: discountNodeId,
          nextStatus,
        })),
        action: intent,
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

  if (intent === "delete") {
    const discountNodeId = String(formData.get("discountNodeId") || "").trim();

    if (!discountNodeId) {
      return {
        ok: false,
        action: intent,
        userErrors: [
          {
            field: ["discountNodeId"],
            message: "The selected bundle discount could not be deleted.",
          },
        ],
        graphqlErrors: [],
      };
    }

    try {
      return {
        ...(await deleteBundleDiscount(admin, discountNodeId)),
        action: intent,
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

  return {
    ok: false,
    action: intent,
    userErrors: [{ field: ["intent"], message: "Unsupported action." }],
    graphqlErrors: [],
  };
};

export default function DiscountBundlePage() {
  const outlet = useOutlet();

  if (outlet) {
    return outlet;
  }

  return <DiscountBundleListPage />;
}

function DiscountBundleListPage() {
  const actionFetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const { collections, discounts, discountsError } = useLoaderData();
  const [activeTab, setActiveTab] = useState("all");

  const collectionTitleMap = useMemo(
    () =>
      new Map(collections.map((collection) => [collection.id, collection.title])),
    [collections],
  );
  const filteredDiscounts = useMemo(() => {
    if (activeTab === "active") {
      return discounts.filter((discount) => discount.status === "ACTIVE");
    }

    if (activeTab === "draft") {
      return discounts.filter((discount) => discount.status !== "ACTIVE");
    }

    return discounts;
  }, [activeTab, discounts]);
  const currentAction = actionFetcher.data?.action;
  const actionFormData = actionFetcher.formData;
  const actionErrorMessage = [
    ...(actionFetcher.data?.userErrors || []).map(({ message }) => message),
    ...(actionFetcher.data?.graphqlErrors || []).map(({ message }) => message),
  ]
    .filter(Boolean)
    .join(" | ");

  useEffect(() => {
    if (!actionFetcher.data?.ok) {
      return;
    }

    if (currentAction === "toggle-status") {
      shopify.toast.show(
        actionFetcher.data?.nextStatus === "disable"
          ? "Bundle discount disabled"
          : "Bundle discount enabled",
      );
      return;
    }

    if (currentAction === "delete") {
      shopify.toast.show("Bundle discount deleted");
    }
  }, [actionFetcher.data, currentAction, shopify]);

  return (
    <s-page>
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>Bundles</h1>
          <button
            type="button"
            onClick={() => navigate("new")}
            style={{
              border: "1px solid #2b2b2b",
              background: "#333333",
              color: "#ffffff",
              borderRadius: "0.65rem",
              padding: "0.75rem 1rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            Create new bundles
          </button>
        </div>

        {actionErrorMessage ? (
          <s-banner tone="critical">
            <s-paragraph>{actionErrorMessage}</s-paragraph>
          </s-banner>
        ) : null}

        {discountsError ? (
          <s-paragraph>
            Saved discounts could not be loaded: {discountsError}
          </s-paragraph>
        ) : (
          <div style={panelStyle}>
            <div style={toolbarStyle}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[
                  { key: "all", label: "All" },
                  { key: "active", label: "Active" },
                  { key: "draft", label: "Draft" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      ...tabButtonStyle,
                      background: activeTab === tab.key ? "#f1f1f1" : "transparent",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "920px",
                }}
              >
                <thead>
                  <tr>
                    {["", "Name", "Discount", "Status", "Type", ""].map(
                      (heading, index) => (
                        <th key={`${heading}-${index}`} style={headerCellStyle}>
                          {heading === "" ? (
                            index === 0 ? (
                              <input type="checkbox" disabled />
                            ) : null
                          ) : (
                            heading
                          )}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredDiscounts.length > 0 ? (
                    filteredDiscounts.map((discount) => {
                      const isActive = discount.status === "ACTIVE";
                      const targetedNodeId = String(
                        actionFormData?.get("discountNodeId") || "",
                      );
                      const isWorkingOnThisDiscount =
                        actionFetcher.state !== "idle" &&
                        targetedNodeId === discount.nodeId;
                      const discountCollectionTitles =
                        discount.config.selectedCollectionIds.map(
                          (collectionId) =>
                            collectionTitleMap.get(collectionId) || collectionId,
                        );
                      const sortedTiers = [...discount.config.bundleTiers].sort(
                        (left, right) => left.quantity - right.quantity,
                      );
                      const leadTier = sortedTiers[0];
                      const discountLabel = leadTier
                        ? `Set price Rs. ${leadTier.price}`
                        : "No pricing";
                      const typeLabel =
                        discountCollectionTitles.length > 0
                          ? "Mix and match"
                          : "Store-wide";

                      return (
                        <tr key={discount.nodeId}>
                          <td style={bodyCellStyle}>
                            <input type="checkbox" />
                          </td>
                          <td style={bodyCellStyle}>{discount.title}</td>
                          <td style={bodyCellStyle}>{discountLabel}</td>
                          <td style={bodyCellStyle}>
                            <span
                              style={{
                                ...statusPillStyle,
                                background: isActive ? "#b8f7c4" : "#eceff3",
                                color: isActive ? "#177a34" : "#64748b",
                              }}
                            >
                              {isActive ? "Active" : "Draft"}
                            </span>
                          </td>
                          <td style={bodyCellStyle}>{typeLabel}</td>
                          <td style={{ ...bodyCellStyle, textAlign: "right" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "0.45rem",
                              }}
                            >
                              <button
                                type="button"
                                style={rowIconButtonStyle}
                                onClick={() =>
                                  navigate(`edit/${encodeURIComponent(discount.nodeId)}`)
                                }
                              >
                                Edit
                              </button>
                              <actionFetcher.Form method="post">
                                <input
                                  type="hidden"
                                  name="intent"
                                  value="toggle-status"
                                />
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
                                <button
                                  type="submit"
                                  style={rowIconButtonStyle}
                                  disabled={
                                    isWorkingOnThisDiscount &&
                                    currentAction === "toggle-status"
                                  }
                                >
                                  {isActive ? "Deactivate" : "Activate"}
                                </button>
                              </actionFetcher.Form>
                              <actionFetcher.Form method="post">
                                <input type="hidden" name="intent" value="delete" />
                                <input
                                  type="hidden"
                                  name="discountNodeId"
                                  value={discount.nodeId}
                                />
                                <button
                                  type="submit"
                                  style={rowIconButtonStyle}
                                  disabled={
                                    isWorkingOnThisDiscount &&
                                    currentAction === "delete"
                                  }
                                >
                                  Delete
                                </button>
                              </actionFetcher.Form>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={emptyStateCellStyle}>
                        No bundle discounts found in this tab.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={pagerWrapStyle}>
              <button type="button" disabled style={pagerButtonStyle}>
                {"<"}
              </button>
              <span style={{ color: "#666", fontSize: "1.05rem" }}>
                Showing page 1 of 1
              </span>
              <button type="button" disabled style={pagerButtonStyle}>
                {">"}
              </button>
            </div>
          </div>
        )}
      </div>
    </s-page>
  );
}

const panelStyle = {
  border: "1px solid #d7dbe0",
  borderRadius: "1rem",
  overflow: "hidden",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
};

const toolbarStyle = {
  padding: "0.7rem 0.8rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  borderBottom: "1px solid #e5e7eb",
  flexWrap: "wrap",
};

const tabButtonStyle = {
  border: "none",
  color: "#444",
  borderRadius: "0.7rem",
  padding: "0.6rem 0.9rem",
  fontWeight: 600,
  cursor: "pointer",
};

const headerCellStyle = {
  textAlign: "left",
  padding: "0.9rem 0.9rem",
  fontSize: "0.9rem",
  fontWeight: 700,
  color: "#666",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const bodyCellStyle = {
  padding: "0.85rem 0.9rem",
  borderBottom: "1px solid #e5e7eb",
  color: "#2c2c2c",
  fontSize: "0.92rem",
};

const statusPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "0.28rem 0.65rem",
  fontSize: "0.85rem",
};

const rowIconButtonStyle = {
  borderRadius: "0.6rem",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: "0.9rem",
  padding: "0.45rem 0.7rem",
  minHeight: "2rem",
};

const emptyStateCellStyle = {
  padding: "2rem 1rem",
  textAlign: "center",
  color: "#6b7280",
};

const pagerWrapStyle = {
  padding: "1.8rem 1rem",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "1rem",
};

const pagerButtonStyle = {
  width: "2rem",
  height: "2rem",
  borderRadius: "0.6rem",
  border: "1px solid #e5e7eb",
  background: "#efefef",
  color: "#6b7280",
  fontSize: "1.2rem",
  opacity: 0.45,
};
