/**
 * In welcher Reihenfolge ein Buch die Blätter einer Figur aufschlägt.
 *
 * Die Figur ist dieselbe. Elara hat ein Wesen, ein Aussehen, eine
 * Vergangenheit und Fähigkeiten, gleichgültig in welchem Band sie steht – das
 * ist der ganze Sinn einer gemeinsamen Welt. Was sich unterscheidet, ist,
 * **womit man anfängt zu lesen**:
 *
 *   Im Roman        zählt, wer sie ist und was ihr widerfahren ist.
 *   Im Artbook      zählt, wie sie aussieht.
 *   Am Spieltisch   zählt, was sie kann.
 *
 * Das ist der Auftragssatz, angewandt auf eine einzelne Seite: *Die Welt ist
 * gemeinsam. Das Buch bestimmt, wie man sie erlebt.*
 *
 * ---
 *
 * **Reihenfolge und nicht Auswahl – und das ist keine Feinheit.**
 *
 * Der naheliegende Weg wäre, im Roman die Fähigkeiten wegzulassen. Er ist
 * falsch, und zwar aus zwei Gründen, die beide schon im Projekt stehen:
 *
 * Erstens sagt der Auftrag ausdrücklich, es solle nichts gelöscht werden, was
 * später noch gebraucht wird. Eine Romanfigur, die am Spieltisch auftaucht,
 * hat Werte – und wer sie im Roman nicht mehr erreicht, kann sie dort auch
 * nicht mehr eintragen.
 *
 * Zweitens steht in `Register.ts` bereits die Begründung, warum leere Reiter
 * stehenbleiben: *„Ein Register, bei dem Reiter kommen und gehen, ist kein
 * Register mehr, sondern eine wandernde Liste."* Das gilt hier doppelt. Eine
 * Reihenfolge dagegen ist je Buch fest; wer in einem Roman arbeitet, findet
 * die Reiter morgen da, wo sie heute waren.
 *
 * ---
 *
 * **Warum die Übersicht überall vorn bleibt.**
 *
 * Sie ist kein Fachblatt, sondern das Blatt, das die Figur vorstellt – für
 * jeden Buchtyp dasselbe. Ein Buch schlägt man am Anfang auf. Die
 * Unterscheidung beginnt danach, bei dem, was dieses Buch als Zweites
 * wissen will.
 *
 * ---
 *
 * **Und ein Band ohne Buchart bekommt die Reihenfolge von gestern.**
 *
 * Kein Rückfall auf `novel`, kein Raten. Auf diesen Geräten liegt Arbeit; ein
 * Band, der gestern seine Reiter in einer bestimmten Ordnung hatte, hat sie
 * morgen genauso – dieselbe Zusage wie bei `buchartVon`, das bewusst kein
 * Ersatzergebnis liefert.
 */

import type { Buchart } from '../buchart';

/**
 * Was von einem Registerblatt gebraucht wird, um es zu ordnen.
 *
 * Nur die Kennung – damit dieses Modul nichts von Zeichen, Schriften oder
 * React weiss und sich durch blosses Ausführen prüfen lässt.
 */
export interface Blattkennung {
  id: string;
}

/**
 * Die Reihenfolgen je Buchtyp.
 *
 * Jede Zeile nennt **alle** Blätter – nicht als Redundanz, sondern als
 * Zusage: Wer hier eine Kennung vergisst, verliert sie nicht, sie rutscht
 * nur ans Ende (siehe `ordneBlaetter`). Und die Prüfung schlägt an.
 */
export const FOLGEN: Record<Buchart, string[]> = {
  /*
   * Der Roman: erst das Innere, dann die Welt darum.
   *
   * Wesen und Vergangenheit stehen vorn, weil ein Roman von Beweggründen
   * lebt. Das Aussehen kommt spät – nicht weil es unwichtig wäre, sondern
   * weil es im Text entsteht und nicht in einem Formular.
   */
  novel: ['uebersicht', 'wesen', 'vergangenheit', 'beziehungen', 'zitat', 'aussehen', 'faehigkeiten'],

  /*
   * Das Artbook: erst das Sichtbare.
   *
   * Aussehen unmittelbar nach der Übersicht, und das Zitat weit vorn – in
   * einem gestalteten Band ist ein Satz unter einem Bild selbst Gestaltung.
   */
  artbook: ['uebersicht', 'aussehen', 'wesen', 'zitat', 'beziehungen', 'vergangenheit', 'faehigkeiten'],

  /*
   * Der Spieltisch: erst, was sie kann.
   *
   * Fähigkeiten und Beziehungen sind die beiden Blätter, die mitten im Spiel
   * gebraucht werden. Die Vergangenheit ist dort Vorbereitung, kein Nachschlag.
   */
  rpg: ['uebersicht', 'faehigkeiten', 'beziehungen', 'wesen', 'aussehen', 'vergangenheit', 'zitat'],
};

/**
 * Bringt die Blätter in die Reihenfolge dieses Buches.
 *
 * Ohne Buchart bleibt alles, wie es war – dieselbe Liste, nicht bloss eine
 * gleiche. Und was die Reihenfolge nicht nennt, fällt nicht weg, sondern
 * hängt sich hinten an: Ein Blatt, das jemand später hinzufügt, verschwindet
 * so nicht stillschweigend aus drei Buchtypen, bis es jemand bemerkt.
 */
export function ordneBlaetter<T extends Blattkennung>(
  blaetter: readonly T[],
  art: Buchart | undefined,
): T[] {
  if (!art) return [...blaetter];

  const folge = FOLGEN[art];
  const offen = new Map(blaetter.map((b) => [b.id, b]));
  const geordnet: T[] = [];

  for (const id of folge) {
    const b = offen.get(id);
    if (b) {
      geordnet.push(b);
      offen.delete(id);
    }
  }

  /* Der Rest in seiner ursprünglichen Ordnung. */
  for (const b of blaetter) {
    if (offen.has(b.id)) geordnet.push(b);
  }

  return geordnet;
}

/**
 * Womit dieses Buch eine Figur aufschlägt.
 *
 * Das erste Blatt der geordneten Liste – es gibt keine zweite Quelle dafür.
 * Stünde hier eine eigene Tabelle, könnte sie eines Tages ein Blatt nennen,
 * das die Reihenfolge gar nicht mehr enthält.
 */
export function erstesBlattFuer<T extends Blattkennung>(
  blaetter: readonly T[],
  art: Buchart | undefined,
): string | undefined {
  return ordneBlaetter(blaetter, art)[0]?.id;
}
