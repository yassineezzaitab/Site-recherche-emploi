import path from "path";
import fs from "fs/promises";
import type { StorageDriver } from "./types";

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");

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
