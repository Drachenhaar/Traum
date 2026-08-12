/**
 * Was möchtest du erschaffen?
 *
 * Die erste Frage, die Dragoncore stellt – und sie steht jetzt **vor** der
 * Bucherschaffung. Das war vorher andersherum: Man band erst den Einband und
 * wurde danach gefragt, wofür. Die Reihenfolge ist keine Kosmetik. Wer weiß,
 * wofür ein Buch gedacht ist, bindet es anders; wer erst bindet und dann
 * gefragt wird, hat die Frage schon beantwortet und merkt es nicht.
 *
 * Die Karten sind bewusst groß und bewusst leise. Kein Symbol in jeder Ecke,
 * keine gleich schweren Kacheln, keine Ankreuzfelder: Wer eine Zeile liest
 * und antwortet, trifft eine Entscheidung. Wer ein Raster sieht, wählt ein
 * Produkt.
 *
 * Und die wichtigste Zeile steht unter allen: **Das nimmt nichts weg.** Diese
 * Wahl ordnet, was zuerst offenliegt – nicht, was es gibt. Wer sie später
 * ändert, findet alles wieder, und wer sie nie ändert, hat nichts verpasst.
 */

import { ABSICHTEN } from '../../lib/profil';
import type { Absicht } from '../../lib/profil';
import { deskStyle } from '../../lib/textures';

export function Absichtsfrage({ onWahl }: { onWahl: (absicht: Absicht) => void }) {
  return (
    <div
      className="flex min-h-full w-full flex-col items-center justify-center overscroll-contain px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] sm:px-6"
      style={deskStyle}
    >
      <div className="w-full max-w-xl animate-fadeIn">
        <p className="text-center font-serif text-[22px] leading-snug text-paper-300/90 sm:text-[25px]">
          Was möchtest du erschaffen?
        </p>
        <p className="mx-auto mt-3 max-w-[40ch] text-center font-serif text-[13px] italic leading-relaxed text-paper-400/45">
          Daraus ergibt sich, womit dein Buch beginnt – und wie viel davon gleich offenliegt.
        </p>

        <ul className="mt-9 space-y-2">
          {ABSICHTEN.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onWahl(a.id)}
                className="group w-full rounded-[3px] border border-paper-400/15 px-5 py-4 text-left transition-colors hover:border-gild-500/40 hover:bg-gild-400/5 no-tap-highlight"
              >
                {/*
                  Der Satz in der ersten Person steht oben und ist die
                  eigentliche Antwort – „Ich möchte eine Geschichte und ihre
                  Welt erschaffen." Der Name darunter ist nur die Vokabel, die
                  Dragoncore später dafür benutzt. Andersherum wäre es eine
                  Kategorienliste mit Erläuterung.
                */}
                <span className="block font-serif text-[17px] leading-snug text-paper-200 transition-colors group-hover:text-gild-300 sm:text-[18.5px]">
                  {a.satz}
                </span>
                <span className="mt-1.5 block font-serif text-[12.5px] italic leading-relaxed text-paper-400/50">
                  {a.zeile}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-8 max-w-[42ch] text-center font-serif text-[12.5px] italic leading-relaxed text-paper-400/35">
          Das nimmt nichts weg. Alles bleibt da, wo es hingehört – und du kannst es jederzeit
          ändern.
        </p>
      </div>
    </div>
  );
}
