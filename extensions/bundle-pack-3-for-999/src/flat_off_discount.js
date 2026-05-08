import { ProductDiscountSelectionStrategy } from "../generated/api";

export function runFlatOffDiscount(input, configValue) {
  const config = parseFlatOffConfig(configValue);

  if (config.percentage <= 0) {
    return { operations: [] };
  }

  const candidates = input.cart.lines.map((line) => ({
    message: config.message,
    targets: [
      {
        cartLine: {
          id: line.id,
        },
      },
    ],
    value: {
      percentage: {
        value: config.percentage.toFixed(1),
      },
    },
  }));

  if (!candidates.length) {
    return { operations: [] };
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

function parseFlatOffConfig(value) {
  const fallback = {
    percentage: 10,
    message: "10% off",
  };

  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);

    return {
      percentage: toPositiveNumber(parsed.percentage, fallback.percentage),
      message:
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
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
 