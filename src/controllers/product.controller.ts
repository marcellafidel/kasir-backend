import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  validateProductName,
  validateProductPrice,
  validateProductStock,
  validateProductUnit,
} from "../validators/product.validator";

type StoreRequest = Request & {
  storeId: number;
};

function formatProduct(product: any) {
  return {
    ...product,
    price: product.price.toFixed(2),
    stock: product.stock.toFixed(3),
  };
}

export async function createProduct(req: Request, res: Response) {
  const { storeId } = req as StoreRequest;

  const {
    name,
    price,
    unit,
    stock = 0,
    allowDecimal = false,
    categoryId = null,
  } = req.body ?? {};

  const nameError = validateProductName(name);
  const priceError = validateProductPrice(price);
  const unitError = validateProductUnit(unit);
  const stockError = validateProductStock(stock);

  if (nameError || priceError || unitError || stockError) {
    return res.status(400).json({
      message: nameError || priceError || unitError || stockError,
    });
  }

  if (typeof allowDecimal !== "boolean") {
    return res.status(400).json({
      message: "allowDecimal must be a boolean",
    });
  }

  let validCategoryId: number | null = null;

  if (categoryId !== null && categoryId !== undefined) {
    const parsedCategoryId = Number(categoryId);

    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
      return res.status(400).json({
        message: "Invalid categoryId",
      });
    }

    const category = await prisma.category.findFirst({
      where: {
        id: parsedCategoryId,
        storeId,
      },
    });

    if (!category) {
      return res.status(400).json({
        message: "Category not found",
      });
    }

    validCategoryId = parsedCategoryId;
  }

  const product = await prisma.product.create({
    data: {
      storeId,
      categoryId: validCategoryId,
      name: name.trim(),
      price: Number(price),
      unit: unit.trim(),
      stock: Number(stock),
      allowDecimal,
    },
  });

  return res.status(201).json({
    message: "Product created",
    data: formatProduct(product),
  });
}

export async function listProducts(req: Request, res: Response) {
  const { storeId } = req as StoreRequest;

  const products = await prisma.product.findMany({
    where: {
      storeId,
      isActive: true,
    },
    include: {
      category: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return res.json({
    data: products.map(formatProduct),
  });
}

export async function getProduct(req: Request, res: Response) {
  const { storeId } = req as StoreRequest;
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid product id",
    });
  }

  const product = await prisma.product.findFirst({
    where: {
      id,
      storeId,
      isActive: true,
    },
    include: {
      category: true,
    },
  });

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  return res.json({
    data: formatProduct(product),
  });
}

export async function updateProduct(req: Request, res: Response) {
  const { storeId } = req as StoreRequest;
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid product id",
    });
  }

  const existingProduct = await prisma.product.findFirst({
    where: {
      id,
      storeId,
      isActive: true,
    },
  });

  if (!existingProduct) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const {
    name,
    price,
    unit,
    stock,
    allowDecimal,
    categoryId,
  } = req.body ?? {};

  const data: any = {};

  if (name !== undefined) {
    const error = validateProductName(name);

    if (error) {
      return res.status(400).json({ message: error });
    }

    data.name = name.trim();
  }

  if (price !== undefined) {
    const error = validateProductPrice(price);

    if (error) {
      return res.status(400).json({ message: error });
    }

    data.price = Number(price);
  }

  if (unit !== undefined) {
    const error = validateProductUnit(unit);

    if (error) {
      return res.status(400).json({ message: error });
    }

    data.unit = unit.trim();
  }

  if (stock !== undefined) {
    const error = validateProductStock(stock);

    if (error) {
      return res.status(400).json({ message: error });
    }

    data.stock = Number(stock);
  }

  if (allowDecimal !== undefined) {
    if (typeof allowDecimal !== "boolean") {
      return res.status(400).json({
        message: "allowDecimal must be a boolean",
      });
    }

    data.allowDecimal = allowDecimal;
  }

  if (categoryId !== undefined) {
    if (categoryId === null) {
      data.categoryId = null;
    } else {
      const parsedCategoryId = Number(categoryId);

      if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
        return res.status(400).json({
          message: "Invalid categoryId",
        });
      }

      const category = await prisma.category.findFirst({
        where: {
          id: parsedCategoryId,
          storeId,
        },
      });

      if (!category) {
        return res.status(400).json({
          message: "Category not found",
        });
      }

      data.categoryId = parsedCategoryId;
    }
  }

  const product = await prisma.product.update({
    where: {
      id,
    },
    data,
  });

  return res.json({
    message: "Product updated",
    data: formatProduct(product),
  });
}

export async function deleteProduct(req: Request, res: Response) {
  const { storeId } = req as StoreRequest;
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid product id",
    });
  }

  const existingProduct = await prisma.product.findFirst({
    where: {
      id,
      storeId,
      isActive: true,
    },
  });

  if (!existingProduct) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  const product = await prisma.product.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });

  return res.json({
    message: "Product deleted",
    data: formatProduct(product),
  });
}