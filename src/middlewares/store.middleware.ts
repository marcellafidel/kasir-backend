import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export async function loadStore(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as Request & { userId: number }).userId;

    const store = await prisma.store.findUnique({
      where: {
        userId,
      },
    });

    if (!store || store.isArchived) {
      return res.status(404).json({
        message: "Store not found",
      });
    }

    (req as Request & { storeId: number }).storeId = store.id;

    next();
  } catch {
    return res.status(500).json({
      message: "Failed to load store",
    });
  }
}