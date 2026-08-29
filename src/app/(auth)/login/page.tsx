"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push(searchParams.get("callbackUrl") || "/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="card w-full max-w-sm">
      <h1 className="font-display text-2xl font-bold text-ink-950">Connexion</h1>
      <p className="mt-1 text-sm text-ink-500">Content de vous revoir.</p>

      {error && (
        <div className="mt-4 rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-600">{error}</div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
        {loading ? "Connexion..." : "Se connecter"}
      </button>

      <p className="mt-4 text-center text-sm text-ink-500">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
