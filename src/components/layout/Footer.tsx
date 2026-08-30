"use client";

import { useRef, useState } from "react";

const SECRET_CLICKS_REQUIRED = 5;
const SECRET_WINDOW_MS = 2500;

export function Footer() {
  const year = new Date().getFullYear();
  const [revealed, setRevealed] = useState(false);
  const clickCount = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSecretClick() {
    clickCount.current += 1;
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, SECRET_WINDOW_MS);

    if (clickCount.current >= SECRET_CLICKS_REQUIRED) {
      clickCount.current = 0;
      setRevealed(true);
    }
  }

  return (
    <footer className="border-t border-ink-100 bg-white px-4 py-4 text-center text-xs text-ink-400">
      <p>
        ©{" "}
        <button
          type="button"
          onClick={handleSecretClick}
          className="m-0 inline border-0 bg-transparent p-0 text-inherit cursor-default select-none"
        >
          {year} JobMatch — Créé par Yassine
        </button>
        . Tous droits réservés.
      </p>
      <p className="mt-1 italic">Une pincée d&apos;Hinamizawa, de trèfle noir et de feu Uchiha.</p>
      <p className="mt-1">Free Palestine 🇵🇸</p>
      {revealed && (
        <p className="mx-auto mt-2 max-w-sm rounded-lg bg-ink-50 px-3 py-2 text-ink-500 motion-safe:animate-fade-in">
          🖤 Rika, Asta, Obito — trois histoires de patience et de volonté. Merci d&apos;avoir cherché.
        </p>
      )}
    </footer>
  );
}
