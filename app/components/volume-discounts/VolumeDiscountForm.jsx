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
            <s-heading>How this offer works</s-heading>
            <s-paragraph>1. Name the offer and add an optional message for shoppers.</s-paragraph>
            <s-paragraph>2. Choose products, or leave this blank to include your whole store.</s-paragraph>
            <s-paragraph>3. Set savings for different quantities, such as buy 2 and save 5%, or buy 3 and save 15%.</s-paragraph>
            <s-paragraph>4. Save the offer. You can turn it on, turn it off, or edit it later.</s-paragraph>
          </s-stack>
        </s-box>

        <s-text-field
          label="Offer name"
          value={form.title}
          onInput={(event) => updateField("title", getEventValue(event))}
        />

        <s-text-field
          label="Cart message"
          value={form.message}
          onInput={(event) => updateField("message", getEventValue(event))}
        />

        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-heading>Set quantity savings</s-heading>
            <s-paragraph>
              Add one option for each quantity you want to reward. When a shopper qualifies for more than one option, they receive the best matching saving.
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
                    <s-heading>Saving option {index + 1}</s-heading>
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
                      label="Number of items to buy"
                      type="number"
                      value={String(tier.minQty)}
                      onInput={(event) =>
                        updateTier(index, "minQty", Number(getEventValue(event)))
                      }
                    />

                    <s-text-field
                      label="Saving percentage"
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
              Add another saving option
            </s-button>
          </s-stack>
        </s-box>

        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-heading>Choose eligible products</s-heading>
            <s-paragraph>
              Leave this blank to include every product in your store. Choose collections to limit the offer to certain products.
            </s-paragraph>

            <s-text-field
              label="Find collections"
              value={collectionSearch}
              onInput={(event) => setCollectionSearch(getEventValue(event))}
            />

            {selectedCollectionTitles.length > 0 ? (
              <s-paragraph>
                Included collections: {selectedCollectionTitles.join(", ")}
              </s-paragraph>
            ) : (
              <s-paragraph>No collections selected. Every product in your store is included.</s-paragraph>
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
            {isEditing ? "Save changes" : "Create offer"}
          </s-button>
          {isEditing ? (
            <s-button type="button" variant="secondary" onClick={onCancelEdit}>
              Cancel
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
