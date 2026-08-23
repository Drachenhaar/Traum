/**
 * Das Daumenregister einer Figur.
 *
 * Sieben Reiter am linken Rand, wie im Referenzbild: Übersicht, Aussehen,
 * Wesen, Vergangenheit, Fähigkeiten, Beziehungen, Zitat.
 *
 * ---
 *
 * **Warum das kein zweites Menü ist – und woran man es erkennen kann.**
 *
 * Der Einwand liegt nahe und er ist ernst gemeint: Living Depth wurde gebaut,
 * *weil* eine Reihe von Registerkarten die falsche Antwort war. Jetzt steht
 * eine Reihe von Registerkarten da. Was ist der Unterschied?
 *
 * Er liegt in der Richtung.
 *
 *   REGISTER  blättert **in** dieser Figur. Übersicht, Aussehen, Wesen,
 *             Vergangenheit – das sind Abschnitte *ihrer eigenen Seite*.
 *             Man bleibt bei ihr, man liest nur woanders.
 *
 *   TIEFE     führt **von** dieser Figur fort. Beziehungen, Herkunft, Wissen,
 *             Notizen – dort stehen andere Einträge, andere Werke, ein
 *             anderer Zusammenhang. Man geht hinaus.
 *
 * Ein Buch kennt beides seit jeher, und niemand verwechselt sie: Man blättert
 * innerhalb eines Kapitels, und man schlägt an anderer Stelle nach. Das
 * Daumenregister ist das Blättern. Die Randgeste ist das Nachschlagen.
 *
 * ---
 *
 * **Die eine Ausnahme, und warum sie richtig ist.**
 *
 * `beziehungen` steht in beiden Listen. Es ist der einzige Reiter, der nach
 * außen zeigt – und er öffnet **denselben Tiefenraum**, den die Geste öffnet.
 * Nicht eine zweite Ansicht davon: dieselbe, mit demselben Anker und
 * demselben Doppeltipp zurück.
 *
 * Das ist kein Widerspruch, sondern der Satz, der in diesem Projekt an
 * mehreren Stellen steht: **eine Wahrheit, mehrere Erscheinungen.** Die Geste
 * ist der schnelle Weg für jemanden, der die Bedienung kennt; der Reiter ist
 * der sichtbare für jemanden, der die App zum ersten Mal aufschlägt. Einen
 * davon wegzunehmen hieße, sich für eine der beiden Personen zu entscheiden.
 *
 * ---
 *
 * **Und der Platz, den beide brauchen.**
 *
 * Das Register liegt am linken Rand – und dort liegt auch der Randstreifen
 * der Geste. Vierunddreißig Punkte, die zweimal vergeben sind.
 *
 * Es löst sich, weil **Tippen nicht Ziehen ist**. Die Raumschicht beansprucht
 * nur Züge; ein Tipp auf einen Knopf hat sie noch nie abgefangen (siehe die
 * Prüfung auf `button` in `Raumschicht.tsx`). Ein Reiter ist ein Knopf. Also:
 * Tipp öffnet das Register, Zug vom selben Punkt öffnet die Herkunft, und
 * keiner der beiden muss dem anderen ausweichen.
 */

import type { Zeichenkennung } from '../../lib/zeichen/zeichen';

export interface Registerblatt {
  id: string;
  /** Wie es am Reiter steht – kurz, denn dort sind sechzig Punkte Platz. */
  name: string;
  /** Das Zeichen darüber. */
  zeichen: Zeichenkennung;
  /**
   * Führt dieser Reiter aus der Seite heraus?
   *
   * Dann öffnet er keinen Abschnitt, sondern den Tiefenraum dieser Richtung –
   * dieselbe Wahrheit, die auch die Geste erreicht.
   */
  hinaus?: 'links' | 'rechts' | 'oben' | 'unten';
}

export const REGISTERBLAETTER: Registerblatt[] = [
  { id: 'uebersicht', name: '\u00dcber\u00adsicht', zeichen: 'wissen' },
  { id: 'aussehen', name: 'Aussehen', zeichen: 'stamm' },
  { id: 'wesen', name: 'Wesen', zeichen: 'freunde' },
  { id: 'vergangenheit', name: 'Vergan\u00adgenheit', zeichen: 'biografie' },
  { id: 'faehigkeiten', name: 'F\u00e4hig\u00adkeiten', zeichen: 'fertigkeiten' },
  /* Der einzige, der hinausführt – siehe oben. */
  { id: 'beziehungen', name: 'Bezie\u00adhungen', zeichen: 'familie', hinaus: 'rechts' },
  { id: 'zitat', name: 'Zitat', zeichen: 'erinnerung' },
];

export const ERSTES_BLATT = REGISTERBLAETTER[0].id;

/** Gibt es zu diesem Blatt überhaupt etwas zu zeigen? */
export type Blattfuellung = Record<string, boolean>;

/**
 * Leere Reiter bleiben stehen – anders als leere Richtungen.
 *
 * Das ist eine bewusste Ausnahme von „nichts erfinden", und der Unterschied
 * ist wichtig genug, ihn zu benennen: Eine fehlende *Richtung* ist eine
 * Aussage über die Welt („um diese Figur herum ist nichts"). Ein fehlender
 * *Abschnitt* wäre eine Aussage über das Buch selbst – und ein Register, bei
 * dem Reiter kommen und gehen, je nachdem wie voll eine Seite gerade ist,
 * ist kein Register mehr, sondern eine wandernde Liste.
 *
 * Ein Buch behält seine Registerkanten, auch wenn ein Kapitel noch leer ist.
 * Der leere Reiter wird nur *stiller* dargestellt und sagt beim Aufschlagen,
 * dass hier noch nichts steht.
 */
export function blattIstStill(fuellung: Blattfuellung, id: string): boolean {
  return fuellung[id] === false;
}
