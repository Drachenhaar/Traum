/**
 * Ob eine Beobachtung jetzt etwas wert ist.
 *
 * Die Trennung von Zuversicht und Relevanz ist der Kern dieser Datei, und sie
 * ist nicht selbstverständlich: Ein sehr sicheres Muster kann völlig
 * uninteressant sein („diese Seite hat kein Bild"), und ein unsicheres kann
 * genau das sein, worauf jemand seit Wochen wartet.
 *
 * Die Zuversicht gehört der Beobachtung. Die Relevanz gehört dem Augenblick –
 * sie hängt davon ab, was schon gesagt wurde, was weggewinkt wurde und was
 * der Verfasser gerade tut. Deshalb steht sie hier und nicht dort.
 *
 * **Keine feste Schwelle über der ganzen Anwendung.** Der Auftrag verlangt
 * das ausdrücklich, und es ist auch die richtige Bauart: Die Schwellen stehen
 * in `beobachtung.ts` als Stufen, und die Gewichte stehen hier als Zahlen mit
 * Namen. Wer beides verschiebt, verschiebt das Verhalten – und muss dafür
 * keine einzige Regel anfassen.
 */

import type { Beobachtung } from './beobachtung';
import { neigung, type Gedaechtnis } from './gedaechtnis';

/**
 * Was der Verfasser gerade tut.
 *
 * Nicht „wo er ist", sondern „ob er mitten in etwas steckt". Der Unterschied
 * entscheidet, ob ein Anerbieten hilfreich oder eine Unterbrechung ist – und
 * mitten im Schreiben ist jedes Anerbieten eine Unterbrechung, auch das
 * beste.
 */
export interface Lage {
  /** Schreibt, bearbeitet, füllt aus, zieht eine Beziehung. */
  beschaeftigt: boolean;
  /** Wie lange die Seite schon ruhig offensteht, in Millisekunden. */
  verweildauer: number;
  /** Die Seite, auf die er gerade sieht – falls es eine gibt. */
  beiEintrag?: string;
  /** Wie viele Seiten das Buch überhaupt hat. */
  umfang: number;
}

/**
 * Wie lange es ruhig sein muss, bevor überhaupt gesprochen werden darf.
 *
 * Wer eine Seite aufschlägt, will sie lesen. Ein Anerbieten, das mit der
 * Seite zusammen erscheint, konkurriert mit dem, weswegen er gekommen ist.
 */
export const RUHE_MS = 4500;

/**
 * Unter wie vielen Seiten Dragoncore grundsätzlich schweigt.
 *
 * Eine junge Welt hat noch keine Muster, sie hat Anfänge. Was hier als Muster
 * erschiene, wäre ein Zufall in Satzform – und der erste Eindruck von
 * Dragoncore wäre eine Software, die schon etwas zu wissen glaubt, bevor
 * irgendetwas da ist.
 */
export const ZU_JUNG = 12;

export function relevanz(b: Beobachtung, g: Gedaechtnis, lage: Lage): number {
  /* Eine zu junge Welt bringt jede Beobachtung zum Schweigen. */
  if (lage.umfang < ZU_JUNG) return 0;

  /*
   * Beschaeftigt heisst beschaeftigt.
   *
   * Keine Abwaegung, keine „aber es ist wirklich wichtig"-Ausnahme. Ein
   * technischer Befund ist morgen genauso technisch; ein unterbrochener
   * Gedanke kommt nicht wieder.
   */
  if (lage.beschaeftigt) return 0;
  if (lage.verweildauer < RUHE_MS) return 0;

  let wert = b.zuversicht;

  /*
   * Wer hinsieht, meint es.
   *
   * Eine Beobachtung ueber die Seite, die gerade offen liegt, ist etwas
   * anderes als dieselbe Beobachtung ueber eine Seite, an die seit Wochen
   * niemand gedacht hat. Der Zuschlag ist deutlich, weil der Unterschied
   * deutlich ist.
   */
  if (b.betrifft && b.betrifft === lage.beiEintrag) wert += 0.22;
  else if (b.betrifft && lage.beiEintrag) wert -= 0.12;

  /* Mehr Belege heisst mehr dahinter – aber mit abnehmendem Ertrag. */
  wert += Math.min(0.15, (b.belege.length - 1) * 0.04);

  /* Was frueher weggewinkt wurde, wiegt leichter. */
  wert *= neigung(g, b.art);

  /*
   * Eine Deutung wiegt weniger als eine Beobachtung.
   *
   * Nicht weil sie weniger wert waere, sondern weil sie mehr behauptet. Wer
   * mehr behauptet, muss sicherer sein, um dasselbe Gewicht zu bekommen.
   */
  if (b.stand === 'vermutung') wert *= 0.8;

  /*
   * Nach oben nicht gekappt – und das ist keine Nachlaessigkeit.
   *
   * Hier stand `Math.min(1, …)`, und das machte den wichtigsten Zuschlag
   * wirkungslos: Zwei Beobachtungen, die beide ueber 1 landen, kommen als 1
   * und 1 heraus und sind damit gleich gut. Genau das ist passiert – auf
   * Arins Seite gewann eine Beobachtung ueber die ganze Welt gegen die ueber
   * Arin, weil beide oben anstiessen und die Reihenfolge dann der Zufall der
   * Beobachterliste entschied.
   *
   * Die Stufen vergleichen weiter gegen Zahlen zwischen 0 und 1; ein Wert
   * darueber ueberschreitet sie einfach. Nur die Sortierung braucht den
   * Unterschied, und die bekommt ihn jetzt.
   */
  return Math.max(0, wert);
}
