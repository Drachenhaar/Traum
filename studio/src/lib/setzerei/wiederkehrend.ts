/**
 * Was in diesem Buch schon einmal dastand.
 *
 * ---
 *
 * **Gewünscht als:** „Die Felder sind zum Ausfüllen, mit der Option,
 * vorgefertigte und wiederkehrende Einträge wieder auszuwählen."
 *
 * Zwei Arten von Angebot, und sie kommen aus zwei verschiedenen Quellen:
 *
 * - **Vorgefertigt** – was die Vorlage vorsieht. Die Rubriken eines Typs, die
 *   Möglichkeiten eines Auswahlfeldes. Das gab es schon: Auswahlfelder setzen
 *   ihre Möglichkeiten längst als Marken.
 * - **Wiederkehrend** – was der Verfasser selbst in diesem Buch schon
 *   geschrieben hat. Wer die dritte Figur anlegt und zum dritten Mal
 *   „Haldenvolk" tippt, hat zweimal zu viel getippt.
 *
 * Diese Datei liefert das Zweite.
 *
 * ---
 *
 * **Nicht jedes Feld darf Vorschläge bekommen.**
 *
 * Das ist die eigentliche Entscheidung hier, und sie ist eine inhaltliche:
 * Ein Vorschlag ergibt nur Sinn, wo Werte sich **wiederholen sollen**. Volk,
 * Zugehörigkeit, Rolle, Klima, Oberfläche, Schlagworte – ja. Beschreibung,
 * Verhalten, Geschichte, Manuskript – nein.
 *
 * Ein Fliesstextfeld mit einer Vorschlagsreihe darunter böte an, den Absatz
 * einer anderen Seite zu übernehmen. Das ist nicht Zeitersparnis, das ist
 * eine Einladung zum Abschreiben der eigenen Welt – und in einem Buch, das
 * von Einzelstücken lebt, das Gegenteil von Hilfe.
 *
 * Deshalb: nur `text`, `tags` und `select`. Alles andere bleibt still.
 *
 * ---
 *
 * **Warum nach Häufigkeit und nicht alphabetisch.**
 *
 * Wer „Haldenvolk" fünfmal geschrieben hat und „Talvolk" einmal, meint beim
 * sechsten Mal wahrscheinlich wieder das erste. Alphabetisch stünde „Talvolk"
 * hinten und „Haldenvolk" auch – die Reihenfolge wäre eine Auskunft über das
 * Alphabet und nicht über dieses Buch.
 */

import type { Entry, EntryType, FieldValue } from '../../types';

/** Ein Angebot: der Wert, und wie oft er in diesem Buch schon dasteht. */
export interface Wiederkehrend {
  wert: string;
  wieOft: number;
}

/**
 * Feldarten, bei denen sich Werte sinnvoll wiederholen.
 *
 * `textarea` fehlt mit Absicht – siehe oben. `palette`, `images`, `entries`
 * und `boolean` fehlen, weil ein Vorschlag dort entweder unmöglich oder
 * sinnlos ist: Zwei Möglichkeiten brauchen keine Liste.
 */
export const VORSCHLAGSARTEN = ['text', 'tags', 'select'] as const;

export function nimmtVorschlaege(kind: string): boolean {
  return (VORSCHLAGSARTEN as readonly string[]).includes(kind);
}

/** Höchstens so viele. Eine Reihe, die umbricht, ist keine Hilfe mehr. */
const HOECHSTENS = 8;

/** Kürzer als das ist kein Wert, sondern ein Tippfehler. */
const MINDESTENS_ZEICHEN = 2;

/**
 * Zu lang für eine Marke.
 *
 * Ein Textfeld kann einen ganzen Satz enthalten – jemand hat in „Rolle"
 * einmal drei Zeilen geschrieben. Als Marke wäre das ein Absatz mit rundem
 * Rand. Was länger ist, wiederholt sich ohnehin nicht.
 */
const HOECHSTENS_ZEICHEN = 42;

/** Die Werte eines Feldes aus einem Eintrag – ein Feld kann mehrere tragen. */
function werteVon(e: Entry, key: string): string[] {
  /*
   * Die Stammangaben liegen nicht in `fields`, sondern am Eintrag selbst.
   * Dieselbe Rautezeichen-Schreibweise wie überall in der Setzerei, damit
   * kein eigenes Feld eines Typs sie treffen kann.
   */
  if (key === '#category') return e.category ? [e.category] : [];
  if (key === '#tags') return e.tags ?? [];
  if (key.startsWith('#')) return [];

  const v: FieldValue | undefined = e.fields?.[key];
  if (typeof v === 'string') return v ? [v] : [];
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
  return [];
}

/**
 * Was in diesem Buch für dieses Feld schon dasteht.
 *
 * Gezählt wird **nur innerhalb desselben Typs**. Das „Volk" einer Figur und
 * das „Volk" einer Kreatur sind zwar derselbe Feldname, aber nicht dieselbe
 * Frage – und ein Vorschlag aus dem falschen Kapitel ist schlimmer als
 * keiner, weil man ihn erst als falsch erkennen muss.
 *
 * @param schon  Was am Feld bereits steht. Es noch einmal anzubieten wäre ein
 *               Knopf, der nichts tut.
 */
export function wiederkehrende(
  entries: Entry[],
  type: EntryType,
  key: string,
  schon: string[] = [],
): Wiederkehrend[] {
  const zaehler = new Map<string, { wert: string; n: number }>();
  const belegt = new Set(schon.map((s) => s.trim().toLowerCase()));

  for (const e of entries) {
    if (e.type !== type || e.deletedAt) continue;
    for (const roh of werteVon(e, key)) {
      const wert = roh.trim();
      if (wert.length < MINDESTENS_ZEICHEN || wert.length > HOECHSTENS_ZEICHEN) continue;
      const schluessel = wert.toLowerCase();
      if (belegt.has(schluessel)) continue;
      /*
       * Gleiche Schreibweise gewinnt, nicht die letzte.
       *
       * „haldenvolk" und „Haldenvolk" sind derselbe Wert; angeboten wird die
       * Schreibweise, die häufiger vorkommt. Sonst schlüge ein einziger
       * Tippfehler die fünfmal richtig geschriebene Fassung.
       */
      const da = zaehler.get(schluessel);
      if (da) da.n += 1;
      else zaehler.set(schluessel, { wert, n: 1 });
    }
  }

  return [...zaehler.values()]
    .sort((a, b) => b.n - a.n || a.wert.localeCompare(b.wert, 'de'))
    .slice(0, HOECHSTENS)
    .map((x) => ({ wert: x.wert, wieOft: x.n }));
}
