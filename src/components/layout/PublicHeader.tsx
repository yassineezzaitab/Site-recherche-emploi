"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";

export function PublicHeader() {
  const { data: session } = useSession();
  return (
    <header className="border-b border-ink-100 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        {session ? (
          <Link href="/dashboard" className="btn-secondary">Mon tableau de bord</Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">Se connecter</Link>
            <Link href="/signup" className="btn-primary">Créer un compte</Link>
          </div>
        )}
      </div>
    </header>
  );
}
