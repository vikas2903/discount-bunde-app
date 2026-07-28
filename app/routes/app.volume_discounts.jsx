import { useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { requireSubscription } from "../utils/billing.server";
import VolumeDiscountForm from "../components/volume-discounts/VolumeDiscountForm";
import {
  createVolumeDiscount,
  deleteVolumeDiscount,
  getVolumeCollections,
  listVolumeDiscounts,
  resolveVolumeFunctionHandle,
  toggleVolumeDiscountStatus,
  updateVolumeDiscount,
} from "../services/volume-discount.server";
import {
  DEFAULT_VOLUME_CONFIG,
  normalizeVolumeConfig,
  parseVolumeConfig,
  validateVolumeConfig,
} from "../utils/volume-discount";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  await requireSubscription(billing, request, session.shop);
  const [collectionsResult, discountsResult] = await Promise.allSettled([
    getVolumeCollections(admin),
    listVolumeDiscounts(admin),
  ]);

  return {
    collections:
      collectionsResult.status === "fulfilled"
        ? collectionsResult.value.collections
        : [],
    discounts:
      discountsResult.status === "fulfilled" ? discountsResult.value.discounts : [],
    loadError: [
      ...(collectionsResult.status === "rejected"
        ? [toErrorMessage(collectionsResult.reason)]
        : collectionsResult.value.graphqlErrors.map(({ message }) => message)),
      ...(discountsResult.status === "rejected"
        ? [toErrorMessage(discountsResult.reason)]
        : discountsResult.value.graphqlErrors.map(({ message }) => message)),
    ]
      .filter(Boolean)
      .join(" | "),
  };
};

export const action = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  await requireSubscription(billing, request, session.shop);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "create");

  if (intent === "toggle-status") {
    const discountId = String(formData.get("discountId") || "").trim();
    const nextStatus = String(formData.get("nextStatus") || "").trim();

    if (!discountId || !["enable", "disable"].includes(nextStatus)) {
      return createActionError(
        intent,
        "The selected volume discount could not be updated.",
      );
    }

    try {
      return {
        ...(await toggleVolumeDiscountStatus(admin, {
          id: discountId,
          nextStatus,
        })),
        action: intent,
      };
    } catch (error) {
      return createActionError(intent, toErrorMessage(error));
    }
  }

  if (intent === "delete") {
    const discountId = String(formData.get("discountId") || "").trim();

    if (!discountId) {
      return createActionError(
        intent,
        "The selected volume discount could not be deleted.",
      );
    }

    try {
      return {
        ...(await deleteVolumeDiscount(admin, discountId)),
        action: intent,
      };
    } catch (error) {
      return createActionError(intent, toErrorMessage(error));
    }
  }

  const config = normalizeVolumeConfig(
    parseVolumeConfig(String(formData.get("config") || "{}")),
  );
  const validationErrors = validateVolumeConfig(config);
  const { discounts: existingDiscounts } = await listVolumeDiscounts(admin);
  const editingDiscountId = String(formData.get("discountId") || "").trim();
  const overlappingDiscounts = existingDiscounts.filter((discount) => {
    if (discount.status !== "ACTIVE") {
      return false;
    }

    if (discount.discountId === editingDiscountId) {
      return false;
    }

    if (discount.config.mode === "legacy-product") {
      return false;
    }

    return hasCollectionOverlap(
      config.selectedCollectionIds,
      discount.config.selectedCollectionIds || [],
    );
  });

  if (validationErrors.length > 0 || overlappingDiscounts.length > 0) {
    return {
      ok: false,
      action: intent,
      config,
      userErrors: [
        ...validationErrors.map((message) => ({
          field: ["config"],
          message,
        })),
        ...overlappingDiscounts.map((discount) => ({
          field: ["config"],
          message: `This discount overlaps with active volume discount "${discount.title}". Deactivate or change collections before saving.`,
        })),
      ],
      graphqlErrors: [],
    };
  }

  try {
    if (intent === "update") {
      const discountId = String(formData.get("discountId") || "").trim();

      if (!discountId) {
        return createActionError(intent, "Discount ID is required to update.");
      }

      return {
        ...(await updateVolumeDiscount(admin, {
          id: discountId,
          title: config.title,
          startsAt: String(formData.get("startsAt") || "").trim() || undefined,
          endsAt: String(formData.get("endsAt") || "").trim() || null,
          functionHandle: resolveVolumeFunctionHandle(),
          config,
        })),
        action: intent,
        config,
      };
    }

    return {
      ...(await createVolumeDiscount(admin, {
        title: config.title,
        startsAt: new Date().toISOString(),
        endsAt: null,
        functionHandle: resolveVolumeFunctionHandle(),
        config,
      })),
      action: intent,
      config,
    };
  } catch (error) {
    return createActionError(intent, toErrorMessage(error), config);
  }
};

