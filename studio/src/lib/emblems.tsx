/**
 * Die Zeichen, die ein Buch tragen kann.
 *
 * Gezeichnet als Linien, nicht als Flächen: Ein geprägtes Siegel lebt von der
 * Kante, nicht von der Füllung. Deshalb erben alle Zeichen Strichstärke und
 * Farbe von aussen (`stroke="currentColor"`), damit dasselbe Zeichen auf dem
 * Einband in Messing und auf der Besitzseite in Tinte stehen kann.
 *
 * Alle Zeichnungen leben im selben Feld von 100 × 100. Ein neues Zeichen
 * braucht genau einen Eintrag in EMBLEM_PRESETS – sonst nichts. Weder die
 * Auswahl noch der Umschlag noch die Besitzseite muessen angefasst werden.
 */

import type { ReactNode } from 'react';
import dragoncore from '../assets/emblem.png';

export interface EmblemPreset {
  id: string;
  label: string;
  /** Die Zeichnung im Feld 100 × 100. */
  draw?: ReactNode;
  /**
   * Statt einer Zeichnung ein mitgeliefertes Bild. Gebraucht fuer das Zeichen,
   * das dieses Buch schon trug, bevor es waehlbar wurde – es soll niemandem
   * unter der Hand vom Einband verschwinden.
   */
  src?: string;
}

export const EMBLEM_PRESETS: EmblemPreset[] = [
  {
    id: 'dragoncore',
    label: 'Dragoncore',
    src: dragoncore,
  },
  {
    id: 'drache',
    label: 'Drache',
    /*
     * Als einziges Zeichen eine Flaeche statt Linien.
     *
     * Zwei Strichfassungen davor – ein senkrechter Leib mit Fluegeln, ein
     * geringelter Ring – lasen sich als Pilz und als Mond mit Vogel. Ein
     * Drache lebt von der Silhouette, nicht von der Kontur: erst der
     * geschlossene Kopf mit zwei zurueckgeschwungenen Hoernern wird bei
     * 32 Pixeln noch als Drache erkannt.
     *
     * Das Auge ist ein echtes Loch (`fillRule="evenodd"`) und keine dunkle
     * Scheibe – sonst verschwaende es auf der hellen Besitzseite.
     */
    draw: (
      <g fill="currentColor" stroke="none" fillRule="evenodd">
        <path d="M20 76C18 58 24 42 38 33c12-8 26-6 35 3l20 9-8 8H72l7 13-19-4-14 9-16 9Zm42-34a2.7 2.7 0 1 1-5.4 0 2.7 2.7 0 0 1 5.4 0Z" />
        <path d="M50 27 28 10l18 22Z" />
        <path d="M38 30 20 18l16 17Z" />
      </g>
    ),
  },
  {
    id: 'baum',
    label: 'Baum',
    /*
     * Krone um die Aeste, nicht darueber. Vorher endete der Stamm unterhalb
     * des Kreises und die Aeste standen frei daneben – das ergab ein Glas.
     */
    draw: (
      <>
        <circle cx="50" cy="38" r="22" />
        <path d="M50 86V42" />
        <path d="M50 58 38 46M50 52l13-13M50 68l-9-9" />
        <path d="M39 86h22" />
      </>
    ),
  },
  {
    id: 'mond',
    label: 'Mond',
    draw: (
      <>
        <path d="M62 20a32 32 0 1 0 0 60 34 34 0 0 1 0-60Z" />
        <circle cx="72" cy="30" r="3" />
      </>
    ),
  },
  {
    id: 'sonne',
    label: 'Sonne',
    draw: (
      <>
        <circle cx="50" cy="50" r="18" />
        <path d="M50 16v10M50 74v10M16 50h10M74 50h10M26 26l7 7M67 67l7 7M74 26l-7 7M33 67l-7 7" />
      </>
    ),
  },
  {
    id: 'berg',
    label: 'Berg',
    draw: (
      <>
        <path d="M12 76 40 30l17 26 9-13 22 33H12Z" />
        <path d="M31 47h18" />
      </>
    ),
  },
  {
    id: 'feder',
    label: 'Feder',
    draw: (
      <>
        <path d="M74 20C50 22 32 38 27 62l-7 18 18-7c24-5 40-23 42-47l-6-6Z" />
        <path d="M70 26 34 66" />
        <path d="M56 30v14M44 42v14M64 44H50M52 56H38" />
      </>
    ),
  },
  {
    id: 'flamme',
    label: 'Flamme',
    draw: (
      <>
        <path d="M50 14c14 16 22 27 22 38a22 22 0 0 1-44 0c0-8 5-16 12-24 2 6 5 9 8 10 3-8 3-16 2-24Z" />
        <path d="M50 52c5 5 8 9 8 13a8 8 0 0 1-16 0c0-4 3-8 8-13Z" />
      </>
    ),
  },
  {
    id: 'welle',
    label: 'Welle',
    draw: (
      <>
        <path d="M12 40c9-9 18-9 27 0s18 9 27 0 15-8 22 0" />
        <path d="M12 56c9-9 18-9 27 0s18 9 27 0 15-8 22 0" />
        <path d="M12 72c9-9 18-9 27 0s18 9 27 0 15-8 22 0" />
      </>
    ),
  },
  {
    id: 'stern',
    label: 'Stern',
    draw: (
      <>
        <path d="m50 14 9 26 27 1-21 17 7 26-22-15-22 15 7-26-21-17 27-1 9-26Z" />
      </>
    ),
  },
  {
    id: 'schluessel',
    label: 'Schlüssel',
    draw: (
      <>
        <circle cx="50" cy="27" r="14" />
        {/* Das Loch im Griff – erst dadurch wird der Ring zum Schlüssel. */}
        <circle cx="50" cy="27" r="4.5" />
        <path d="M50 41v45" />
        <path d="M50 64h14M50 76h11" />
      </>
    ),
  },
];

export function emblemById(id: string | undefined): EmblemPreset | undefined {
  return EMBLEM_PRESETS.find((e) => e.id === id);
}
