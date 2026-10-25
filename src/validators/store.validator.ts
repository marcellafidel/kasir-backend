const MAX_NAME_LENGTH = 100;
const MAX_BUSINESS_TYPE_LENGTH = 50;
const MAX_ADDRESS_LENGTH = 255;
const MAX_PHONE_LENGTH = 20;
const MAX_LOGO_URL_LENGTH = 500;
const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15;

type Errors = Record<string, string>;
type Result<T> = { ok: true; data: T } | { ok: false; errors: Errors };

// Hanya field yang dikirim (dan lolos validasi) yang ada di sini
export type StoreProfileChanges = {
  name?: string;
  businessType?: string;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
};

type TextParse = { ok: true; value: string } | { ok: false; error: string };
type NullableTextParse = { ok: true; value: string | null } | { ok: false; error: string };

function toBody(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

// Teks wajib: tidak boleh null atau kosong
function readRequiredText(value: unknown, label: string, maxLength: number): TextParse {
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string` };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: `${label} must not be empty` };
  }
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${label} must be at most ${maxLength} characters` };
  }
  return { ok: true, value: trimmed };
}

// Teks opsional: null atau teks kosong berarti dihapus (disimpan sebagai null)
function readNullableText(value: unknown, label: string, maxLength: number): NullableTextParse {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be a string or null` };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${label} must be at most ${maxLength} characters` };
  }
  return { ok: true, value: trimmed };
}

function readPhone(value: unknown): NullableTextParse {
  const text = readNullableText(value, "Phone", MAX_PHONE_LENGTH);
  if (!text.ok || text.value === null) return text;

  if (!/^\+?[0-9\s\-()]+$/.test(text.value)) {
    return {
      ok: false,
      error: "Phone may only contain digits, spaces, +, - and parentheses",
    };
  }

  const digits = text.value.replace(/\D/g, "");
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    return {
      ok: false,
      error: `Phone must contain between ${MIN_PHONE_DIGITS} and ${MAX_PHONE_DIGITS} digits`,
    };
  }

  return text;
}

// Hanya tautan http atau https (menolak javascript:, ftp:, dan sejenisnya)
function readLogoUrl(value: unknown): NullableTextParse {
  const text = readNullableText(value, "Logo URL", MAX_LOGO_URL_LENGTH);
  if (!text.ok || text.value === null) return text;

  const message = "Logo URL must be a valid http or https URL";

  let url: URL;
  try {
    url = new URL(text.value);
  } catch {
    return { ok: false, error: message };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: message };
  }

  return text;
}

// PATCH bersifat parsial: field yang tidak dikirim tidak berubah
export function validateStoreProfileUpdate(input: unknown): Result<StoreProfileChanges> {
  const { name, businessType, address, phone, logoUrl } = toBody(input);
  const errors: Errors = {};
  const changes: StoreProfileChanges = {};

  if (name !== undefined) {
    const parsed = readRequiredText(name, "Name", MAX_NAME_LENGTH);
    if (parsed.ok) changes.name = parsed.value;
    else errors.name = parsed.error;
  }

  if (businessType !== undefined) {
    const parsed = readRequiredText(businessType, "Business type", MAX_BUSINESS_TYPE_LENGTH);
    if (parsed.ok) changes.businessType = parsed.value;
    else errors.businessType = parsed.error;
  }

  if (address !== undefined) {
    const parsed = readNullableText(address, "Address", MAX_ADDRESS_LENGTH);
    if (parsed.ok) changes.address = parsed.value;
    else errors.address = parsed.error;
  }

  if (phone !== undefined) {
    const parsed = readPhone(phone);
    if (parsed.ok) changes.phone = parsed.value;
    else errors.phone = parsed.error;
  }

  if (logoUrl !== undefined) {
    const parsed = readLogoUrl(logoUrl);
    if (parsed.ok) changes.logoUrl = parsed.value;
    else errors.logoUrl = parsed.error;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  if (Object.keys(changes).length === 0) {
    return {
      ok: false,
      errors: {
        body: "At least one of name, businessType, address, phone, or logoUrl is required",
      },
    };
  }

  return { ok: true, data: changes };
}