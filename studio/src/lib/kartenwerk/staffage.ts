/**
 * Staffage – was auf der Karte steht.
 *
 * ---
 *
 * **Daten, keine Zeichnung.**
 *
 * Ein Stück Staffage weiß, *dass* hier ein Baum steht, wie groß er ist und
 * welche Variante. Es weiß nicht, ob dieser Baum später ein Pinselstrich oder
 * ein Bild aus einem Atlas wird – das entscheidet das Stilbuch.
 *
 * Diese Trennung ist der Grund, warum ein Stilwechsel mehr kann als Farben:
 * Dieselbe Staffageliste, zwei Stilbücher, zwei Bilder **derselben** Welt.
 * Würde die Dichte im Stilbuch stehen, wäre derselbe Wald in zwei Stilen zwei
 * verschiedene Wälder, und die Karte wäre nicht mehr dieselbe Karte.
 *
 * ---
 *
 * **Die zwei Lagen.**
 *
 * `grund` ist das Gelände: Papier, Wasser, Land, Küste, Flüsse, Wege – alles,
 * was zusammenhängend ist und ineinander übergeht. `bewuchs` ist alles, was
 * *darauf* steht.
 *
 * Sie sind getrennt, weil sie sich verschieden oft ändern und verschieden
 * teuer sind. Ein Wald, der dichter gestellt wird, lässt das Gelände
 * unberührt; eine verschobene Küste lässt die Bäume stehen, die nicht an ihr
 * liegen. Jede Lage hat deshalb ihren eigenen Zwischenspeicher.
 *
 * Und sie sind die Antwort auf „zusammenhängende Landschaft statt
 * aufgesetzter Symbole": Berge brauchen später **beides** – einen
 * Geländeunterbau in `grund`, der die Hänge zwischen den Gipfeln trägt, und
 * die Gipfel selbst in `bewuchs`. Ohne die Lage darunter bleibt eine
 * Gebirgskette eine Reihe von Zeichen auf Papier.
 */

/** Welche Lage ein Stück Staffage bewohnt. */
export type Lage = 'grund' | 'bewuchs';

export const LAGEN: Lage[] = ['grund', 'bewuchs'];

/**
 * Ein Ding auf der Karte.
 *
 * `h` ist die Höhe im **Kartenmaß** (0…1000), nicht in Bildpunkten. Ein Baum
 * ist damit so groß wie sein Stück Land, egal wie weit man herangeht – und
 * genau das unterscheidet Staffage von einer Beschriftung.
 *
 * Der Fußpunkt (`x`, `y`) ist die Stelle, an der das Ding den Boden berührt.
 * Nicht sein Mittelpunkt: Ein Zeichen, dessen Mittelpunkt in der Luft liegt,
 * rutscht beim Vergrößern nach unten weg. Dieselbe Regel wie bei den
 * Siedlungszeichen in `karte/siedlung.ts`.
 */
export interface Staffage {
  /** Welche Art – `'wald'`, später `'berge'`, `'fels'`, … */
  art: string;
  /**
   * Welche Ausprägung dieser Art.
   *
   * **Nach oben offen.** Wie viele es gibt, sagt das Stilbuch; hier steht nur
   * eine Zahl. Ein Stil mit vierzig gemalten Bäumen ist damit genauso möglich
   * wie einer mit drei Pinselformen, ohne dass hier etwas geändert wird.
   */
  variante: number;
  /** Fußpunkt im Kartenraum. */
  x: number;
  y: number;
  /** Höhe im Kartenmaß. */
  h: number;
  /** Neigung in Radiant, meist klein. */
  dreh: number;
  /** Gespiegelt? Verdoppelt die Formenzahl, ohne ein Bild zu kosten. */
  spiegel: boolean;
  /** Welcher Zwischenspeicher. */
  lage: Lage;
  /**
   * Grobe Malreihenfolge innerhalb der Lage; fein entscheidet `y`.
   *
   * Sortiert wird **global**, über alle Flächen hinweg. Der heutige Renderer
   * zeichnet je Fläche, und deshalb kann ein Baum dort nicht vor einem Berg
   * stehen, der zu einer anderen Fläche gehört. Für eine Landschaft, die
   * zusammenhängt, ist die globale Tiefensortierung Voraussetzung.
   */
  ebene: number;
}

export const EBENE = {
  boden: 0,
  bewuchs: 1,
  fels: 2,
  bauwerk: 3,
} as const;

/** Der Kasten, den ein Stück Staffage auf dem Papier einnimmt – grob. */
export function staffageKasten(s: Staffage, breiteZuHoehe = 1): {
  x0: number; y0: number; x1: number; y1: number;
} {
  const b = s.h * breiteZuHoehe;
  return { x0: s.x - b, y0: s.y - s.h, x1: s.x + b, y1: s.y + s.h * 0.1 };
}
