/**
 * Welchen Weg gehst du?
 *
 * Fünf Rollen, keine Betriebsarten. Die Wahl entscheidet über eine einzige
 * Schauseite und über spätere Vorschläge – sie schaltet nichts frei und
 * nichts ab, und sie lässt sich jederzeit ändern.
 *
 * Bewusst als gesetzte Liste und nicht als Kachelraster: Fünf gleich große
 * Karten mit Symbolen wären eine Produktauswahl. Das hier ist eine Frage.
 */

import { WEGE } from '../../lib/onboarding/wege';
import { deskStyle } from '../../lib/textures';

export function DeinWeg({ onWahl }: { onWahl: (weg: string) => void }) {
  return (
    <div
      className="flex min-h-full w-full flex-col items-center justify-center overscroll-contain px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]"
      style={deskStyle}
    >
      <div className="w-full max-w-lg animate-fadeIn">
        <p className="text-center font-serif text-[22px] leading-snug text-paper-300/90 sm:text-[25px]">
          Welchen Weg gehst du?
        </p>
        <p className="mx-auto mt-3 max-w-[38ch] text-center font-serif text-[13px] italic leading-relaxed text-paper-400/45">
          Das ändert nichts daran, was das Buch kann – nur, womit es beginnt. Du kannst später
          jederzeit wechseln.
        </p>

        <ul className="mt-9 space-y-1">
          {WEGE.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => onWahl(w.id)}
                className="group w-full border-b border-paper-400/10 py-4 text-left transition-colors hover:border-gild-500/40 no-tap-highlight"
              >
                <span className="block font-serif text-[19px] text-paper-200 transition-colors group-hover:text-gild-300">
                  {w.name}
                </span>
                <span className="mt-1 block font-serif text-[13.5px] italic leading-relaxed text-paper-400/55">
                  {w.zeile}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
