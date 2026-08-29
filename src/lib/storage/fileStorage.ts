import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

/**
 * Storage abstraction for uploaded files (CVs).
 *
 * Only a "local" driver is implemented (dev/demo default: files land under
 * ./storage/uploads, outside the web root, served only via an authenticated
 * API route — never a static/public path). Setting STORAGE_DRIVER=s3 and
 * filling the S3_* env vars is the intended production path; the interface
 * below is what an S3 implementation needs to satisfy so call sites never
 * change. We do not ship an S3 implementation because we have no bucket/
 * credentials to test against in this environment — wiring one in is a
 * contained, well-scoped follow-up (swap the two functions below for calls
 * to the AWS SDK v3 S3Client).
 */

export interface StoredFile {
  key: string;
}

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");

function assertLocalDriver() {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver !== "local") {
    throw new Error(
      `STORAGE_DRIVER="${driver}" is not implemented yet. Only "local" is wired up in this build.`
    );
  }
}

function safeKeyFor(userId: string, originalName: string) {
  const ext = path.extname(originalName).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, "");
  return `${userId}/${randomUUID()}${ext}`;
}

export async function saveUploadedFile(
  userId: string,
  originalName: string,
  buffer: Buffer
): Promise<StoredFile> {
  assertLocalDriver();
  const key = safeKeyFor(userId, originalName);
  const fullPath = path.join(UPLOAD_ROOT, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return { key };
}

export async function readStoredFile(key: string): Promise<Buffer> {
  assertLocalDriver();
  const fullPath = resolveSafePath(key);
  return fs.readFile(fullPath);
}

export async function deleteStoredFile(key: string): Promise<void> {
  assertLocalDriver();
  const fullPath = resolveSafePath(key);
  await fs.rm(fullPath, { force: true });
}

/** Resolves a storage key to an absolute path, rejecting any path traversal. */
function resolveSafePath(key: string): string {
  const fullPath = path.normalize(path.join(UPLOAD_ROOT, key));
  if (!fullPath.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Chemin de fichier invalide");
  }
  return fullPath;
}
