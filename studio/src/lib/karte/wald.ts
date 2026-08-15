/**
 * Der Wald.
 *
 * Der entscheidende Teil des Durchstichs, und die eigentliche Prüfung ist
 * nicht, ob er schön aussieht, sondern ob er **stehen bleibt**:
 *
 *   Kleine Änderung an der Waldgrenze → kleine Änderung im Bild.
 *
 * Das klingt selbstverständlich und ist der Punkt, an dem die meisten
 * Streuverfahren scheitern. Klassisches Poisson-Disk-Sampling (Bridson)
 * arbeitet mit einer *Warteschlange*: Man setzt einen Startpunkt, würfelt
 * Nachbarn, arbeitet sich fort. Die Reihenfolge bestimmt das Ergebnis – und
 * die Reihenfolge ändert sich, sobald die Fläche anders ist. Ein Wald, dessen
 * Rand man um zehn Punkte verschiebt, wäre danach ein anderer Wald.
 *
 * Deshalb hier ein **Gitter mit Ortszufall**:
 *
 *   Der Kartenraum ist fest in Zellen der Kantenlänge `r` geteilt.
 *   Jede Zelle würfelt aus (Startwert, Zellenspalte, Zellenzeile) ihre
 *   eigenen Kandidaten – unabhängig von jeder anderen Zelle und von der
 *   Reihenfolge.
 *   Behalten wird, was in der Fläche liegt und weit genug von schon
 *   Behaltenem entfernt ist.
 *
 * Damit hängt ein Baum nur von seinem Ort ab, nicht von der Geschichte seiner
 * Entstehung. Wächst der Wald, kommen Zellen dazu; die alten antworten
 * weiterhin dasselbe. Das ist keine Annäherung an Stabilität, das *ist*
 * Stabilität – und es ist der Grund, warum diese Datei kein Poisson-Disk
 * benutzt, obwohl der Auftrag es vorschlägt.
 *
 * Der Preis: Die Abstände sind etwas weniger gleichmäßig als bei Bridson. Auf
 * einer Karte mit Bäumen sieht das niemand; ein tanzender Wald fällt sofort
 * auf.
 */

import type { Kartenfeature } from './modell';
import { imPolygon, kasten, randabstand } from './modell';
import { zahl, zwischen } from './zufall';

export interface Baum {
  x: number;
  y: number;
  /** 0…1 – wie groß dieser Baum gezeichnet wird. */
  groesse: number;
  /** Radiant, klein. */
  neigung: number;
  /** Welche der wenigen Zeichnungen. */
  form: number;
}

export interface Waldwerte {
  /** Mittlerer Abstand der Bäume im Kartenraum. Kleiner heißt dichter. */
  abstand: number;
  /** Wie breit der lockere Rand ist. */
  saum: number;
  /** Wie viele Kandidaten je Zelle. Mehr füllt Lücken, kostet Rechenzeit. */
  jeZelle: number;
}

export const WALD_VORGABE: Waldwerte = { abstand: 15, saum: 34, jeZelle: 2 };

/**
 * Die Bäume einer Fläche.
 *
 * Rein: dieselbe Fläche mit demselben Startwert ergibt immer dieselbe Liste,
 * in derselben Reihenfolge. Nichts hier liest eine Uhr oder `Math.random`.
 */
export function baeume(feature: Kartenfeature, werte: Waldwerte = WALD_VORGABE): Baum[] {
  const poly = feature.punkte;
  if (poly.length < 3) return [];
  const { x0, y0, x1, y1 } = kasten(poly);
  const r = werte.abstand;

  /*
   * Die Zellen sind am Kartenraum ausgerichtet, nicht am Kasten der Flaeche.
   *
   * Das ist der zweite Teil der Stabilitaet und leicht zu uebersehen: Waere
   * das Gitter am Kasten ausgerichtet, verschoebe sich beim Vergroessern der
   * Flaeche das ganze Gitter – und mit ihm jeder Baum.
   */
  const vonSpalte = Math.floor(x0 / r);
  const bisSpalte = Math.ceil(x1 / r);
  const vonZeile = Math.floor(y0 / r);
  const bisZeile = Math.ceil(y1 / r);

  /* Behaltene Punkte je Zelle – fuer die Abstandspruefung gegen die Nachbarn. */
  const belegt = new Map<string, Baum[]>();
  const aus: Baum[] = [];

  const zuNah = (x: number, y: number, spalte: number, zeile: number) => {
    for (let ds = -1; ds <= 1; ds++) {
      for (let dz = -1; dz <= 1; dz++) {
        const nachbarn = belegt.get(`${spalte + ds}:${zeile + dz}`);
        if (!nachbarn) continue;
        for (const b of nachbarn) {
          if ((b.x - x) ** 2 + (b.y - y) ** 2 < r * r) return true;
        }
      }
    }
    return false;
  };

  for (let zeile = vonZeile; zeile <= bisZeile; zeile++) {
    for (let spalte = vonSpalte; spalte <= bisSpalte; spalte++) {
      for (let k = 0; k < werte.jeZelle; k++) {
        /* Der Kandidat liegt irgendwo in seiner Zelle – nie am Rasterpunkt. */
        const x = (spalte + zahl(feature.seed, spalte, zeile, k * 3 + 1)) * r;
        const y = (zeile + zahl(feature.seed, spalte, zeile, k * 3 + 2)) * r;
        if (!imPolygon([x, y], poly)) continue;

        /*
         * Der lockere Saum.
         *
         * Nahe der Kante wird ein Kandidat nur mit einer Wahrscheinlichkeit
         * behalten, die mit dem Abstand steigt. Nicht linear, sondern im
         * Quadrat – linear sieht aus wie ein Farbverlauf, im Quadrat wie ein
         * Waldrand, der ausduennt.
         */
        const d = randabstand([x, y], poly);
        const naehe = Math.min(1, d / werte.saum);
        const chance = 0.12 + 0.88 * naehe * naehe;
        if (zahl(feature.seed, spalte, zeile, k * 3 + 3) > chance) continue;

        if (zuNah(x, y, spalte, zeile)) continue;

        const baum: Baum = {
          x,
          y,
          /* Aussen etwas kleiner – das vertieft den Rand, ohne ihn zu zeichnen. */
          groesse: zwischen(feature.seed, spalte, zeile, 0.72, 1, k * 3 + 4) * (0.78 + 0.22 * naehe),
          neigung: zwischen(feature.seed, spalte, zeile, -0.12, 0.12, k * 3 + 5),
          form: Math.floor(zahl(feature.seed, spalte, zeile, k * 3 + 6) * 3),
        };
        aus.push(baum);
        const schluessel = `${spalte}:${zeile}`;
        const liste = belegt.get(schluessel);
        if (liste) liste.push(baum);
        else belegt.set(schluessel, [baum]);
      }
    }
  }

  /*
   * Von hinten nach vorn: Was weiter unten steht, wird spaeter gezeichnet und
   * verdeckt das Dahinterliegende. Ohne diese Zeile ueberlappen die Baeume in
   * zufaelliger Folge, und der Wald wirkt flach.
   */
  return aus.sort((a, b) => a.y - b.y);
}
