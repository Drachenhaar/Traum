/**
 * Manuskript · Veredeln · Seite.
 *
 * Ausdrücklich **keine** Tab-Leiste. Eine Tab-Leiste ist eine Behauptung über
 * eine App: drei gleichrangige Orte, jederzeit austauschbar, mit Symbolen und
 * einer Fläche darunter. Hier sind es drei Zustände **derselben Arbeit**, in
 * einer Reihenfolge, und sie stehen deshalb wie eine Setzfolge am unteren
 * Papierrand: drei Wörter, ein Punkt dazwischen, eine Haarlinie unter dem,
 * bei dem man gerade ist.
 *
 * Zurückgehen verliert nichts. Das ist keine Höflichkeit, sondern die
 * Bedingung dafür, dass die Reihenfolge überhaupt erträglich ist – wer
 * fürchten muss, beim Zurückblättern etwas zu verlieren, blättert nicht
 * zurück und arbeitet stattdessen an der falschen Stelle weiter.
 */

import type { SetzereiPhase } from '../../lib/setzerei/draft';
import { cx } from '../../lib/utils';

const SCHRITTE: { id: SetzereiPhase; label: string }[] = [
  { id: 'manuskript', label: 'Manuskript' },
  { id: 'veredeln', label: 'Veredeln' },
  { id: 'seite', label: 'Seite' },
];

export function SetzereiSchritte({
  jetzt,
  onWechsel,
  /** Ohne Entwurf führen Veredeln und Seite ins Leere – sie stehen dann still. */
  bereit,
}: {
  jetzt: SetzereiPhase;
  onWechsel: (p: SetzereiPhase) => void;
  bereit: boolean;
}) {
  return (
    <nav
      aria-label="Setzfolge"
      className="mt-12 flex items-baseline justify-center gap-1 border-t border-line pt-5"
    >
      {SCHRITTE.map((s, i) => {
        const an = s.id === jetzt;
        const still = !bereit && s.id !== 'manuskript';
        return (
          <span key={s.id} className="flex items-baseline">
            {i > 0 && (
              <span aria-hidden className="mx-2 font-serif text-[13px] text-gold opacity-40">
                ·
              </span>
            )}
            <button
              type="button"
              onClick={() => !still && onWechsel(s.id)}
              disabled={still}
              aria-current={an ? 'step' : undefined}
              className={cx(
                'relative min-h-[44px] px-1 font-serif text-[15px] transition-colors duration-200 no-tap-highlight',
                an ? 'text-ink' : still ? 'text-ink-faint/40' : 'text-ink-muted hover:text-ink',
              )}
            >
              {s.label}
              <span
                aria-hidden
                className={cx(
                  'absolute inset-x-1 bottom-[9px] block h-px transition-colors duration-300',
                  an ? 'bg-gild-500/70' : 'bg-transparent',
                )}
              />
            </button>
          </span>
        );
      })}
    </nav>
  );
}
