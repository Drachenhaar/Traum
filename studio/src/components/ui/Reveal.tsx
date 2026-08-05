/**
 * Ein Blatt, das sich aufklappt statt die Seite zu ersetzen.
 *
 * Die Werkstatt liegt immer unter der Seite, nie davor. Wer sie nicht
 * braucht, sieht nur eine ruhige, einzeilige Einladung.
 */

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../lib/utils';

export function Reveal({
  label,
  hint,
  defaultOpen = false,
  children,
}: {
  label: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-line pt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 text-left no-tap-highlight"
        aria-expanded={open}
      >
        <ChevronDown
          size={16}
          className={cx('shrink-0 text-ink-faint transition-transform duration-300 ease-calm', open && 'rotate-180')}
        />
        <span className="font-serif text-[19px] text-ink">{label}</span>
        {hint && !open && <span className="text-[13px] text-ink-faint">{hint}</span>}
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-calm"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="animate-fadeIn pt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
