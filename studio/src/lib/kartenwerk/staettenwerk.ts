/**
 * Stättenwerk: frei gesetzte Bauwerke statt bloßer Siedlungssymbole.
 * Die Welt speichert nur Bedeutung und Lage, nie ein fertiges Bild.
 */
import type { Punkt } from '../karte/modell';
import type { Staffage } from './staffage';
import { EBENE } from './staffage';

export type Bauform = 'haus' | 'turm' | 'bruecke';
export const BAUFORMEN: { id: Bauform; name: string }[] = [
  { id: 'haus', name: 'Haus' },
  { id: 'turm', name: 'Turm' },
  { id: 'bruecke', name: 'Brücke' },
];
export function istBauform(roh: unknown): roh is Bauform {
  return BAUFORMEN.some((b) => b.id === roh);
}

export interface Staettenobjekt {
  id: string;
  bauform: Bauform;
  bei: Punkt;
  hoehe: number;
  variante: number;
  seed: number;
  entryId?: string;
}

export function setzeStaette(
  id: string, bauform: Bauform, bei: Punkt, hoehe: number, seed: number, variante = 0,
): Staettenobjekt {
  if (!id || !istBauform(bauform)) throw new Error('Ungültiges Bauwerk.');
  if (!bei.every(Number.isFinite) || !Number.isFinite(hoehe) || hoehe <= 0) {
    throw new Error('Ungültiger Standort oder ungültige Höhe.');
  }
  if (!Number.isFinite(seed) || !Number.isInteger(variante) || variante < 0) {
    throw new Error('Ungültige Variante.');
  }
  return { id, bauform, bei: [bei[0], bei[1]], hoehe, variante, seed };
}
export function verschiebeStaette(
  liste: readonly Staettenobjekt[], id: string, bei: Punkt,
): Staettenobjekt[] {
  if (!bei.every(Number.isFinite)) throw new Error('Ungültiger Standort.');
  return liste.map((s) => s.id === id ? { ...s, bei: [bei[0], bei[1]] } : s);
}

/** Maß der Silhouette einschließlich Überstand und Schatten; für gezielte Kachel-Entwertung. */
export function staettenkasten(s: Staettenobjekt) {
  const breite = s.hoehe * (s.bauform === 'bruecke' ? 1.6 : 1.15);
  return { x0: s.bei[0] - breite, y0: s.bei[1] - s.hoehe * 1.8,
    x1: s.bei[0] + breite, y1: s.bei[1] + s.hoehe * 0.35 };
}

/** Alle Bauformen benutzen die bestehende Staffage-Pipeline. */
export function staettenStaffage(liste: readonly Staettenobjekt[]): Staffage[] {
  return liste.map((s) => ({
    art: 'bauwerk',
    variante: BAUFORMEN.findIndex((b) => b.id === s.bauform),
    x: s.bei[0], y: s.bei[1], h: s.hoehe,
    dreh: 0, spiegel: false, lage: 'bewuchs' as const, ebene: EBENE.bauwerk,
  }));
}
