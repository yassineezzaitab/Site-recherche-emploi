"use client";

import { useEffect, useRef, useState } from "react";

const SECRET_CLICKS_REQUIRED = 5;
const SECRET_WINDOW_MS = 2500;
const TYPED_TRIGGER = "nipah";

export function Footer() {
  const year = new Date().getFullYear();
  const [revealed, setRevealed] = useState(false);
  const [typedFound, setTypedFound] = useState(false);
  const clickCount = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typedBuffer = useRef("");

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

  useEffect(() => {
    // A true level-3/4 easter egg: type Rika's own catchphrase anywhere on
    // the site (no click target, no hint) and get a small wink back. Only
    // her name and gesture from before the story's spoiler boundary — this
    // line appears on merchandise and the opening themselves, nothing
    // narrative.
    function handleKeydown(e: KeyboardEvent) {
      if (e.key.length !== 1) return; // ignore Shift/Enter/arrows/etc.
      typedBuffer.current = (typedBuffer.current + e.key).slice(-TYPED_TRIGGER.length).toLowerCase();
      if (typedBuffer.current === TYPED_TRIGGER) {
        setTypedFound(true);
        typedBuffer.current = "";
        setTimeout(() => setTypedFound(false), 3000);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

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
      {typedFound && (
        <p className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-4 py-2 text-white shadow-elevated motion-safe:animate-fade-in">
          Nipah~ 🎐
        </p>
      )}
    </footer>
  );
}
