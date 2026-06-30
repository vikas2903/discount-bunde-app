/* eslint-disable react/prop-types */
import DiscountCard from "./DiscountCard";

export default function DiscountList({
  discounts,
  discountsError,
  toggleFetcher,
  onEdit,
  collectionTitleMap,
}) {
  if (discountsError) {
    return (
      <s-paragraph>
        Saved volume discounts could not be loaded: {discountsError}
      </s-paragraph>
    );
  }

  if (discounts.length === 0) {
    return (
      <s-paragraph>
        No saved volume discounts yet. Create one above and it will appear here.
      </s-paragraph>
    );
  }

  return (
    <s-stack direction="block" gap="base">
      {discounts.map((discount) => (
        <DiscountCard
          key={discount.discountId}
          discount={discount}
          toggleFetcher={toggleFetcher}
          onEdit={onEdit}
          collectionTitleMap={collectionTitleMap}
        />
      ))}
    </s-stack>
  );
}
