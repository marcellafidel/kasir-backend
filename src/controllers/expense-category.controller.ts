
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { isUniqueViolation } from "../lib/errors";
import {
  validateExpenseCategoryCreate,
  validateExpenseCategoryUpdate,
} from "../validators/expense-category.validator";

const MAX_INT_ID = 2147483647;

const categorySelect = {
  id: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

function getStoreId(req: Request): number | null {
  const storeId = (req as Request & { storeId: number }).storeId;
  return typeof storeId === "number" ? storeId : null;
}

function parseId(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const id = Number(value);
  return id >= 1 && id <= MAX_INT_ID ? id : null;
}

function sendInvalidId(res: Response): void {
  res.status(400).json({
    message: "Validation failed",
    errors: { id: "Id must be a positive integer" },
  });
}

function sendUnexpected(res: Response, label: string, error: unknown): void {
  console.error(label, error);
  res.status(500).json({ message: "Internal server error" });
}

type ExistingCategory = {
  id: number;
  name: string;
  isActive: boolean;
};

function findDuplicate(
  storeId: number,
  name: string,
  excludeId?: number,
): Promise<ExistingCategory | null> {
  return prisma.expenseCategory.findFirst({
    where: {
      storeId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
    },
    select: { id: true, name: true, isActive: true },
  });
}

function sendDuplicate(res: Response, existing: ExistingCategory): void {
  res.status(409).json({
    message: existing.isActive
      ? "Expense category name already exists"
      : "Expense category already exists but is inactive. Reactivate it instead of creating a new one",
    data: existing,
  });
}

export async function createExpenseCategory(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const storeId = getStoreId(req);

    if (storeId === null) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const result = validateExpenseCategoryCreate(req.body);

    if (!result.ok) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.errors,
      });
      return;
    }

    const { name } = result.data;
    const duplicate = await findDuplicate(storeId, name);

    if (duplicate) {
      sendDuplicate(res, duplicate);
      return;
    }

    const category = await prisma.expenseCategory.create({
      data: { storeId, name },
      select: categorySelect,
    });

    res.status(201).json({
      message: "Expense category created",
      data: category,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({
        message: "Expense category name already exists",
      });
      return;
    }

    sendUnexpected(res, "Failed to create expense category:", error);
  }
}

export async function listExpenseCategories(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const storeId = getStoreId(req);

    if (storeId === null) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const includeInactive = req.query.includeInactive === "true";

    const categories = await prisma.expenseCategory.findMany({
      where: {
        storeId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { name: "asc" },
      select: categorySelect,
    });

    res.json({
      message: "Expense categories retrieved",
      data: categories,
    });
  } catch (error) {
    sendUnexpected(res, "Failed to list expense categories:", error);
  }
}

export async function updateExpenseCategory(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const storeId = getStoreId(req);

    if (storeId === null) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const id = parseId(req.params.id);

    if (id === null) {
      sendInvalidId(res);
      return;
    }

    const result = validateExpenseCategoryUpdate(req.body);

    if (!result.ok) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.errors,
      });
      return;
    }

    const changes = result.data;

    const existing = await prisma.expenseCategory.findFirst({
      where: { id, storeId },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Expense category not found" });
      return;
    }

    if (changes.name !== undefined) {
      const duplicate = await findDuplicate(storeId, changes.name, id);

      if (duplicate) {
        sendDuplicate(res, duplicate);
        return;
      }
    }

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: changes,
      select: categorySelect,
    });

    res.json({
      message: "Expense category updated",
      data: category,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({
        message: "Expense category name already exists",
      });
      return;
    }

    sendUnexpected(res, "Failed to update expense category:", error);
  }
}

export async function deactivateExpenseCategory(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const storeId = getStoreId(req);

    if (storeId === null) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const id = parseId(req.params.id);

    if (id === null) {
      sendInvalidId(res);
      return;
    }

    const existing = await prisma.expenseCategory.findFirst({
      where: { id, storeId },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ message: "Expense category not found" });
      return;
    }

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: { isActive: false },
      select: categorySelect,
    });

    res.json({
      message: "Expense category deactivated",
      data: category,
    });
  } catch (error) {
    sendUnexpected(res, "Failed to deactivate expense category:", error);
  }
}
