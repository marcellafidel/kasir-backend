const MAX_CUSTOMER_NAME_LENGTH = 100;
const MAX_NOTE_LENGTH = 200;
const MAX_ITEMS = 100;
const MAX_INT_ID = 2147483647;

// Sesuai kolom database: uang Decimal(12,2), quantity Decimal(12,3)
const AMOUNT_RULE = { maxDecimals: 2, maxIntegerDigits: 10 };
const QUANTITY_RULE = { maxDecimals: 3, maxIntegerDigits: 9 };

type Errors = Record<string, string>;
type Result<T> = { ok: true; data: T } | { ok: false; errors: Errors };

export type PaymentMethodInput = "CASH" | "TRANSFER";

export type OrderItemInput = {
  productId: number;
  quantity: string;
  note: string | null;
};

export type OrderCreateInput = {
  customerName: string | null;
  note: string | null;
  paymentMethod: PaymentMethodInput;
  paymentAmount: string;
  items: OrderItemInput[];
};

function toBody(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

type DecimalRule = { maxDecimals: number; maxIntegerDigits: number };

type DecimalParse = { ok: true; text: string } | { ok: false; error: string };

// Menerima angka (2.5) atau string angka ("2.5"), tidak boleh negatif.
function parseNonNegativeDecimal(value: unknown, label: string, rule: DecimalRule): DecimalParse {
  let raw: string;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { ok: false, error: `${label} must be a valid number` };
    }
    if (value < 0) {
      return { ok: false, error: `${label} must be greater than or equal to 0` };
    }
    raw = String(value);
  } else if (typeof value === "string") {
    raw = value.trim();
    if (/^-\d/.test(raw)) {
      return { ok: false, error: `${label} must be greater than or equal to 0` };
    }
  } else {
    return { ok: false, error: `${label} must be a number` };
  }

  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return { ok: false, error: `${label} must be a valid number` };
  }

  const [integerPart, fractionPart = ""] = raw.split(".");
  const fraction = fractionPart.replace(/0+$/, "");
  const integer = integerPart.replace(/^0+/, "");

  if (fraction.length > rule.maxDecimals) {
    return {
      ok: false,
      error: `${label} must have at most ${rule.maxDecimals} decimal places`,
    };
  }

  if (integer.length > rule.maxIntegerDigits) {
    return { ok: false, error: `${label} is too large` };
  }

  return { ok: true, text: `${integer || "0"}${fraction ? `.${fraction}` : ""}` };
}

type OptionalText = { ok: true; value: string | null } | { ok: false; error: string };

// Teks opsional: kosong atau null jadi null, ada batas panjang.
function readOptionalText(value: unknown, label: string, maxLength: number): OptionalText {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: `${label} must be a string` };

  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${label} must be at most ${maxLength} characters` };
  }
  return { ok: true, value: trimmed };
}

export function validateOrderCreate(input: unknown): Result<OrderCreateInput> {
  const { customerName, note, paymentMethod, paymentAmount, items } = toBody(input);
  const errors: Errors = {};

  const customer = readOptionalText(customerName, "Customer name", MAX_CUSTOMER_NAME_LENGTH);
  if (!customer.ok) errors.customerName = customer.error;

  const orderNote = readOptionalText(note, "Note", MAX_NOTE_LENGTH);
  if (!orderNote.ok) errors.note = orderNote.error;

  let method: PaymentMethodInput = "CASH";
  if (paymentMethod === "CASH" || paymentMethod === "TRANSFER") {
    method = paymentMethod;
  } else {
    errors.paymentMethod = "paymentMethod must be CASH or TRANSFER";
  }

  let amountText = "0";
  if (paymentAmount === undefined || paymentAmount === null) {
    errors.paymentAmount = "Payment amount is required";
  } else {
    const parsed = parseNonNegativeDecimal(paymentAmount, "Payment amount", AMOUNT_RULE);
    if (parsed.ok) amountText = parsed.text;
    else errors.paymentAmount = parsed.error;
  }

  const parsedItems: OrderItemInput[] = [];
  if (!Array.isArray(items) || items.length === 0) {
    errors.items = "Items must be a non-empty array";
  } else if (items.length > MAX_ITEMS) {
    errors.items = `Items must contain at most ${MAX_ITEMS} entries`;
  } else {
    for (let index = 0; index < items.length; index++) {
      const { productId, quantity, note: itemNote } = toBody(items[index]);
      const prefix = `items[${index}]`;
      let valid = true;

      if (
        typeof productId !== "number" ||
        !Number.isInteger(productId) ||
        productId < 1 ||
        productId > MAX_INT_ID
      ) {
        errors[`${prefix}.productId`] = "productId must be a positive integer";
        valid = false;
      }

      let quantityText = "0";
      if (quantity === undefined || quantity === null) {
        errors[`${prefix}.quantity`] = "Quantity is required";
        valid = false;
      } else {
        const parsed = parseNonNegativeDecimal(quantity, "Quantity", QUANTITY_RULE);
        if (!parsed.ok) {
          errors[`${prefix}.quantity`] = parsed.error;
          valid = false;
        } else if (parsed.text === "0") {
          errors[`${prefix}.quantity`] = "Quantity must be greater than 0";
          valid = false;
        } else {
          quantityText = parsed.text;
        }
      }

      const itemNoteResult = readOptionalText(itemNote, "Item note", MAX_NOTE_LENGTH);
      if (!itemNoteResult.ok) {
        errors[`${prefix}.note`] = itemNoteResult.error;
        valid = false;
      }

      if (valid && typeof productId === "number" && itemNoteResult.ok) {
        parsedItems.push({ productId, quantity: quantityText, note: itemNoteResult.value });
      }
    }
  }

  if (Object.keys(errors).length > 0 || !customer.ok || !orderNote.ok) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      customerName: customer.value,
      note: orderNote.value,
      paymentMethod: method,
      paymentAmount: amountText,
      items: parsedItems,
    },
  };
}