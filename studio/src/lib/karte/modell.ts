/**
 * Was eine Karte ist.
 *
 * **Nicht ein Bild.** Eine Karte ist eine Liste von Flächen, die eine
 * Bedeutung tragen – und die Darstellung wird daraus erzeugt. Der Unterschied
 * ist nicht akademisch, er entscheidet über alles Weitere:
 *
 *   Ein Bild kann man ansehen und wegwerfen.
 *   Eine Fläche mit Bedeutung kann man umfärben, umbenennen, verschieben,
 *   an eine Seite hängen, in einem anderen Stil zeigen und in zehn Jahren
 *   noch bearbeiten.
 *
 * Gespeichert wird deshalb nie eine Farbe und nie ein Baum. Gespeichert wird:
 *
 *   Geometrie + Bedeutung + Startwert
 *
 * Woraus die Darstellung entsteht, entscheidet der Stil. Dieselbe Waldfläche
 * kann morgen in Sepia stehen, ohne dass sich ein Datensatz ändert. Dieselbe
 * Trennung wie beim Buchzeichen (Form vs. Material) und bei der Anmutung
 * (Inhalt vs. Satz) – in diesem Projekt inzwischen das dritte Mal, und jedes
 * Mal aus demselben Grund.
 *
 * **Keine zweite Wahrheit.** Ein Feature kann auf einen Eintrag zeigen; dann
 * stammen Name, Beschreibung und alles Weitere von dort. Der Name steht nicht
 * zusätzlich in der Karte. Ein Wald, der auf der Karte anders heißt als im
 * Buch, wäre der Anfang von zwei Welten.
 */

import { neuerSeed } from './zufall';

/**
 * Was eine Fläche bedeutet.
 *
 * Drei, nicht mehr. Berge, Flüsse, Straßen, Siedlungen und Grenzen sind
 * ausdrücklich noch nicht dran – zuerst muss bewiesen sein, dass aus einem
 * groben Fleck etwas Schönes wird. Als Zeichenkette und nicht als Aufzählung
 * im Typ wäre bequemer; als Aufzählung fällt beim Erweitern jede Stelle auf,
 * die den neuen Fall nicht behandelt.
 */
export type Bedeutung = 'land' | 'wasser' | 'wald';

export const BEDEUTUNGEN: { id: Bedeutung; name: string }[] = [
  { id: 'land', name: 'Land' },
  { id: 'wasser', name: 'Wasser' },
  { id: 'wald', name: 'Wald' },
];

/** Ein Punkt im Kartenraum. Siehe `Kartenfeature.punkte`. */
export type Punkt = [number, number];

export interface Kartenfeature {
  id: string;
  art: Bedeutung;
  /**
   * Der geschlossene Umriss, im Kartenraum 0…1000.
   *
   * Bewusst eine eigene, feste Skala und keine Bildschirmpunkte: Eine Karte,
   * die in den Maßen des Geräts gespeichert wird, in dem sie gemalt wurde,
   * ist auf jedem anderen Gerät falsch. Tausend statt eins, weil ganze Zahlen
   * sich besser lesen und die Auflösung für eine Weltkarte reicht.
   */
  punkte: Punkt[];
  /**
   * Der Startwert dieser Fläche – einmal gezogen, danach unveränderlich.
   *
   * Er ist der Grund, warum ein Wald beim Neuladen derselbe Wald ist. Wer ihn
   * beim Bearbeiten neu zieht, hat einen anderen Wald gemalt.
   */
  seed: number;
  /** Auf welche Seite des Buches diese Fläche zeigt. Darf fehlen. */
  entryId?: string;
  /**
   * Wann es das gab.
   *
   * Noch von nichts gelesen – die Karte kennt keine Zeit. Die Felder stehen
   * hier, weil die Chronik sie später ohne Wanderung benutzen kann und weil
   * es billiger ist, sie jetzt vorzusehen, als sie später nachzurüsten.
   */
  beginn?: string;
  ende?: string;
}

export interface Kartendokument {
  id: string;
  bookId: string;
  /** Der Startwert der Karte selbst – für alles, was nicht zu einer Fläche gehört. */
  seed: number;
  styleId: string;
  features: Kartenfeature[];
  createdAt: number;
  updatedAt: number;
}

