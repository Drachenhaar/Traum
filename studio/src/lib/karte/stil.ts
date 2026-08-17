/**
 * Der Kartenstil.
 *
 * **Genau einer.** Der Auftrag nennt ihn „Clean Artbook", und die Versuchung,
 * gleich drei zu bauen, ist die falsche: Ein Stil, der stimmt, beweist die
 * Trennung von Daten und Darstellung genauso gut wie drei – und drei halb
 * fertige beweisen nur, dass die Trennung möglich war.
 *
 * Was diese Datei ist: die einzige Stelle, an der eine Farbe steht. Kein
 * Bauteil der Karte kennt einen Farbwert. Wer morgen Sepia will, schreibt
 * dreißig Zeilen hier und ändert kein Datum, keine Fläche, keinen Baum.
 *
 * Und was diese Datei bewusst *nicht* ist: eine Pergamentkarte mit
 * Seeungeheuern und Kompassrose. Dragoncore ist ein Artbook, kein
 * Mittelaltermarkt. Die Karte darf ruhig sein, hell, mit dünnen Linien und
 * wenigen, gedeckten Tönen – so, wie die Buchseiten daneben. Eine Karte, die
 * lauter ist als das Buch, gehört zu einem anderen Buch.
 */

export interface Kartenstil {
  id: string;
  name: string;
  /** Der Grund, auf dem alles liegt. */
  papier: string;
  /** Ein Hauch Struktur darauf – sehr schwach, sonst wird es Textur. */
  koernung: string;
  land: { flaeche: string; linie: string };
  wasser: { flaeche: string; linie: string; saum: string };
  wald: { flaeche: string; linie: string; laub: string; stamm: string };
  /** Was noch nicht fertig ist, während der Finger malt. */
  entwurf: string;
  /** Die Auswahl – nie eine Farbe, immer nur ein Rahmen. */
  wahl: string;
  /** Marken für Flächen, die auf eine Seite zeigen. */
  marke: string;
  /** Linienstärke im Kartenmaß (0…1000). Sehr fein. */
  strich: number;
}

/**
 * Warum diese Töne.
 *
 * Sie stammen aus der Palette des Buches (`tailwind.config.js`) und sind nur
 * dort entsättigt worden, wo eine Fläche groß wird: Ein Wasser im vollen
 * Blau des Buchdeckels würde auf einer halben Seite schreien. Land ist
 * absichtlich fast das Papier selbst – Land ist auf einer Karte kein Ding,
 * sondern das, was übrig bleibt.
 */
export const ARTBOOK: Kartenstil = {
  id: 'artbook',
  name: 'Clean Artbook',
  papier: '#F7F2E8',
  koernung: '#E8DECB',
  land: { flaeche: '#EFE7D4', linie: '#D8CCB4' },
  wasser: { flaeche: '#DCE6E6', linie: '#A9BFC2', saum: '#EDF2F1' },
  wald: { flaeche: '#DFE5D2', linie: '#B4C0A0', laub: '#7A8467', stamm: '#6B6047' },
  entwurf: '#A8853F',
  wahl: '#B8860B',
  marke: '#8C6D31',
  strich: 1.6,
};

export const STILE: Kartenstil[] = [ARTBOOK];

export function stilVon(id: string | undefined): Kartenstil {
  return STILE.find((s) => s.id === id) ?? ARTBOOK;
}

/**
 * Die Reihenfolge der Bedeutungen beim Zeichnen.
 *
 * Nicht die Reihenfolge, in der gemalt wurde. Wer zuerst einen Wald malt und
 * dann das Meer daneben, will nicht, dass das Meer den Wald verdeckt –
 * gemeint ist immer: Land unten, Wasser darauf, Wald zuoberst. Diese eine
 * Zeile ist der Unterschied zwischen „meine Karte" und „meine Malschichten".
 */
export const EBENEN = ['land', 'wasser', 'wald'] as const;
