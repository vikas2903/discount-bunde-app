/* eslint-disable react/prop-types */
export default function DiscountCard({
  discount,
  toggleFetcher,
  onEdit,
  collectionTitleMap,
}) {
  const isActive = discount.status === "ACTIVE";
  const actionFormData = toggleFetcher.formData;
  const targetedDiscountId = String(actionFormData?.get("discountId") || "");
  const currentIntent = String(actionFormData?.get("intent") || "");
  const isWorkingOnThisDiscount =
    toggleFetcher.state !== "idle" && targetedDiscountId === discount.discountId;
  const collectionTitles = discount.config.selectedCollectionIds.map(
    (collectionId) => collectionTitleMap.get(collectionId) || collectionId,
  );
  const tierList =
    discount.config.mode === "legacy-product"
      ? []
      : [...discount.config.tiers].sort((left, right) => left.minQty - right.minQty);

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
      <s-stack direction="block" gap="tight">
        <s-stack
          direction="inline"
          gap="tight"
          alignItems="center"
          justifyContent="space-between"
        >
          <s-heading>{discount.title}</s-heading>
          <s-paragraph>Status: {discount.status}</s-paragraph>
        </s-stack>

        <s-paragraph>Message: {discount.config.message}</s-paragraph>
        <s-paragraph>
          Applies to:{" "}
          {collectionTitles.length > 0
            ? `${collectionTitles.length} selected collection${collectionTitles.length === 1 ? "" : "s"}`
            : "All products"}
        </s-paragraph>
        {collectionTitles.length > 0 ? (
          <s-paragraph>{collectionTitles.join(", ")}</s-paragraph>
        ) : null}
        <s-paragraph>Starts at: {discount.startsAt}</s-paragraph>
        <s-paragraph>Ends at: {discount.endsAt || "No end date"}</s-paragraph>

        {discount.config.mode === "legacy-product" ? (
          <s-banner tone="warning">
            <s-paragraph>
              This is a legacy product-based volume discount. You can activate,
              deactivate, or delete it here.
            </s-paragraph>
          </s-banner>
        ) : (
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="tight">
              <s-heading>Tiers</s-heading>
              {tierList.map((tier, index) => (
                <s-paragraph key={`${discount.discountId}-${index}`}>
                  Discount {tier.minQty} items and get {tier.discountValue}% off
                </s-paragraph>
              ))}
            </s-stack>
          </s-box>
        )}

        <s-stack direction="inline" gap="tight">
          {discount.config.mode !== "legacy-product" ? (
            <s-button type="button" variant="secondary" onClick={() => onEdit(discount)}>
              Edit
            </s-button>
          ) : null}

          <toggleFetcher.Form method="post">
            <input type="hidden" name="intent" value="toggle-status" />
            <input type="hidden" name="discountId" value={discount.discountId} />
            <input
              type="hidden"
              name="nextStatus"
              value={isActive ? "disable" : "enable"}
            />
            <s-button
              type="submit"
              variant="secondary"
              loading={isWorkingOnThisDiscount && currentIntent === "toggle-status"}
            >
              {isActive ? "Deactivate" : "Activate"}
            </s-button>
          </toggleFetcher.Form>

          <toggleFetcher.Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="discountId" value={discount.discountId} />
            <s-button
              type="submit"
              variant="secondary"
              loading={isWorkingOnThisDiscount && currentIntent === "delete"}
            >
              Delete
            </s-button>
          </toggleFetcher.Form>
        </s-stack>
      </s-stack>
    </s-box>
  );
}
