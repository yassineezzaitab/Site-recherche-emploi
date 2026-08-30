/**
 * JobMatch's mark: a briefcase (the job) with a checkmark badge (the
 * match) — reusing the same design already shipped as the favicon/PWA
 * icon (public/icons/icon-source.svg) rather than inventing a second
 * logo. Inline SVG so it's crisp at any size and costs nothing to load.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="jobmatch-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3866e3" />
          <stop offset="1" stopColor="#122456" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#jobmatch-logo-bg)" />
      <rect x="128" y="216" width="256" height="176" rx="24" fill="#ffffff" />
      <path
        d="M208 216v-24a48 48 0 0 1 48-48h0a48 48 0 0 1 48 48v24"
        stroke="#ffffff"
        strokeWidth="20"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="236" y="264" width="40" height="28" rx="6" fill="#3866e3" />
      <circle cx="372" cy="368" r="56" fill="#14b090" stroke="#122456" strokeWidth="8" />
      <path
        d="M348 368l16 16 32-32"
        stroke="#ffffff"
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Full lockup: mark + wordmark, for headers/login/signup. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={size} />
      <span className="font-display text-lg font-bold text-brand-700">JobMatch</span>
    </span>
  );
}
