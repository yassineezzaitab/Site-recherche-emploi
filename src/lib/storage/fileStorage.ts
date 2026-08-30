import { randomUUID } from "crypto";
import path from "path";
import type { StorageDriver } from "./types";
import { localDriver } from "./localDriver";

/**
 * Storage abstraction for uploaded files (CVs).
 *
 * Two drivers are wired up, selected by STORAGE_DRIVER:
 *  - "local" (default): files under ./storage/uploads — simple for local
 *    dev, but not persistent on serverless/ephemeral-filesystem hosts.
 *  - "s3": any S3-compatible object store (AWS S3, Cloudflare R2, Backblaze
 *    B2, MinIO...) — see s3Driver.ts. Recommended for real deployments.
 *
 * Every call site here (upload/read/delete routes) is driver-agnostic —
 * switching STORAGE_DRIVER is the only change needed to move from local
 * disk to object storage.
 */

export interface StoredFile {
  key: string;
}

let cachedDriver: StorageDriver | null = null;

async function getDriver(): Promise<StorageDriver> {
  if (cachedDriver) return cachedDriver;
  // .trim(): a stray trailing/leading space from copy-pasting the value
  // into a hosting dashboard's env var field is an easy, otherwise-silent
  // mistake — it must not turn into "unknown storage driver" in production.
  const kind = (process.env.STORAGE_DRIVER || "local").trim();
  if (kind === "local") {
    cachedDriver = localDriver;
  } else if (kind === "s3") {
    // Dynamically imported so the AWS SDK is never pulled into a
    // "local"-mode deployment's serverless bundle.
    const { s3Driver } = await import("./s3Driver");
    cachedDriver = s3Driver;
  } else {
    throw new Error(`STORAGE_DRIVER="${kind}" inconnu. Valeurs possibles : "local", "s3".`);
  }
  return cachedDriver;
}

function safeKeyFor(userId: string, originalName: string) {
  const ext = path.extname(originalName).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, "");
  return `${userId}/${randomUUID()}${ext}`;
}

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function saveUploadedFile(
  userId: string,
  originalName: string,
  buffer: Buffer
): Promise<StoredFile> {
  const key = safeKeyFor(userId, originalName);
  const contentType = CONTENT_TYPES[path.extname(key).toLowerCase()];
  const driver = await getDriver();
  await driver.save(key, buffer, contentType);
  return { key };
}

export async function readStoredFile(key: string): Promise<Buffer> {
  const driver = await getDriver();
  return driver.read(key);
}

export async function deleteStoredFile(key: string): Promise<void> {
  const driver = await getDriver();
  await driver.delete(key);
}

/**
 * A time-limited direct-download URL, when the active driver supports it
 * (S3 only — the local driver has no equivalent of a signed URL, since
 * "direct from disk" already implies going through our own server).
 * Returns null for drivers without this capability so callers can fall
 * back to proxying the file through readStoredFile()/the file route.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const driver = await getDriver();
  if (!driver.getSignedUrl) return null;
  return driver.getSignedUrl(key, expiresInSeconds);
}
