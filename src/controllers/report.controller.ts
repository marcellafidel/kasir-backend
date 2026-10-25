import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { formatScaled, toScaled } from "../lib/money";
import { validateReportQuery } from "../validators/report.validator";

const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // WIB = UTC+7

type DecimalLike = { toFixed(decimalPlaces: number): string };

// storeId berasal dari JWT -> user -> store (diisi oleh loadStore), bukan dari request
function getStoreId(req: Request): number | null {
  const storeId = (req as Request & { storeId: number }).storeId;
  return typeof storeId === "number" ? storeId : null;
}

// Jumlah dari database (bisa kosong kalau tidak ada data) menjadi sen (bilangan bulat)
function toCents(value: DecimalLike | null): bigint {
  return value === null ? 0n : toScaled(value.toFixed(2), 2);
}

// Selisih bisa negatif, jadi tandanya ditangani di sini
function formatCents(cents: bigint): string {
  return cents < 0n ? `-${formatScaled(-cents, 2)}` : formatScaled(cents, 2);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getFinancialReport(req: Request, res: Response): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (storeId === null) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const result = validateReportQuery(req.query);
    if (!result.ok) {
      res.status(400).json({ message: "Validation failed", errors: result.errors });
      return;
    }
    const { from, to } = result.data;

    // Order disimpan dengan jam UTC. Hari WIB dimulai 7 jam lebih awal dari tengah malam UTC,
    // dan batas akhir dibuat eksklusif (mulai hari berikutnya) supaya tidak ada yang terlewat.
    const salesStart = new Date(from.getTime() - WIB_OFFSET_MS);
    const salesEndExclusive = new Date(to.getTime() + DAY_MS - WIB_OFFSET_MS);

    const [sales, expenses] = await Promise.all([
      prisma.order.aggregate({
        where: {
          storeId,
          status: "COMPLETED",
          createdAt: { gte: salesStart, lt: salesEndExclusive },
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.expense.aggregate({
        where: {
          storeId,
          deletedAt: null,
          expenseDate: { gte: from, lte: to },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const revenueCents = toCents(sales._sum.totalAmount);
    const expensesCents = toCents(expenses._sum.amount);

    res.json({
      message: "Financial report retrieved",
      data: {
        period: {
          from: toDateString(from),
          to: toDateString(to),
          timezone: "Asia/Jakarta (UTC+7)",
        },
        sales: {
          totalRevenue: formatCents(revenueCents),
          orderCount: sales._count._all,
        },
        expenses: {
          totalExpenses: formatCents(expensesCents),
          expenseCount: expenses._count._all,
        },
        revenueMinusExpenses: formatCents(revenueCents - expensesCents),
        notes: [
          "Revenue counts only COMPLETED orders",
          "Profit is not calculated because cost of goods (HPP) is not tracked yet",
        ],
      },
    });
  } catch (error) {
    // Detail hanya ke log server, client hanya menerima pesan umum
    console.error("Failed to generate financial report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}