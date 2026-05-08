import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * Very small example:
 * apply one percentage discount to every cart line.
 *
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  if (!input.discount.discountClasses.includes(DiscountClass.Product)) {
    return { operations: [] };
  }

  const config = parseConfig(input.discount.functionConfig?.value);

  if (config.percentage <= 0) {
    return { operations: [] };
  }

  const candidates = input.cart.lines.map((line) => ({
    message: config.message,
    targets: [{ cartLine: { id: line.id } }],
    value: {
      percentage: {
        value: config.percentage.toFixed(1),
      },
    },
  }));

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

function parseConfig(value) {
  const fallback = {
    percentage: 10,
    message: "10% off from app discount",
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
