
const MAX_NAME_LENGTH = 100;

type Errors = Record<string, string>;
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Errors };

export type ExpenseCategoryCreateInput = {
  name: string;
};

export type ExpenseCategoryUpdateInput = {
  name?: string;
  isActive?: boolean;
};

function toBody(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function readName(
  value: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "Name must be a string" };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: "Name must not be empty" };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `Name must be at most ${MAX_NAME_LENGTH} characters`,
    };
  }

  return { ok: true, value: trimmed };
}

export function validateExpenseCategoryCreate(
  input: unknown,
): Result<ExpenseCategoryCreateInput> {
  const { name } = toBody(input);

  if (name === undefined || name === null) {
    return { ok: false, errors: { name: "Name is required" } };
  }

  const parsed = readName(name);

  if (!parsed.ok) {
    return { ok: false, errors: { name: parsed.error } };
  }

  return { ok: true, data: { name: parsed.value } };
}

export function validateExpenseCategoryUpdate(
  input: unknown,
): Result<ExpenseCategoryUpdateInput> {
  const { name, isActive } = toBody(input);
  const errors: Errors = {};
  const data: ExpenseCategoryUpdateInput = {};

  if (name !== undefined) {
    const parsed = readName(name);

    if (parsed.ok) {
      data.name = parsed.value;
    } else {
      errors.name = parsed.error;
    }
  }

  if (isActive !== undefined) {
    if (typeof isActive === "boolean") {
      data.isActive = isActive;
    } else {
      errors.isActive = "isActive must be a boolean";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  if (Object.keys(data).length === 0) {
    return {
      ok: false,
      errors: { body: "At least one of name or isActive is required" },
    };
  }

  return { ok: true, data };
}