const INITIAL_FORM = {
  ...DEFAULT_VOLUME_CONFIG,
  tiers: [...DEFAULT_VOLUME_CONFIG.tiers],
};

export default function VolumeDiscountsPage() {
  const formFetcher = useFetcher();
  const actionFetcher = useFetcher();
  const shopify = useAppBridge();
  const { collections, discounts, loadError } = useLoaderData();
  const [form, setForm] = useState(INITIAL_FORM);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [editingDiscountId, setEditingDiscountId] = useState("");
  const [editingSchedule, setEditingSchedule] = useState({
    startsAt: "",
    endsAt: "",
  });

  const collectionTitleMap = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection.title])),
    [collections],
  );
  const latestAction = formFetcher.data || actionFetcher.data;
  const editingDiscount = useMemo(
    () =>
      discounts.find((discount) => discount.discountId === editingDiscountId) || null,
    [discounts, editingDiscountId],
  );
  const overlapWarnings = useMemo(() => {
    const currentCollectionIds = form.selectedCollectionIds || [];

    return discounts
      .filter((discount) => discount.discountId !== editingDiscountId)
      .filter((discount) => discount.config.mode !== "legacy-product")
      .filter((discount) => discount.status === "ACTIVE")
      .filter((discount) =>
        hasCollectionOverlap(currentCollectionIds, discount.config.selectedCollectionIds || []),
      )
      .map((discount) => {
        const collectionTitles =
          discount.config.selectedCollectionIds.length > 0
            ? discount.config.selectedCollectionIds
                .map((collectionId) => collectionTitleMap.get(collectionId) || collectionId)
                .join(", ")
            : "All products";

        return {
          discountId: discount.discountId,
          title: discount.title,
          collections: collectionTitles,
        };
      });
  }, [collectionTitleMap, discounts, editingDiscountId, form.selectedCollectionIds]);
  const filteredDiscounts = useMemo(() => {
    if (activeTab === "active") {
      return discounts.filter((discount) => discount.status === "ACTIVE");
    }

    if (activeTab === "draft") {
      return discounts.filter((discount) => discount.status !== "ACTIVE");
    }

    return discounts;
  }, [activeTab, discounts]);

  useEffect(() => {
    if (formFetcher.data?.config) {
      setForm(formFetcher.data.config);
    }
  }, [formFetcher.data]);

  useEffect(() => {
    if (!formFetcher.data?.ok) {
      return;
    }

    if (formFetcher.data.action === "update") {
      shopify.toast.show("Quantity offer updated");
    } else {
      shopify.toast.show("Quantity offer created");
    }

    setForm(INITIAL_FORM);
    setShowForm(false);
    setEditingDiscountId("");
    setEditingSchedule({ startsAt: "", endsAt: "" });
  }, [formFetcher.data, shopify]);

  useEffect(() => {
    if (!actionFetcher.data?.ok) {
      return;
    }

    if (actionFetcher.data.action === "delete") {
      shopify.toast.show("Quantity offer deleted");
      if (editingDiscountId === String(actionFetcher.formData?.get("discountId") || "")) {
        setForm(INITIAL_FORM);
        setShowForm(false);
        setEditingDiscountId("");
        setEditingSchedule({ startsAt: "", endsAt: "" });
      }
      return;
    }

    if (actionFetcher.data.action === "toggle-status") {
      shopify.toast.show(
        actionFetcher.data.nextStatus === "disable"
          ? "Quantity offer turned off"
          : "Quantity offer turned on",
      );
    }
  }, [actionFetcher.data, actionFetcher.formData, editingDiscountId, shopify]);

  const actionErrorMessage = [
    ...(latestAction?.userErrors || []).map(({ message }) => message),
    ...(latestAction?.graphqlErrors || []).map(({ message }) => message),
  ]
    .filter(Boolean)
    .join(" | ");

  const startEditing = (discount) => {
    if (discount.config.mode === "legacy-product") {
      shopify.toast.show("Legacy product-rule discounts can be toggled or deleted only");
      return;
    }

    setShowForm(true);
    setEditingDiscountId(discount.discountId);
    setEditingSchedule({
      startsAt: discount.startsAt || "",
      endsAt: discount.endsAt || "",
    });
    setForm({
      title: discount.config.title || discount.title,
      message: discount.config.message || DEFAULT_VOLUME_CONFIG.message,
      status: discount.config.status || "ACTIVE",
      selectedCollectionIds: [...(discount.config.selectedCollectionIds || [])],
      tiers:
        discount.config.tiers.length > 0
          ? discount.config.tiers.map((tier) => ({ ...tier }))
          : [...DEFAULT_VOLUME_CONFIG.tiers],
    });
  };

  const cancelEditing = () => {
    setShowForm(false);
    setEditingDiscountId("");
    setEditingSchedule({ startsAt: "", endsAt: "" });
    setForm(INITIAL_FORM);
  };

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
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>
            Quantity-based offers
          </h1>
          <button
            type="button"
            onClick={() => {
              setForm(INITIAL_FORM);
              setEditingDiscountId("");
              setEditingSchedule({ startsAt: "", endsAt: "" });
              setShowForm(true);
            }}
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
            Create quantity offer
          </button>
        </div>

        {loadError ? (
          <s-banner tone="critical">
            <s-paragraph>{loadError}</s-paragraph>
          </s-banner>
        ) : null}
        {actionErrorMessage ? (
          <s-banner tone="critical">
            <s-paragraph>{actionErrorMessage}</s-paragraph>
          </s-banner>
        ) : null}
        {showForm && overlapWarnings.length > 0 ? (
          <s-banner tone="warning">
            <s-paragraph>
              This offer includes products that are already covered by an active quantity offer.
              Review the offers below before saving so shoppers do not receive an unexpected saving.
            </s-paragraph>
            <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.6rem" }}>
              {overlapWarnings.map((warning) => (
                <s-paragraph key={warning.discountId}>
                  {warning.title} - {warning.collections}
                </s-paragraph>
              ))}
            </div>
          </s-banner>
        ) : null}

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
                        {heading === "" ? (index === 0 ? <input type="checkbox" disabled /> : null) : heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredDiscounts.length > 0 ? (
                  filteredDiscounts.map((discount) => {
                    const isActive = discount.status === "ACTIVE";
                    const targetedDiscountId = String(
                      actionFetcher.formData?.get("discountId") || "",
                    );
                    const currentAction = actionFetcher.data?.action;
                    const isWorkingOnThisDiscount =
                      actionFetcher.state !== "idle" &&
                      targetedDiscountId === discount.discountId;
                    const collectionTitles = discount.config.selectedCollectionIds.map(
                      (collectionId) => collectionTitleMap.get(collectionId) || collectionId,
                    );
                    const sortedTiers =
                      discount.config.mode === "legacy-product"
                        ? []
                        : [...discount.config.tiers].sort(
                            (left, right) => left.minQty - right.minQty,
                          );
                    const leadTier = sortedTiers[0];
                    const discountLabel = leadTier
                      ? `${leadTier.minQty} items -> ${leadTier.discountValue}% off`
                      : "Legacy product rules";
                    const typeLabel =
                      collectionTitles.length > 0 ? "Collection-based" : "Store-wide";

                    return (
                      <tr key={discount.discountId}>
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
                            {discount.config.mode !== "legacy-product" ? (
                              <button
                                type="button"
                                style={rowIconButtonStyle}
                                onClick={() => startEditing(discount)}
                              >
                                Edit
                              </button>
                            ) : null}
                            <actionFetcher.Form method="post">
                              <input type="hidden" name="intent" value="toggle-status" />
                              <input
                                type="hidden"
                                name="discountId"
                                value={discount.discountId}
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
                                name="discountId"
                                value={discount.discountId}
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
                      No volume discounts found in this tab.
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

        {showForm ? (
          <s-section
            heading={editingDiscount ? "Edit quantity offer" : "Create quantity offer"}
          >
            <VolumeDiscountForm
              fetcher={formFetcher}
              form={form}
              setForm={setForm}
              collections={collections}
              isEditing={Boolean(editingDiscount)}
              editingDiscountId={editingDiscountId}
              editingSchedule={editingSchedule}
              onCancelEdit={cancelEditing}
            />
          </s-section>
        ) : null}
      </div>
    </s-page>
  );
}

function createActionError(action, message, config = null) {
  return {
    ok: false,
    action,
    config,
    userErrors: message
      ? [
          {
            field: ["config"],
            message,
          },
        ]
      : [],
    graphqlErrors: [],
  };
}

function toErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function hasCollectionOverlap(leftCollectionIds, rightCollectionIds) {
  const left = Array.isArray(leftCollectionIds) ? leftCollectionIds : [];
  const right = Array.isArray(rightCollectionIds) ? rightCollectionIds : [];

  if (left.length === 0 || right.length === 0) {
    return true;
  }

  return left.some((collectionId) => right.includes(collectionId));
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
