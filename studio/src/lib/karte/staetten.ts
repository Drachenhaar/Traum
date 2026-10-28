/**
 * Einzelne Stätten – nicht mit Siedlungszeichen verwechseln.
 *
 * Eine Kartenmarke fasst einen Ort zusammen. Eine Stätte ist ein einzelnes
 * Bauwerk, das jemand an einen Bodenpunkt gesetzt hat. Ihre Koordinaten,
 * Proportionen und Buchverknüpfung sind Daten, ihre Zeichnung nicht.
 */
import type { Punkt } from './modell';

export type Bauform = 'haus' | 'turm' | 'bruecke';

export interface Staettenobjekt {
  id: string;
  bauform: Bauform;
  bei: Punkt;
  /** Höhe im Kartenmaß (nicht in Bildschirm-Pixeln). */
  hoehe: number;
  seed: number;
  /** Der Name steht nur auf der verknüpften Buchseite. */
  entryId?: string;
}

export const BAUFORMEN: { id: Bauform; name: string }[] = [
  { id: 'haus', name: 'Haus' },
  { id: 'turm', name: 'Turm' },
  { id: 'bruecke', name: 'Brücke' },
];

export function istBauform(art: unknown): art is Bauform {
  return BAUFORMEN.some((b) => b.id === art);
}

export function verschiebeStaette(
  liste: readonly Staettenobjekt[], id: string, bei: Punkt,
): Staettenobjekt[] {
  if (!bei.every(Number.isFinite)) return [...liste];
  return liste.map((s) =>
    s.id === id ? { ...s, bei: [...bei] as Punkt } : s,
  );
}

/** Alter und neuer Bildkasten werden beim Verschieben beide entwertet. */
export function staettenKasten(s: Staettenobjekt) {
  const r = s.hoehe * 1.7;
  return {
    x0: s.bei[0] - r, y0: s.bei[1] - s.hoehe * 1.9,
    x1: s.bei[0] + r, y1: s.bei[1] + s.hoehe * 0.3,
  };
}
