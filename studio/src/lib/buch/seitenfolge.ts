/**
 * Die Reihenfolge der Seiten – von Hand gesetzt.
 *
 * Bis hierher war die Ordnung eines Buches eine **Folge der Daten**: erst nach
 * Typ, dann nach Kategorie, dann alphabetisch. Für ein Weltbuch ist das
 * richtig – ein Nachschlagewerk soll auffindbar sein, nicht komponiert.
 *
 * Für ein Artbook ist es falsch, und zwar grundsätzlich. Ein gestaltetes Buch
 * lebt davon, was *nach* was kommt: das Panorama vor der Nahaufnahme, die
 * Skizze vor dem fertigen Bild, die stille Seite nach der lauten. Diese
 * Entscheidungen sind die Arbeit. Sie aus dem Alphabet abzuleiten heisst, sie
 * dem Verfasser wegzunehmen.
 *
 * **Der Bruch, um den es geht: Daten und Darstellung sind nicht dasselbe.**
 * Was ein Eintrag *ist*, steht im Eintrag. In welcher Reihenfolge er *steht*,
 * ist eine Eigenschaft des Buches. Deshalb liegt die Folge am Buch und nicht
 * an den Einträgen – zwei Bände, die dieselbe Welt zeigen, dürfen sie
 * verschieden ordnen, ohne einander zu überschreiben. Das ist derselbe
 * Grundsatz, aus dem die Welt vom Buch getrennt wurde, eine Ebene tiefer.
 *
 * **Warum je Kapitel und nicht über das ganze Buch.**
 * Die Kapitel sind das Gerüst: Das Inhaltsverzeichnis, das Register und die
 * Lesezeichen hängen daran. Eine freie Folge über alle Kapitel hinweg wäre
 * keine Ordnung mehr, sondern ihre Abschaffung. Innerhalb eines Kapitels ist
 * dagegen alles erlaubt – und genau dort entscheidet sich, wie ein Artbook
 * sich liest.
 *
 * **Warum eine Liste und keine Nummer am Eintrag.**
 * Eine Sortiernummer („position: 3") klingt einfacher und ist die teurere
 * Lösung: Jedes Verschieben schreibt die halbe Welt neu, und zwei Geräte, die
 * gleichzeitig umsortieren, erzeugen Nummern, die es doppelt gibt. Eine Liste
 * ist ein Wert, der als Ganzes gilt oder gar nicht.
 */

/**
 * Was von einem Eintrag gebraucht wird, um ihn zu ordnen.
 *
 * Nur die Kennung. Damit ist dieses Modul für jede Liste zu haben, die
 * Kennungen trägt – und es kann geprüft werden, ohne ein halbes Buch zu bauen.
 */
export interface Ordenbar {
  id: string;
}

/**
 * Die gesetzte Folge eines Buches: Kapitelkennung → Reihenfolge der Einträge.
 *
 * Ein Kapitel ohne Eintrag in dieser Tabelle hat keine gesetzte Folge und
 * behält die abgeleitete. Das ist der Normalfall und bleibt es.
 */
export type Seitenfolge = Record<string, string[]>;

/**
 * Bringt eine abgeleitete Liste in die gesetzte Folge.
 *
 * Drei Regeln, und die dritte ist die, auf die es ankommt:
 *
 *   1. Was in der Folge steht, kommt in dieser Reihenfolge.
 *   2. Was in der Folge steht, aber nicht mehr existiert, fällt weg.
 *   3. **Was neu ist, kommt ans Ende** – nicht an seinen alphabetischen Platz.
 *
 * Regel 3 sieht nach Nachlässigkeit aus und ist eine Entscheidung. Ein neues
 * Bild mitten in eine von Hand gesetzte Folge einzusortieren hiesse, es an
 * einen Platz zu stellen, den niemand gewählt hat – und zwar unsichtbar,
 * irgendwo zwischen Seite 12 und 13. Hinten steht es da, wo man es sucht,
 * und ein Griff bringt es dahin, wo es hingehört.
 */
