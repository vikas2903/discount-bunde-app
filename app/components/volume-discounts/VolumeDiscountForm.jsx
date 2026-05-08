/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import ProductRuleCard from "./ProductRuleCard";

export default function VolumeDiscountForm({
  fetcher,
  searchFetcher,
  form,
  setForm,
}) {
  const isSaving = fetcher.state !== "idle";
  const [searchTerm, setSearchTerm] = useState("");
  const trimmedSearchTerm = searchTerm.trim();
  const searchResults =
    trimmedSearchTerm && searchFetcher.data?.action === "search-products"
      ? searchFetcher.data?.products || []
      : [];
  const isSearching = searchFetcher.state !== "idle";
  const searchError = searchFetcher.data?.graphqlErrors
    ?.map((error) => error.message)
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    if (!trimmedSearchTerm) {
      return;
    }

    const timeoutId = setTimeout(() => {
      searchFetcher.submit(
        {
          intent: "search-products",
          searchTerm: trimmedSearchTerm,
        },
        { method: "post" },
      );
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchFetcher, trimmedSearchTerm]);

  const addProduct = (product) => {
    setForm((currentForm) => ({
      ...currentForm,
      products: [
        ...currentForm.products.filter(
          (currentProduct) => currentProduct.productId !== product.id,
        ),
        {
          productId: product.id,
          productTitle: product.title,
          tiers: [
            {
              minQty: 2,
              discountType: "percentage",
              discountValue: 10,
            },
          ],
        },
      ],
    }));
    setSearchTerm("");
  };

  return (
    <s-stack direction="block" gap="base">
      <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
        <s-stack direction="block" gap="tight">
          <s-heading>Instructions</s-heading>
          <s-paragraph>1. Type a product name in search.</s-paragraph>
          <s-paragraph>2. Click Add on the product you want.</s-paragraph>
          <s-paragraph>3. Add quantity tiers like 2, 3, 4.</s-paragraph>
          <s-paragraph>4. Enter discount percent for each tier.</s-paragraph>
          <s-paragraph>5. Save the volume discount.</s-paragraph>
        </s-stack>
      </s-box>

      <s-text-field
        label="Search product"
        value={searchTerm}
        onInput={(event) => setSearchTerm(getEventValue(event))}
      />

      {isSearching && trimmedSearchTerm && (
        <s-paragraph>Searching products...</s-paragraph>
      )}

      {searchError && (
        <s-paragraph>Product search failed: {searchError}</s-paragraph>
      )}

      {!isSearching &&
        trimmedSearchTerm &&
        !searchError &&
        searchResults.length === 0 && (
          <s-paragraph>No matching products found.</s-paragraph>
        )}

      {searchResults.length > 0 && (
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="tight">
            {searchResults.map((product) => (
              <s-stack
                key={product.id}
                direction="inline"
                gap="tight"
                alignItems="center"
                justifyContent="space-between"
              >
                <s-paragraph>{product.title}</s-paragraph>
                <s-button
                  type="button"
                  variant="secondary"
                  onClick={() => addProduct(product)}
                >
                  Add
                </s-button>
              </s-stack>
            ))}
          </s-stack>
        </s-box>
      )}

      <fetcher.Form method="post">
        <s-stack direction="block" gap="base">
          <input type="hidden" name="intent" value="create" />
          <input type="hidden" name="config" value={JSON.stringify(form)} />

          <s-text-field
            label="Discount title"
            value={form.title}
            onInput={(event) =>
              setForm((currentForm) => ({
                ...currentForm,
                title: getEventValue(event),
              }))
            }
          />

          <s-text-field
            label="Message"
            value={form.message}
            onInput={(event) =>
              setForm((currentForm) => ({
                ...currentForm,
                message: getEventValue(event),
              }))
            }
          />

      {form.products.length > 0 ? (
            <s-stack direction="block" gap="base">
              {form.products.map((product, productIndex) => (
                <ProductRuleCard
                  key={`${product.productId}-${productIndex}`}
                  form={form}
                  setForm={setForm}
                  product={product}
                  productIndex={productIndex}
                />
              ))}
            </s-stack>
          ) : (
          <s-paragraph>
            Search for a product above, add it, then create quantity tiers.
          </s-paragraph>
        )}

        <s-button type="submit" variant="primary" loading={isSaving}>
          Save volume discount
        </s-button>
      </s-stack>
      </fetcher.Form>

      <s-box padding="base" borderWidth="base" borderRadius="base">
        <s-stack direction="block" gap="tight">
          <s-heading>JSON preview</s-heading>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            <code>{JSON.stringify(form, null, 2)}</code>
          </pre>
        </s-stack>
      </s-box>
    </s-stack>
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
