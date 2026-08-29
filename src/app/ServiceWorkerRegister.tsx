"use client";

import { useEffect } from "react";

/** Registers the service worker in production only — in dev it would fight with Next's own hot-reload asset invalidation. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement — a failed
      // registration (unsupported browser, blocked by a privacy setting)
      // should never affect the app working as a normal website.
    });
  }, []);
  return null;
}
