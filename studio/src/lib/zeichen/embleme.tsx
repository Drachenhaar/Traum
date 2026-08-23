/**
 * Die Drachenzeichen.
 *
 * Im Referenzbild sitzen sie an drei Stellen: oben und unten an der
 * Registerkante als geprägte Marken, und einmal sehr groß und sehr schwach
 * hinter den Listen als Wasserzeichen.
 *
 * ---
 *
 * **Vier Anläufe, und was jeder gezeigt hat.**
 *
 * Ein Drache ist nicht dasselbe wie ein Herz oder ein Buch. Die Zeichen in
 * `zeichen.tsx` sind Strichzeichnungen, und das geht dort auf, weil ein Herz
 * aus zwei Bögen besteht. Ein Lebewesen besteht nicht aus zwei Bögen.
 *
 *   1. Strichzeichnung, Kopf im Profil mit Nüstern, Auge, Kamm.
 *      Bei 48 hübsch, bei 26 ein grauer Fleck. Gerendert sah es aus wie eine
 *      eingerollte Ranke mit zwei Fühlern.
 *   2. Gefüllte Kopfsilhouette.
 *      Las sich als Vogel. Ein Schnabel und ein Horn ergeben einen Greifvogel.
 *   3. Wyvern mit gespreizten Flügeln.
 *      Bei jeder Größe ein stachliger Klecks. Zu viele Spitzen auf zu wenig
 *      Fläche.
 *   4. **Windung mit Kopf.** Ein Leib, der sich einrollt, und ein gehörnter
 *      Kopf, der über die eigene Windung schaut. Das trägt.
 *
 * Der Weg dahin ging nur über das Ansehen. Keine dieser Erkenntnisse stand in
 * den Zahlen; jede stand auf einem Probebogen mit denselben vier Größen
 * nebeneinander.
 *
 * ---
 *
 * **Die Mindestgröße ist eine Eigenschaft des Zeichens, keine Einstellung.**
 *
 * Auch der vierte Anlauf trägt nicht bei vierundzwanzig Punkten – dort wird
 * die Windung zu einem Klecks mit einer Beule. Er trägt ab etwa
 * **zweiunddreißig**.
 *
 * Das ist keine Kleinigkeit, sondern bestimmt die Registerkante: Nicht das
 * Zeichen wird geschrumpft, bis es in die Kante passt, sondern die Kante ist
 * breit genug für das Zeichen. Ein Wappen, das man nicht erkennt, ist kein
 * Wappen mehr, sondern ein Fleck – und ein Fleck an einer Buchkante sieht
 * nach Druckfehler aus.
 */

import type { SVGProps } from 'react';

export interface Emblemeigenschaften extends SVGProps<SVGSVGElement> {
  groesse?: number;
}

/** Ab hier ist die Windung als Wesen zu erkennen. Siehe oben. */
export const DRACHE_MINDESTGROESSE = 32;

/*
 * Der Leib und der Kopf als zwei Pfade.
 *
 * Getrennt, weil sie sich überlappen dürfen: Der Kopf liegt *über* der
 * äußersten Windung, und genau diese Überlappung macht aus einem Ring ein
 * Tier, das sich um sich selbst gelegt hat.
 */
const LEIB =
  'M22 8c11-1 21 7 22 18 1 8-4 15-11 17 5-4 8-10 7-16-1-8-8-14-16-13-7 1-12 7-11 13 ' +
  '.5 5 5 8 10 7 3-.4 5-3 4.6-5.6-.3-2-2.3-3.4-4.3-3.2 4-1.6 8 1 8.5 5 .6 5-3 9.6-9 10.3' +
  '-8 1-15-4.6-16-12.6-.7-6 2-11.4 6.6-14.6C6 17 2 24.6 3 33c.7 6 4.3 11.4 9.6 14' +
  'C4.6 44.6-.6 37 .5 28.6 2 17.6 11 9 22 8z';

const KOPF =
  'M30 2c4-2 9-1 12 2-3 0-6 1-8 3 3 2 4 5 4 8-2-3-5-5-9-5-3 0-6 2-7 4-1-4 1-8 4-10' +
  '-2-1-4-1-6 0 2-2 6-3 10-2z';

/**
 * Die Drachenmarke – das Zeichen an den Enden der Registerkante.
 *
 * Unter `DRACHE_MINDESTGROESSE` sollte sie nicht gesetzt werden; der Wert
 * steht daneben, damit die Kante sich danach richten kann.
 */
export function Drachenmarke({ groesse = 34, ...rest }: Emblemeigenschaften) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden
      focusable="false"
      {...rest}
    >
      <path d={LEIB} transform="translate(2 2) scale(.94)" />
      <path d={KOPF} />
    </svg>
  );
}

/**
 * Das Wasserzeichen hinter den Listen.
 *
 * Dasselbe Zeichen, groß und bei wenigen Prozent Deckkraft. Der Sinn ist
 * nicht, dass jemand einen Drachen erkennt, sondern dass eine große dunkle
 * Fläche hinter dem Text nicht leer wirkt – dieselbe Aufgabe, die auf dem
 * Grund der Seite das Korn übernimmt.
 */
export function Drachenschatten({ groesse = 170, ...rest }: Emblemeigenschaften) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden
      focusable="false"
      {...rest}
    >
      <path d={LEIB} transform="translate(2 2) scale(.94)" />
      <path d={KOPF} />
    </svg>
  );
}

/**
 * Die Buchmarke – ein aufgeschlagener Band mit einer Prägung darauf.
 *
 * Sie steht dort, wo im Referenzbild das gemalte Buch liegt, **solange kein
 * Bild eingelegt ist**. Kein Ersatz für die Illustration und auch nicht als
 * solcher gedacht: Eine Prägung an der Stelle einer Malerei ist etwas
 * Eigenes, und sie sagt „hier gehört ein Bild hin", ohne kaputt auszusehen.
 *
 * Anders als der Drache ist sie beim ersten Anlauf gelungen, und der Grund
 * ist derselbe wie oben: Ein aufgeschlagenes Buch *besteht* aus zwei Bögen.
 */
export function Buchmarke({ groesse = 64, ...rest }: Emblemeigenschaften) {
  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      <path d="M24 15c-3-2-7-3-11-3H6v24h7c4 0 8 1 11 3" />
      <path d="M24 15c3-2 7-3 11-3h7v24h-7c-4 0-8 1-11 3" />
      <path d="M24 15v24" />
      <path d="M32 24l2.5-2 2.5 2-2.5 2z" />
    </svg>
  );
}
