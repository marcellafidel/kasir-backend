import {
  isDecimalQuantity,
  isNonNegativeNumber,
} from "./common";

export function validateProductName(value: unknown): string | null {
  if (typeof value !== "string") {
    return "Product name must be a string";
  }

  const name = value.trim();

  if (name.length < 1 || name.length > 150) {
    return "Product name must be between 1 and 150 characters";
  }

  return null;
}

export function validateProductPrice(value: unknown): string | null {
  if (!isNonNegativeNumber(value)) {
    return "Price must be a non-negative number";
  }

  return null;
}

export function validateProductStock(value: unknown): string | null {
  if (!isDecimalQuantity(value)) {
    return "Stock must be a non-negative number with maximum 3 decimal places";
  }

  return null;
}

export function validateProductUnit(value: unknown): string | null {
  if (typeof value !== "string") {
    return "Unit must be a string";
  }

  const unit = value.trim();

  if (unit.length < 1 || unit.length > 30) {
    return "Unit must be between 1 and 30 characters";
  }

  return null;
}