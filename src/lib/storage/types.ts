/** Storage keys are opaque, server-generated strings (see fileStorage.ts's safeKeyFor) — never derived from user input, which is what keeps every driver below immune to path traversal / object-key injection. */
export interface StorageDriver {
  save(key: string, buffer: Buffer, contentType?: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** Optional: a time-limited signed URL for direct download, bypassing our own server. Only meaningful for object storage (S3); the local driver doesn't implement it. */
  getSignedUrl?(key: string, expiresInSeconds: number): Promise<string>;
}
