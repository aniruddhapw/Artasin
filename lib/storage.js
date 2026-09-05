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

const providers = {
  local: { save: saveLocal }
};

export function getStorageProvider() {
  const name = process.env.STORAGE_PROVIDER || "local";
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown storage provider: ${name}`);
  }
  return { name, ...provider };
}
