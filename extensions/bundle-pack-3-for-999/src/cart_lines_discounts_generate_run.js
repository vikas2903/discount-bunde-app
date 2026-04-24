import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
} from '../generated/api';

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * Shopify runs this function separately for each cart/checkout recalculation.
 * Customer A and Customer B never share input, even when they add products at
 * the same time. The discount metafield provides rule settings, and the cart
 * input provides only the current buyer's cart lines.
 *
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  if (
    !input.cart.lines.length ||
    !input.discount.discountClasses.includes(DiscountClass.Order)
  ) {
    return {operations: []};
  }

  // Evaluate larger bundles first so a cart that qualifies for 3-for-999
  // doesn't get consumed by a cheaper 2-item rule too early.
  const config = parseBundleConfig(input.discount.metafield?.value);
  const bundleRules = [
    {quantity: 3, fixedBundlePrice: config.bundle3Price},
    {quantity: 2, fixedBundlePrice: config.bundle2Price},
  ].filter((rule) => rule.fixedBundlePrice > 0);

  if (!bundleRules.length) {
    return {operations: []};
  }

  const eligibleUnits = [];

  for (const line of input.cart.lines) {
    const merchandise = line.merchandise;

    if (!merchandise?.product) {
      continue;
    }

    // If no collections are configured, every product is eligible. Otherwise
    // Shopify resolves product.inSelectedCollections from this discount's
    // JSON metafield variables during the current cart execution.
    const matchesCollection =
      config.selectedCollectionIds.length === 0 ||
      merchandise.product.inSelectedCollections;

    if (!matchesCollection) {
      continue;
    }

    const unitPrice = Number(line.cost.amountPerQuantity.amount);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      continue;
    }

    // Expand line quantity into units so different variants can form one bundle.
    for (let index = 0; index < line.quantity; index += 1) {
      eligibleUnits.push({cartLineId: line.id, price: unitPrice});
    }
  }

  // Highest-priced units are grouped first so the fixed bundle price creates
  // the biggest valid savings for the buyer.
  eligibleUnits.sort((a, b) => b.price - a.price);

  let discountAmount = 0;
  let unitIndex = 0;
  const discountedCartLineIds = new Set();

  while (unitIndex < eligibleUnits.length) {
    let appliedRule = false;

    for (const rule of bundleRules) {
      const bundleUnits = eligibleUnits.slice(
        unitIndex,
        unitIndex + rule.quantity,
      );

      if (bundleUnits.length !== rule.quantity) {
        continue;
      }

      const bundleSubtotal = bundleUnits.reduce(
        (total, unit) => total + unit.price,
        0,
      );
      const bundleDiscount = bundleSubtotal - rule.fixedBundlePrice;

      if (bundleDiscount > 0) {
        discountAmount += bundleDiscount;
        for (const unit of bundleUnits) {
          discountedCartLineIds.add(unit.cartLineId);
        }
        unitIndex += rule.quantity;
        appliedRule = true;
        break;
      }
    }

    if (!appliedRule) {
      unitIndex += 1;
    }
  }

  if (discountAmount <= 0) {
    return {operations: []};
  }

  // Order discounts can target the subtotal and exclude entire cart lines.
  // Excluding unused lines keeps unrelated products out of the bundle savings
  // when the cart contains extra items beyond the matched bundle units.
  const excludedCartLineIds = input.cart.lines
    .filter((line) => !discountedCartLineIds.has(line.id))
    .map((line) => line.id);

  return {
    operations: [
      {
        orderDiscountsAdd: {
          candidates: [
            {
              message: config.message,
              targets: [
                {
                  // Apply one fixed discount against the order subtotal rather
                  // than trying to split bundle savings across individual lines.
                  orderSubtotal: {
                    excludedCartLineIds,
                  },
                },
              ],
              value: {
                fixedAmount: {
                  amount: discountAmount.toFixed(2),
                },
              },
            },
          ],
          selectionStrategy: OrderDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}

function parseBundleConfig(value) {
  const fallback = {
    bundle2Price: 799,
    bundle3Price: 999,
    selectedCollectionIds: [],
    message: 'Bundle Discount Applied',
  };

  if (!value) {
    return fallback;
  }

  try {
    const config = JSON.parse(value);

    return {
      bundle2Price: toPositiveNumber(config.bundle2Price, fallback.bundle2Price),
      bundle3Price: toPositiveNumber(config.bundle3Price, fallback.bundle3Price),
      selectedCollectionIds: Array.isArray(config.selectedCollectionIds)
        ? config.selectedCollectionIds.filter((id) => typeof id === 'string')
        : [],
      message:
        typeof config.message === 'string' && config.message.trim()
          ? config.message.trim()
          : fallback.message,
    };
  } catch {
    return fallback;
  }
}

function toPositiveNumber(value, fallback) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}