/** Der Kartenraum. Alles rechnet in diesem Feld. */
export const FELD = 1000;

let zaehler = 0;
function neueId(prefix: string): string {
  zaehler += 1;
  return `${prefix}_${Date.now().toString(36)}${zaehler.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function neueKarte(bookId: string): Kartendokument {
  const jetzt = Date.now();
  return {
    id: neueId('karte'),
    bookId,
    seed: neuerSeed(),
    styleId: 'artbook',
    features: [],
    createdAt: jetzt,
    updatedAt: jetzt,
  };
}

export function neuesFeature(art: Bedeutung, punkte: Punkt[]): Kartenfeature {
  return { id: neueId('f'), art, punkte, seed: neuerSeed() };
}

/* ------------------------------------------------------------- Heilung ---- */

/**
 * Eine gespeicherte Karte einlesen – auch wenn sie beschädigt ist.
 *
 * Dieselbe Vorsicht wie bei Einträgen: Feld für Feld, mit Rückfällen. Eine
 * Fläche mit weniger als drei Punkten ist keine Fläche und fällt weg; ein
 * fehlender Startwert wird ergänzt, damit wenigstens *ab jetzt* Ruhe ist.
 */
export function heileKarte(roh: unknown): Kartendokument | undefined {
  if (!roh || typeof roh !== 'object') return undefined;
  const k = roh as Record<string, unknown>;
  if (typeof k.id !== 'string' || typeof k.bookId !== 'string') return undefined;

  const zahl = (v: unknown, r: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : r;

  const features: Kartenfeature[] = [];
  for (const rohesFeature of Array.isArray(k.features) ? k.features : []) {
    if (!rohesFeature || typeof rohesFeature !== 'object') continue;
    const f = rohesFeature as Record<string, unknown>;
    if (!BEDEUTUNGEN.some((b) => b.id === f.art)) continue;
    const punkte = (Array.isArray(f.punkte) ? f.punkte : [])
      .filter(
        (p): p is Punkt =>
          Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n)),
      )
      .map(([x, y]) => [x, y] as Punkt);
    if (punkte.length < 3) continue;
    features.push({
      id: typeof f.id === 'string' ? f.id : neueId('f'),
      art: f.art as Bedeutung,
      punkte,
      seed: zahl(f.seed, neuerSeed()) | 0,
      entryId: typeof f.entryId === 'string' ? f.entryId : undefined,
      beginn: typeof f.beginn === 'string' ? f.beginn : undefined,
      ende: typeof f.ende === 'string' ? f.ende : undefined,
    });
  }

  return {
    id: k.id,
    bookId: k.bookId,
    seed: zahl(k.seed, 1) | 0,
    styleId: typeof k.styleId === 'string' ? k.styleId : 'artbook',
    features,
    createdAt: zahl(k.createdAt, Date.now()),
    updatedAt: zahl(k.updatedAt, Date.now()),
  };
}

/* ------------------------------------------------------------ Geometrie --- */

/** Liegt der Punkt in der Fläche? Strahlensatz, wie üblich. */
export function imPolygon(p: Punkt, poly: Punkt[]): boolean {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}

/** Der umschließende Kasten – für alles, was nicht jede Fläche absuchen will. */
export function kasten(poly: Punkt[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

/** Abstand eines Punktes zur nächsten Kante – für den lockeren Waldrand. */
export function randabstand(p: Punkt, poly: Punkt[]): number {
  let beste = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const dx = bx - ax;
    const dy = by - ay;
    const laenge = dx * dx + dy * dy;
    const t = laenge ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / laenge)) : 0;
    const qx = ax + t * dx - p[0];
    const qy = ay + t * dy - p[1];
    const d = Math.hypot(qx, qy);
    if (d < beste) beste = d;
  }
  return beste;
}

/** Als SVG-Pfad. Geschlossen, weil eine Fläche geschlossen ist. */
export function alsPfad(poly: Punkt[]): string {
  if (!poly.length) return '';
  return `M${poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
}