export function ordne<T extends Ordenbar>(abgeleitet: T[], folge: string[] | undefined): T[] {
  /*
   * Eine Abkürzung, keine Wache – das Gegenproben hat es gezeigt: Bei einer
   * leeren Folge liefe die Schleife unten ins Leere und der Rest käme in
   * abgeleiteter Ordnung heraus, also genau dasselbe. Die Zeile spart die
   * Arbeit und gibt dieselbe Liste zurück statt einer gleichen Kopie.
   */
  if (!folge || folge.length === 0) return abgeleitet;

  const offen = new Map(abgeleitet.map((e) => [e.id, e]));
  const geordnet: T[] = [];

  for (const id of folge) {
    const gefunden = offen.get(id);
    /*
     * `delete` und nicht bloss überspringen: Eine Folge, in der eine Kennung
     * zweimal steht – aus einer halb geschriebenen Sicherung etwa –, würde
     * den Eintrag sonst doppelt ins Buch setzen.
     */
    if (gefunden) {
      geordnet.push(gefunden);
      offen.delete(id);
    }
  }

  /* Der Rest in seiner abgeleiteten Ordnung, hinten angehängt. */
  for (const e of abgeleitet) {
    if (offen.has(e.id)) geordnet.push(e);
  }

  return geordnet;
}

/**
 * Verschiebt einen Eintrag um einen Platz.
 *
 * Zurück kommt die **vollständige** neue Folge – nicht ein Unterschied, nicht
 * eine Nummer. Wer heute zum ersten Mal etwas verschiebt, hat noch gar keine
 * gesetzte Folge; deshalb wird die sichtbare Reihenfolge hereingereicht und
 * als Ganzes zur Folge. Von da an gilt sie.
 *
 * `undefined` heisst: Es gibt nichts zu tun. Der erste Eintrag kann nicht
 * weiter nach vorn, der letzte nicht weiter nach hinten, und eine Kennung,
 * die gar nicht in der Liste steht, verschiebt nichts. In allen drei Fällen
 * soll nichts geschrieben werden – ein Buch, dessen Änderungsdatum sich beim
 * Antippen eines wirkungslosen Pfeils bewegt, lügt über seine Arbeit.
 */
export function verschiebe(
  sichtbar: string[],
  id: string,
  richtung: -1 | 1,
): string[] | undefined {
  const von = sichtbar.indexOf(id);
  if (von < 0) return undefined;

  const nach = von + richtung;
  if (nach < 0 || nach >= sichtbar.length) return undefined;

  const neu = [...sichtbar];
  neu[von] = neu[nach];
  neu[nach] = id;
  return neu;
}

/**
 * Setzt die Folge eines Kapitels – oder nimmt sie zurück.
 *
 * `undefined` als Folge löscht den Eintrag aus der Tabelle, statt eine leere
 * Liste zu hinterlassen. Der Unterschied ist nicht kosmetisch: Eine leere
 * Liste ist eine gesetzte Folge ohne Inhalt, und `ordne` müsste raten, was
 * gemeint ist. Kein Eintrag heisst eindeutig „abgeleitet, wie immer".
 */
export function setzeFolge(
  bestand: Seitenfolge | undefined,
  kapitelId: string,
  folge: string[] | undefined,
): Seitenfolge | undefined {
  const neu: Seitenfolge = { ...(bestand ?? {}) };

  if (folge && folge.length > 0) neu[kapitelId] = folge;
  else delete neu[kapitelId];

  /*
   * Eine Tabelle ohne Kapitel ist keine. Sie verschwindet, damit ein Buch,
   * dessen Folge man zurückgenommen hat, wieder genauso aussieht wie eines,
   * das nie eine hatte – und in der Sicherung auch so steht.
   */
  return Object.keys(neu).length > 0 ? neu : undefined;
}

/**
 * Weicht die gesetzte Folge von der abgeleiteten ab?
 *
 * Wird gebraucht, um „Zur Buchordnung zurück" nur dann anzubieten, wenn es
 * etwas zurückzunehmen gibt. Eine Handlung, die sichtbar nichts tut, ist
 * schlimmer als keine: Beim zweiten Mal glaubt niemand mehr, dass sie wirkt.
 */
export function abweichend<T extends Ordenbar>(
  abgeleitet: T[],
  folge: string[] | undefined,
): boolean {
  if (!folge || folge.length === 0) return false;
  const gesetzt = ordne(abgeleitet, folge);
  return gesetzt.some((e, i) => e.id !== abgeleitet[i]?.id);
}
