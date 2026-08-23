/**
 * Ein Wegweiser: ein Pfeil und ein Satz, die auf etwas zeigen.
 *
 * Er liegt über dem Buch, aber nicht davor – kein dunkler Vorhang, kein
 * Ausschneiden, kein „Klicke hier, um fortzufahren". Das Buch bleibt
 * bedienbar, während er dasteht; wer ihn ignoriert, kommt trotzdem weiter.
 *
 * Gezeichnet wird an der Stelle, an der das Ziel steht. Deshalb misst dieser
 * Bestandteil das Element wirklich aus, statt Positionen zu erraten – und er
 * misst neu, wenn sich das Fenster ändert, weil eine Sprechblase, die neben
 * dem Knopf steht statt darauf, schlimmer ist als keine.
 */

import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/utils';

interface Masse {
  x: number;
  y: number;
  breite: number;
  hoehe: number;
}

/** Wo das Ziel gerade liegt – oder `null`, wenn es hier nicht steht. */
function useMasse(ziel: string): Masse | null {
  const [masse, setMasse] = useState<Masse | null>(null);

  useLayoutEffect(() => {
    let laeuft = true;
    const messen = () => {
      if (!laeuft) return;
      const el = document.querySelector<HTMLElement>(`[data-leitfaden="${ziel}"]`);
      if (!el) {
        setMasse(null);
        return;
      }
      const r = el.getBoundingClientRect();
      /* Unsichtbares zählt nicht: Der Buchsatz zeichnet manche Seite doppelt. */
      if (r.width === 0 || r.height === 0) {
        setMasse(null);
        return;
      }
      setMasse({ x: r.left, y: r.top, breite: r.width, hoehe: r.height });
    };

    /*
     * Einmal jetzt, einmal nach dem Zeichnen, dann bei jeder Bewegung. Der
     * Nachschlag ist nötig, weil Seiten einblenden: Zum Zeitpunkt des ersten
     * Messens steht der Knopf oft noch woanders.
     */
    messen();
    const nach = window.setTimeout(messen, 420);
    window.addEventListener('resize', messen);
    window.addEventListener('scroll', messen, true);
    return () => {
      laeuft = false;
      window.clearTimeout(nach);
      window.removeEventListener('resize', messen);
      window.removeEventListener('scroll', messen, true);
    };
  }, [ziel]);

  return masse;
}

export function Wegweiser({
  ziel,
  text,
  onVerstanden,
  onGenug,
}: {
  ziel: string;
  text: string;
  onVerstanden: () => void;
  /** Den Leitfaden ganz abstellen. */
  onGenug: () => void;
}) {
  const masse = useMasse(ziel);
  const [da, setDa] = useState(false);

  /* Erst nach einem Moment auftauchen – sonst springt er mit der Seite mit. */
  useEffect(() => {
    const t = window.setTimeout(() => setDa(true), 600);
    return () => window.clearTimeout(t);
  }, [ziel]);

  if (!masse || !da) return null;

  const mitte = masse.x + masse.breite / 2;
  /* Unter dem Ziel, außer es liegt in der unteren Hälfte – dann darüber. */
  const unten = masse.y + masse.hoehe < window.innerHeight * 0.55;
  const breite = Math.min(280, window.innerWidth - 32);
  /* Am Rand einklappen, damit die Blase nie über die Kante ragt. */
  const links = Math.max(16, Math.min(mitte - breite / 2, window.innerWidth - breite - 16));
  const zeigerX = Math.max(links + 14, Math.min(mitte, links + breite - 14));

  return createPortal(
    <>
      {/*
        Der Ring um das Ziel. Er hebt hervor, ohne zu verdecken – und er
        nimmt keine Berührungen an, damit der Knopf darunter erreichbar
        bleibt.
      */}
      <span
        aria-hidden
        className="pointer-events-none fixed z-[60] rounded-full ring-2 ring-gild-500/60 animate-fadeIn"
        style={{
          left: masse.x - 5,
          top: masse.y - 5,
          width: masse.breite + 10,
          height: masse.hoehe + 10,
        }}
      />

      <div
        role="note"
        aria-label="Hinweis"
        className={cx(
          'fixed z-[61] animate-fadeIn rounded-[3px] border border-gild-500/35 bg-cream-50',
          'px-4 py-3 shadow-[0_16px_40px_-16px_rgba(60,44,26,0.55)]',
        )}
        style={{
          left: links,
          width: breite,
          ...(unten
            ? { top: masse.y + masse.hoehe + 14 }
            : { bottom: window.innerHeight - masse.y + 14 }),
        }}
      >
        {/* Die Spitze, die auf das Ziel zeigt. */}
        <span
          aria-hidden
          className={cx(
            'absolute h-3 w-3 rotate-45 border-gild-500/35 bg-cream-50',
            unten ? '-top-[7px] border-l border-t' : '-bottom-[7px] border-b border-r',
          )}
          style={{ left: zeigerX - links - 6 }}
        />

        <p className="font-serif text-[14.5px] leading-relaxed text-ink">{text}</p>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onVerstanden}
            className="inline-flex min-h-[36px] items-center rounded-full border border-gild-500/40 px-4 font-serif text-[13.5px] text-gold transition-colors hover:bg-gild-400/10 no-tap-highlight"
          >
            Verstanden
          </button>
          <button
            type="button"
            onClick={onGenug}
            className="min-h-[36px] font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-ink no-tap-highlight"
          >
            Nicht mehr zeigen
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
