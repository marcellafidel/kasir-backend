
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { validateStoreProfileUpdate } from "../validators/store.validator";

export async function updateStoreProfile(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as Request & { userId: number }).userId;

    if (typeof userId !== "number") {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const result = validateStoreProfileUpdate(req.body);

    if (!result.ok) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.errors,
      });
      return;
    }

    const store = await prisma.store.update({
      where: { userId },
      data: result.data,
      select: {
        id: true,
        name: true,
        businessType: true,
        address: true,
        phone: true,
        logoUrl: true,
      },
    });

    res.json({
      message: "Store profile updated",
      data: store,
    });
  } catch (error) {
    console.error("Failed to update store profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
