/**
 * Was dasteht, wenn nichts dasteht.
 *
 * Eine frisch angelegte Figur hat heute **keine einzige Richtung**. Gemessen:
 * `figurkarte` liefert für sie `{}`. Wer sie in die Tiefe drückt, bekommt
 * nichts – keine Bewegung, keinen Satz, keinen Hinweis. Die Geste läuft ins
 * Leere, und zwar stumm.
 *
 * ---
 *
 * **Warum das geändert wird, obwohl es begründet war.**
 *
 * In `figurkarte.ts` steht der Grundsatz, und er ist richtig: *Eine Richtung
 * offenzuhalten, in der nichts liegt, heisst, dort etwas zu erfinden.* Und in
 * `Register.ts` steht die Gegenüberstellung: Eine fehlende Richtung sei eine
 * **Aussage über die Welt** („um diese Figur herum ist nichts"), ein
 * fehlender Reiter dagegen eine Aussage über das Buch.
 *
 * Der Einwand gegen die eigene Begründung ist dieser: **Die Aussage wird nie
 * ausgesprochen.** Eine Geste, die nichts tut, sagt nicht „hier ist nichts" –
 * sie sagt gar nichts. Der Unterschied zwischen „um sie herum ist nichts" und
 * „die Bedienung ist kaputt" ist für den, der drückt, nicht zu erkennen. Aus
 * einer ehrlichen Auskunft wird auf diesem Weg ein Verdacht.
 *
 * Die Antwort ist deshalb **nicht**, die Richtung mit erfundenem Inhalt zu
 * füllen. Sie ist, die Aussage endlich auszusprechen: Der Raum öffnet sich,
 * und darin steht, was hier stünde. Nichts wird behauptet, was nicht da ist –
 * es wird nur gesagt, dass nichts da ist, und wo man anfinge.
 *
 * ---
 *
 * **Und warum das kein Mahnmal wird.**
 *
 * Gesetz 3 dieses Projekts lautet: *Unvollständigkeit ist kein Fehler. Nichts
 * mahnt, nichts zählt fehlende Felder.* Deshalb steht hier kein „Fülle das
 * aus", kein Fortschrittsbalken, kein „3 von 7". Es steht ein Satz, wie er in
 * einem Buch stünde, in dem eine Seite noch leer ist – und daneben eine
 * einzige, stille Tür.
 *
 * Der Unterschied ist hörbar:
 *
 *     „Noch keine Beziehungen angelegt."   ← ein Formular, das etwas vermisst
 *     „Sie kennt noch niemanden."          ← eine Auskunft über die Welt
 *
 * Der zweite Satz ist ausserdem der wahrere: Er redet von der Figur, nicht
 * von der Datenbank.
 */

import type { Raumkennung } from './tiefenkarte';

/**
 * Was ein leerer Raum sagt.
 *
 * Drei Teile, und jeder hat eine Aufgabe. `sagt` ist die Auskunft über die
 * Welt – ein Satz über die Figur, nie über das Programm. `waere` erklärt, was
 * dieser Ort überhaupt ist, denn wer zum ersten Mal hierherkommt, weiss es
 * noch nicht. `tuer` ist die eine Handlung, die von hier wegführt; mehr als
 * eine wäre schon wieder ein Bedienfeld.
 */
export interface Ersatz {
  /** Die Auskunft. Über die Figur, nicht über das Buch. */
  sagt: string;
  /** Was hier stünde, wenn etwas hier stünde. */
  waere: string;
  /** Die eine stille Tür – oder keine. */
  tuer?: { text: string; ziel: 'eintrag' | 'setzerei' };
}

