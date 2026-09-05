import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const uploadsDir = path.join(process.cwd(), "public", "uploads");

async function saveLocal(file) {
  await mkdir(uploadsDir, { recursive: true });
  const ext = path.extname(file.name || "").slice(0, 10);
  const filename = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

async function saveCloudinary(file) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set to use the cloudinary storage provider"
    );
  }

  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "artisan-exchange",
    resource_type: "auto"
  });

  return result.secure_url;
}

const providers = {
  local: { save: saveLocal },
  cloudinary: { save: saveCloudinary }
};

export function getStorageProvider() {
  const name = process.env.STORAGE_PROVIDER || "local";
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown storage provider: ${name}`);
  }
  return { name, ...provider };
}
