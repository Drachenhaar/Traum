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

import type { Gebirgskamm, Kartenfeature } from '../karte/modell';
import { baeume } from '../karte/wald';
import { hoeheUeberall } from '../karte/gebirge';
import { zahl } from '../karte/zufall';
import type { Stilbuch } from './stilbuch';
import type { Staffage } from './staffage';

/**
 * Die Baumgrenze.
 *
 * ---
 *
 * **Warum sie hierher gehört und nicht ins Waldwerk.**
 *
 * Das Streuwerk sagt, *wo* etwas steht; das Stilbuch, *wie* es aussieht.
 * Dass oberhalb einer Höhe keine Bäume mehr stehen, ist eine Aussage über
 * den Ort und nicht über das Aussehen – in jedem Stil dieselbe.
 *
 * ---
 *
 * **Eine Höhe und kein Anteil.**
 *
 * Die Zahlen sind absolute Höhen, nicht Bruchteile des jeweiligen Berges.
 * Das ist der Unterschied zwischen einer Landschaft und einer Zeichnung:
 * Ein Hügel von halber Höhe trägt bis zum Gipfel Wald, ein hoher Zug wird
 * oben kahl. Als Anteil gerechnet wäre jeder Gipfel gleich kahl, egal wie
 * hoch er ist – und zwei Berge nebeneinander sähen aus wie zwei Kopien
 * desselben.
 *
 * ---
 *
 * **Ohne Gebirge ändert sich nichts.**
 *
 * `hoeheUeberall` gibt ohne Kämme überall null zurück. Eine Karte von
 * vorher sieht also aus wie vorher, Baum für Baum – das ist keine
 * Hoffnung, sondern geprüft.
 */
export const BAUMGRENZE = {
  /** Ab dieser Höhe dünnt der Wald aus. */
  beginn: 0.3,
  /** Ab dieser Höhe steht kein Baum mehr. */
  ende: 0.58,
  /** Wie stark ein Baum dicht unter der Grenze verkümmert. */
  kuemmer: 0.45,
};

/**
 * Wie weit über der Baumgrenze: 0 unterhalb, 1 darüber.
 *
 * Eine Rampe und keine Kante. Eine Kante ergäbe eine saubere Höhenlinie
 * quer durch den Wald, und so etwas gibt es in der Natur nicht – oben
 * stehen zuerst weniger Bäume, dann kleinere, dann keine.
 */
function ueberGrenze(x: number, y: number, kaemme: Gebirgskamm[]): number {
  if (!kaemme.length) return 0;
  const h = hoeheUeberall(x, y, kaemme);
  if (h <= BAUMGRENZE.beginn) return 0;
  const t = (h - BAUMGRENZE.beginn) / (BAUMGRENZE.ende - BAUMGRENZE.beginn);
  return t < 1 ? t : 1;
}

/**
 * Die Staffage einer einzelnen Fläche.
 *
 * Getrennt von `staffageAus`, weil das Kachelwerk beim Ändern genau diese
 * eine Fläche neu braucht und nicht die ganze Karte.
 */
export function staffageFuerFlaeche(
  f: Kartenfeature,
  stilbuch: Stilbuch,
  kaemme: Gebirgskamm[] = [],
): Staffage[] {
  const eintrag = stilbuch.eintrag(f.art);
  if (!eintrag) return [];

  if (f.art === 'wald') {
    const aus: Staffage[] = [];
    for (const b of baeume(f)) {
      /*
       * **Die Baumgrenze – ausdünnen, dann kümmern, dann nichts mehr.**
       *
       * Gewürfelt wird am **Ort** und nicht in einer Folge: Eine Folge
       * verschöbe jeden Baum dahinter, sobald sich ein Berg bewegt, und aus
       * einer verschobenen Bergflanke würde ein neu gewürfelter Wald.
       *
       * Das Salz liegt weit weg von denen in `wald.ts` (dort 1 bis 9) –
       * zwei Griffe mit demselben Salz an derselben Stelle gäben dieselbe
       * Zahl, und die Ausdünnung hinge dann an der Baumform.
       */
      /*
       * **Eine Zeile, nicht zwei.**
       *
       * Hier stand noch `if (ueber >= 1) continue;` davor – und die
       * Gegenprobe hat gezeigt, dass sie nichts tut: `zahl` liegt immer
       * unter eins, also entfernt der Wurf bei `ueber = 1` ohnehin jeden
       * Baum. Eine Zeile, die nicht scheitern kann, lässt sich auch nicht
       * prüfen; sie gehört weg und nicht mit einem Kommentar versehen.
       */
      const ueber = ueberGrenze(b.x, b.y, kaemme);
      if (ueber > 0 && zahl(f.seed, Math.round(b.x), Math.round(b.y), 991) < ueber) continue;
      const kuemmert = 1 - BAUMGRENZE.kuemmer * ueber;

      aus.push({
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
        /*
         * Wie gross, sagt das Stilbuch – siehe `Stileintrag.hoehe`. Mal dem,
         * was die Höhe davon übrig lässt: Dicht unter der Baumgrenze steht
         * kein ausgewachsener Baum mehr.
         */
        h: b.groesse * eintrag.hoehe * kuemmert,
        dreh: b.neigung,
        /*
         * Spiegeln verdoppelt die Silhouetten und kostet nichts.
         *
         * Aus `rohform` abgeleitet und nicht aus einem neuen Griff in die
         * Zufallskette – ein zusätzlicher Griff verschöbe jeden folgenden
         * Baum. Die zweite Nachkommastelle ist von der Formwahl unabhängig
         * genug, dass gespiegelte und ungespiegelte sich nicht entlang der
         * Varianten sortieren.
         */
        spiegel: Math.floor(b.rohform * 1000) % 2 === 1,
        lage: eintrag.lage,
        ebene: eintrag.ebene,
      });
    }
    return aus;
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
export function staffageAus(
  features: Kartenfeature[],
  stilbuch: Stilbuch,
  kaemme: Gebirgskamm[] = [],
): Staffage[] {
  const aus: Staffage[] = [];
  for (const f of features) aus.push(...staffageFuerFlaeche(f, stilbuch, kaemme));
  aus.sort((a, b) => (a.ebene - b.ebene) || (a.y - b.y));
  return aus;
}
