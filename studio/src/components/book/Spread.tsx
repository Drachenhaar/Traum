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
/**
 * Wie breit eine Buchspalte sein darf.
 *
 * Gemessen wurden in Chromium mit der Schriftkaskade des Buches **0,408 em je
 * Zeichen**. Der Lesetext steht auf 17 Punkten (die Anmutung darf ihn
 * verschieben, das ist die Wahl des Verfassers). Damit gilt:
 *
 *     620 px  →  89 Zeichen     zu viel
 *     480 px  →  69 Zeichen     die Obergrenze aus dem Auftrag
 *
 * Deshalb 480 und nicht 620. Auf einem Telefon ist die Seite ohnehin
 * schmaler, und die Zahl tut dort nichts – sie greift am Schreibtisch, wo
 * sonst die sehr lange Zeile entsteht, aus der das Auge nicht mehr an den
 * richtigen Anfang zurueckfindet.
 *
 * **Die Zahl ist der Kasten, nicht die Spalte.** Die Stege liegen innerhalb
 * der Hoechstbreite – wer hier 480 einsetzt, bekommt eine Spalte von 412 und
 * damit 59 Zeichen. Am Schreibtisch sind die Stege zusammen 112 Punkte breit
 * (16 + 12 mal vier), also traegt der Kasten 480 + 112.
 */
export const SPALTE = 592;

/**
 * Die Stege einer Seite – innen breiter als aussen.
 *
 * Steht hier und wird ausgefuehrt, statt in zwei Dateien abgeschrieben zu
 * werden. Der Anlass ist der Fehler, den es sonst gaebe – und den es schon
 * gab: `AppendixSheet` baute sein eigenes Blatt mit 980 Punkten Spalte und
 * gleichen Raendern. Das sind 141 Zeichen je Zeile. Niemandem faellt so
 * etwas auf, weil es nicht falsch *aussieht*; es liest sich nur schlecht.
 *
 * `single` ist die Telefonseite und die Anhangseite: eine einzelne Seite,
 * deren Falz links liegt.
 */
export function stege(side: 'left' | 'right' | 'single'): string {
  return side === 'left'
    ? 'pl-7 pr-10 sm:pl-12 sm:pr-16'
    : 'pl-10 pr-7 sm:pl-16 sm:pr-12';
}

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

      {/*
        Der Satzspiegel – und warum er hier steht und nicht auf jeder Seite.

        Hier stand eine Web-Mitte: gleiche Raender links und rechts, ein
        schmaler Fusssteg, und eine Spalte von 620 Punkten. Gemessen sind das
        neunundachtzig Zeichen je Zeile – zwanzig mehr, als ein Buch je
        zulaesst. Genau das war der Grund, warum das Buch nach der ganzen
        Setzerei „aussah wie vorher": Die Setzerei kam nie auf den Buchseiten
        an, es gab dort keine einzige `satz-`Klasse.

        `Leaf` ist der Rahmen der geblaetterten Seiten: Eintrag, Kapitel,
        Inhalt, Vorwort, Register.

        **Nicht aller Seiten.** Genau das habe ich beim ersten Mal behauptet,
        ohne nachzusehen: Die Anhangsblaetter (`AppendixSheet`) bauen ihr Blatt
        selbst – eigenes Papier, eigener Scrollbereich – und gingen mit 980
        Punkten Spalte an `Leaf` vorbei. Deshalb sind `SPALTE` und `stege`
        ausgelagert und werden dort ausgefuehrt statt abgeschrieben.

        Drei Dinge aendern sich:

        1. **Der Innensteg ist breiter als der Aussensteg.** `Leaf` weiss als
           einziges Bauteil, ob es eine linke oder rechte Seite ist – und nur
           wer das weiss, kann den Falz beruecksichtigen. Auf dem Telefon gibt
           es nur eine Seite; dort liegt der Falz links.
        2. **Der Fusssteg ist der groesste.** Ohne Stand kippt der Text aus
           dem Blatt.
        3. **Die Zeile wird begrenzt** – siehe `SPALTE` unten.
      */}
      <div className="scroll-slim relative flex-1 overflow-y-auto overscroll-y-contain">
        <div
          className={cx(
            'mx-auto w-full pt-9 sm:pt-14',
            /* Innen breiter als aussen – der Falz frisst Papier. */
            stege(side),
          )}
          style={{ maxWidth: SPALTE, paddingBottom: 'calc(var(--satz-raster) * 2)' }}
        >
          {children}
        </div>
      </div>

      {/*
        Die Seitenzahl steht **aussen**, nicht in der Mitte.

        Im aufgeschlagenen Buch liegen die Zahlen an den Schnittkanten, weil
        man dort blaettert. `side` weiss, welche Kante das ist.
      */}
      <div className="relative shrink-0 px-7 pt-1 sm:px-12 lg:px-14" style={{ paddingBottom: 'calc(var(--satz-raster) * 0.75)' }}>
        <span
          className={cx(
            'satz-seitenzahl block text-ink-faint/70',
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
      <div className="relative flex-1 overflow-hidden rounded-[3px] bg-cream-300 shadow-[0_2px_18px_-8px_rgba(60,44,26,0.5)]">
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
