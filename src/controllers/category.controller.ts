import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { validateCategoryName } from "../validators/category.validator";

type StoreRequest = Request & {
  storeId: number;
};

export async function createCategory(req: Request, res: Response) {
  const { storeId } = req as StoreRequest;
  const error = validateCategoryName(req.body?.name);

  if (error) {
    return res.status(400).json({ message: error });
  }

  const name = req.body.name.trim();

  const existing = await prisma.category.findFirst({
    where: {
      storeId,
      name,
    },
  });

  if (existing) {
    return res.status(409).json({
      message: "Category already exists",
    });
  }

  const category = await prisma.category.create({
    data: {
      storeId,
      name,
    },
  });

  return res.status(201).json({
    message: "Category created",
    data: category,
  });
}

export async function listCategories(req: Request, res: Response) {
  const { storeId } = req as StoreRequest;

  const categories = await prisma.category.findMany({
    where: {
      storeId,
    },
    orderBy: {
      name: "asc",
    },
  });

  return res.json({
    data: categories,
  });
}

export async function updateCategory(req: Request, res: Response) {
  const { storeId } = req as StoreRequest;
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid category id",
    });
  }

  const error = validateCategoryName(req.body?.name);

  if (error) {
    return res.status(400).json({ message: error });
  }

  const name = req.body.name.trim();

  const category = await prisma.category.findFirst({
    where: {
      id,
      storeId,
    },
  });

  if (!category) {
    return res.status(404).json({
      message: "Category not found",
    });
  }

  const existing = await prisma.category.findFirst({
    where: {
      storeId,
      name,
      NOT: {
        id,
      },
    },
  });

  if (existing) {
    return res.status(409).json({
      message: "Category already exists",
    });
  }

  const updated = await prisma.category.update({
    where: {
      id,
    },
    data: {
      name,
    },
  });

  return res.json({
    message: "Category updated",
    data: updated,
  });
}

export async function deleteCategory(req: Request, res: Response) {
  const { storeId } = req as StoreRequest;
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid category id",
    });
  }

  const category = await prisma.category.findFirst({
    where: {
      id,
      storeId,
    },
  });

  if (!category) {
    return res.status(404).json({
      message: "Category not found",
    });
  }

  await prisma.category.delete({
    where: {
      id,
    },
  });

  return res.json({
    message: "Category deleted",
  });
}