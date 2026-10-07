export function validateCategoryName(value: unknown): string | null {
  if (typeof value !== "string") {
    return "Category name must be a string";
  }

  const name = value.trim();

  if (name.length < 1 || name.length > 100) {
    return "Category name must be between 1 and 100 characters";
  }

  return null;
}