/**
 * Der Einband.
 *
 * Das Buch liegt geschlossen auf dem Tisch. Nichts blinkt, nichts fordert.
 * Es zeigt nur, was wahr ist: wie dick es geworden ist, welche Kapitel ein
 * Lesezeichen tragen und wo zuletzt aufgehört wurde.
 *
 * Beim Antippen schlägt es auf – der Deckel schwingt um den Rücken, darunter
 * kommt Papier zum Vorschein. Weil aus dem Vorderdeckel dabei die linke Seite
 * wird, rückt das Buch nach rechts; genau das tut ein echtes Buch auch, und es
 * verhindert nebenbei, dass der Deckel auf schmalen Geräten aus dem Bild
 * schwingt.
 *
 * Die Bewegung ist bewusst schwer: langsam los, kein Nachfedern, kein Curl.
 */

import { useEffect, useRef, useState } from 'react';
import type { BookStructure } from '../../lib/book';
import { spineThickness } from '../../lib/book';
import type { BookIdentity } from '../../types';
import { deskStyle } from '../../lib/textures';
import { coverSurface, CoverFace } from './CoverBoard';
import { cx } from '../../lib/utils';

/** Zuerst richtet sich das Buch gerade, dann öffnet der Deckel. */
const STRAIGHTEN_MS = 300;
const SWING_MS = 900;

type Phase = 'zu' | 'richtet' | 'oeffnet';

