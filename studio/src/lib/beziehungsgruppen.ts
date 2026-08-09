/**
 * Verbindungen nach Fragen ordnen.
 *
 * Eine Seite listet bisher ihre Kanten nach Beschriftung: „beherbergt",
 * „enthaelt", „stand unter", „Schauplatz von". Das ist richtig und bei drei
 * Kanten voellig genug. Bei dreissig ist es eine Liste von Vokabeln.
 *
 * Ein Spielleiter, der einen Ort aufschlaegt, hat aber keine Vokabelfrage. Er
 * hat vier: Wer ist hier? Was ist hier? Wozu gehoert das hier? Was ist hier
 * passiert? Also stehen die Kanten unter diesen Fragen – dieselben Kanten,
 * dieselben Beschriftungen, nur eine Ebene darueber.
 *
 * Zugeordnet wird nach **Art und Richtung**. Das ist der Punkt, an dem eine
 * naive Zuordnung scheitert: „lebt in" und „beherbergt" sind dieselbe Kante,
 * beantworten aber entgegengesetzte Fragen. Von der Figur aus gelesen heisst
 * sie „wo gehoere ich hin", vom Ort aus „wer ist hier".
 */

export interface Beziehungsgruppe {
  id: string;
  /** Die Frage, unter der die Kanten stehen. */
  frage: string;
}

export const BEZIEHUNGSGRUPPEN: Beziehungsgruppe[] = [
  { id: 'wer', frage: 'Wer dazugehört' },
  { id: 'was', frage: 'Was dazugehört' },
  { id: 'wo', frage: 'Wo es hingehört' },
  { id: 'familie', frage: 'Verwandtschaft' },
  { id: 'geschah', frage: 'Was geschah' },
  { id: 'stoff', frage: 'Woraus und wovon' },
];

/** Sammelgruppe fuer kurze Listen: keine Frage, keine Ueberschrift. */
const ALLES: Beziehungsgruppe = { id: 'alles', frage: '' };

/**
 * Ab wie vielen Kanten lohnt sich die zweite Ebene?
 *
 * Darunter ist die Beschriftung selbst schon die Antwort, und eine Frage
 * darueber waere eine Ueberschrift ueber einer einzigen Zeile.
 */
const AB_HIER = 6;

/**
 * Art und Richtung → Gruppe.
 *
 * `true` heisst: die Kante zeigt von dieser Seite fort (sie steht bei `fromId`).
 * Was hier nicht steht, faellt ans Ende – es geht nichts verloren.
 */
const TABELLE: Record<string, { hin: string; her: string }> = {
  lives_in: { hin: 'wo', her: 'wer' },
  contains: { hin: 'was', her: 'wo' },
  made_of: { hin: 'stoff', her: 'was' },
  comes_from: { hin: 'stoff', her: 'was' },
  grows_in: { hin: 'wo', her: 'wer' },
  uses: { hin: 'was', her: 'wer' },
  owns: { hin: 'was', her: 'wer' },
  wears: { hin: 'was', her: 'wer' },
  appears_in: { hin: 'geschah', her: 'wer' },
  created_by: { hin: 'stoff', her: 'was' },
  follows_dna: { hin: 'stoff', her: 'was' },
  variant_of: { hin: 'stoff', her: 'stoff' },
  causes: { hin: 'geschah', her: 'geschah' },
  precedes: { hin: 'geschah', her: 'geschah' },
  parent_of: { hin: 'familie', her: 'familie' },
  married_to: { hin: 'familie', her: 'familie' },
  related: { hin: 'familie', her: 'familie' },
  ruled: { hin: 'was', her: 'wer' },
  member_of: { hin: 'wo', her: 'wer' },
  plays_at: { hin: 'wo', her: 'geschah' },
  pov: { hin: 'wer', her: 'geschah' },
};

export function gruppeVonKante(typ: string, hinaus: boolean): string {
  const eintrag = TABELLE[typ];
  if (!eintrag) return 'stoff';
  return hinaus ? eintrag.hin : eintrag.her;
}

/**
 * Beschriftungsgruppen unter Fragen buendeln.
 *
 * Die Eingabe ist das Ergebnis von `groupRelations` – die vorhandene
 * Gruppierung nach Beschriftung bleibt also unangetastet und wird nur
 * einsortiert. Kurze Listen bekommen eine einzige, namenlose Gruppe.
 */
export function gruppiereBeziehungen<
  T extends { label: string; items: { outgoing: boolean; relation: { type: string } }[] },
>(gruppen: T[]): { gruppe: Beziehungsgruppe; gruppen: T[] }[] {
  const gesamt = gruppen.reduce((n, g) => n + g.items.length, 0);
  if (gesamt < AB_HIER) {
    return gruppen.length ? [{ gruppe: ALLES, gruppen }] : [];
  }

  const nach = new Map<string, T[]>();
  for (const g of gruppen) {
    /*
     * Eine Beschriftungsgruppe ist immer eine Art in einer Richtung –
     * `groupRelations` gruppiert ja genau danach. Der erste Eintrag
     * entscheidet also fuer alle.
     */
    const erster = g.items[0];
    const id = erster ? gruppeVonKante(erster.relation.type, erster.outgoing) : 'stoff';
    if (!nach.has(id)) nach.set(id, []);
    nach.get(id)!.push(g);
  }

  return BEZIEHUNGSGRUPPEN.map((gruppe) => ({ gruppe, gruppen: nach.get(gruppe.id) ?? [] })).filter(
    (x) => x.gruppen.length > 0,
  );
}
