
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  validateExpenseCreate,
  validateExpenseListQuery,
  validateExpenseUpdate,
} from "../validators/expense.validator";

const MAX_INT_ID = 2147483647;

const expenseSelect = {
  id: true,
  title: true,
  amount: true,
  expenseDate: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
} as const;

type DecimalLike = {
  toFixed(decimalPlaces: number): string;
};

type ExpenseRow = {
  id: number;
  title: string;
  amount: DecimalLike;
  expenseDate: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: number;
    name: string;
    isActive: boolean;
  };
};

function toExpenseResponse(expense: ExpenseRow) {
  return {
    id: expense.id,
    title: expense.title,
    amount: expense.amount.toFixed(2),
    expenseDate: expense.expenseDate.toISOString().slice(0, 10),
    note: expense.note,
    category: expense.category,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

function getStoreId(req: Request): number | null {
  const storeId = (req as Request & { storeId: number }).storeId;
  return typeof storeId === "number" ? storeId : null;
}

function parseId(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return id >= 1 && id <= MAX_INT_ID ? id : null;
}

function sendValidationError(
  res: Response,
  errors: Record<string, string>,
): void {
  res.status(400).json({
    message: "Validation failed",
    errors,
  });
}

function sendUnexpected(
  res: Response,
  label: string,
  error: unknown,
): void {
  console.error(label, error);
  res.status(500).json({
    message: "Internal server error",
  });
}

type CategoryCheck = "ok" | "not_found" | "inactive";

async function checkCategory(
  categoryId: number,
  storeId: number,
): Promise<CategoryCheck> {
  const category = await prisma.expenseCategory.findFirst({
    where: { id: categoryId, storeId },
    select: { isActive: true },
  });

  if (!category) return "not_found";
  return category.isActive ? "ok" : "inactive";
}

function sendCategoryProblem(
  res: Response,
  check: "not_found" | "inactive",
): void {
  if (check === "not_found") {
    res.status(404).json({
      message: "Expense category not found",
    });
  } else {
    res.status(409).json({
      message: "Expense category is inactive",
    });
  }
}

// POST /expenses
export async function createExpense(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const storeId = getStoreId(req);

    if (storeId === null) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const result = validateExpenseCreate(req.body);

    if (!result.ok) {
      sendValidationError(res, result.errors);
      return;
    }

    const data = result.data;
    const check = await checkCategory(data.categoryId, storeId);

    if (check !== "ok") {
      sendCategoryProblem(res, check);
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        storeId,
        categoryId: data.categoryId,
        title: data.title,
        amount: data.amount,
        expenseDate: data.expenseDate,
        note: data.note,
      },
      select: expenseSelect,
    });

    res.status(201).json({
      message: "Expense created",
      data: toExpenseResponse(expense),
    });
  } catch (error) {
    sendUnexpected(res, "Failed to create expense:", error);
  }
}

// GET /expenses
export async function listExpenses(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const storeId = getStoreId(req);

    if (storeId === null) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const result = validateExpenseListQuery(req.query);

    if (!result.ok) {
      sendValidationError(res, result.errors);
      return;
    }

    const { page, limit, from, to, categoryId } = result.data;

    const where = {
      storeId,
      deletedAt: null,
      ...(from === undefined && to === undefined
        ? {}
        : {
            expenseDate: {
              ...(from === undefined ? {} : { gte: from }),
              ...(to === undefined ? {} : { lte: to }),
            },
          }),
      ...(categoryId === undefined ? {} : { categoryId }),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: expenseSelect,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      message: "Expenses retrieved",
      data: expenses.map(toExpenseResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    sendUnexpected(res, "Failed to list expenses:", error);
  }
}

// GET /expenses/:id
export async function getExpense(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const storeId = getStoreId(req);

    if (storeId === null) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const id = parseId(req.params.id);

    if (id === null) {
      sendValidationError(res, {
        id: "Id must be a positive integer",
      });
      return;
    }

    const expense = await prisma.expense.findFirst({
      where: { id, storeId, deletedAt: null },
      select: expenseSelect,
    });

    if (!expense) {
      res.status(404).json({
        message: "Expense not found",
      });
      return;
    }

    res.json({
      message: "Expense retrieved",
      data: toExpenseResponse(expense),
    });
  } catch (error) {
    sendUnexpected(res, "Failed to get expense:", error);
  }
}

// PUT /expenses/:id
export async function updateExpense(req: Request, res: Response): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (storeId === null) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const id = parseId(req.params.id);
    if (id === null) {
      sendValidationError(res, { id: "Id must be a positive integer" });
      return;
    }

    const result = validateExpenseUpdate(req.body);
    if (!result.ok) {
      sendValidationError(res, result.errors);
      return;
    }
    const changes = result.data;

    // Pembacaan awal: harus milik toko ini dan belum dihapus
    const existing = await prisma.expense.findFirst({
      where: { id, storeId, deletedAt: null },
      select: { categoryId: true },
    });
    if (!existing) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }

    // Salinan perubahan yang benar-benar akan ditulis (tipenya sama dengan hasil validator)
    const data: typeof changes = { ...changes };
    const requestedCategoryId = changes.categoryId;

    if (requestedCategoryId !== undefined) {
      if (requestedCategoryId === existing.categoryId) {
        // Kategori tidak berubah: tidak ditulis ulang, jadi pengeluaran lama
        // tetap bisa diedit walaupun kategorinya sudah nonaktif
        delete data.categoryId;
      } else {
        // Kategori baru harus milik toko ini dan aktif
        const check = await checkCategory(requestedCategoryId, storeId);
        if (check !== "ok") {
          sendCategoryProblem(res, check);
          return;
        }
      }
    }

    // Penulisan dan pembacaan ulang dalam satu transaksi. Syarat toko dan belum-dihapus
    // ikut di perintah penulisan, jadi data yang dihapus bersamaan tidak ikut berubah.
    const expense = await prisma.$transaction(async (tx) => {
      // Kalau tidak ada yang berubah (misalnya hanya mengirim kategori yang sama),
      // tidak ada penulisan sama sekali
      if (Object.keys(data).length > 0) {
        const updated = await tx.expense.updateMany({
          where: { id, storeId, deletedAt: null },
          data,
        });
        if (updated.count === 0) return null;
      }

      return tx.expense.findFirst({
        where: { id, storeId, deletedAt: null },
        select: expenseSelect,
      });
    });

    if (!expense) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }

    res.json({ message: "Expense updated", data: toExpenseResponse(expense) });
  } catch (error) {
    sendUnexpected(res, "Failed to update expense:", error);
  }
}

// DELETE /expenses/:id — soft delete
export async function deleteExpense(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const storeId = getStoreId(req);

    if (storeId === null) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const id = parseId(req.params.id);

    if (id === null) {
      sendValidationError(res, {
        id: "Id must be a positive integer",
      });
      return;
    }

    const result = await prisma.expense.updateMany({
      where: { id, storeId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      res.status(404).json({
        message: "Expense not found",
      });
      return;
    }

    res.json({
      message: "Expense deleted",
      data: { id },
    });
  } catch (error) {
    sendUnexpected(res, "Failed to delete expense:", error);
  }
}
