import TierRow from "./TierRow";

export default function ProductRuleCard({
  form,
  setForm,
  product,
  productIndex,
}) {
  const updateProduct = (updater) => {
    setForm((currentForm) => {
      const nextProducts = [...currentForm.products];
      nextProducts[productIndex] = updater(nextProducts[productIndex]);

      return {
        ...currentForm,
        products: nextProducts,
      };
    });
  };

  const removeProduct = () => {
    setForm((currentForm) => ({
      ...currentForm,
      products: currentForm.products.filter((_, index) => index !== productIndex),
    }));
  };

  const addTier = () => {
    updateProduct((currentProduct) => ({
      ...currentProduct,
      tiers: [
        ...currentProduct.tiers,
        {
          minQty: 2,
          discountType: "percentage",
          discountValue: 10,
        },
      ],
    }));
  };

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="tight" alignItems="center">
          <s-heading>{product.productTitle}</s-heading>
          <s-button type="button" variant="tertiary" onClick={removeProduct}>
            Remove
          </s-button>
        </s-stack>

        <s-paragraph>{product.productId}</s-paragraph>

        <s-stack direction="block" gap="tight">
          {product.tiers.map((tier, tierIndex) => (
            <TierRow
              key={`${product.productId}-${tierIndex}`}
              form={form}
              setForm={setForm}
              productIndex={productIndex}
              tierIndex={tierIndex}
              tier={tier}
            />
          ))}
        </s-stack>

        <s-button type="button" variant="secondary" onClick={addTier}>
          Add tier
        </s-button>
      </s-stack>
    </s-box>
  );
}
