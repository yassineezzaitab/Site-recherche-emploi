import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

/** Returns the current session, or null if the request is unauthenticated. */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Returns the current user id, or throws an AuthError the API route layer
 * should translate into a 401. Use this at the top of every protected route
 * handler / server action.
 */
export class AuthError extends Error {}

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new AuthError("Authentification requise");
  }
  return session.user.id;
}
