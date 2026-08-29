import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as presign } from "@aws-sdk/s3-request-presigner";
import type { StorageDriver } from "./types";

/**
 * S3-compatible object storage driver.
 *
 * Works with real AWS S3 and any S3-compatible provider (Cloudflare R2,
 * Backblaze B2, MinIO, Scaleway, OVH...) by pointing S3_ENDPOINT at it —
 * this is the recommended production driver for serverless hosting, where
 * the local filesystem is not persistent between requests/deploys.
 *
 * HONESTY NOTE: this driver has not been exercised against a real bucket
 * in this environment — there is no AWS/R2/B2 account or network access to
 * S3-compatible endpoints available here to test against. The code below
 * uses the standard, stable AWS SDK v3 client exactly as documented
 * (PutObjectCommand / GetObjectCommand / DeleteObjectCommand, streamed
 * buffer conversion for reads); it is not exotic or version-sensitive, but
 * treat it as "should work" rather than "verified working" until you've
 * run one real upload/download/delete cycle against your bucket.
 */

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;

  const region = process.env.S3_REGION || "auto";
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "STORAGE_DRIVER=s3 requires S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY to be set."
    );
  }

  cachedClient = new S3Client({
    region,
    endpoint,
    // Path-style addressing is required by most non-AWS S3-compatible
    // providers (R2, MinIO, B2) and is harmless on real AWS S3 too.
    forcePathStyle: Boolean(endpoint),
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET to be set.");
  return bucket;
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  // The SDK v3 Body is a web ReadableStream in edge/browser runtimes and a
  // Node.js Readable in the Node runtime this app runs under — Node
  // Readable is async-iterable, which covers our case (Next.js API routes
  // run in the Node runtime by default).
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export const s3Driver: StorageDriver = {
  async save(key, buffer, contentType) {
    const client = getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // CVs are personal data — never make the bucket/object public;
        // access always goes through getSignedUrl or our own proxy route.
        ACL: "private",
      })
    );
  },
  async read(key) {
    const client = getClient();
    const result = await client.send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key })
    );
    if (!result.Body) throw new Error("Fichier introuvable dans le stockage S3");
    return streamToBuffer(result.Body);
  },
  async delete(key) {
    const client = getClient();
    await client.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
  },
  async getSignedUrl(key, expiresInSeconds) {
    const client = getClient();
    const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
    return presign(client, command, { expiresIn: expiresInSeconds });
  },
};
