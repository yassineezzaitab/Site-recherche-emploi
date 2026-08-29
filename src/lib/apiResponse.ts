import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/session";

/** Uniform error envelope + centralized handling for route handlers. */
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof AuthError) {
    return jsonError("Authentification requise", 401);
  }
  if (err instanceof ZodError) {
    return jsonError(err.issues.map((i) => i.message).join(", "), 422);
  }
  if (err instanceof ForbiddenError) {
    return jsonError(err.message, 403);
  }
  if (err instanceof NotFoundError) {
    return jsonError(err.message, 404);
  }
  console.error(err);
  return jsonError("Une erreur interne est survenue", 500);
}

export class ForbiddenError extends Error {}
export class NotFoundError extends Error {}
