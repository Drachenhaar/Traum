/**
 * Das Stilbuch – Gestaltung, getrennt von Rendertechnik.
 *
 * ---
 *
 * **Der Vertrag besteht aus einer Methode.**
 *
 * Ein Stileintrag kann zeichnen. Wie, geht niemanden etwas an: Striche,
 * Flächen, ein Bild aus einem Atlas, zwanzig Bilder übereinander. Der Maler
 * fragt nie, welches von beiden – er ruft `zeichne` auf.
 *
 * Daraus folgt alles, was ein Kartenbaukasten braucht:
 *
 *   · Ein Stil darf **mischen**. Artbook darf seine Bäume mit der Feder
 *     zeichnen und seine Berge aus Bildern setzen.
 *   · Ein **neuer Landschaftstyp** ist ein Eintrag. Weder Maler noch
 *     Kachelwerk noch Modell ändern sich.
 *   · **Fehlende Grafiken blockieren nichts.** Solange kein Bild da ist, malt
 *     ein Pinsel, und die Engine steht trotzdem schon richtig.
 *
 * ---
 *
 * **Was hier ausdrücklich *nicht* steht.**
 *
 * Keine feste Zahl Varianten, keine feste Bildgröße, keine Tabelle, die sagt,
 * wie groß ein Berg zu sein hat. Ein Stileintrag nennt seine Variantenzahl
 * selbst, und ein Bild bringt seine Maße mit. Eine Obergrenze hier wäre eine
 * Obergrenze für jede spätere Qualitätsstufe – und die teuerste Sorte Fehler,
 * weil man sie erst bemerkt, wenn man sie überschreiten will.
 *
 * ---
 *
 * **Was hier auch nicht steht: wo etwas liegt.**
 *
 * Die Dichte eines Waldes gehört ins Streuwerk, nicht hierher. Ein Wald ist
 * in jedem Stil derselbe Wald; was der Stil ändert, ist, *wie ein Baum
 * aussieht*. Siehe `staffage.ts`.
 */

import type { Lage, Staffage } from './staffage';
import { EBENE } from './staffage';
import type { Kartenstil } from '../karte/stil';
import { zeichneBaum } from '../../components/karte/baumzeichnung';
import type { Baum } from '../karte/wald';

/**
 * Wie eine Art in einem Stil aussieht.
 *
 * `zeichne` bekommt den Maßstab mit, weil manche Darstellungen ihn brauchen:
 * ein Pinsel, um unterhalb einer Größe zu vereinfachen, ein Bild, um die
 * passende Mipstufe zu wählen. Er ist **Bildpunkte je Karteneinheit**.
 */
export interface Stileintrag {
  /** Wie viele Ausprägungen es gibt. Nach oben offen. */
  varianten: number;
  /** Welche Lage; entscheidet den Zwischenspeicher. */
  lage: Lage;
  /** Grobe Malreihenfolge innerhalb der Lage. */
  ebene: number;
  /**
   * Wie breit dieses Ding im Verhältnis zu seiner Höhe ist – grob.
   *
   * Nur für den Überstand der Kacheln gebraucht: Ein Ding, dessen Fuß
   * ausserhalb einer Kachel liegt, dessen Bild aber hineinragt, muss
   * mitgezeichnet werden. Zu klein angegeben heißt Schnittkanten an den
   * Kachelgrenzen, zu groß heißt überflüssige Arbeit.
   */
  breiteZuHoehe: number;
  /** Zeichnen. Der Maler fragt nicht, wie. */
  zeichne(ctx: CanvasRenderingContext2D, s: Staffage, massstab: number): void;
}

export interface Stilbuch {
  id: string;
  /** Der Eintrag zu einer Art, oder nichts – dann wird sie nicht gezeichnet. */
  eintrag(art: string): Stileintrag | undefined;
  /** Alle Arten, die dieses Stilbuch kennt. */
  arten(): string[];
}

/** Ein Stilbuch aus einer Tabelle von Einträgen. */
export function stilbuchAus(id: string, tabelle: Record<string, Stileintrag>): Stilbuch {
  return {
    id,
    eintrag: (art) => tabelle[art],
    arten: () => Object.keys(tabelle),
  };
}

/* =========================================================== Artbook ===== */

/**
 * Das Stilbuch des heutigen Aussehens.
 *
 * **Es zeichnet genau das, was vorher dastand.** `zeichneBaum` ist dieselbe
 * Funktion wie bisher, mit denselben Argumenten. Diese Etappe überführt die
 * Maschinerie und nicht die Gestaltung: Wer die Karte danach ansieht, soll
 * keinen Unterschied sehen – nur merken, dass sie flüssiger läuft.
 *
 * Die drei Baumformen aus `baumzeichnung.ts` sind hier die drei Varianten.
 * Dass es drei sind und nicht acht, ist eine Angabe dieses Stilbuchs und
 * keine Grenze der Architektur.
 */
export function artbookStilbuch(stil: Kartenstil): Stilbuch {
  return stilbuchAus('artbook', {
    wald: {
      varianten: 3,
      lage: 'bewuchs',
      ebene: EBENE.bewuchs,
      /*
       * Eine Baumkrone ist etwa 0,8 so breit wie der Baum hoch – gemessen an
       * den drei Formen in `baumzeichnung.ts` (die breiteste ist der Busch
       * mit 2 × 0,3 + 0,22). Ein Viertel Zuschlag für die Neigung.
       */
      breiteZuHoehe: 1,
      zeichne(ctx, s, massstab) {
        /*
         * Zurück in die Form, die `zeichneBaum` kennt.
         *
         * Diese Übersetzung ist der ganze Preis dafür, dass die alte
         * Zeichenfunktion unverändert bleibt – und sie ist es wert: Jede
         * Änderung an ihr wäre eine Änderung am Aussehen, und das war in
         * dieser Etappe ausdrücklich nicht die Aufgabe.
         */
        const baum: Baum = {
          x: s.x,
          y: s.y,
          /* `zeichneBaum` rechnet die Höhe aus GROESSE × groesse. */
          groesse: s.h / 15,
          neigung: s.dreh,
          form: s.variante,
        };
        zeichneBaum(ctx, baum, stil, massstab);
      },
    },
  });
}
