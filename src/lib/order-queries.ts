import { prisma } from "./prisma";
import { orderSelect } from "./order";
import type { OrderRef } from "../validators/order-query.validator";

// Satu halaman riwayat transaksi, terbaru dulu. Transaksi CANCELLED tetap ikut.
export async function listOrders(storeId: number, page: number, limit: number) {
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { storeId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: orderSelect,
    }),
    prisma.order.count({ where: { storeId } }),
  ]);

  return { orders, total };
}

// Satu transaksi berdasarkan id atau nomor transaksi, hanya di dalam toko ini.
export async function findOrder(storeId: number, ref: OrderRef) {
  return prisma.order.findFirst({
    where:
      ref.by === "id"
        ? { id: ref.id, storeId }
        : { transactionNumber: ref.transactionNumber, storeId },
    select: orderSelect,
  });
}