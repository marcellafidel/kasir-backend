import { prisma } from "./prisma";
import { AppError } from "./errors";
import { orderSelect } from "./order";
import type { OrderRef } from "../validators/order-query.validator";

export async function cancelOrderAndRestoreStock(storeId: number, ref: OrderRef) {
  return prisma.$transaction(async (tx) => {
    // 1. Cari transaksi, hanya di dalam toko ini
    const order = await tx.order.findFirst({
      where:
        ref.by === "id"
          ? { id: ref.id, storeId }
          : { transactionNumber: ref.transactionNumber, storeId },
      select: {
        id: true,
        items: { select: { productId: true, quantity: true } },
      },
    });

    if (!order) {
      throw new AppError(404, { message: "Order not found" });
    }

    // 2. Ubah status COMPLETED -> CANCELLED dalam SATU perintah.
    //    Perintah ini hanya berhasil kalau status masih COMPLETED, jadi kalau dua
    //    permintaan pembatalan datang bersamaan, hanya satu yang menang.
    const changed = await tx.order.updateMany({
      where: { id: order.id, storeId, status: "COMPLETED" },
      data: { status: "CANCELLED" },
    });

    if (changed.count === 0) {
      throw new AppError(409, { message: "Only completed orders can be cancelled" });
    }

    // 3. Kembalikan stok sesuai quantity yang tersimpan di item transaksi.
    //    Diurutkan per productId agar tidak terjadi deadlock.
    const items = [...order.items].sort((a, b) => a.productId - b.productId);

    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity.toFixed(3) } },
      });
    }

    // 4. Ambil transaksi terbaru untuk dikirim sebagai respons
    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      select: orderSelect,
    });
  });
}