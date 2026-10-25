const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

type Errors = Record<string, string>;
type Result<T> = { ok: true; data: T } | { ok: false; errors: Errors };

// from dan to adalah Date pada pukul 00:00 UTC dari tanggal kalender yang dipilih
export type ReportQuery = { from: Date; to: Date };

// Tanggal hanya berbentuk YYYY-MM-DD dan harus tanggal kalender yang benar
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

export function validateReportQuery(query: unknown): Result<ReportQuery> {
  const { from, to } =
    typeof query === "object" && query !== null
      ? (query as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const errors: Errors = {};
  let fromDate: Date | null = null;
  let toDate: Date | null = null;

  if (from === undefined) {
    errors.from = "from is required";
  } else {
    fromDate = parseDateOnly(from);
    if (fromDate === null) errors.from = "from must be a valid date in YYYY-MM-DD format";
  }

  if (to === undefined) {
    errors.to = "to is required";
  } else {
    toDate = parseDateOnly(to);
    if (toDate === null) errors.to = "to must be a valid date in YYYY-MM-DD format";
  }

  if (fromDate !== null && toDate !== null) {
    if (fromDate.getTime() > toDate.getTime()) {
      errors.to = "to must be on or after from";
    } else {
      const days = (toDate.getTime() - fromDate.getTime()) / DAY_MS + 1;
      if (days > MAX_RANGE_DAYS) {
        errors.to = `Date range must be at most ${MAX_RANGE_DAYS} days`;
      }
    }
  }

  if (Object.keys(errors).length > 0 || fromDate === null || toDate === null) {
    return { ok: false, errors };
  }

  return { ok: true, data: { from: fromDate, to: toDate } };
}