const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_PAGE = 10000;
const MAX_LIMIT = 100;
const MAX_INT_ID = 2147483647;

type Errors = Record<string, string>;
type Result<T> = { ok: true; data: T } | { ok: false; errors: Errors };

export type OrderListQuery = { page: number; limit: number };

export type OrderRef =
  | { by: "id"; id: number }
  | { by: "transactionNumber"; transactionNumber: string };

type IntParse = { ok: true; value: number } | { ok: false; error: string };

// Membaca angka bulat dari query string. Kalau tidak diisi, pakai nilai bawaan.
function readPositiveInt(value: unknown, label: string, fallback: number, max: number): IntParse {
  if (value === undefined) return { ok: true, value: fallback };

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return { ok: false, error: `${label} must be a positive integer` };
  }

  const number = Number(value);
  if (number < 1 || number > max) {
    return { ok: false, error: `${label} must be between 1 and ${max}` };
  }

  return { ok: true, value: number };
}

export function validateOrderListQuery(query: unknown): Result<OrderListQuery> {
  const { page, limit } =
    typeof query === "object" && query !== null
      ? (query as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const errors: Errors = {};

  const pageResult = readPositiveInt(page, "page", DEFAULT_PAGE, MAX_PAGE);
  if (!pageResult.ok) errors.page = pageResult.error;

  const limitResult = readPositiveInt(limit, "limit", DEFAULT_LIMIT, MAX_LIMIT);
  if (!limitResult.ok) errors.limit = limitResult.error;

  if (!pageResult.ok || !limitResult.ok) {
    return { ok: false, errors };
  }

  return { ok: true, data: { page: pageResult.value, limit: limitResult.value } };
}

// "1" -> cari berdasarkan id, "TRX-20261007-A4490F2F" -> cari berdasarkan nomor transaksi
export function parseOrderRef(value: unknown): OrderRef | null {
  if (typeof value !== "string") return null;

  const text = value.trim();

  if (/^\d+$/.test(text)) {
    const id = Number(text);
    return id >= 1 && id <= MAX_INT_ID ? { by: "id", id } : null;
  }

  const upper = text.toUpperCase();
  if (/^TRX-\d{8}-[0-9A-F]{8}$/.test(upper)) {
    return { by: "transactionNumber", transactionNumber: upper };
  }

  return null;
}