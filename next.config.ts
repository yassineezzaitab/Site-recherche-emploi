import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse and mammoth both do dynamic/native-style requires that
  // Next.js's serverless bundler can mis-trace, silently dropping files
  // the package needs at runtime — the upload succeeds but text extraction
  // then fails on Vercel even though it works in local dev. Marking them
  // as external keeps them as plain node_modules requires instead.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
