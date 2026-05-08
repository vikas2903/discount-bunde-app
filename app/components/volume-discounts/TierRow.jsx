export default function TierRow({
  form,
  setForm,
  productIndex,
  tierIndex,
  tier,
}) {
  const updateTier = (field, value) => {
    setForm((currentForm) => {
      const nextProducts = [...currentForm.products];
      const nextTiers = [...nextProducts[productIndex].tiers];

      nextTiers[tierIndex] = {
        ...nextTiers[tierIndex],
        [field]: value,
      };

      nextProducts[productIndex] = {
        ...nextProducts[productIndex],
        tiers: nextTiers,
      };

      return {
        ...currentForm,
        products: nextProducts,
      };
    });
  };

  const removeTier = () => {
    setForm((currentForm) => {
      const nextProducts = [...currentForm.products];

      nextProducts[productIndex] = {
        ...nextProducts[productIndex],
        tiers: nextProducts[productIndex].tiers.filter(
          (_, index) => index !== tierIndex,
        ),
      };

      return {
        ...currentForm,
        products: nextProducts,
      };
    });
  };

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
      <s-stack direction="block" gap="tight">
        <s-stack direction="inline" gap="tight" alignItems="center">
          <s-heading>Tier {tierIndex + 1}</s-heading>
          <s-button type="button" variant="tertiary" onClick={removeTier}>
            Remove tier
          </s-button>
        </s-stack>

        <s-text-field
          label="Minimum quantity"
          type="number"
          value={String(tier.minQty)}
          onInput={(event) => updateTier("minQty", Number(getEventValue(event)))}
        />

        <s-text-field
          label="Discount percent"
          type="number"
          value={String(tier.discountValue)}
          onInput={(event) =>
            updateTier("discountValue", Number(getEventValue(event)))
          }
        />
      </s-stack>
    </s-box>
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
