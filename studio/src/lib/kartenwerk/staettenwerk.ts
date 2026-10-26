/**
 * Stättenwerk – fachliches Modell für frei platzierbare Einzelbauten.
 *
 * Ein Siedlungssymbol bleibt ein Symbol. Einzelne Häuser sind eigene Dinge:
 * Sie haben Fußpunkt, Größe und eine stabile Identität. Der Renderer muss
 * weder wissen, woher eine Stätte stammt, noch Daten mutieren.
 *
 * Dieser erste Baustein ist bewusst NICHT an Kartendokument/IndexedDB
 * angeschlossen: Ohne Heilung und Backup-Anpassung wäre das Datenverlust.
 */
import type { Punkt } from '../karte/modell';
import { EBENE, type Staffage } from './staffage';

export type Bauform = 'haus' | 'turm' | 'bruecke';

export interface Staettenobjekt {
  id: string;
  bauform: Bauform;
  /** Der Bodenkontakt, nicht das Bildzentrum. */
  bei: Punkt;
  /** Höhe im Kartenmaß, unabhängig von Zoom und Pixelauflösung. */
  hoehe: number;
  /** Variante innerhalb eines künftig gemalten Bildersatzes. */
  variante: number;
  /** Ortsgebundene Abweichungen bleiben nach Neuladen identisch. */
  seed: number;
  /** Ein Ort im Buch ist die einzige Quelle seines Namens. */
  entryId?: string;
}

export function setzeStaette(
  id: string,
  bauform: Bauform,
  bei: Punkt,
  hoehe: number,
  seed: number,
  variante = 0,
): Staettenobjekt {
  if (!id.trim()) throw new Error('Eine Stätte braucht eine Kennung.');
  if (!Number.isFinite(hoehe) || hoehe <= 0) throw new Error('Die Gebäudehöhe muss positiv sein.');
  if (!Number.isFinite(bei[0]) || !Number.isFinite(bei[1])) throw new Error('Ungültiger Fußpunkt.');
  if (!Number.isFinite(seed) || !Number.isSafeInteger(variante) || variante < 0) throw new Error('Ungültige Variante.');
  return { id, bauform, bei: [bei[0], bei[1]], hoehe, variante, seed };
}

/** Rein: Nicht einmal ein verschobenes Gebäude ändert das alte Array. */
export function verschiebeStaette(
  vorher: readonly Staettenobjekt[], id: string, bei: Punkt,
): Staettenobjekt[] {
  if (!Number.isFinite(bei[0]) || !Number.isFinite(bei[1])) throw new Error('Ungültiger Fußpunkt.');
  return vorher.map((s) => s.id === id ? { ...s, bei: [bei[0], bei[1]] } : s);
}

/** Gleiche Blickrichtung: höheres Y steht weiter vorne. */
export function staettenInMalfolge(staetten: readonly Staettenobjekt[]): Staettenobjekt[] {
  return [...staetten].sort((a, b) => (a.bei[1] - b.bei[1]) || a.id.localeCompare(b.id));
}

/**
 * Übersetzung in die vorhandene Karte: Staffage, kein zweiter Renderer.
 * Die konkrete Bauform soll später als eigene Atlas-Art aufgenommen werden.
 * Bis dahin zeichnet `bauwerk` eine gemeinsame Platzhalterfamilie.
 */
export function staettenStaffage(staetten: readonly Staettenobjekt[]): Staffage[] {
  return staettenInMalfolge(staetten).map((s) => ({
    art: 'bauwerk', variante: s.variante,
    x: s.bei[0], y: s.bei[1], h: s.hoehe,
    dreh: 0, spiegel: false,
    lage: 'bewuchs', ebene: EBENE.bauwerk,
  }));
}
