
import multer from "multer";
import { AppError } from "../lib/errors";

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // Maksimal 2 MB
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(
        new AppError(400, {
          message: "Only JPEG, PNG, and WebP images are allowed",
        }),
      );
      return;
    }

    callback(null, true);
  },
});

export const uploadLogo = upload.single("logo");
