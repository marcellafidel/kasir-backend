export function isPositiveInteger(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

export function isNonNegativeNumber(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0;
  }

  return false;
}

export function isDecimalQuantity(value: unknown): boolean {
  if (!isNonNegativeNumber(value)) {
    return false;
  }

  const number = Number(value);
  return Number.isInteger(number * 1000);
}