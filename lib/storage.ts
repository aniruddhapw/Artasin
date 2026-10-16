import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const uploadsDir = path.join(process.cwd(), "public", "uploads");

async function saveLocal(file: File): Promise<string> {
  await mkdir(uploadsDir, { recursive: true });
  const ext = path.extname(file.name || "").slice(0, 10);
  const filename = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

async function saveCloudinary(file: File): Promise<string> {
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

export interface StorageProvider {
  /** Stores the file and returns the URL to serve it from. */
  save(file: File): Promise<string>;
}

const providers: Record<"local" | "cloudinary", StorageProvider> = {
  local: { save: saveLocal },
  cloudinary: { save: saveCloudinary }
};

export function getStorageProvider(): StorageProvider & { name: string } {
  const name = process.env.STORAGE_PROVIDER || "local";
  const provider = name === "local" || name === "cloudinary" ? providers[name] : undefined;
  if (!provider) {
    throw new Error(`Unknown storage provider: ${name}`);
  }
  return { name, ...provider };
}

/**
 * Whether a URL is a file our own upload endpoint produced, so a form can't
 * be pointed at an image hosted somewhere else.
 */
export function isOwnUploadUrl(url: unknown): boolean {
  if (typeof url !== "string") {
    return false;
  }
  if (url.startsWith("/uploads/") && !url.includes("..")) {
    return true;
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  return Boolean(cloudName) && url.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`);
}
