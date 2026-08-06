/**
 * Die Doppelseite.
 *
 * Auf dem Schreibtisch liegen zwei Seiten nebeneinander, auf dem iPhone eine.
 * Das ist keine Notlösung – so machen es Lese-Apps seit jeher, weil eine
 * Doppelseite auf einer Handbreite unlesbar wäre.
 *
 * Ränder sind hier bewusst groß. Sie sind der Grund, warum eine Buchseite ruhig
 * wirkt und ein Bildschirm nicht.
 */

import type { ReactNode } from 'react';
import { cx } from '../../lib/utils';

export function Spread({
  left,
  right,
  pageLeft,
  wear = 0,
}: {
  left: ReactNode;
  right: ReactNode;
  pageLeft: number;
  /** 0 = frisches Papier, 1 = oft gelesen */
  wear?: number;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-1 justify-center">
      {/* Am Schreibtisch: zwei Seiten nebeneinander. */}
      <Leaf side="left" page={pageLeft} wear={wear} className="hidden lg:flex">
        {left}
      </Leaf>
      <Leaf side="right" page={pageLeft + 1} wear={wear} className="hidden lg:flex">
        {right}
      </Leaf>

      {/* In der Hand: eine Seite, beide Hälften untereinander gelesen. */}
      <Leaf side="single" page={pageLeft} wear={wear} className="flex lg:hidden">
        {left}
        {right}
      </Leaf>
    </div>
  );
}

/**
 * Eine einzelne Seite: Papier, Falz, Seitenzahl.
 *
 * Die Abnutzung legt einen kaum sichtbaren warmen Schleier über oft gelesene
 * Seiten. Man bemerkt sie nicht bewusst – man merkt nur, dass das Buch benutzt
 * aussieht.
 */
function Leaf({
  children,
  side,
  page,
  wear,
  className,
}: {
  children: ReactNode;
  side: 'left' | 'right' | 'single';
  page: number;
  wear: number;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'paper-sheet relative flex min-h-0 w-full max-w-[750px] flex-col',
        side === 'left' && 'gutter-right',
        side === 'right' && 'gutter-left',
        className,
      )}
    >
      {wear > 0.02 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(75% 60% at 50% 50%, transparent 40%, rgba(150, 116, 62, 0.16) 100%)',
            opacity: wear,
          }}
        />
      )}

      <div className="scroll-slim relative flex-1 overflow-y-auto overscroll-y-contain">
        <div className="mx-auto w-full max-w-[620px] px-7 pb-4 pt-9 sm:px-12 sm:pt-14 lg:px-14">
          {children}
        </div>
      </div>

      <div className="relative shrink-0 px-7 pb-4 pt-1 sm:px-12 lg:px-14">
        <span
          className={cx(
            'block font-serif text-[12px] tracking-[0.18em] text-ink-faint/70',
            side === 'left' ? 'text-left' : 'text-right',
          )}
        >
          {page}
        </span>
      </div>
    </div>
  );
}

/**
 * Eine ganzseitige Tafel – Bild randlos, Bildunterschrift darunter.
 * In Kunstbüchern trägt die Tafel die Seite, nicht der Text.
 */
export function Plate({
  children,
  caption,
  rubric,
}: {
  children: ReactNode;
  caption?: string;
  rubric?: string;
}) {
  return (
    <figure className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden rounded-[3px] bg-paper-300/50 shadow-[0_2px_18px_-8px_rgba(60,44,26,0.5)]">
        {children}
      </div>
      {(caption || rubric) && (
        <figcaption className="mt-3 shrink-0">
          {rubric && <p className="rubric mb-0.5">{rubric}</p>}
          {caption && (
            <p className="font-serif text-[13.5px] italic leading-snug text-ink-muted">{caption}</p>
          )}
        </figcaption>
      )}
    </figure>
  );
}
