import Link from "next/link";
import { Sparkles, FileText, Target, Bell, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";

const FEATURES = [
  {
    icon: FileText,
    title: "Votre CV, analysé en un instant",
    text: "Importez votre CV (PDF, DOCX, TXT) : nous détectons vos compétences, expériences, formations et langues pour construire votre profil — vous gardez toujours la main pour tout corriger.",
  },
  {
    icon: Target,
    title: "Un score de compatibilité expliqué",
    text: "Chaque offre reçoit un pourcentage de compatibilité détaillé : compétences, horaires, distance, salaire, type de contrat — avec les points forts et les points à travailler.",
  },
  {
    icon: Sparkles,
    title: "Recherche en langage naturel",
    text: "« Job étudiant, 15h/semaine, le soir, à moins de 20 minutes » — décrivez ce que vous cherchez avec vos mots, on transforme ça en critères.",
  },
  {
    icon: Bell,
    title: "Alertes intelligentes",
    text: "Enregistrez une recherche et recevez une notification dès qu'une nouvelle offre vous correspond à plus de 70%.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
      <PublicHeader />

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-10 text-center sm:pt-20">
        <span className="badge mb-6 bg-brand-100 text-brand-700">100% gratuit</span>
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
          Le bon poste, pas juste une liste d&apos;annonces.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
          JobMatch analyse votre CV, comprend vos vraies contraintes — horaires, distance,
          disponibilités — et classe les offres selon ce qui compte réellement pour vous.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Commencer gratuitement
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            J&apos;ai déjà un compte
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-20 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card">
            <div className="mb-3 inline-flex rounded-lg bg-brand-100 p-2.5 text-brand-700">
              <Icon size={20} />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink-900">{title}</h3>
            <p className="mt-1.5 text-sm text-ink-600">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="card flex flex-col items-start gap-3 bg-ink-900 text-white sm:flex-row sm:items-center">
          <ShieldCheck size={28} className="shrink-0 text-accent-400" />
          <p className="text-sm text-ink-200">
            Vos données restent les vôtres : export complet, suppression de compte en un clic,
            CV stockés de manière sécurisée. Voir notre{" "}
            <Link href="/legal/privacy" className="underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </section>

    </div>
  );
}
