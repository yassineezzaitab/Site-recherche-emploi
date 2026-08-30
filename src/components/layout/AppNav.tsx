"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  LayoutDashboard,
  User,
  Search,
  Heart,
  ClipboardList,
  BellRing,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/search", label: "Recherche", icon: Search },
  { href: "/profile", label: "Mon profil", icon: User },
  { href: "/favorites", label: "Favoris", icon: Heart },
  { href: "/applications", label: "Candidatures", icon: ClipboardList },
  { href: "/alerts", label: "Alertes", icon: BellRing },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function refreshUnreadCount() {
      fetch("/api/notifications")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data && setUnreadCount(data.unreadCount))
        .catch(() => {});
    }
    // Fetch on mount and when the tab regains focus — not on every
    // in-app navigation (nothing in the UI currently marks notifications
    // read, so re-fetching per route change was a pure wasted request on
    // every single page change).
    refreshUnreadCount();
    window.addEventListener("focus", refreshUnreadCount);
    return () => window.removeEventListener("focus", refreshUnreadCount);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="font-display text-lg font-bold text-brand-700">
          JobMatch
        </Link>
        <button onClick={() => setOpen(!open)} className="btn-ghost p-2" aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <nav
        className={clsx(
          "flex-col gap-1 border-r border-ink-100 bg-white p-4 lg:flex lg:w-64 lg:shrink-0",
          open ? "flex" : "hidden lg:flex"
        )}
      >
        <Link href="/dashboard" className="mb-6 hidden font-display text-xl font-bold text-brand-700 lg:block">
          JobMatch
        </Link>
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50"
              )}
            >
              <Icon size={18} />
              {label}
              {href === "/alerts" && unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-danger-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50"
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </nav>
    </>
  );
}
