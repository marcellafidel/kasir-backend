import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { AppError, isUniqueViolation } from "./errors";
import { formatScaled, toScaled } from "./money";
import { orderSelect } from "./order";
import type { OrderCreateInput } from "../validators/order.validator";

const MAX_ATTEMPTS = 3;
const MAX_TOTAL_RUPIAH = 9_999_999_999n; // batas kolom Decimal(12,2)

type Line = {
  productId: number;
  productName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  note: string | null;
};

// Contoh: TRX-20261007-9F3A1C2B (tanggal memakai WIB / UTC+7)
function generateTransactionNumber(): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const date = wib.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `TRX-${date}-${suffix}`;
}

function validationError(errors: Record<string, string>): AppError {
  return new AppError(400, { message: "Validation failed", errors });
}

export async function placeOrder(storeId: number, input: OrderCreateInput) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Ambil produk dari database (hanya milik toko ini)
        const productIds = [...new Set(input.items.map((item) => item.productId))];

        const products = await tx.product.findMany({
          where: { id: { in: productIds }, storeId },
          select: {
            id: true,
            name: true,
            unit: true,
            price: true,
            allowDecimal: true,
            isActive: true,
          },
        });
        const productById = new Map(products.map((product) => [product.id, product] as const));

        // 2. Hitung tiap item. Harga SELALU dari database, bukan dari request.
        const lines: Line[] = [];
        let totalRupiah = 0n;

        for (const [index, item] of input.items.entries()) {
          const product = productById.get(item.productId);

          if (!product) {
            throw new AppError(404, { message: "Product not found", productId: item.productId });
          }
          if (!product.isActive) {
            throw new AppError(409, {
              message: "Product is not active",
              productId: product.id,
              productName: product.name,
            });
          }

          const quantityMilli = toScaled(item.quantity, 3);

          if (!product.allowDecimal && quantityMilli % 1000n !== 0n) {
            throw validationError({
              [`items[${index}].quantity`]: "Quantity must be a whole number for this product",
            });
          }

          const priceCents = toScaled(product.price.toFixed(2), 2);

          // sen x seperseribu = 1/100.000 rupiah, dibulatkan ke rupiah (0,5 ke atas naik)
          const subtotalRupiah = (priceCents * quantityMilli + 50000n) / 100000n;
          totalRupiah += subtotalRupiah;

          lines.push({
            productId: product.id,
            productName: product.name,
            unit: product.unit,
            quantity: formatScaled(quantityMilli, 3),
            unitPrice: product.price.toFixed(2),
            subtotal: formatScaled(subtotalRupiah * 100n, 2),
            note: item.note,
          });
        }

        if (totalRupiah > MAX_TOTAL_RUPIAH) {
          throw validationError({ items: "Total amount is too large" });
        }

        // 3. Cek pembayaran
        const totalCents = totalRupiah * 100n;
        const paymentCents = toScaled(input.paymentAmount, 2);
        let changeCents = 0n;

        if (input.paymentMethod === "CASH") {
          if (paymentCents < totalCents) {
            throw validationError({
              paymentAmount: "Payment amount is less than total amount",
            });
          }
          changeCents = paymentCents - totalCents;
        } else if (paymentCents !== totalCents) {
          throw validationError({
            paymentAmount: "Payment amount must equal total amount for TRANSFER",
          });
        }

        // 4. Kurangi stok. Satu perintah UPDATE dengan syarat stock >= quantity,
        //    jadi stok tidak mungkin negatif walau ada transaksi bersamaan.
        //    Diurutkan per productId agar tidak terjadi deadlock.
        const byProductId = [...lines].sort((a, b) => a.productId - b.productId);

        for (const line of byProductId) {
          const updated = await tx.product.updateMany({
            where: {
              id: line.productId,
              storeId,
              isActive: true,
              stock: { gte: line.quantity },
            },
            data: { stock: { decrement: line.quantity } },
          });

          if (updated.count === 0) {
            throw new AppError(409, {
              message: "Insufficient stock or product unavailable",
              productId: line.productId,
              productName: line.productName,
            });
          }
        }

        // 5. Simpan order + item (snapshot nama, satuan, harga)
        return tx.order.create({
          data: {
            storeId,
            transactionNumber: generateTransactionNumber(),
            customerName: input.customerName,
            totalAmount: formatScaled(totalCents, 2),
            paymentMethod: input.paymentMethod,
            paymentAmount: formatScaled(paymentCents, 2),
            changeAmount: formatScaled(changeCents, 2),
            status: "COMPLETED",
            note: input.note,
            items: { create: lines },
          },
          select: orderSelect,
        });
      });
    } catch (error) {
      // Nomor transaksi kebetulan bentrok: coba lagi dengan nomor baru
      if (isUniqueViolation(error) && attempt < MAX_ATTEMPTS) continue;
      throw error;
    }
  }
}