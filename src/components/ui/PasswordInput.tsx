"use client";

import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password <input> with a show/hide toggle (eye / crossed-eye icon).
 * Starts masked. Works the same on touch devices — the toggle is a real
 * <button type="button"> (not a hover-only affordance) so it's reachable
 * on mobile, and toggling only flips the `type` attribute, so existing
 * autoComplete/validation behavior is unchanged.
 */
export const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          className={`${className ?? ""} pr-10`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-400 hover:text-ink-600"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    );
  }
);
