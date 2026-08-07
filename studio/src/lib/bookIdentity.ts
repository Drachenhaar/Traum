/**
 * Die Identität des Buches.
 *
 * Nicht bloß ein Deckblatt: Titel, Einband und Zeichen sind das, woran die
 * Welt später wiedererkannt wird – auf dem Umschlag, auf der Besitzseite, auf
 * Kapitelmarken, auf allem, was dieses Buch je verlässt. Deshalb steht die
 * Identität als eigene Entität hier und nicht verstreut in Komponenten.
 *
 * Gespeichert wird sie in der vorhandenen `settings`-Zeile der Datenbank. Eine
 * eigene Tabelle brächte nichts: Es gibt genau ein Buch je Gerät, und eine
 * zweite Datenhaltung wäre eine zweite Stelle, die auseinanderlaufen kann.
 *
 * Abweichungen vom Entwurf im Auftrag, bewusst und aus Rücksicht auf das, was
 * hier bereits steht:
 *
 *  - Zeitangaben sind Zahlen, keine ISO-Zeichenketten. Das ganze Projekt
 *    rechnet mit `Date.now()`; eine Insel mit anderem Format wäre eine
 *    Fehlerquelle bei jedem Vergleich.
 *  - Statt `emblemImage` (ein Bild im Datensatz) steht hier `emblemImageId`.
 *    Bilder liegen in diesem Projekt als Blob in `imageBlobs` und werden über
 *    ihre Id geholt. Ein Bild in die Einstellungen zu legen hieße, dieselbe
 *    Datei ein zweites Mal und in schlechterer Form zu speichern.
 */

import type { BookIdentity } from '../types';

/* ------------------------------------------------------------- Material ---- */

export interface CoverMaterial {
  id: string;
  label: string;
  /** Ein Satz, der das Material beschreibt – erscheint bei der Wahl. */
  note: string;
  /**
   * Die Maserung. `leder` nimmt die fotografierte Narbung, `leinen` webt ein
   * feines Gitter aus Verläufen. Neue Materialien tragen hier ihr Muster ein.
   */
  weave: 'leder' | 'leinen';
  /** Wie stark das Material glänzt (0 stumpf, 1 speckig). */
  sheen: number;
}

/**
 * Die Materialien.
 *
 * Ein neues Material braucht drei Dinge: einen Eintrag hier, einen Fall in
 * `weaveStyle` unten – und sonst nichts. Weder Einbandwahl noch Umschlag
 * müssen angefasst werden, beide lesen dieses Register.
 */
export const COVER_MATERIALS: CoverMaterial[] = [
  {
    id: 'leder',
    label: 'Leder',
    note: 'Genarbt, mit der Zeit dunkler an den Kanten.',
    weave: 'leder',
    sheen: 0.55,
  },
  {
    id: 'leinen',
    label: 'Leinen',
    note: 'Grob gewebt, matt, wie bei alten Bibliotheksbänden.',
    weave: 'leinen',
    sheen: 0.16,
  },
];

/* ---------------------------------------------------------------- Farbe ---- */

export interface CoverColor {
  id: string;
  label: string;
  /** Der Ton, der über die Maserung gelegt wird. */
  tint: string;
  /**
   * Wie der Ton mit der Maserung verrechnet wird. `color` übernimmt Farbe und
   * Sättigung und lässt die Helligkeit des Materials stehen – die Narbung
   * bleibt also sichtbar, statt unter Farbe zu verschwinden.
   */
  blend: 'color' | 'multiply' | 'overlay' | 'soft-light';
  /** Deckkraft der Farbschicht, 0–1. */
  strength: number;
  /** Die Prägung: Messing, Silber, altes Gold. */
  foil: string;
  /** Der Ton der Kapitalbänder und Kanten. */
  edge: string;
}

/**
 * Die Einbandfarben.
 *
 * Eine weitere Farbe ist eine weitere Zeile. Die Werte sind so gewählt, dass
 * die Prägung auf jedem Grund lesbar bleibt – das ist der einzige harte
 * Anspruch an eine neue Farbe.
 */
export const COVER_COLORS: CoverColor[] = [
  {
    id: 'umbra',
    label: 'Dunkles Umbra',
    tint: '#2A1F16',
    blend: 'multiply',
    strength: 0.72,
    foil: '#D4AF37',
    edge: '#8C6510',
  },
  {
    id: 'naturbraun',
    label: 'Naturbraun',
    tint: '#7A4F26',
    blend: 'soft-light',
    strength: 0.6,
    foil: '#E3C878',
    edge: '#B8860B',
  },
  {
    id: 'waldgruen',
    label: 'Waldgrün',
    tint: '#2E4032',
    blend: 'color',
    strength: 0.82,
    foil: '#D4AF37',
    edge: '#8C6510',
  },
  {
    id: 'bordeaux',
    label: 'Bordeaux',
    tint: '#4A1D22',
    blend: 'color',
    strength: 0.84,
    foil: '#E3C878',
    edge: '#B8860B',
  },
  {
    id: 'nachtblau',
    label: 'Tiefes Nachtblau',
    tint: '#1E2A3C',
    blend: 'color',
    strength: 0.86,
    foil: '#C9CBD0',
    edge: '#8A8D95',
  },
  {
    id: 'schwarz',
    label: 'Schwarz',
    tint: '#14110F',
    blend: 'multiply',
    strength: 0.88,
    foil: '#D4AF37',
    edge: '#8C6510',
  },
];

export function materialById(id: string): CoverMaterial {
  return COVER_MATERIALS.find((m) => m.id === id) ?? COVER_MATERIALS[0];
}

export function colorById(id: string): CoverColor {
  return COVER_COLORS.find((c) => c.id === id) ?? COVER_COLORS[0];
}

/* ----------------------------------------------------------- Neues Buch ---- */

export const DEFAULT_BOOK: Omit<BookIdentity, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  subtitle: '',
  coverMaterial: 'leder',
  coverColor: 'umbra',
  emblemType: 'preset',
  emblemId: 'drache',
};

/**
 * Trägt das Buch schon einen Namen?
 *
 * Genau daran – und an nichts sonst – hängt die Erstöffnung. Ein Buch ohne
 * Identität ist ein ungeschriebenes; sobald eines vorliegt, wird es geöffnet
 * statt erschaffen.
 */
export function hasBookIdentity(book: BookIdentity | undefined): book is BookIdentity {
  return !!book && typeof book.id === 'string' && book.title.trim().length > 0;
}

export function newBookIdentity(patch: Partial<BookIdentity> = {}): BookIdentity {
  const now = Date.now();
  return {
    id: `buch_${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    ...DEFAULT_BOOK,
    ...patch,
    createdAt: now,
    updatedAt: now,
  };
}
