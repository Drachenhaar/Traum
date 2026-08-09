/**
 * Was existiert in deiner Welt zuerst?
 *
 * Eine einzige Frage, ein Feld, die Eingabetaste. Kein Dashboard, keine
 * Typenwahl vorweg. Was hier zählt, ist die Fünf-Sekunden-Regel: geöffnet,
 * getippt, gespeichert. Eine Idee darf niemals daran scheitern, dass zuerst
 * ein Formular auszufüllen war.
 *
 * Die Art fächert erst danach auf – und nur, wenn überhaupt etwas dasteht.
 * Fünf gleich große Knöpfe vor dem ersten Wort wären genau die Wand, die
 * dieses Buch nicht sein will.
 */

import { useEffect, useRef, useState } from 'react';
import type { EntryType } from '../../types';
import { deskStyle } from '../../lib/textures';
import { cx } from '../../lib/utils';

/** Die fünf Anfänge – bewusst wenige, alles Weitere kennt die Setzerei. */
const ANFAENGE: { type: EntryType; label: string }[] = [
  { type: 'location', label: 'Ort' },
  { type: 'character', label: 'Figur' },
  { type: 'lore', label: 'Ereignis' },
  { type: 'prop', label: 'Gegenstand' },
  { type: 'page', label: 'Gedanke' },
];

export function ErsterSchritt({
  onAnlegen,
  onUeberspringen,
}: {
  onAnlegen: (titel: string, type: EntryType) => void;
  onUeberspringen: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const feld = useRef<HTMLInputElement>(null);

  /*
   * Hier darf der Fokus sofort ins Feld: Die Seite besteht aus dieser einen
   * Frage, und die Tastatur verdeckt nichts, was man noch sehen müsste. Bei
   * der Titelwahl des Buches war das anders – dort hätte sie das Buch selbst
   * aus dem Blick geschoben.
   */
  useEffect(() => {
    const t = window.setTimeout(() => feld.current?.focus(), 500);
    return () => window.clearTimeout(t);
  }, []);

  const fertig = text.trim().length > 0;

  const anlegen = (type: EntryType) => {
    if (!fertig || busy) return;
    setBusy(true);
    onAnlegen(text.trim(), type);
  };

  return (
    <div
      className="flex min-h-full w-full flex-col items-center justify-center overscroll-contain px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]"
      style={deskStyle}
    >
      <div className="w-full max-w-md animate-fadeIn">
        <p className="text-center font-serif text-[21px] leading-snug text-paper-300/90 sm:text-[24px]">
          Was existiert in deiner Welt zuerst?
        </p>

        <input
          ref={feld}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            /* Eingabetaste genügt. Die Art lässt sich danach noch ändern. */
            if (e.key === 'Enter' && fertig) anlegen('page');
          }}
          placeholder="Ein Ort, eine Figur, ein Gedanke …"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label="Was existiert in deiner Welt zuerst?"
          className="mt-9 w-full border-0 border-b border-gild-500/25 bg-transparent px-1 pb-2.5 text-center font-serif text-[20px] text-gild-300 outline-none transition-colors placeholder:text-paper-400/25 focus:border-gild-400/60"
        />

        {/*
         * Fächert erst auf, wenn etwas dasteht. Vorher wäre es eine
         * Entscheidung über etwas, das es noch nicht gibt.
         */}
        <div
          /* Unsichtbar heisst auch: fuer Vorleseprogramme nicht vorhanden.
             Sonst kuendigt es fuenf Knoepfe an, die es noch nicht gibt. */
          aria-hidden={!fertig}
          className={cx(
            'transition-all duration-500',
            fertig ? 'mt-7 opacity-100' : 'pointer-events-none mt-2 opacity-0',
          )}
        >
          <p className="mb-3 text-center text-[11px] uppercase tracking-[0.22em] text-paper-400/40">
            Als was?
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {ANFAENGE.map((a) => (
              <button
                key={a.type}
                type="button"
                onClick={() => anlegen(a.type)}
                className="min-h-[44px] rounded-full border border-paper-400/20 px-5 font-serif text-[15px] text-paper-300/85 transition-colors hover:border-gild-500/50 hover:text-gild-300 no-tap-highlight"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={onUeberspringen}
            className="min-h-[44px] font-serif text-[13.5px] italic text-paper-400/45 transition-colors hover:text-paper-300/70 no-tap-highlight"
          >
            Später – erst einmal blättern
          </button>
        </div>
      </div>
    </div>
  );
}
