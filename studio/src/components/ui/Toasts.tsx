/** Kurze Rückmeldungen („Gespeichert“, „Gelöscht“ …) unten bzw. oben rechts. */

import { AlertTriangle, Check, Info } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { cx } from '../../lib/utils';

const ICONS = { success: Check, error: AlertTriangle, info: Info } as const;

const TONES = {
  success: 'border-olive-500/30 bg-olive-800 text-cream-100',
  error: 'border-red-900/30 bg-red-800 text-red-50',
  info: 'border-line bg-ink text-cream-100',
} as const;

export function Toasts() {
  const toasts = useStudio((s) => s.toasts);
  const dismiss = useStudio((s) => s.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+var(--sab))] z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end sm:px-0">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={cx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-left text-[15px] shadow-lift animate-riseIn',
              TONES[t.tone],
            )}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{t.message}</span>
          </button>
        );
      })}
    </div>
  );
}
