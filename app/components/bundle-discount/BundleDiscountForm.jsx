/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import { useRevalidator } from "react-router";
import { DEFAULT_BUNDLE_CONFIG } from "../../utils/bundle-discount";

export function BundleDiscountForm({
  action = "create",
  collections,
  defaultValues,
  submitLabel,
  loading = false,
  error,
}) {
  const revalidator = useRevalidator();
  const initialValues = useMemo(
    () => ({
      title: defaultValues?.title || "Bundle Discount",
      startsAt:
        toDateTimeLocalValue(defaultValues?.startsAt) ||
        toDateTimeLocalValue(new Date().toISOString()),
      endsAt: toDateTimeLocalValue(defaultValues?.endsAt),
      config: {
        bundleTiers: (defaultValues?.config?.bundleTiers ?? DEFAULT_BUNDLE_CONFIG.bundleTiers).map(toFormTier),
        selectedCollectionIds:
          defaultValues?.config?.selectedCollectionIds ??
          DEFAULT_BUNDLE_CONFIG.selectedCollectionIds,
        message:
          defaultValues?.config?.message ?? DEFAULT_BUNDLE_CONFIG.message,
      },
    }),
    [defaultValues],
  );
  const [startDate, setStartDate] = useState(
    getDatePart(initialValues.startsAt) || getDatePart(toDateTimeLocalValue(new Date().toISOString())),
  );
  const [startTime, setStartTime] = useState(
    getTimePart(initialValues.startsAt) || "00:00",
  );
  const [hasEndDate, setHasEndDate] = useState(Boolean(initialValues.endsAt));
  const [endDate, setEndDate] = useState(getDatePart(initialValues.endsAt));
  const [endTime, setEndTime] = useState(getTimePart(initialValues.endsAt) || "00:00");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState(
    initialValues.config.selectedCollectionIds,
  );
  const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [draftSelectedCollectionIds, setDraftSelectedCollectionIds] = useState(
    initialValues.config.selectedCollectionIds,
  );
  const [bundleTiers, setBundleTiers] = useState(initialValues.config.bundleTiers);
  const startsAtValue = combineDateTimeParts(startDate, startTime);
  const endsAtValue = hasEndDate ? combineDateTimeParts(endDate, endTime) : "";
  const selectedCollectionTitles = useMemo(() => {
    const selectedIds = new Set(selectedCollectionIds);

    return collections
      .filter((collection) => selectedIds.has(collection.id))
      .map((collection) => collection.title);
  }, [collections, selectedCollectionIds]);
  const appliesToLabel =
    selectedCollectionTitles.length > 0
      ? selectedCollectionTitles.join(", ")
      : "All products";
  const filteredCollections = useMemo(() => {
    const query = collectionSearch.trim().toLowerCase();

    if (!query) {
      return collections;
    }

    return collections.filter((collection) => {
      const haystack = `${collection.title} ${collection.handle || ""}`.toLowerCase();

      return haystack.includes(query);
    });
  }, [collectionSearch, collections]);
  const sortedPreviewTiers = [...bundleTiers]
    .map((tier) => ({
      quantity: Number(tier.quantity) || 0,
      discountType: tier.discountType === "percentage" ? "percentage" : "fixed_price",
      value: Number(tier.value ?? tier.price) || 0,
    }))
    .filter((tier) => tier.quantity > 0 || tier.value > 0)
    .sort((left, right) => left.quantity - right.quantity);
  const discountMessagePreview =
    String(initialValues.config.message || "").trim() || DEFAULT_BUNDLE_CONFIG.message;
  const activeWindowLabel = hasEndDate && endsAtValue ? "Scheduled range" : "Starts and runs until removed";

  return (
    <div
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 0.9fr)",
        alignItems: "start",
      }}
    >
      <input type="hidden" name="intent" value={action} />
      <input type="hidden" name="startsAt" value={startsAtValue} />
      <input type="hidden" name="endsAt" value={endsAtValue} />
      <div style={{ display: "grid", gap: "1rem" }}>
        <s-box padding="base" borderWidth="base" borderRadius="large">
          <s-stack direction="block" gap="base">
            <SectionIntro
              step="1"
              title="Name your offer"
              description="Give the offer an internal name and add the message shoppers will see at checkout. Then choose when it starts."
            />
            <s-text-field
              label="Offer name"
              name="title"
              defaultValue={initialValues.title}
            />
            <s-text-field
              label="Cart message"
              name="message"
              defaultValue={initialValues.config.message}
            />
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack direction="block" gap="tight">
                <s-heading>When should this offer run?</s-heading>
                <s-paragraph>
                  Choose a start date and time. Turn on an end date only when
                  you want the offer to stop automatically.
                </s-paragraph>
                <div
                  style={{
                    display: "grid",
                    gap: "0.75rem",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  }}
                >
                  <s-text-field
                    label="Start date"
                    type="date"
                    value={startDate}
                    onInput={(event) => setStartDate(event.currentTarget.value)}
                  />
                  <s-text-field
                    label="Start time"
                    type="time"
                    value={startTime}
                    onInput={(event) => setStartTime(event.currentTarget.value)}
                  />
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(event) => setHasEndDate(event.currentTarget.checked)}
                  />
                  <span>Stop this offer on a specific date</span>
                </label>
                {hasEndDate ? (
                  <div
                    style={{
                      display: "grid",
                      gap: "0.75rem",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    }}
                  >
                    <s-text-field
                      label="End date"
                      type="date"
                      value={endDate}
                      onInput={(event) => setEndDate(event.currentTarget.value)}
                    />
                    <s-text-field
                      label="End time"
                      type="time"
                      value={endTime}
                      onInput={(event) => setEndTime(event.currentTarget.value)}
                    />
                  </div>
                ) : null}
              </s-stack>
            </s-box>
          </s-stack>
        </s-box>

        <s-box padding="base" borderWidth="base" borderRadius="large">
          <s-stack direction="block" gap="base">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <SectionIntro
                step="2"
                title="Choose how shoppers save"
                description="For each quantity, choose either a fixed total bundle price or a percentage off. Use the examples to make the offer easy to understand."
              />
              <s-button type="button" variant="secondary" onClick={addTier}>
                Add another bundle option
              </s-button>
            </div>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              {bundleTiers.map((tier, index) => (
                <s-box
                  key={index}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    <input
                      type="hidden"
                      name="bundleTierQuantity"
                      value={tier.quantity}
                    />
                    <input
                      type="hidden"
                      name="bundleTierDiscountType"
                      value={tier.discountType}
                    />
                    <input
                      type="hidden"
                      name="bundleTierValue"
                      value={tier.value}
                    />
                    <s-text-field
                      label={`Option ${index + 1}: number of items`}
                      type="number"
                      value={String(tier.quantity)}
                      onInput={(event) =>
                        updateTier(index, "quantity", event.currentTarget.value)
                      }
                    />
                    <label style={{ display: "grid", gap: "0.35rem", fontWeight: 700 }}>
                      <span>How should shoppers save?</span>
                      <select
                        value={tier.discountType}
                        onChange={(event) => changeTierDiscountType(index, event.currentTarget.value)}
                        style={tierSelectStyle}
                      >
                        <option value="fixed_price">Set a fixed total bundle price</option>
                        <option value="percentage">Give a percentage off</option>
                      </select>
                    </label>
                    <s-text-field
                      label={tier.discountType === "percentage"
                        ? `Option ${index + 1}: percentage off`
                        : `Option ${index + 1}: total bundle price`}
                      type="number"
                      min="0"
                      max={tier.discountType === "percentage" ? "100" : undefined}
                      value={String(tier.value)}
                      onInput={(event) =>
                        updateTier(index, "value", event.currentTarget.value)
                      }
                    />
                    <p style={tierHintStyle}>
                      {tier.discountType === "percentage"
                        ? `Example: Buy ${tier.quantity || "this many"} items and get ${tier.value || "0"}% off.`
                        : `Example: Buy ${tier.quantity || "this many"} items and pay ${tier.value || "your price"} in total.`}
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <s-button
                        type="button"
                        variant="secondary"
                        tone="critical"
                        disabled={bundleTiers.length === 1}
                        onClick={() => removeTier(index)}
                      >
                        Remove
                      </s-button>
                    </div>
                  </div>
                </s-box>
              ))}
            </div>
          </s-stack>
        </s-box>

        <s-box padding="base" borderWidth="base" borderRadius="large">
          <s-stack direction="block" gap="base">
            <SectionIntro
              step="3"
              title="Choose eligible products"
              description="Choose collections for this offer, or leave them blank to include every product in your store."
            />
            {selectedCollectionIds.map((collectionId) => (
              <input
                key={collectionId}
                type="hidden"
                name="selectedCollectionIds"
                value={collectionId}
              />
            ))}
            {collections.length > 0 ? (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <s-box
                    padding="base"
                    borderWidth="base"
                    borderRadius="base"
                    background="subdued"
                  >
                    <s-stack direction="block" gap="tight">
                      <s-paragraph>
                        {selectedCollectionTitles.length > 0
                          ? `${selectedCollectionTitles.length} collections selected`
                          : "All products"}
                      </s-paragraph>
                      <s-paragraph>
                        {selectedCollectionTitles.length > 0
                          ? selectedCollectionTitles.join(", ")
                          : "Every product in your store is included"}
                      </s-paragraph>
                    </s-stack>
                  </s-box>
                  <s-button type="button" variant="secondary" onClick={openCollectionPicker}>
                    {selectedCollectionTitles.length > 0
                      ? "Edit collections"
                      : "Choose collections"}
                  </s-button>
                </div>

                {isCollectionPickerOpen ? (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      background: "rgba(15, 23, 42, 0.32)",
                      display: "grid",
                      placeItems: "center",
                      padding: "1rem",
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        width: "min(700px, 100%)",
                        maxHeight: "85vh",
                        background: "#ffffff",
                        borderRadius: "1.2rem",
                        border: "1px solid #d7dbe0",
                        boxShadow: "0 24px 50px rgba(15, 23, 42, 0.18)",
                        overflow: "hidden",
                        display: "grid",
                        gridTemplateRows: "auto auto minmax(0, 1fr) auto",
                      }}
                    >
                      <div
                        style={{
                          padding: "1rem 1.1rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "1rem",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>
                          Add collections
                        </h3>
                        <button
                          type="button"
                          onClick={closeCollectionPicker}
                          style={pickerCloseButtonStyle}
                        >
                          x
                        </button>
                      </div>

                      <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid #e5e7eb" }}>
                        <input
                          type="text"
                          value={collectionSearch}
                          onChange={(event) => setCollectionSearch(event.currentTarget.value)}
                          placeholder="Search collections"
                          style={pickerSearchInputStyle}
                        />
                      </div>

                      <div style={{ overflow: "auto" }}>
                        {filteredCollections.length > 0 ? (
                          filteredCollections.map((collection) => {
                            const isChecked = draftSelectedCollectionIds.includes(collection.id);

                            return (
                              <label
                                key={collection.id}
                                style={pickerRowStyle}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleDraftCollection(collection.id)}
                                />
                                <div style={pickerImageStyle}>IMG</div>
                                <div style={{ display: "grid", gap: "0.2rem" }}>
                                  <span style={{ fontWeight: 600 }}>{collection.title}</span>
                                  <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                                    {collection.handle ? `/${collection.handle}` : "Collection"}
                                  </span>
                                </div>
                              </label>
                            );
                          })
                        ) : (
                          <div style={{ padding: "1rem", color: "#64748b" }}>
                            No collections match your search.
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          padding: "1rem",
                          borderTop: "1px solid #e5e7eb",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "1rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ color: "#475569", fontSize: "0.95rem" }}>
                          {draftSelectedCollectionIds.length}/{collections.length} collections selected
                        </span>
                        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                          <s-button type="button" variant="secondary" onClick={closeCollectionPicker}>
                            Cancel
                          </s-button>
                          <s-button
                            type="button"
                            variant="primary"
                            onClick={applyDraftCollections}
                          >
                            Add
                          </s-button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <s-paragraph>
                No collections found. This discount will apply to all products.
              </s-paragraph>
            )}
          </s-stack>
        </s-box>

        {error ? (
          <s-banner tone="critical">
            <s-paragraph>{error}</s-paragraph>
          </s-banner>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <s-button type="submit" variant="primary" loading={loading}>
            {submitLabel}
          </s-button>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="large"
          background="subdued"
        >
          <s-stack direction="block" gap="base">
            <s-heading>Your offer at a glance</s-heading>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <SummaryItem
                label="When it runs"
                value={activeWindowLabel}
                detail={`${startDate || "Not set"} ${startTime || ""}`.trim()}
              />
              <SummaryItem
                label="Eligible products"
                value={selectedCollectionTitles.length > 0 ? "Selected collections" : "All products"}
                detail={
                  selectedCollectionTitles.length > 0
                    ? selectedCollectionTitles.join(", ")
                    : "Every product in your store can use this offer."
                }
              />
              <SummaryItem
                label="Cart message"
                value={discountMessagePreview}
                detail="Shoppers see this when the offer is applied."
              />
            </div>
          </s-stack>
        </s-box>

        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="large"
          background="subdued"
        >
          <s-stack direction="block" gap="base">
            <s-heading>Shopper preview</s-heading>
            <s-paragraph>This is how your offer will work for eligible products.</s-paragraph>
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-heading>{initialValues.title}</s-heading>
                {sortedPreviewTiers.map((tier) => (
                  <s-paragraph key={`${tier.quantity}-${tier.discountType}-${tier.value}`}>
                    {tier.discountType === "percentage"
                      ? `Buy ${tier.quantity} and get ${tier.value}% off`
                      : `Buy ${tier.quantity} for ${tier.value}`}
                  </s-paragraph>
                ))}
                <s-paragraph>Applies to: {appliesToLabel}</s-paragraph>
                <s-paragraph>
                  Cart message: {discountMessagePreview}
                </s-paragraph>
              </s-stack>
            </s-box>
          </s-stack>
        </s-box>

        <s-box padding="base" borderWidth="base" borderRadius="large">
          <s-stack direction="block" gap="tight">
            <s-heading>Helpful tips</s-heading>
            <s-paragraph>
              You can mix offer types. For example, set “Buy 2 for 799” and “Buy 3, get 15% off”.
            </s-paragraph>
            <s-paragraph>
              Use each item quantity only once. For example, do not add two different offers for 3 items.
            </s-paragraph>
            <s-paragraph>
              Choose collections when the offer should apply to only some of
              your products.
            </s-paragraph>
          </s-stack>
        </s-box>
      </div>
    </div>
  );

  function addTier() {
    setBundleTiers((currentTiers) => [
      ...currentTiers,
      createEmptyTier(currentTiers),
    ]);
  }

  function updateTier(index, field, value) {
    setBundleTiers((currentTiers) =>
      currentTiers.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, [field]: value } : tier,
      ),
    );
  }

  function changeTierDiscountType(index, discountType) {
    setBundleTiers((currentTiers) =>
      currentTiers.map((tier, tierIndex) => {
        if (tierIndex !== index) {
          return tier;
        }

        if (discountType === "percentage") {
          const existingValue = Number(tier.value);
          return {
            ...tier,
            discountType,
            // A fixed bundle price such as 799 can't become a valid percentage.
            value: existingValue > 0 && existingValue <= 100 ? tier.value : 10,
          };
        }

        return { ...tier, discountType, value: "" };
      }),
    );
  }

  function removeTier(index) {
    setBundleTiers((currentTiers) =>
      currentTiers.filter((_, tierIndex) => tierIndex !== index),
    );
  }

  function openCollectionPicker() {
    revalidator.revalidate();
    setDraftSelectedCollectionIds(selectedCollectionIds);
    setCollectionSearch("");
    setIsCollectionPickerOpen(true);
  }

  function closeCollectionPicker() {
    setDraftSelectedCollectionIds(selectedCollectionIds);
    setCollectionSearch("");
    setIsCollectionPickerOpen(false);
  }

  function applyDraftCollections() {
    setSelectedCollectionIds(draftSelectedCollectionIds);
    setCollectionSearch("");
    setIsCollectionPickerOpen(false);
  }

  function toggleDraftCollection(collectionId) {
    setDraftSelectedCollectionIds((currentIds) =>
      currentIds.includes(collectionId)
        ? currentIds.filter((id) => id !== collectionId)
        : [...currentIds, collectionId],
    );
  }
}

function SectionIntro({ step, title, description }) {
  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          width: "fit-content",
        }}
      >
        <span
          style={{
            width: "1.8rem",
            height: "1.8rem",
            borderRadius: "999px",
            background: "#111827",
            color: "#ffffff",
            display: "grid",
            placeItems: "center",
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          {step}
        </span>
        <s-heading>{title}</s-heading>
      </div>
      <s-paragraph>{description}</s-paragraph>
    </div>
  );
}

