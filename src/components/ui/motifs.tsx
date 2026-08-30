/**
 * Small original decorative motifs — not character artwork, not official
 * logos. Each one is an abstract/generic shape that quietly nods to one of
 * the three referenced stories for anyone who recognizes it, while reading
 * as ordinary UI decoration to everyone else: a cicada (Higurashi's own
 * name means "the cicada that cries at dusk"), a four-leaf clover (a
 * universal luck symbol, echoing Black Clover without reproducing its
 * cover art), and a simple spiral (a generic whirlpool shape — Naruto
 * itself means "maelstrom" — rather than a literal mask or Sharingan).
 * All inline SVG: zero network requests, a few hundred bytes each.
 */

export function HigurashiMotif({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="19" className="fill-warn-100" />
      <path
        d="M20 12c-3.5 0-6.5 3-7.5 7 1 4 4 7 7.5 7s6.5-3 7.5-7c-1-4-4-7-7.5-7z"
        className="fill-warn-600"
        opacity="0.85"
      />
      <ellipse cx="14.5" cy="17.5" rx="2.2" ry="1.6" className="fill-warn-100" transform="rotate(-25 14.5 17.5)" />
      <ellipse cx="25.5" cy="17.5" rx="2.2" ry="1.6" className="fill-warn-100" transform="rotate(25 25.5 17.5)" />
      <circle cx="20" cy="19" r="1.3" className="fill-warn-100" />
    </svg>
  );
}

export function AstaMotif({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="19" className="fill-ink-900" />
      <g className="fill-accent-400">
        <ellipse cx="16" cy="15" rx="4.5" ry="5.5" transform="rotate(-25 16 15)" />
        <ellipse cx="24" cy="15" rx="4.5" ry="5.5" transform="rotate(25 24 15)" />
        <ellipse cx="16" cy="24" rx="4.5" ry="5.5" transform="rotate(25 16 24)" />
        <ellipse cx="24" cy="24" rx="4.5" ry="5.5" transform="rotate(-25 24 24)" />
      </g>
      <rect x="19" y="19" width="2.2" height="12" rx="1.1" className="fill-accent-400" transform="rotate(10 20 25)" />
    </svg>
  );
}

export function ObitoMotif({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="19" className="fill-brand-900" />
      <path
        d="M20 8a12 12 0 1 0 8.49 3.51"
        stroke="#f2924a"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M20 13.5a6.5 6.5 0 1 0 4.6 1.9"
        stroke="#f2924a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="2" className="fill-[#f2924a]" />
    </svg>
  );
}
