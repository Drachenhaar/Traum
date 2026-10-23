/**
 * Das Streuwerk – aus Bedeutung wird Staffage.
 *
 * ---
 *
 * **Was hier nicht passiert: Geografie erfinden.**
 *
 * Gestreut wird nur *innerhalb* dessen, was jemand gemalt hat. Ein Wald, den
 * niemand gezeichnet hat, entsteht nicht – Gesetz 4. Dieselbe Zusage wie beim
 * Fluss und bei den Siedlungen, und sie gilt für jede Art, die hier je
 * dazukommt.
 *
 * ---
 *
 * **Rein und wiederholbar.**
 *
 * Dieselbe Fläche mit demselben Startwert ergibt dieselbe Liste, in derselben
 * Reihenfolge, auf jedem Gerät. Die Grundlage dafür liegt tiefer, in
 * `karte/zufall.ts`: ein **Ortszufall** statt einer Zufallsfolge. Eine Folge
 * würde bei jeder Randkorrektur den ganzen Wald neu würfeln; eine Funktion
 * vom Ort antwortet für alte Orte weiterhin dasselbe.
 *
 * ---
 *
 * **Warum `baeume()` weiterbenutzt wird.**
 *
 * Diese Etappe überführt die Maschinerie, nicht das Aussehen. `wald.ts`
 * enthält bereits einen reinen Streuer mit raumfestem Gitter,
 * Mindestabstand und Randsaum – also genau das, was hier gebraucht wird. Ihn
 * nachzubauen hieße, den Wald bei gleicher Absicht anders aussehen zu lassen,
 * und dann wäre der Vergleich zwischen altem und neuem Weg nichts mehr wert.
 *
 * Wenn später Berge, Fels und Sumpf dazukommen, bekommt jede Art ihre eigene
 * Regel an dieser Stelle. Die Schnittstelle nach aussen bleibt dieselbe.
 */

import type { Kartenfeature } from '../karte/modell';
import { baeume } from '../karte/wald';
import type { Stilbuch } from './stilbuch';
import type { Staffage } from './staffage';

/**
 * Die Staffage einer einzelnen Fläche.
 *
 * Getrennt von `staffageAus`, weil das Kachelwerk beim Ändern genau diese
 * eine Fläche neu braucht und nicht die ganze Karte.
 */
export function staffageFuerFlaeche(f: Kartenfeature, stilbuch: Stilbuch): Staffage[] {
  const eintrag = stilbuch.eintrag(f.art);
  if (!eintrag) return [];

  if (f.art === 'wald') {
    return baeume(f).map((b) => ({
      art: 'wald',
      /*
       * **Die Variantenzahl kommt vom Stilbuch, nicht von hier.**
       *
       * `baeume()` liefert `rohform` – dieselbe Wahl ungeteilt, zwischen 0
       * und 1. Wer drei Formen hat, teilt in drei; wer acht gemalte Bäume
       * hat, teilt in acht. Bei drei ist es genau `form`, also sieht der
       * Wald aus wie vorher, Baum für Baum.
       *
       * Der Umweg über `rohform` ist nötig, weil ein zusätzlicher Griff in
       * die Zufallskette **jeden folgenden Baum verschöbe** – die Zahlen
       * hängen am Salz, und das Salz zählt mit.
       */
      variante: Math.min(eintrag.varianten - 1, Math.floor(b.rohform * eintrag.varianten)),
      x: b.x,
      y: b.y,
      /* `GROESSE` aus `baumzeichnung.ts` ist 15 Karteneinheiten. */
      h: b.groesse * 15,
      dreh: b.neigung,
      spiegel: false,
      lage: eintrag.lage,
      ebene: eintrag.ebene,
    }));
  }

  return [];
}

/**
 * Die Staffage der ganzen Karte, einmal sortiert.
 *
 * ---
 *
 * **Global sortiert, nicht je Fläche.**
 *
 * Erst `ebene`, dann `y`. Damit steht ein Baum vor dem, was hinter ihm liegt
 * – auch wenn beides zu verschiedenen Flächen gehört. Der heutige Renderer
 * zeichnet Fläche für Fläche und kann das nicht; für eine Landschaft, die
 * zusammenhängt, ist es Voraussetzung.
 *
 * **Und es ändert das Bild, minimal.** Wo zwei Wälder einander überlappen,
 * verschränken sich ihre Bäume jetzt, statt dass der eine vollständig über
 * dem anderen liegt. Das ist die Absicht und der einzige gewollte
 * Unterschied dieser Etappe. Der Vergleich misst ihn, statt ihn zu
 * behaupten.
 */
export function staffageAus(features: Kartenfeature[], stilbuch: Stilbuch): Staffage[] {
  const aus: Staffage[] = [];
  for (const f of features) aus.push(...staffageFuerFlaeche(f, stilbuch));
  aus.sort((a, b) => (a.ebene - b.ebene) || (a.y - b.y));
  return aus;
}
