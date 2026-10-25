
const MAX_TITLE_LENGTH = 150;
const MAX_NOTE_LENGTH = 200;
const MAX_INT_ID = 2147483647;

const AMOUNT_MAX_INTEGER_DIGITS = 10;
const AMOUNT_MAX_DECIMALS = 2;

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_PAGE = 10000;
const MAX_LIMIT = 100;

type Errors = Record<string, string>;
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Errors };

export type ExpenseCreateInput = {
  title: string;
  amount: string;
  expenseDate: Date;
  note: string | null;
  categoryId: number;
};

export type ExpenseChanges = {
  title?: string;
  amount?: string;
  expenseDate?: Date;
  note?: string | null;
  categoryId?: number;
};

export type ExpenseListQuery = {
  page: number;
  limit: number;
  from?: Date;
  to?: Date;
  categoryId?: number;
};

function toBody(input: unknown): Record<string, unknown> {
  return typeof input === "object" &&
    input !== null &&
    !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

type TextParse =
  | { ok: true; value: string }
  | { ok: false; error: string };

function readTitle(value: unknown): TextParse {
  if (typeof value !== "string") {
    return { ok: false, error: "Title must be a string" };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: "Title must not be empty" };
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      error: `Title must be at most ${MAX_TITLE_LENGTH} characters`,
    };
  }

  return { ok: true, value: trimmed };
}

type NoteParse =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

function readNote(value: unknown): NoteParse {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "Note must be a string" };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { ok: true, value: null };
  }

  if (trimmed.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `Note must be at most ${MAX_NOTE_LENGTH} characters`,
    };
  }

  return { ok: true, value: trimmed };
}

type AmountParse =
  | { ok: true; text: string }
  | { ok: false; error: string };

function parseAmount(value: unknown): AmountParse {
  let raw: string;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { ok: false, error: "Amount must be a valid number" };
    }

    if (value <= 0) {
      return { ok: false, error: "Amount must be greater than 0" };
    }

    raw = String(value);
  } else if (typeof value === "string") {
    raw = value.trim();

    if (/^-/.test(raw)) {
      return { ok: false, error: "Amount must be greater than 0" };
    }
  } else {
    return { ok: false, error: "Amount must be a number" };
  }

  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return { ok: false, error: "Amount must be a valid number" };
  }

  const [integerPart, fractionPart = ""] = raw.split(".");
  const fraction = fractionPart.replace(/0+$/, "");
  const integer = integerPart.replace(/^0+/, "");

  if (fraction.length > AMOUNT_MAX_DECIMALS) {
    return {
      ok: false,
      error: `Amount must have at most ${AMOUNT_MAX_DECIMALS} decimal places`,
    };
  }

  if (integer.length > AMOUNT_MAX_INTEGER_DIGITS) {
    return { ok: false, error: "Amount is too large" };
  }

  const text = `${integer || "0"}${fraction ? `.${fraction}` : ""}`;

  if (text === "0") {
    return { ok: false, error: "Amount must be greater than 0" };
  }

  return { ok: true, text };
}

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < MIN_YEAR || year > MAX_YEAR) return null;

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

const DATE_ERROR =
  "Expense date must be a valid date in YYYY-MM-DD format";

function isPositiveIntId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_INT_ID
  );
}

export function validateExpenseCreate(
  input: unknown,
): Result<ExpenseCreateInput> {
  const { title, amount, expenseDate, note, categoryId } = toBody(input);
  const errors: Errors = {};

  let titleText = "";
  if (title === undefined || title === null) {
    errors.title = "Title is required";
  } else {
    const parsed = readTitle(title);
    if (parsed.ok) titleText = parsed.value;
    else errors.title = parsed.error;
  }

  let amountText = "";
  if (amount === undefined || amount === null) {
    errors.amount = "Amount is required";
  } else {
    const parsed = parseAmount(amount);
    if (parsed.ok) amountText = parsed.text;
    else errors.amount = parsed.error;
  }

  let date: Date | null = null;
  if (expenseDate === undefined || expenseDate === null) {
    errors.expenseDate = "Expense date is required";
  } else {
    date = parseDateOnly(expenseDate);
    if (date === null) errors.expenseDate = DATE_ERROR;
  }

  let categoryIdValue = 0;
  if (categoryId === undefined || categoryId === null) {
    errors.categoryId = "categoryId is required";
  } else if (isPositiveIntId(categoryId)) {
    categoryIdValue = categoryId;
  } else {
    errors.categoryId = "categoryId must be a positive integer";
  }

  const noteResult = readNote(note);
  if (!noteResult.ok) errors.note = noteResult.error;

  if (Object.keys(errors).length > 0 || date === null || !noteResult.ok) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      title: titleText,
      amount: amountText,
      expenseDate: date,
      note: noteResult.value,
      categoryId: categoryIdValue,
    },
  };
}