export function Cover({
  book,
  identity,
  tagline,
  resumePage,
  resumeLabel,
  onOpen,
  onRegal,
}: {
  book: BookStructure;
  /** Der Einband, wie ihn der Verfasser erschaffen hat. */
  identity: BookIdentity;
  tagline: string;
  resumePage?: number;
  resumeLabel?: string;
  onOpen: () => void;
  /**
   * Zurueck ins Regal.
   *
   * Fehlt, wenn dieses Geraet nur dieses eine Buch kennt: Ein Regal mit einem
   * Band darin ist kein Regal, und ein Verweis darauf waere ein Umweg zu
   * nichts. Erst ab dem zweiten Buch steht die Zeile hier.
   */
  onRegal?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('zu');
  const timers = useRef<number[]>([]);

  const thickness = spineThickness(book.totalPages);
  const blockWidth = 10 + thickness * 30;
  const ribbons = book.chapters.slice(0, 8);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const open = () => {
    if (phase !== 'zu') return;

    /* Wer Bewegung reduziert haben möchte, bekommt sie nicht aufgezwungen. */
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      onOpen();
      return;
    }

    setPhase('richtet');
    timers.current.push(window.setTimeout(() => setPhase('oeffnet'), STRAIGHTEN_MS));
    timers.current.push(window.setTimeout(onOpen, STRAIGHTEN_MS + SWING_MS));
  };

  const opening = phase === 'oeffnet';

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-10"
      style={deskStyle}
    >
      <div
        className="flex flex-col items-center"
        style={{
          /* Ganz zum Schluss ausblenden, damit der Übergang zur Seite nahtlos ist. */
          opacity: opening ? 0 : 1,
          transition: `opacity 220ms ease-in ${SWING_MS - 200}ms`,
        }}
      >
        {/* ------------------------------------------------------ Das Buch */}
        <button
          type="button"
          onClick={open}
          aria-label={`${identity.title || 'Das Buch'} aufschlagen`}
          className="group relative no-tap-highlight"
          style={{ perspective: '2200px' }}
        >
          {/* Geschlossen angeschnitten, dann gerade, dann aufgeschlagen und
              zur Seite gerückt – die Stellungen stehen in index.css, weil sie
              auf schmalen Geräten zusätzlich verkleinert werden müssen. */}
          <div
            className={cx(
              'book-stage relative',
              phase === 'zu' && 'book-zu',
              phase === 'richtet' && 'book-gerade',
              opening && 'book-offen',
            )}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              className="relative h-[390px] w-[286px] sm:h-[476px] sm:w-[348px]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Lesezeichen – sie gehören zum Buchblock, nicht zum Deckel */}
              <div className="absolute -top-3 right-8 z-30 flex gap-1.5">
                {ribbons.map(({ chapter, complete }) => (
                  <span
                    key={chapter.id}
                    className="block h-4 w-[7px] rounded-t-[2px]"
                    style={{
                      background: complete ? '#D4AF37' : chapter.ribbon,
                      boxShadow: complete ? '0 0 7px rgba(212,175,55,0.55)' : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Der Buchblock: sichtbare Seitenkanten an der rechten Kante */}
              <div
                aria-hidden
                className="absolute right-0 top-[7px] z-0 h-[calc(100%-14px)] translate-x-[calc(100%-3px)] rounded-r-[2px]"
                style={{
                  width: blockWidth,
                  background:
                    'repeating-linear-gradient(90deg, #cbbc9c 0px, #e6dbc0 1.5px, #bfae8c 2.5px, #ddd1b4 4px)',
                  boxShadow:
                    'inset -8px 0 12px -7px rgba(0,0,0,0.65), inset 0 8px 10px -8px rgba(0,0,0,0.4), inset 0 -8px 10px -8px rgba(0,0,0,0.4)',
                }}
              />

              {/* Die erste Seite – liegt unter dem Deckel und wird beim Öffnen frei */}
              <div
                aria-hidden
                className="paper-sheet absolute inset-0 z-[1] rounded-[3px]"
                style={{ boxShadow: 'inset 14px 0 26px -18px rgba(60,44,26,0.75)' }}
              />

              {/* --------------------------------------------------- Der Deckel */}
              <div
                className="absolute inset-0 z-10"
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: 'left center',
                  transform: `rotateY(${opening ? -168 : 0}deg)`,
                  transition: `transform ${SWING_MS}ms cubic-bezier(0.42, 0, 0.22, 1)`,
                }}
              >
                {/*
                  Aussenseite: der Einband, den der Verfasser erschaffen hat.
                  Material, Farbe, Zeichen und Titel kommen aus derselben
                  Quelle wie bei der Erschaffung – das Buch, das man hier
                  aufschlaegt, ist genau das, das man dort gebunden hat.
                */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-[4px]"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    ...coverSurface(identity),
                    boxShadow:
                      '0 40px 70px -22px rgba(0,0,0,0.9), inset 0 1px 0 rgba(226,196,120,0.22), inset -14px 0 26px -18px rgba(0,0,0,0.8), inset 0 0 70px rgba(0,0,0,0.3)',
                    /* Der Deckel dreht sich vom Licht weg und wird dunkler. */
                    filter: opening ? 'brightness(0.55)' : 'brightness(1)',
                    transition: `filter ${SWING_MS}ms cubic-bezier(0.42, 0, 0.22, 1)`,
                  }}
                >
                  <CoverFace identity={identity} />
                </div>

                {/* Innenseite des Deckels: das Vorsatzpapier */}
                <div
                  aria-hidden
                  className="paper-sheet absolute inset-0 rounded-[4px]"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    boxShadow: 'inset -16px 0 30px -18px rgba(60,44,26,0.8)',
                    filter: 'brightness(0.86)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Schatten auf dem Tisch */}
          <div
            aria-hidden
            className="absolute -bottom-5 left-1/2 h-8 w-[86%] -translate-x-1/2 rounded-[50%] blur-xl transition-opacity duration-700"
            style={{ background: 'rgba(0,0,0,0.6)', opacity: opening ? 0.35 : 1 }}
          />
        </button>

        {/* --------------------------------------------------------- Text */}
        <div className="mt-14 max-w-md text-center">
          <p className="font-serif text-[13px] italic leading-relaxed text-paper-400/70">
            {tagline || 'Ein lebendiges Buch. Deine Welt. Deine Geschichte.'}
          </p>

          <button
            type="button"
            onClick={open}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2.5 rounded-full border border-gild-500/35 px-6 font-serif text-[15px] text-gild-300 transition-colors duration-300 hover:border-gild-400/70 hover:text-gild-300 no-tap-highlight"
          >
            {resumePage ? `Weiterlesen auf Seite ${resumePage}` : 'Das Buch aufschlagen'}
          </button>

          {resumeLabel && (
            <p className="mt-3 font-serif text-[12.5px] italic text-paper-400/50">{resumeLabel}</p>
          )}

          {onRegal && (
            <div className="mt-7">
              <button
                type="button"
                onClick={onRegal}
                className="min-h-[40px] font-serif text-[13px] italic text-paper-400/45 transition-colors hover:text-gild-400 no-tap-highlight"
              >
                Deine anderen Bücher
              </button>
            </div>
          )}

          <p className="mt-8 font-serif text-[11.5px] tracking-[0.18em] text-paper-400/35">
            {book.totalPages} Seiten · {book.chapters.length} Kapitel
          </p>
        </div>
      </div>
    </div>
  );
}
