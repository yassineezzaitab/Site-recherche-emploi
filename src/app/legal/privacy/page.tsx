import Link from "next/link";

export const metadata = { title: "Politique de confidentialité — JobMatch" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-brand-600 hover:underline">
        ← Retour à l&apos;accueil
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-ink-950">
        Politique de confidentialité
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        Dernière mise à jour : 29 août 2026 — document de démonstration, à faire valider par un
        professionnel du droit avant toute mise en production réelle.
      </p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 text-ink-700">
        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">Données collectées</h2>
          <p>
            Nous collectons les données que vous fournissez directement : email, mot de passe
            (stocké sous forme hachée, jamais en clair), CV et les informations qui en sont
            extraites (compétences, expériences, formations, langues), ainsi que vos critères de
            recherche, favoris, candidatures et alertes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">Finalité</h2>
          <p>
            Ces données servent exclusivement à construire votre profil professionnel, calculer
            la compatibilité avec des offres d&apos;emploi, et vous permettre de suivre vos
            candidatures. Elles ne sont jamais vendues à des tiers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">Base légale</h2>
          <p>
            Le traitement repose sur votre consentement explicite (case à cocher lors de
            l&apos;inscription) et sur l&apos;exécution du service que vous avez demandé.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Vos droits (RGPD)
          </h2>
          <ul className="list-disc pl-5">
            <li>
              <strong>Droit d&apos;accès et de portabilité</strong> : exportez toutes vos
              données au format JSON depuis Paramètres → Exporter mes données.
            </li>
            <li>
              <strong>Droit à l&apos;effacement</strong> : supprimez définitivement votre compte
              et toutes les données associées depuis Paramètres → Supprimer mon compte.
            </li>
            <li>
              <strong>Droit de rectification</strong> : modifiez votre profil à tout moment.
            </li>
            <li>
              <strong>Retrait du consentement</strong> : la suppression du compte vaut retrait du
              consentement.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">Conservation</h2>
          <p>
            Vos données sont conservées tant que votre compte est actif. Les offres d&apos;emploi
            expirées sont désactivées automatiquement après 14 jours sans nouvelle vérification.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">Sécurité</h2>
          <p>
            Les mots de passe sont hachés (bcrypt). Les fichiers de CV sont stockés en dehors de
            tout répertoire public et ne sont accessibles qu&apos;à leur propriétaire, via une
            route authentifiée. Les communications sont chiffrées (HTTPS) en production.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink-900">Contact</h2>
          <p>
            Pour toute question relative à vos données, contactez l&apos;administrateur de cette
            instance de démonstration.
          </p>
        </section>
      </div>
    </div>
  );
}
