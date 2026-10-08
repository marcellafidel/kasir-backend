// Semua angka diproses sebagai bilangan bulat (BigInt) supaya tidak ada
// kesalahan pembulatan desimal. Contoh: "10.5" dengan 3 desimal -> 10500n
//
// Helper ini hanya menerima angka tidak negatif dalam bentuk teks biasa ("12", "10.5").
// Input lain dianggap bug di kode pemanggil dan dilempar sebagai RangeError
// (pesan hanya muncul di log server, tidak dikirim ke client).

const NON_NEGATIVE_DECIMAL = /^\d+(\.\d+)?$/;

export function toScaled(text: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new RangeError("decimals must be a non-negative integer");
  }
  if (!NON_NEGATIVE_DECIMAL.test(text)) {
    throw new RangeError(`Invalid decimal string: "${text}"`);
  }

  const [integer, fraction = ""] = text.split(".");

  // Digit di luar jumlah desimal yang didukung harus nol semua, jangan dipotong diam-diam
  if (/[^0]/.test(fraction.slice(decimals))) {
    throw new RangeError(`Too many decimal places: "${text}"`);
  }

  return BigInt(integer + fraction.slice(0, decimals).padEnd(decimals, "0"));
}

export function formatScaled(value: bigint, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 1) {
    throw new RangeError("decimals must be an integer >= 1");
  }
  if (value < 0n) {
    throw new RangeError("value must not be negative");
  }

  const digits = value.toString().padStart(decimals + 1, "0");
  const integer = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals);
  return `${integer}.${fraction}`;
}