export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-ink-100 bg-white px-4 py-4 text-center text-xs text-ink-400">
      <p>
        © {year} JobMatch — Créé par Yassine. Tous droits réservés.
      </p>
      <p className="mt-1">Free Palestine 🇵🇸</p>
    </footer>
  );
}
