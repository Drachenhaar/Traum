/**
 * „Mehr“ – das Auffaechern seltener Handgriffe.
 *
 * Der Grundgedanke aus dem Knopf-Audit: Je Ansicht gibt es hoechstens eine
 * dominante Aktion. Alles Uebrige ist entweder haeufig genug fuer einen
 * eigenen stillen Knopf – oder es gehoert hierher.
 *
 * Warum ueberhaupt verstecken? Weil eine Reihe aus sieben gleich lauten
 * Knoepfen keine Auswahl anbietet, sondern eine Entscheidung verlangt. Wer
 * eine Seite liest, will lesen. Wer sie duplizieren will, weiss das vorher
 * und findet einen Weg – wer nur liest, soll nicht danach gefragt werden.
 *
 * Was hier **nicht** passiert: Funktionen verschwinden. Auffaechern ist kein
 * Entfernen. Alles, was hier drin liegt, war vorher erreichbar oder haette es
 * sein sollen.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cx } from '../../lib/utils';

export interface MehrEintrag {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  /** Trennlinie darueber – fuer alles, was man nicht versehentlich tut. */
  abgesetzt?: boolean;
  gefaehrlich?: boolean;
}

export function Mehr({
  eintraege,
  label = 'Mehr',
  ausrichtung = 'rechts',
  klasse,
}: {
  eintraege: MehrEintrag[];
  label?: string;
  ausrichtung?: 'links' | 'rechts';
  /**
   * Die Farbe des Zeichens – fuer Seiten, die nicht aus Papier sind.
   *
   * Der Vorgabewert `text-ink-faint/35` ist auf hellem Buchpapier richtig und
   * auf der fast schwarzen Charakterseite unsichtbar. Nur der *Ausloeser*
   * wechselt; die aufgeklappte Liste bleibt ein Zettel aus Papier, und das
   * ist auf einem dunklen Tisch genau richtig.
   */
  klasse?: string;
}) {
  const [offen, setOffen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offen) return;
    const weg = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOffen(false);
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOffen(false);
    };
    /* Einen Zug warten, sonst schliesst der oeffnende Tipp gleich wieder. */
    const id = window.setTimeout(() => window.addEventListener('pointerdown', weg), 0);
    window.addEventListener('keydown', taste);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('pointerdown', weg);
      window.removeEventListener('keydown', taste);
    };
  }, [offen]);

  if (eintraege.length === 0) return null;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        aria-haspopup="menu"
        aria-label={label}
        data-leitfaden="mehr"
        className={cx(
          'grid h-9 w-9 place-items-center transition-colors no-tap-highlight',
          offen ? 'text-gild-500' : (klasse ?? 'text-ink-faint/35 hover:text-gold-hell'),
        )}
      >
        <MoreHorizontal size={16} />
      </button>

      {offen && (
        <div
          role="menu"
          className={cx(
            'absolute top-full z-30 mt-1 w-[13.5rem] rounded-[3px] border border-line',
            'bg-cream-50 py-1 shadow-[0_18px_44px_-18px_rgba(60,44,26,0.5)] animate-fadeIn',
            ausrichtung === 'rechts' ? 'right-0' : 'left-0',
          )}
        >
          {eintraege.map((e) => (
            <button
              key={e.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOffen(false);
                e.onClick();
              }}
              className={cx(
                'flex min-h-[40px] w-full items-center gap-2.5 px-3.5 text-left font-serif text-[14.5px]',
                'transition-colors no-tap-highlight hover:bg-cream-200',
                e.abgesetzt && 'mt-1 border-t border-line pt-2',
                e.gefaehrlich ? 'text-red-800/85' : 'text-ink-muted',
              )}
            >
              <span className="grid w-4 shrink-0 place-items-center opacity-55">{e.icon}</span>
              {e.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
