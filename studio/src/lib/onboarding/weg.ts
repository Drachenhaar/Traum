/**
 * Der Weg durch die Erschaffung.
 *
 * ---
 *
 * **Was hier entschieden wird.**
 *
 * Bis eben war der Weg ein Korridor: Absicht → Buch → **Führung** → Anfang.
 * Dreizehn Klicks bis zum ersten eigenen Wort, sechs davon eine Vorführung an
 * einer fremden Beispielwelt.
 *
 * Die Führung ist gut gemacht – sechs Buchseiten, je ein Gedanke, echte
 * Einträge, und über jeder steht „ein Beispiel, nicht deine Welt". Sie stand
 * nur an der falschen Stelle: **vor** dem eigenen Buch, wo nichts von dem, was
 * sie zeigt, sich an etwas Eigenem festmachen kann. Wer nichts hat, dem kann
 * man nicht zeigen, was mit dem Seinen geschieht.
 *
 * Jetzt ist sie ein **Abstecher**: angeboten genau dort, wo jemand ins Stocken
 * gerät – vor dem leeren Feld „Was existiert in deiner Welt zuerst?" –, und
 * danach steht man wieder vor demselben Feld. Nicht weiter, nicht davor.
 * Zurück an genau der Stelle, die man verlassen hat, nur mit einer Vorstellung
 * mehr.
 *
 * Wer sie überspringt, ist in sieben Klicks im Buch. Wer sie will, hat nichts
 * verloren – sie liegt danach dauerhaft im Anhang.
 *
 * ---
 *
 * **Warum das eine eigene Datei ist.**
 *
 * Es sind vier Zustände und eine Handvoll Übergänge; als `switch` im Bauteil
 * wären sie kürzer. Aber der Satz, um den es hier geht – *die Führung liegt
 * nicht im Pflichtweg, und sie kehrt dorthin zurück, wo sie verlassen wurde* –
 * ist eine Aussage über die Bedienung, keine über die Darstellung. In der
 * `.tsx` wäre sie nur durch Nachklicken zu belegen.
 */

/** Die Abschnitte der Erschaffung. */
export type Abschnitt = 'absicht' | 'buch' | 'fuehrung' | 'anfang';

/** Was gerade geschehen ist. */
export type Schritt =
  /** Die Absicht ist gewählt. */
  | 'gewaehlt'
  /** Das Buch ist gebunden. */
  | 'gebunden'
  /** Jemand möchte erst ein Beispiel sehen. */
  | 'fuehrungGewuenscht'
  /** Die Führung ist zu Ende. */
  | 'fuehrungFertig';

/**
 * Der Pflichtweg – was jeder durchläuft.
 *
 * Die Führung steht hier **nicht** darin, und das ist der ganze Sinn dieser
 * Datei. Wer die Liste erweitert, verlängert den Weg jedes Menschen bis zu
 * seinem ersten Wort; das soll man sehen müssen, während man es tut.
 */
export const PFLICHTWEG: readonly Abschnitt[] = ['absicht', 'buch', 'anfang'];

/**
 * Wohin als Nächstes.
 *
 * Unbekannte Übergänge lassen den Abschnitt stehen, statt irgendwohin zu
 * springen: Ein Weg, der bei einem unerwarteten Ereignis rät, verliert Leute
 * an Stellen, an denen niemand nachsieht.
 */
export function naechsterAbschnitt(jetzt: Abschnitt, was: Schritt): Abschnitt {
  if (jetzt === 'absicht' && was === 'gewaehlt') return 'buch';
  if (jetzt === 'buch' && was === 'gebunden') return 'anfang';
  if (jetzt === 'anfang' && was === 'fuehrungGewuenscht') return 'fuehrung';
  /*
   * Und zurück an genau die Stelle, die verlassen wurde.
   *
   * Nicht ins Buch: Die Führung war eine Antwort auf „ich weiss noch nicht,
   * was ich schreiben soll" – jemanden danach an ihr vorbeizuschicken hiesse,
   * ihm die Frage zu ersparen, die er gerade beantworten wollte.
   */
  if (jetzt === 'fuehrung' && was === 'fuehrungFertig') return 'anfang';
  return jetzt;
}
