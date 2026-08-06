/**
 * Der Einband.
 *
 * Das Buch liegt geschlossen auf dem Tisch. Nichts blinkt, nichts fordert.
 * Es zeigt nur, was wahr ist: wie dick es geworden ist, welche Kapitel ein
 * Lesezeichen tragen und wo zuletzt aufgehört wurde.
 *
 * Der Rücken wächst mit der Welt – das ist keine Animation, sondern gerechnet
 * aus der Zahl der Seiten. Wer eine Woche lang schreibt, sieht das Buch dicker
 * werden.
 */

import { useState } from 'react';
import type { BookStructure } from '../../lib/book';
import { spineThickness } from '../../lib/book';
import emblem from '../../assets/emblem.png';
import { TEXTURES, deskStyle } from '../../lib/textures';

export function Cover({
  book,
  worldName,
  tagline,
  resumePage,
  resumeLabel,
  onOpen,
}: {
  book: BookStructure;
  worldName: string;
  tagline: string;
  resumePage?: number;
  resumeLabel?: string;
  onOpen: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const thickness = spineThickness(book.totalPages);
  const blockWidth = 10 + thickness * 30;
  const ribbons = book.chapters.slice(0, 8);

  const open = () => {
    if (opening) return;
    setOpening(true);
    // Kurz warten, damit der Einband sichtbar nachgibt, bevor die Seite kommt.
    window.setTimeout(onOpen, 420);
  };

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-10"
      style={deskStyle}
    >
      <div
        className="flex flex-col items-center transition-all duration-500 ease-calm"
        style={{
          transform: opening ? 'scale(1.06)' : 'scale(1)',
          opacity: opening ? 0 : 1,
        }}
      >
        {/* ------------------------------------------------------ Das Buch */}
        <button
          type="button"
          onClick={open}
          aria-label={`${worldName} öffnen`}
          className="group relative no-tap-highlight"
          style={{ perspective: '1800px' }}
        >
          <div
            className="relative transition-transform duration-700 ease-calm group-hover:-translate-y-1"
            style={{ transform: 'rotateY(-13deg) rotateX(5deg)', transformStyle: 'preserve-3d' }}
          >
            {/* Lesezeichen, die oben herausschauen – eines je gefülltem Kapitel */}
            <div className="absolute -top-3 right-8 z-20 flex gap-1.5">
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

            {/* Der Deckel */}
            <div
              className="relative z-10 flex h-[390px] w-[286px] flex-col items-center justify-between rounded-[4px] px-6 py-9 sm:h-[476px] sm:w-[348px] sm:px-8 sm:py-11"
              style={{
                /*
                 * Echtes Leder statt Verlauf. Der dunkle Schleier darüber nimmt
                 * dem Foto die Helligkeit, damit Gold und Titel darauf stehen
                 * können – die Narbung bleibt sichtbar.
                 */
                backgroundImage: `linear-gradient(150deg, rgba(30,22,15,0.32) 0%, rgba(20,15,10,0.52) 55%, rgba(14,10,7,0.68) 100%), url(${TEXTURES.leather})`,
                backgroundSize: 'cover, cover',
                backgroundPosition: 'center, center',
                boxShadow:
                  '0 40px 70px -22px rgba(0,0,0,0.9), inset 0 1px 0 rgba(226,196,120,0.22), inset -14px 0 26px -18px rgba(0,0,0,0.8), inset 0 0 70px rgba(0,0,0,0.3)',
              }}
            >
              {/* Gebrauchsspuren an den Ecken */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[4px]"
                style={{
                  background:
                    'radial-gradient(circle at 4% 3%, rgba(190,160,110,0.16) 0%, transparent 16%), radial-gradient(circle at 97% 96%, rgba(190,160,110,0.13) 0%, transparent 15%)',
                }}
              />
              {/* Goldene Rahmenlinie, wie geprägt */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-[10px] rounded-[2px] border border-gild-500/30"
              />

              <span className="rubric mt-1 text-gild-300/75">Artbook</span>

              {/*
               * Freigestelltes Emblem: kein Kasten, kein Rand. Der doppelte
               * Schatten – dunkel nach unten, golden nach oben – lässt es in
               * das Leder geprägt wirken statt daraufgeklebt.
               */}
              <img
                src={emblem}
                alt=""
                className="w-[124px] sm:w-[158px]"
                style={{
                  filter:
                    'drop-shadow(0 2px 3px rgba(0,0,0,0.85)) drop-shadow(0 -1px 0 rgba(240,215,150,0.28)) drop-shadow(0 0 22px rgba(212,175,55,0.22))',
                }}
              />

              <div className="text-center">
                <p
                  className="font-serif text-[22px] leading-tight tracking-[0.12em] text-gild-300 sm:text-[26px]"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85), 0 0 18px rgba(212,175,55,0.2)' }}
                >
                  {worldName || 'Dragoncore'}
                </p>
                <span aria-hidden className="rule-gild mx-auto mt-2.5 block w-20 opacity-80" />
              </div>
            </div>
          </div>

          {/* Schatten auf dem Tisch */}
          <div
            aria-hidden
            className="absolute -bottom-5 left-1/2 h-8 w-[86%] -translate-x-1/2 rounded-[50%] blur-xl"
            style={{ background: 'rgba(0,0,0,0.6)' }}
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

          <p className="mt-8 font-serif text-[11.5px] tracking-[0.18em] text-paper-400/35">
            {book.totalPages} Seiten · {book.chapters.length}{' '}
            {book.chapters.length === 1 ? 'Kapitel' : 'Kapitel'}
          </p>
        </div>
      </div>
    </div>
  );
}
