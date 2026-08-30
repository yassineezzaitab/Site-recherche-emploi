import path from "path";
import os from "os";
import fs from "fs/promises";
import type { StorageDriver } from "./types";

// Vercel's serverless filesystem is read-only outside /tmp — writing under
// process.cwd() there throws EROFS and every upload fails outright. /tmp is
// writable but ephemeral (wiped between cold starts, not shared across
// instances), so this remains a stopgap: fine for local dev and for using
// a file within the request that created it, but not durable storage.
// STORAGE_DRIVER=s3 is the durable option for production.
const UPLOAD_ROOT = process.env.VERCEL
  ? path.join(os.tmpdir(), "jobmatch-uploads")
  : path.join(process.cwd(), "storage", "uploads");

/** Resolves a storage key to an absolute path, rejecting any path traversal. */
function resolveSafePath(key: string): string {
  const fullPath = path.normalize(path.join(UPLOAD_ROOT, key));
  if (!fullPath.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Chemin de fichier invalide");
  }
  return fullPath;
}

/**
 * Local filesystem driver — the dev/demo default. Files land under
 * ./storage/uploads, outside the web root (never a public/static path),
 * and are only ever served through an authenticated API route. Not
 * persistent on serverless hosts with an ephemeral filesystem (Vercel,
 * most PaaS): use STORAGE_DRIVER=s3 there instead.
 */
export const localDriver: StorageDriver = {
  async save(key, buffer) {
    const fullPath = resolveSafePath(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
  },
  async read(key) {
    return fs.readFile(resolveSafePath(key));
  },
  async delete(key) {
    await fs.rm(resolveSafePath(key), { force: true });
  },
};
