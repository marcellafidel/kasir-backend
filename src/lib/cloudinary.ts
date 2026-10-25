
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

export function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  console.log("Status konfigurasi Cloudinary:", {
    cloudName: Boolean(cloudName),
    apiKey: Boolean(apiKey),
    apiSecret: Boolean(apiSecret),
  });

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}
