export default function DiscountCard({ discount, toggleFetcher }) {
  const isActive = discount.status === "ACTIVE";
  const togglingDiscountNodeId = toggleFetcher.formData?.get("discountNodeId");
  const isToggling =
    toggleFetcher.state !== "idle" &&
    togglingDiscountNodeId === discount.nodeId;

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
      <s-stack direction="block" gap="tight">
        <s-heading>{discount.title}</s-heading>
        <s-paragraph>Status: {discount.status}</s-paragraph>
        <s-paragraph>Message: {discount.config.message}</s-paragraph>
        <s-paragraph>Products: {discount.config.products.length}</s-paragraph>
        <s-paragraph>Starts at: {discount.startsAt}</s-paragraph>
        <s-paragraph>Ends at: {discount.endsAt || "No end date"}</s-paragraph>

        {discount.config.products.map((product) => (
          <s-box
            key={product.productId}
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-stack direction="block" gap="tight">
              <s-heading>{product.productTitle || product.productId}</s-heading>
              <s-paragraph>Product ID: {product.productId}</s-paragraph>
              {product.tiers.map((tier, tierIndex) => (
                <s-paragraph key={`${product.productId}-${tierIndex}`}>
                  Buy {tier.minQty}+ and get {tier.discountValue}% off
                </s-paragraph>
              ))}
            </s-stack>
          </s-box>
        ))}

        <toggleFetcher.Form method="post">
          <input type="hidden" name="intent" value="toggle-status" />
          <input type="hidden" name="discountNodeId" value={discount.nodeId} />
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
}