/**
 * Je Raum ein eigener Satz – und das ist der ganze Punkt.
 *
 * Ein gemeinsames „Hier ist noch nichts." für alle vier Richtungen wäre
 * billiger zu schreiben und würde die Sache verderben: Dann wäre die Tiefe
 * eine Fläche mit vier Türen zu demselben leeren Zimmer. Der Leser soll
 * merken, dass oben etwas anderes fehlt als rechts.
 *
 * `%s` steht für den Namen der Figur. Eingesetzt wird er erst beim Anzeigen –
 * ein Modul, das Sätze baut, soll keine Einträge kennen.
 */
export const ERSATZ: Partial<Record<Raumkennung, Ersatz>> = {
  wissen: {
    sagt: 'Über %s ist noch nichts aufgeschrieben.',
    waere: 'Hier stünde, was man von ihr weiss: woher sie kommt, wie sie spricht, was sie will.',
    tuer: { text: 'Eine erste Zeile schreiben', ziel: 'eintrag' },
  },

  herkunft: {
    sagt: '%s steht noch nirgendwo.',
    waere: 'Hier stünde der Ort, an dem sie lebt, und die Welt, aus der sie kommt.',
    tuer: { text: 'Einen Ort anlegen', ziel: 'setzerei' },
  },

  beziehungen: {
    /*
     * „Kennt noch niemanden" und nicht „hat keine Beziehungen".
     *
     * Das erste ist ein Satz über eine Figur in einer Welt. Das zweite ist ein
     * Satz über eine Tabelle, in der eine Zeile fehlt – und genau so liest es
     * sich auch.
     */
    sagt: '%s kennt noch niemanden.',
    waere: 'Hier stünde, wer ihr nahesteht und wer ihr im Weg steht.',
    tuer: { text: 'Eine Verbindung knüpfen', ziel: 'eintrag' },
  },

  notizen: {
    sagt: 'Von %s ist noch nichts aufbewahrt.',
    waere: 'Hier lägen Erinnerungen, Gewohnheiten und was sie bei sich trägt.',
    tuer: { text: 'Etwas aufbewahren', ziel: 'eintrag' },
  },

  /*
   * Die drei Räume der Beziehungskette bekommen **keine Tür.**
   *
   * Man kommt dorthin nur über eine getroffene Wahl; ein Angebot „lege etwas
   * an" hinge dort in der Luft, weil das Anzulegende erst entsteht, wenn zwei
   * Figuren schon verbunden sind. Ein Satz genügt.
   */
  beziehung: {
    sagt: 'Zwischen den beiden steht noch nichts.',
    waere: 'Hier stünde, was sie verbindet – und seit wann.',
  },

  gemeinsameGeschichte: {
    sagt: 'Die beiden haben noch keine gemeinsame Geschichte.',
    waere: 'Hier stünden die Szenen, in denen beide vorkommen.',
  },
};

/**
 * Den Namen einsetzen – und den Satz auch ohne Namen gültig lassen.
 *
 * Eine Figur ohne Titel gibt es: Sie ist gerade angelegt und noch nicht
 * benannt. „Über  ist noch nichts aufgeschrieben." mit einer Lücke in der
 * Mitte wäre ein sichtbarer Fehler an einer Stelle, die Ruhe ausstrahlen
 * soll. Ohne Namen tritt deshalb „diese Figur" ein.
 */
export function mitNamen(satz: string, name: string | undefined): string {
  const sauber = name?.trim();
  const eingesetzt = satz.replace('%s', sauber || 'diese Figur');
  /* Am Satzanfang wird aus „diese Figur" ein Grossbuchstabe. */
  return eingesetzt.charAt(0).toUpperCase() + eingesetzt.slice(1);
}

/**
 * Was dieser Raum sagt, wenn er leer ist.
 *
 * `undefined` heisst: für diesen Raum ist kein Satz vorgesehen. Dann bleibt
 * es beim allgemeinen Ersatz der Darstellung – erfunden wird hier nichts.
 */
export function ersatzFuer(raum: Raumkennung | undefined): Ersatz | undefined {
  return raum ? ERSATZ[raum] : undefined;
}
