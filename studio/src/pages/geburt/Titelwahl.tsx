/**
 * Der Titel.
 *
 * Ein einzelnes Feld, ohne Kasten. Nur eine Linie darunter, wie sie in einem
 * Buch stuende, in dem jemand einen Namen eintraegt. Was hier getippt wird,
 * steht im selben Augenblick auf dem Einband darueber – es gibt keine
 * Vorschau daneben, das Buch selbst ist die Vorschau.
 */

import { useEffect, useRef } from 'react';
import { BUCH_TEXTE } from '../../lib/bookTexts';
import type { BookIdentity } from '../../types';
import { SzenenFrage, SzenenWeg } from './Geburt';

const T = BUCH_TEXTE.geburt.titel;

export function Titelwahl({
  identity,
  onChange,
  onWeiter,
  onZurueck,
}: {
  identity: BookIdentity;
  onChange: (patch: Partial<BookIdentity>) => void;
  onWeiter: () => void;
  onZurueck: () => void;
}) {
  const feld = useRef<HTMLInputElement>(null);

  /*
   * Nicht selbst fokussieren.
   *
   * Auf dem iPhone risse die Tastatur sofort das halbe Bild an sich und
   * schoebe das Buch aus dem Blick – ausgerechnet in dem Moment, in dem man
   * sehen soll, wie der Name darauf erscheint. Wer schreiben will, tippt ins
   * Feld; die Linie darunter zeigt deutlich genug, wohin.
   *
   * Was wir tun: den Cursor ans Ende setzen, falls schon ein Titel dasteht
   * (spaeteres Bearbeiten).
   */
  useEffect(() => {
    const el = feld.current;
    if (el && el.value) el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const fertig = identity.title.trim().length > 0;

  return (
    <div>
      <SzenenFrage frage={T.frage} hinweis={T.hinweis} />

      <div className="mx-auto max-w-sm">
        <input
          ref={feld}
          value={identity.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && fertig) {
              e.currentTarget.blur();
              onWeiter();
            }
          }}
          placeholder={T.platzhalter}
          /* Kein `autoCapitalize="off"`: Ein Weltname beginnt gross. */
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          aria-label={T.frage}
          className="w-full border-0 border-b border-gild-500/25 bg-transparent px-1 pb-2 text-center font-serif text-[22px] text-gild-300 outline-none transition-colors placeholder:text-paper-400/25 focus:border-gild-400/60"
        />

        <input
          value={identity.subtitle ?? ''}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          placeholder={T.untertitelPlatzhalter}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label={T.untertitelPlatzhalter}
          className="mt-6 w-full border-0 border-b border-gild-500/12 bg-transparent px-1 pb-2 text-center font-serif text-[14px] italic text-paper-300/70 outline-none transition-colors placeholder:text-paper-400/20 focus:border-gild-400/40"
        />
      </div>

      <SzenenWeg onZurueck={onZurueck} onWeiter={onWeiter} weiterAus={!fertig} />
    </div>
  );
}
