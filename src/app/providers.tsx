"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

export function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  // Seeding SessionProvider with the server-computed session avoids the
  // brief "unauthenticated" flash on first paint (client fetch of
  // /api/auth/session hasn't resolved yet) that otherwise makes the app
  // look logged-out right after a refresh or back-navigation, especially
  // on slower mobile connections.
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
