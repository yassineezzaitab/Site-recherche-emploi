"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("Vous devez accepter la politique de confidentialité pour continuer.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, consent, marketingOptIn }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Une erreur est survenue.");
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push("/profile?welcome=1");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-ink-950">Créer un compte</h1>
        <p className="mt-1 text-sm text-ink-500">
          Gratuit. Vous pourrez importer votre CV juste après.
        </p>

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
              minLength={10}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-ink-400">
              Au moins 10 caractères, avec une lettre et un chiffre.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <label className="flex items-start gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
              required
            />
            <span>
              J&apos;accepte la{" "}
              <Link href="/legal/privacy" className="text-brand-600 underline" target="_blank">
                politique de confidentialité
              </Link>{" "}
              et le traitement de mes données pour la recherche d&apos;emploi (requis).
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5"
            />
            <span>Je souhaite recevoir des conseils emploi par email (optionnel).</span>
          </label>
        </div>

        <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
          {loading ? "Création..." : "Créer mon compte"}
        </button>

        <p className="mt-4 text-center text-sm text-ink-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
