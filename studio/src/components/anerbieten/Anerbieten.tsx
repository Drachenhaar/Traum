/**
 * Wie Dragoncore spricht.
 *
 * Ein Zettel, der im Buch liegt. Nicht ein Fenster, nicht ein Balken, nicht
 * eine Meldung – die drei Formen, die eine Software normalerweise wählt, und
 * alle drei wären hier falsch:
 *
 *   Ein **Fenster** verlangt eine Antwort, bevor es weitergeht. Aber niemand
 *   *muss* wissen, dass über Arin viel entstanden ist.
 *
 *   Ein **Balken** oben behauptet Wichtigkeit. Das hier ist nicht wichtig,
 *   es ist interessant, und der Unterschied ist der ganze Ton.
 *
 *   Eine **Meldung**, die von selbst verschwindet, zwingt zum schnellen
 *   Lesen. Wer gerade etwas anderes liest, hat sie verpasst und weiß nicht,
 *   was er verpasst hat.
 *
 * Also ein Zettel: unten, ruhig, wartend. Er geht nicht von selbst weg, und
 * er hält nichts auf. Drei Antworten, und alle drei sind gleichwertig gesetzt
 * – „Später" ist keine zweite Wahl, sondern eine Antwort.
 *
 * Warnungen sehen fast genauso aus. Nur ein Wort steht davor und ein Strich
 * ist etwas kräftiger. Es gibt keine roten Flächen: Auch ein Ende vor seinem
 * Anfang ist kein Unglück, sondern ein Zustand, den jemand ansehen sollte.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Anerbieten as AnerbietenDaten } from '../../lib/anerbieten/anerbieten';
import type { Antwort } from '../../lib/anerbieten/gedaechtnis';

export function AnerbietenZettel({
  anerbieten,
  ziel,
  zielLabel,
  onAntwort,
}: {
  anerbieten: AnerbietenDaten;
  /** Wohin „Ansehen" führt. Ohne Ziel gibt es kein Ansehen. */
  ziel?: string;
  zielLabel: string;
  onAntwort: (a: Antwort) => void;
}) {
  const navigate = useNavigate();
  const [belegeOffen, setBelegeOffen] = useState(false);
  const { beobachtung, stufe } = anerbieten;

  /*
   * Einblenden, nicht erscheinen.
   *
   * Ein Zettel, der schlagartig da ist, zieht den Blick vom Text weg. Eine
   * Sekunde weiches Aufblenden merkt man am Rand des Gesichtsfelds und nicht
   * mitten im Satz.
   */
  const [da, setDa] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setDa(true), 30);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      role="note"
      /* Damit der Zettel sich nicht selbst fuer eine fremde Stimme haelt. */
      data-anerbieten
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <div
        className={[
          'pointer-events-auto w-full max-w-[34rem] rounded-[3px] border bg-cream-50/95 px-5 py-4 shadow-[0_8px_40px_-12px_rgba(30,22,15,0.6)] backdrop-blur-sm transition-all duration-700',
          stufe === 'warnung' ? 'border-gild-600/50' : 'border-paper-400/40',
          da ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        ].join(' ')}
      >
        {stufe === 'warnung' && <p className="rubric mb-1.5">Etwas stimmt so nicht</p>}

        <p className="font-serif text-[15.5px] leading-relaxed text-ink">{beobachtung.text}</p>

        {/*
          Warum sieht Dragoncore das?

          Zugeklappt, aber immer da. Wer es nie aufklappt, wird nicht belaestigt;
          wer einmal misstraut, findet auf der Stelle die Seiten, aus denen der
          Satz entstanden ist – und kann sie anklicken. Keine Deutung ohne
          Belege ist eine Bedingung und keine Absichtserklaerung.
        */}
        <button
          type="button"
          onClick={() => setBelegeOffen((v) => !v)}
          className="mt-2 min-h-[36px] font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
        >
          {belegeOffen ? 'Weniger' : 'Woran liegt das?'}
        </button>

        {belegeOffen && (
          <ul className="mb-1 mt-1 space-y-1">
            {beobachtung.belege.map((b) => (
              <li key={b.entryId}>
                <button
                  type="button"
                  onClick={() => navigate(`/eintrag/${b.entryId}`)}
                  className="group flex min-h-[32px] w-full items-baseline gap-2 text-left no-tap-highlight"
                >
                  <span className="text-gild-600/70">·</span>
                  <span className="font-serif text-[13px] leading-snug text-ink-muted transition-colors group-hover:text-gild-600">
                    {b.warum}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
          {ziel && (
            <button
              type="button"
              onClick={() => {
                onAntwort('geoeffnet');
                navigate(ziel);
              }}
              className="inline-flex min-h-[40px] items-center gap-1 font-serif text-[14.5px] text-gild-600 transition-colors hover:text-gild-500 no-tap-highlight"
            >
              {zielLabel} <ChevronRight size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onAntwort('spaeter')}
            className="min-h-[40px] font-serif text-[14px] italic text-ink-faint transition-colors hover:text-ink-muted no-tap-highlight"
          >
            Später
          </button>
          <button
            type="button"
            onClick={() => onAntwort('nie')}
            className="min-h-[40px] font-serif text-[14px] italic text-ink-faint/70 transition-colors hover:text-ink-muted no-tap-highlight"
          >
            Nicht mehr hierzu
          </button>
        </div>
      </div>
    </div>
  );
}
