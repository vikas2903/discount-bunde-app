import {
  BUNDLE_METAFIELD_KEY,
  BUNDLE_METAFIELD_NAMESPACE,
} from "./bundle-discount";

export const VOLUME_METAFIELD_NAMESPACE = "$app:volume-discount";
export const VOLUME_METAFIELD_KEY = "function-configuration";
export const DEFAULT_VOLUME_FUNCTION_HANDLE = "bundle-pack-3-for-999";
export const DEFAULT_VOLUME_CONFIG = {
  title: "",
  message: "Buy more & save more",
  status: "ACTIVE",
  selectedCollectionIds: [],
  tiers: [
    {
      minQty: 2,
      discountType: "percentage",
      discountValue: 5,
    },
  ],
};

export function parseVolumeConfig(value) {
  const fallback = { ...DEFAULT_VOLUME_CONFIG, tiers: [...DEFAULT_VOLUME_CONFIG.tiers] };

  if (!value) {
    return {
      ...fallback,
      mode: "collection",
      legacyProducts: [],
    };
  }

  try {
    const parsed = JSON.parse(value);
    const topLevelTiers = normalizeTiers(parsed?.tiers, []);
    const legacyProducts = Array.isArray(parsed?.products)
      ? parsed.products
          .map((product) => ({
            productId:
              typeof product?.productId === "string" ? product.productId : "",
            productTitle:
              typeof product?.productTitle === "string"
                ? product.productTitle
                : "",
            tiers: normalizeTiers(product?.tiers, []),
          }))
          .filter((product) => product.productId)
      : [];

    return {
      title: typeof parsed?.title === "string" ? parsed.title : fallback.title,
      message:
        typeof parsed?.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
          : fallback.message,
      status:
        parsed?.status === "DRAFT" || parsed?.status === "ACTIVE"
          ? parsed.status
          : fallback.status,
      selectedCollectionIds: normalizeCollectionIds(parsed?.selectedCollectionIds),
      tiers: topLevelTiers,
      mode:
        topLevelTiers.length > 0 || legacyProducts.length === 0
          ? "collection"
          : "legacy-product",
      legacyProducts,
    };
  } catch {
    return {
      ...fallback,
      mode: "collection",
      legacyProducts: [],
    };
  }
}

export function normalizeVolumeConfig(config) {
  return {
    title: String(config?.title || "").trim() || "Quantity offer",
    message:
      String(config?.message || "").trim() || DEFAULT_VOLUME_CONFIG.message,
    status:
      config?.status === "DRAFT" || config?.status === "ACTIVE"
        ? config.status
        : DEFAULT_VOLUME_CONFIG.status,
    selectedCollectionIds: normalizeCollectionIds(config?.selectedCollectionIds),
    tiers: normalizeTiers(config?.tiers, DEFAULT_VOLUME_CONFIG.tiers),
  };
}

export function validateVolumeConfig(config, { allowLegacy = false } = {}) {
  const errors = [];

  if (!String(config?.title || "").trim()) {
    errors.push("Discount title is required.");
  }

  if (!allowLegacy && (!Array.isArray(config?.tiers) || config.tiers.length === 0)) {
    errors.push("Add at least one volume tier.");
  }

  const seenQuantities = new Set();
  for (const tier of config?.tiers || []) {
    if (tier.minQty < 2) {
      errors.push("Tier quantity must be 2 or more.");
    }

    if (tier.discountValue <= 0) {
      errors.push("Tier discount value must be greater than 0.");
    }

    if (seenQuantities.has(tier.minQty)) {
      errors.push("Each tier quantity must be unique.");
    }

    seenQuantities.add(tier.minQty);
  }

  return errors;
}

export function formatVolumeDiscountInput({
  title,
  startsAt,
  endsAt,
  functionHandle,
  config,
}) {
  return {
    title: String(title || config.title || "").trim() || "Volume discount",
    startsAt: startsAt || new Date().toISOString(),
    endsAt: endsAt || null,
    functionHandle: functionHandle || DEFAULT_VOLUME_FUNCTION_HANDLE,
    discountClasses: ["PRODUCT"],
    combinesWith: {
      productDiscounts: false,
      orderDiscounts: false,
      shippingDiscounts: false,
    },
    metafields: [
      {
        namespace: VOLUME_METAFIELD_NAMESPACE,
        key: VOLUME_METAFIELD_KEY,
        type: "json",
        value: JSON.stringify(config),
      },
      {
        namespace: BUNDLE_METAFIELD_NAMESPACE,
        key: BUNDLE_METAFIELD_KEY,
        type: "json",
        value: JSON.stringify({
          selectedCollectionIds: normalizeCollectionIds(config.selectedCollectionIds),
        }),
      },
    ],
  };
}

export function resolveVolumeTierLabel(tier) {
  const minQty = toPositiveInteger(tier?.minQty, 2);
  const discountType = tier?.discountType === "fixed" ? "fixed" : "percentage";
  const discountValue = toPositiveNumber(tier?.discountValue, 0);

  return discountType === "fixed"
    ? `Discount ${minQty} items and save ${discountValue} each`
    : `Discount ${minQty} items and get ${discountValue}% off`;
}

function normalizeCollectionIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .filter((entry, index, entries) => entries.indexOf(entry) === index);
}

function normalizeTiers(value, fallback) {
  const source = Array.isArray(value) ? value : fallback;

  return source
    .map((tier) => ({
      minQty: toPositiveInteger(tier?.minQty, 2),
      discountType: tier?.discountType === "fixed" ? "fixed" : "percentage",
      discountValue: toPositiveNumber(tier?.discountValue, 0),
    }))
    .filter((tier) => tier.discountValue > 0)
    .sort((left, right) => left.minQty - right.minQty);
}

function toPositiveInteger(value, fallback) {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}

function toPositiveNumber(value, fallback) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}
