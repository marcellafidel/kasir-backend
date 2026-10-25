
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { getCloudinary } from "../lib/cloudinary";
import { detectImageType } from "../lib/image-type";

export async function updateStoreLogo(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = (req as Request & { userId: number }).userId;
  const file = req.file;

  if (typeof userId !== "number") {
    throw new AppError(401, { message: "Authentication required" });
  }

  if (!file) {
    throw new AppError(400, { message: "Please select a logo image" });
  }

  const imageType = detectImageType(file.buffer);

  if (!imageType) {
    throw new AppError(400, {
      message: "Invalid image. Use JPEG, PNG, or WebP",
    });
  }

  const cloudinary = getCloudinary();

  if (!cloudinary) {
    throw new AppError(503, {
      message: "Cloudinary is not configured",
    });
  }

  const uploadResult = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "kasir-store-logos",
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          transformation: [
            { width: 500, height: 500, crop: "limit" },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new AppError(502, {
                message: "Failed to upload logo",
              }),
            );
            return;
          }

          resolve({ secure_url: result.secure_url });
        },
      );

      stream.end(file.buffer);
    },
  );

  const store = await prisma.store.update({
    where: { userId },
    data: { logoUrl: uploadResult.secure_url },
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  });

  res.json({
    message: "Store logo updated",
    data: store,
  });
}
