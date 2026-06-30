/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";

export default function VolumeDiscountForm({
  fetcher,
  form,
  setForm,
  collections,
  isEditing,
  editingDiscountId,
  editingSchedule,
  onCancelEdit,
}) {
  const isSaving = fetcher.state !== "idle";
  const [collectionSearch, setCollectionSearch] = useState("");
  const selectedCollectionIds = form.selectedCollectionIds;
  const selectedCollectionTitles = useMemo(() => {
    const selectedSet = new Set(selectedCollectionIds);

    return collections
      .filter((collection) => selectedSet.has(collection.id))
      .map((collection) => collection.title);
  }, [collections, selectedCollectionIds]);
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

  const updateField = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const addTier = () => {
    setForm((currentForm) => ({
      ...currentForm,
      tiers: [
        ...currentForm.tiers,
        {
          minQty: currentForm.tiers.length + 2,
          discountType: "percentage",
          discountValue: 5,
        },
      ],
    }));
  };

  const updateTier = (index, field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      tiers: currentForm.tiers.map((tier, tierIndex) =>
        tierIndex === index
          ? {
              ...tier,
              [field]: value,
            }
          : tier,
      ),
    }));
  };

  const removeTier = (index) => {
    setForm((currentForm) => ({
      ...currentForm,
      tiers: currentForm.tiers.filter((_, tierIndex) => tierIndex !== index),
    }));
  };

  const toggleCollection = (collectionId) => {
    setForm((currentForm) => {
      const exists = currentForm.selectedCollectionIds.includes(collectionId);

      return {
        ...currentForm,
        selectedCollectionIds: exists
          ? currentForm.selectedCollectionIds.filter((id) => id !== collectionId)
          : [...currentForm.selectedCollectionIds, collectionId],
      };
    });
  };

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value={isEditing ? "update" : "create"} />
      <input type="hidden" name="discountId" value={editingDiscountId || ""} />
      <input type="hidden" name="startsAt" value={editingSchedule?.startsAt || ""} />
      <input type="hidden" name="endsAt" value={editingSchedule?.endsAt || ""} />
      <input type="hidden" name="config" value={JSON.stringify(form)} />

      <s-stack direction="block" gap="base">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <s-stack direction="block" gap="tight">
            <s-heading>How this volume discount works</s-heading>
            <s-paragraph>1. Name the discount and optional customer message.</s-paragraph>
            <s-paragraph>2. Choose collections, or leave blank for all products.</s-paragraph>
            <s-paragraph>3. Add tiers like 2 qty = 5% off, 3 qty = 15% off.</s-paragraph>
            <s-paragraph>4. Save, update, deactivate, or delete from the dashboard below.</s-paragraph>
          </s-stack>
        </s-box>

        <s-text-field
          label="Discount title"
          value={form.title}
          onInput={(event) => updateField("title", getEventValue(event))}
        />

        <s-text-field
          label="Customer message"
          value={form.message}
          onInput={(event) => updateField("message", getEventValue(event))}
        />

        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-heading>Volume tiers</s-heading>
            <s-paragraph>
              Add each tier quantity to discount. If cart quantity is higher, the best matching tier discounts only that many items in the line.
            </s-paragraph>

            {form.tiers.map((tier, index) => (
              <s-box
                key={`tier-${index}`}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
              >
                <s-stack direction="block" gap="tight">
                  <s-stack
                    direction="inline"
                    gap="tight"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <s-heading>Tier {index + 1}</s-heading>
                    <s-button
                      type="button"
                      variant="tertiary"
                      onClick={() => removeTier(index)}
                      disabled={form.tiers.length === 1}
                    >
                      Remove
                    </s-button>
                  </s-stack>

                  <s-stack direction="inline" gap="tight">
                    <s-text-field
                      label="Tier quantity"
                      type="number"
                      value={String(tier.minQty)}
                      onInput={(event) =>
                        updateTier(index, "minQty", Number(getEventValue(event)))
                      }
                    />

                    <s-text-field
                      label="Percentage off"
                      type="number"
                      value={String(tier.discountValue)}
                      onInput={(event) =>
                        updateTier(
                          index,
                          "discountValue",
                          Number(getEventValue(event)),
                        )
                      }
                    />
                  </s-stack>
                </s-stack>
              </s-box>
            ))}

            <s-button type="button" variant="secondary" onClick={addTier}>
              Add tier
            </s-button>
          </s-stack>
        </s-box>

        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-heading>Target collections</s-heading>
            <s-paragraph>
              Leave this empty to apply the discount to all products. Select collections to limit the offer.
            </s-paragraph>

            <s-text-field
              label="Search collections"
              value={collectionSearch}
              onInput={(event) => setCollectionSearch(getEventValue(event))}
            />

            {selectedCollectionTitles.length > 0 ? (
              <s-paragraph>
                Selected: {selectedCollectionTitles.join(", ")}
              </s-paragraph>
            ) : (
              <s-paragraph>No collection selected. This will work on all products.</s-paragraph>
            )}

            <s-stack direction="block" gap="tight">
              {filteredCollections.length > 0 ? (
                filteredCollections.map((collection) => {
                  const checked = selectedCollectionIds.includes(collection.id);

                  return (
                    <div
                      key={collection.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.6rem 0.75rem",
                        border: "1px solid #d9dde3",
                        borderRadius: "0.75rem",
                      }}
                    >
                      <input
                        id={`volume-collection-${collection.id}`}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCollection(collection.id)}
                        aria-label={collection.title}
                      />
                      <label htmlFor={`volume-collection-${collection.id}`}>
                        <strong>{collection.title}</strong>
                        <span style={{ color: "#667085", marginLeft: "0.5rem" }}>
                          {collection.handle ? `/${collection.handle}` : "Collection"}
                        </span>
                      </label>
                    </div>
                  );
                })
              ) : (
                <s-paragraph>No collections match your search.</s-paragraph>
              )}
            </s-stack>
          </s-stack>
        </s-box>

        <s-stack direction="inline" gap="tight">
          <s-button type="submit" variant="primary" loading={isSaving}>
            {isEditing ? "Update volume discount" : "Create volume discount"}
          </s-button>
          {isEditing ? (
            <s-button type="button" variant="secondary" onClick={onCancelEdit}>
              Cancel edit
            </s-button>
          ) : null}
        </s-stack>
      </s-stack>
    </fetcher.Form>
  );
}

function getEventValue(event) {
  return (
    event?.currentTarget?.value ??
    event?.target?.value ??
    event?.detail?.value ??
    ""
  );
}
