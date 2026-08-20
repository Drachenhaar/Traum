/**
 * Wie eine Seite ihre Tiefe anmeldet.
 *
 * Ein Aufruf, mehr ist es nicht:
 *
 *   useTiefe(
 *     karte({
 *       rechts: tieferWeg('Beteiligte', 'Wer dabei ist', [...]),
 *       oben: weg('Regeln', 'Was gilt', 'Was hier gilt', 'wissen'),
 *     }),
 *   );
 *
 * Was diese Seite nicht nennt, gibt es hier nicht. Kein Rückfall auf
 * „irgendwas Naheliegendes", keine vierte Richtung aus Symmetrie.
 *
 * ---
 *
 * **Warum die Seite anmeldet und nicht das Programm nachschlägt.**
 *
 * Der Unterschied entscheidet, wem die Bedeutung gehört. Ein Nachschlagewerk
 * im Programm – „welche Adresse, also welche Richtungen" – ist ein Menü, das
 * sich als Geste verkleidet, egal wie viele Einträge es hat. Meldet dagegen
 * die Seite an, gehört die Karte dem Werk, das gerade in der Mitte liegt.
 * Eine neue Seite bringt ihre Umgebung mit, statt in einer Tabelle
 * nachgetragen werden zu müssen.
 *
 * Der Rückfall in `tiefenvorlagen.ts` bleibt trotzdem – für Seiten, die noch
 * nichts sagen. Er ist ausdrücklich das Zweitbeste.
 *
 * ---
 *
 * **Der Rückfall liegt in einem eigenen Fach.**
 *
 * `useTiefe(karte, true)` meldet keinen Vorschlag der Seite an, sondern den
 * Grundstock der Hülle. Zwei Fächer statt eines, weil React Kind-Effekte vor
 * Eltern-Effekten abarbeitet: Schrieben beide in dieselbe Stelle, käme der
 * Rückfall der Hülle *nach* der Karte der Seite an und überschriebe sie. Der
 * Vorrang wirkte dann genau verkehrt herum – und man merkte es erst daran,
 * dass eine Seite mit eigener Tiefe sich benimmt wie eine ohne.
 *
 * ---
 *
 * **Warum das Abmelden nicht immer auf `OHNE_TIEFE` zurücksetzt.**
 *
 * Beim Seitenwechsel wird die neue Karte angemeldet, *bevor* die alte
 * Komponente abräumt – React arbeitet in dieser Reihenfolge. Ein Abräumen,
 * das blind leert, löschte also die frisch angemeldete Karte. Deshalb räumt
 * hier nur ab, wer noch dieselbe Karte vorfindet, die er hinterlassen hat.
 *
 * ---
 *
 * **Und niemandem wird die Karte weggezogen, auf der er gerade steht.**
 *
 * Das war der Fehler, der die ganze Charakterseite unbrauchbar machte, und er
 * ist so einfach wie hässlich: Der Tiefenraum *ersetzt* die sichtbare Seite.
 * Wer nach rechts zieht, baut damit genau die Komponente ab, die die Karte
 * angemeldet hat – ihre Abmeldung läuft, die Karte wird gelöscht, und für
 * den Raum, der sich gerade öffnet, gilt plötzlich der Rückfall.
 *
 * Gemessen sah das so aus: Auf der Seite stand `[l1 r3 o1 u1]`, und in dem
 * Augenblick, in dem sich rechts etwas öffnete, stand da `[l1 r1 o· u1]`.
 * Statt „Beziehungen, Tiefe 1 von 3" kam „Wesen, Tiefe 1" – der Raum aus dem
 * Vorrat, nicht der Raum dieser Figur. Die Karte war richtig gebaut, richtig
 * angemeldet und zum falschen Zeitpunkt wieder eingesammelt.
 *
 * Die Regel dagegen ist keine Notlösung, sondern der fehlende Satz: Eine
 * Karte ist erst dann veraltet, wenn niemand mehr in ihr steht. Solange eine
 * Tiefe offen ist, *ist* sie das Betretene und bleibt liegen. Beim Heimkehren
 * wird die sichtbare Seite ohnehin neu gebaut und meldet neu an.
 */

import { useEffect } from 'react';
import { useRaum } from '../../lib/raum/useRaum';
import { OHNE_TIEFE, type Tiefenkarte } from '../../lib/raum/tiefenkarte';

export function useTiefe(karte: Tiefenkarte, alsRueckfall = false): void {
  /*
   * Die Karte hängt an ihrem Inhalt, nicht an ihrer Kennung.
   *
   * Eine Seite baut ihre Karte meist im Rumpf – also bei jedem Durchlauf neu.
   * Hinge dieser Effekt am Objekt, liefe er sechzigmal, während jemand zieht,
   * und schriebe bei jedem Mal in den Speicher. Über den Inhalt verglichen
   * läuft er genau dann, wenn sich wirklich etwas an der Bedeutung ändert.
   */
  const abdruck = JSON.stringify(karte);

  useEffect(() => {
    const gelesen = JSON.parse(abdruck) as Tiefenkarte;
    const setze = alsRueckfall
      ? useRaum.getState().setzeRueckfallkarte
      : useRaum.getState().setzeTiefenkarte;
    setze(gelesen);
    return () => {
      const stand = useRaum.getState();
      /*
       * Steht jemand in der Tiefe, bleibt die Karte liegen – siehe oben.
       * Der Rückfall darf trotzdem abräumen: Er gehört der Hülle, und die
       * bleibt stehen, solange überhaupt etwas zu sehen ist.
       */
      if (!alsRueckfall && stand.tiefe > 0) return;
      const jetzt = alsRueckfall ? stand.rueckfallkarte : stand.tiefenkarte;
      if (JSON.stringify(jetzt) === abdruck) setze(OHNE_TIEFE);
    };
  }, [abdruck, alsRueckfall]);
}
