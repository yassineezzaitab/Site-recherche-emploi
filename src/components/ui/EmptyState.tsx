import type { ReactNode } from "react";

/**
 * Shared "nothing here yet" state. The optional `motif` slot is where a
 * page can pass one of the small decorative icons from motifs.tsx — kept
 * optional and separate from the message so a page can use this component
 * without any personalization at all.
 */
export function EmptyState({
  motif,
  message,
  action,
}: {
  motif?: ReactNode;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 py-8 text-center text-sm text-ink-500">
      {motif}
      <p>{message}</p>
      {action}
    </div>
  );
}
