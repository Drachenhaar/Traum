/**
 * Das Kapitelzeichen – Navigation, die zusammengefaltet auf dem Tisch liegt.
 *
 * Eine dauerhafte Kapitelleiste am linken Rand waere die naheliegende Loesung
 * und die falsche: Sie nimmt auf einem Telefon ein Drittel der Breite, und sie
 * steht auch dann da, wenn niemand navigieren will – also fast immer, denn wer
 * schreibt, schreibt.
 *
 * Stattdessen ein Lesebaendchen. Antippen faechert die Kapitel auf, Antippen
 * springt, danach faltet sich alles wieder zusammen.
 */

import { useEffect, useRef } from 'react';
import { Bookmark, Plus } from 'lucide-react';
import type { Entry } from '../../types';
import { roemisch, szeneWoerter, type RomanBaum } from '../../lib/roman/struktur';
import { cx } from '../../lib/utils';

export function Kapitelzeichen({
  baum,
  aktiveSzeneId,
  offen,
  onOeffnen,
  onSchliessen,
  onSpringe,
  onNeueSzene,
}: {
  baum: RomanBaum;
  aktiveSzeneId?: string;
  offen: boolean;
  onOeffnen: () => void;
  onSchliessen: () => void;
  onSpringe: (szeneId: string) => void;
  onNeueSzene?: (kapitelId: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);

  /* Aussen tippen faltet zusammen – wie eine Karte, die man weglegt. */
  useEffect(() => {
    if (!offen) return;
    const weg = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) onSchliessen();
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSchliessen();
    };
    /* Erst im naechsten Zug lauschen, sonst schliesst der oeffnende Tipp gleich wieder. */
    const id = window.setTimeout(() => window.addEventListener('pointerdown', weg), 0);
    window.addEventListener('keydown', taste);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('pointerdown', weg);
      window.removeEventListener('keydown', taste);
    };
  }, [offen, onSchliessen]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={offen ? onSchliessen : onOeffnen}
        aria-expanded={offen}
        aria-label="Kapitel"
        className={cx(
          'grid h-10 w-10 place-items-center transition-colors no-tap-highlight',
          offen ? 'text-gild-500' : 'text-ink-faint/45 hover:text-gild-500',
        )}
      >
        <Bookmark size={17} className={offen ? 'fill-current' : ''} />
      </button>

      {offen && (
        <div
          className={cx(
            'absolute left-1/2 top-full z-30 mt-1 w-[min(21rem,calc(100vw-2rem))] -translate-x-1/2',
            'max-h-[min(70vh,32rem)] overflow-y-auto scroll-slim rounded-[3px]',
            'border border-paper-300/80 bg-cream-50/97 px-1 py-2 shadow-[0_18px_44px_-18px_rgba(60,44,26,0.5)]',
            'animate-fadeIn backdrop-blur-[1px]',
          )}
        >
          {baum.kapitel.length === 0 && baum.lose.length === 0 && (
            <p className="px-4 py-6 text-center font-serif text-[14px] italic leading-relaxed text-ink-faint">
              Dieser Roman hat noch keine Kapitel.
            </p>
          )}

          {baum.kapitel.map(({ kapitel, szenen }, i) => (
            <Abteilung
              key={kapitel.id}
              titel={kapitel.title}
              zahl={roemisch(i + 1)}
              szenen={szenen}
              aktiveSzeneId={aktiveSzeneId}
              onSpringe={onSpringe}
              onNeueSzene={onNeueSzene && (() => onNeueSzene(kapitel.id))}
            />
          ))}

          {baum.lose.length > 0 && (
            <Abteilung
              titel="Ohne Kapitel"
              zahl=""
              szenen={baum.lose}
              aktiveSzeneId={aktiveSzeneId}
              onSpringe={onSpringe}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Abteilung({
  titel,
  zahl,
  szenen,
  aktiveSzeneId,
  onSpringe,
  onNeueSzene,
}: {
  titel: string;
  zahl: string;
  szenen: Entry[];
  aktiveSzeneId?: string;
  onSpringe: (id: string) => void;
  onNeueSzene?: () => void;
}) {
  return (
    <section className="mb-1 last:mb-0">
      <div className="flex items-baseline gap-2 px-3 pb-1 pt-2">
        {zahl && <span className="rubric shrink-0">{zahl}</span>}
        <span className="min-w-0 flex-1 truncate font-serif text-[15px] text-ink">{titel}</span>
        {onNeueSzene && (
          <button
            type="button"
            onClick={onNeueSzene}
            aria-label={`Szene in ${titel} anlegen`}
            className="grid h-7 w-7 shrink-0 place-items-center text-ink-faint/40 transition-colors hover:text-gild-500 no-tap-highlight"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {szenen.length === 0 ? (
        <p className="px-3 pb-2 font-serif text-[13px] italic text-ink-faint/70">
          Noch keine Szene.
        </p>
      ) : (
        szenen.map((szene) => {
          const aktiv = szene.id === aktiveSzeneId;
          const w = szeneWoerter(szene);
          return (
            <button
              key={szene.id}
              type="button"
              onClick={() => onSpringe(szene.id)}
              className={cx(
                'flex min-h-[38px] w-full items-baseline gap-2 rounded-[2px] px-3 py-1.5 text-left',
                'transition-colors no-tap-highlight',
                aktiv ? 'bg-gild-400/12' : 'hover:bg-paper-200/60',
              )}
            >
              <span
                aria-hidden
                className={cx(
                  'mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full',
                  aktiv ? 'bg-gild-500' : 'bg-ink-faint/25',
                )}
              />
              <span
                className={cx(
                  'min-w-0 flex-1 truncate font-serif text-[14px]',
                  aktiv ? 'text-ink' : 'text-ink-muted',
                )}
              >
                {szene.title}
              </span>
              {w > 0 && (
                <span className="shrink-0 text-[11px] tabular-nums text-ink-faint/55">{w}</span>
              )}
            </button>
          );
        })
      )}
    </section>
  );
}
