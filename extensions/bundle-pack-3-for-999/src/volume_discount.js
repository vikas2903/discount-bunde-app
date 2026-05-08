import {ProductDiscountSelectionStrategy} from '../generated/api';

export function runVolumeDiscount(input, configValue) {
  const config = parseVolumeConfig(configValue);
  const candidates = [];

  for (const line of input.cart.lines) {
    const productId = line.merchandise?.product?.id;

    if (!productId) {
      continue;
    }

    const productRule = config.products.find((product) => product.productId === productId);

    if (!productRule) {
      continue;
    }

    const matchedTier = [...productRule.tiers]
      .sort((left, right) => right.minQty - left.minQty)
      .find((tier) => line.quantity >= tier.minQty);

    if (!matchedTier) {
      continue;
    }

    if (matchedTier.discountType === 'fixed') {
      candidates.push({
        message: resolveVolumeMessage(config.message, matchedTier.label),
        targets: [{cartLine: {id: line.id}}],
        value: {
          fixedAmount: {
            amount: matchedTier.discountValue.toFixed(2),
            appliesToEachItem: true,
          },
        },
      });

      continue;
    }

    candidates.push({
      message: resolveVolumeMessage(config.message, matchedTier.label),
      targets: [{cartLine: {id: line.id}}],
      value: {
        percentage: {
          value: matchedTier.discountValue.toFixed(2),
        },
      },
    });
  }

  if (!candidates.length) {
    return {operations: []};
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates,
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}

function parseVolumeConfig(value) {
  const fallback = {
    message: 'Volume discount applied',
    products: [],
  };

  if (!value) {
    return fallback;
  }

  try {
    const config = JSON.parse(value);

    return {
      message:
        typeof config.message === 'string' && config.message.trim()
          ? config.message.trim()
          : fallback.message,
      products: Array.isArray(config.products)
        ? config.products.map((product) => ({
            productId:
              typeof product?.productId === 'string' ? product.productId : '',
            tiers: Array.isArray(product?.tiers)
              ? product.tiers
                  .map((tier) => ({
                    minQty: toPositiveInteger(tier?.minQty, 2),
                    discountType:
                      tier?.discountType === 'fixed' ? 'fixed' : 'percentage',
                    discountValue: toPositiveNumber(tier?.discountValue, 0),
                    label: typeof tier?.label === 'string' ? tier.label : '',
                  }))
                  .filter((tier) => tier.discountValue > 0)
              : [],
          }))
        : fallback.products,
    };
  } catch {
    return fallback;
  }
}

function resolveVolumeMessage(configMessage, tierLabel) {
  if (typeof tierLabel === 'string' && tierLabel.trim()) {
    return tierLabel.trim();
  }

  return configMessage;
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
