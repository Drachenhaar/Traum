/**
 * Die Bände zum Ansehen.
 *
 * Eine Liste und nicht zwei Aufrufe, und der Grund steht in der Geschichte
 * dieses Verzeichnisses: Der erste Beispielband stempelte seinen Inhalt nur
 * mit `bookId` und keiner `worldId`. Seit Fassung 8 wird nach Welt geladen –
 * fünfzig herrenlose Einträge fielen beim nächsten Start dem Buch zu, das
 * gerade vorne lag, samt neuer Herkunft. Gemessen: einundfünfzig Einträge in
 * der eigenen Welt statt einem.
 *
 * Ein zweiter Band mit eigener Ladefunktion wäre die zweite Gelegenheit für
 * denselben Fehler gewesen. Deshalb gibt es jetzt **einen** Weg ins Regal, und
 * ein neuer Band ist eine Zeile hier – nicht eine Kopie der Ladelogik.
 *
 * Was ein Band mitbringen muss, steht in `Beispielband` und sonst nirgends.
 */

import type { Entry, LibraryBook, Relation } from '../../types';
import { DRAGONCORE_BUCH, BEISPIEL_TITEL, dragoncore, KANTEN_ANZAHL } from './dragoncore';
import { STILLERSEE_BUCH, SEE_TITEL, stillersee, SEE_KANTEN_ANZAHL } from './stillersee';

export interface Beispielband {
  /** Stabile Kennung – steht in keiner Oberfläche, nur in Prüfungen und Aufrufen. */
  id: string;
  /** Wie er im Regal heisst. */
  titel: string;
  /** Eine Zeile darüber, was er zeigt. Steht im Angebot, nicht im Buch. */
  worum: string;
  /** Einband, Weltname, Zeichen. */
  buch: Partial<LibraryBook>;
  /**
   * Baut Inhalt und Verbindungen.
   *
   * **Beide Kennungen, immer.** `bookId` sagt, wo etwas entstanden ist,
   * `worldId`, wem es gehört. Wer hier eine weglässt, baut den Fehler von
   * oben nach.
   */
  baue: (bookId: string, worldId: string) => { entries: Entry[]; relations: Relation[] };
  /** Wie viele Kanten er beschreibt – die Prüfung zählt gegen diese Zahl. */
  kanten: number;
}

export const BEISPIELBAENDE: Beispielband[] = [
  {
    id: 'dragoncore',
    titel: BEISPIEL_TITEL,
    worum: 'Eine Kette aus Ursachen: ein gefällter Baum, und am Ende schweigt ein Vogel.',
    buch: DRAGONCORE_BUCH,
    baue: dragoncore,
    kanten: KANTEN_ANZAHL,
  },
  {
    id: 'stillersee',
    /*
     * Der zweite Band zeigt bewusst eine **andere Art von Zusammenhang.**
     *
     * Im ersten läuft eine Kette von einer Ursache zu einer Wirkung. Hier
     * hängt alles an einer Dauer: Was sich zeigt, hängt davon ab, wie lange
     * jemand geblieben ist. Zwei Bände, die dasselbe vorführen, wären einer
     * zu viel.
     */
    titel: SEE_TITEL,
    worum: 'Eine Welt, die sich nach Dauer zeigt – drei Minuten, fünf, zehn, und dann das Tal.',
    buch: STILLERSEE_BUCH,
    baue: stillersee,
    kanten: SEE_KANTEN_ANZAHL,
  },
];

/**
 * Einen Band an seiner Kennung finden.
 *
 * Ohne Rückfall auf den ersten: Ein Aufruf mit einer Kennung, die es nicht
 * gibt, ist ein Fehler im Code und keine Lage, aus der man raten sollte –
 * sonst stünde eines Tages der falsche Band im Regal, und niemand wüsste,
 * warum.
 */
export function bandMit(id: string): Beispielband | undefined {
  return BEISPIELBAENDE.find((b) => b.id === id);
}