export function validateExpenseUpdate(
  input: unknown,
): Result<ExpenseChanges> {
  const { title, amount, expenseDate, note, categoryId } = toBody(input);
  const errors: Errors = {};
  const changes: ExpenseChanges = {};

  if (title !== undefined) {
    const parsed = readTitle(title);
    if (parsed.ok) changes.title = parsed.value;
    else errors.title = parsed.error;
  }

  if (amount !== undefined) {
    const parsed = parseAmount(amount);
    if (parsed.ok) changes.amount = parsed.text;
    else errors.amount = parsed.error;
  }

  if (expenseDate !== undefined) {
    const date = parseDateOnly(expenseDate);
    if (date === null) errors.expenseDate = DATE_ERROR;
    else changes.expenseDate = date;
  }

  if (categoryId !== undefined) {
    if (isPositiveIntId(categoryId)) changes.categoryId = categoryId;
    else errors.categoryId = "categoryId must be a positive integer";
  }

  if (note !== undefined) {
    const parsed = readNote(note);
    if (parsed.ok) changes.note = parsed.value;
    else errors.note = parsed.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  if (Object.keys(changes).length === 0) {
    return {
      ok: false,
      errors: { body: "At least one field is required to update" },
    };
  }

  return { ok: true, data: changes };
}

type IntParse =
  | { ok: true; value: number }
  | { ok: false; error: string };

function readQueryInt(
  value: unknown,
  label: string,
  fallback: number | undefined,
  max: number,
): IntParse | undefined {
  if (value === undefined) {
    return fallback === undefined
      ? undefined
      : { ok: true, value: fallback };
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return { ok: false, error: `${label} must be a positive integer` };
  }

  const number = Number(value);

  if (number < 1 || number > max) {
    return { ok: false, error: `${label} must be between 1 and ${max}` };
  }

  return { ok: true, value: number };
}

export function validateExpenseListQuery(
  query: unknown,
): Result<ExpenseListQuery> {
  const { page, limit, from, to, categoryId } =
    typeof query === "object" && query !== null
      ? (query as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const errors: Errors = {};
  const data: ExpenseListQuery = {
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
  };

  const pageResult = readQueryInt(page, "page", DEFAULT_PAGE, MAX_PAGE);
  if (pageResult && !pageResult.ok) errors.page = pageResult.error;
  else if (pageResult) data.page = pageResult.value;

  const limitResult = readQueryInt(limit, "limit", DEFAULT_LIMIT, MAX_LIMIT);
  if (limitResult && !limitResult.ok) errors.limit = limitResult.error;
  else if (limitResult) data.limit = limitResult.value;

  const categoryResult = readQueryInt(
    categoryId,
    "categoryId",
    undefined,
    MAX_INT_ID,
  );

  if (categoryResult && !categoryResult.ok) {
    errors.categoryId = categoryResult.error;
  } else if (categoryResult) {
    data.categoryId = categoryResult.value;
  }

  if (from !== undefined) {
    const date = parseDateOnly(from);
    if (date === null) {
      errors.from = "from must be a valid date in YYYY-MM-DD format";
    } else {
      data.from = date;
    }
  }

  if (to !== undefined) {
    const date = parseDateOnly(to);
    if (date === null) {
      errors.to = "to must be a valid date in YYYY-MM-DD format";
    } else {
      data.to = date;
    }
  }

  if (data.from && data.to && data.from.getTime() > data.to.getTime()) {
    errors.to = "to must be on or after from";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}