function SummaryItem({ label, value, detail }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="tight">
        <s-paragraph>{label}</s-paragraph>
        <s-heading>{value}</s-heading>
        <s-paragraph>{detail}</s-paragraph>
      </s-stack>
    </s-box>
  );
}

function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

function getDatePart(value) {
  return value ? value.slice(0, 10) : "";
}

function getTimePart(value) {
  return value ? value.slice(11, 16) : "";
}

function combineDateTimeParts(date, time) {
  if (!date) {
    return "";
  }

  return `${date}T${time || "00:00"}`;
}

const pickerCloseButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  fontSize: "1.35rem",
  lineHeight: 1,
  cursor: "pointer",
};

const pickerSearchInputStyle = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: "0.85rem",
  padding: "0.85rem 1rem",
  fontSize: "1rem",
  outline: "none",
};

const pickerRowStyle = {
  display: "grid",
  gridTemplateColumns: "auto auto minmax(0, 1fr)",
  alignItems: "center",
  gap: "0.85rem",
  padding: "0.9rem 1rem",
  borderBottom: "1px solid #eef2f7",
  cursor: "pointer",
};

const pickerImageStyle = {
  width: "2.8rem",
  height: "2.8rem",
  borderRadius: "0.8rem",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  display: "grid",
  placeItems: "center",
  color: "#94a3b8",
  fontSize: "0.85rem",
  fontWeight: 700,
};

function createEmptyTier(currentTiers) {
  const highestQuantity = currentTiers.reduce((max, tier) => {
    const quantity = Number(tier.quantity) || 0;

    return Math.max(max, quantity);
  }, 1);

  return {
    quantity: highestQuantity + 1,
    discountType: "fixed_price",
    value: "",
  };
}

function toFormTier(tier) {
  return {
    quantity: tier?.quantity ?? 2,
    discountType: tier?.discountType === "percentage" ? "percentage" : "fixed_price",
    value: tier?.value ?? tier?.price ?? "",
  };
}

const tierSelectStyle = { width: "100%", border: "1px solid #aeb4bc", borderRadius: "0.6rem", padding: "0.7rem", fontSize: "1rem", background: "#ffffff" };
const tierHintStyle = { margin: 0, color: "#64748b", fontSize: "0.85rem", lineHeight: 1.45 };
