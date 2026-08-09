/** Farbige Kennzeichnung des Bearbeitungsstands. */

import type { EntryStatus } from '../../types';
import { cx } from '../../lib/utils';

const STYLES: Record<EntryStatus, string> = {
  Idee: 'border-ink-faint/30 bg-cream-200 text-ink-muted',
  'In Arbeit': 'border-brass-500/35 bg-brass-500/10 text-brass-600',
  Überarbeitung: 'border-orange-700/25 bg-orange-50 text-orange-800',
  Freigegeben: 'border-olive-500/35 bg-olive-500/10 text-olive-600',
  Archiviert: 'border-line bg-cream-200 text-ink-faint',
};

export function StatusPill({ status, className }: { status: EntryStatus; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium',
        STYLES[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
