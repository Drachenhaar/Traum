/**
 * Die Arbeitsräume.
 *
 * Die zweite Hälfte der Grundregel: **Die Welt ist gemeinsam. Das Buch
 * bestimmt, wie man sie erlebt.** `buchart.ts` sagt, *was* ein Band ist –
 * hier steht, *wohin* das führt.
 *
 * Ein Arbeitsraum ist keine Einstellung und keine Rechteliste. Er ist eine
 * Antwort auf drei Fragen, und zwar für jeden Buchtyp eine eigene:
 *
 *   1. Wo landet man, wenn man das Buch aufschlägt?
 *   2. Was tut man hier hauptsächlich?
 *   3. Was steht am Anfang da, wenn noch nichts da ist?
 *
 * **Warum das eine eigene Datei ist und keine Bedingung im Router:**
 * Der Auftrag schliesst ausdrücklich aus, eine gemeinsame Oberfläche zu bauen,
 * in der je Buchtyp Knöpfe verschwinden. Der Unterschied zwischen beiden
 * Ansätzen ist keine Frage des Ergebnisses, sondern der Richtung: Eine
 * Oberfläche mit Ausnahmen wächst zu einer Oberfläche mit vielen Ausnahmen.
 * Drei Räume, die zufällig Bauteile teilen, bleiben drei Räume. Deshalb steht
 * hier eine Tabelle und keine Kette von `if`.
 *
 * **Was hier bewusst *nicht* steht:** Welche Werkzeuge ein Raum verbirgt. Ein
 * Raum wird dadurch beschrieben, was er ist, nicht dadurch, was er
 * weglässt – sonst wäre die Liste wieder eine Rechteverwaltung, nur anders
 * geschrieben.
 */

import type { Buchart } from './buchart';

/* ------------------------------------------------------- Was ein Raum ist -- */

export interface Arbeitsraum {
  id: 'schreibraum' | 'gestaltung' | 'werkstatt';
  /** Wie er heisst, wenn er benannt werden muss. */
  name: string;
  /**
   * Wo man ankommt, wenn dieses Buch aufgeschlagen wird.
   *
   * Eine Adresse, keine Liste – jeder Raum hat genau eine Tür. Wo genau sie
   * hinführt, kann sich noch ändern; dass es *eine* ist, nicht.
   */
  eingang: string;
  /** Der Satz, der über dem leeren Raum steht. */
  leer: string;
  /**
   * Womit man in einem leeren Buch anfangen kann.
   *
   * Höchstens vier, und beim Roman genau eine: Der Auftrag verlangt, dass ein
   * leeres Buch zeigt, was daraus werden kann – aber ein Schreibraum, der mit
   * vier Angeboten beginnt, ist keiner. Ihm genügt eine Seite.
   */
  anfaenge: { titel: string; ziel: string }[];
}

/* ------------------------------------------------------------ Die Räume ---- */

export const ARBEITSRAEUME: Record<Buchart, Arbeitsraum> = {
  /*
   * Der Roman: eine Seite, ein Anfang.
   *
   * Der Eingang ist das Regal der Manuskripte und nicht der Schreibraum
   * selbst – man muss wissen, in welchem Kapitel man schreibt, bevor man
   * schreibt. Von dort ist es ein Tippen bis zum Text.
   */
  novel: {
    id: 'schreibraum',
    name: 'Schreibraum',
    eingang: '/roman',
    leer: 'Eine leere Seite und ein erster Satz.',
    anfaenge: [{ titel: 'Kapitel 1 beginnen', ziel: '/roman' }],
  },

  /*
   * Das Artbook: der Buchblock, aufgeschlagen.
   *
   * Der Eingang ist das Inhaltsverzeichnis, weil ein Artbook eine Reihenfolge
   * hat und man sie sehen soll. Der Roman käme hier nie hin – er hat ein
   * Manuskript, keinen Satzspiegel.
   */
  artbook: {
    id: 'gestaltung',
    name: 'Gestaltung',
    eingang: '/inhalt',
    leer: 'Noch ist jede Seite leer. Sie zeigen schon, was darauf soll.',
    anfaenge: [
      { titel: 'Einen Ort anlegen', ziel: '/kapitel/architektur' },
      { titel: 'Eine Figur anlegen', ziel: '/kapitel/bewohner' },
      { titel: 'Bilder einlegen', ziel: '/tafelteil' },
      { titel: 'Seiten setzen', ziel: '/setzerei' },
    ],
  },

  /*
   * Das Rollenspielbuch: die Werkbank.
   *
   * Der einzige Raum, in dem Werkzeuge von selbst offen liegen dürfen. Wer
   * eine Runde vorbereitet, sucht nicht nach Stimmung, sondern nach einer
   * Karte, einer Figur und einer Begegnung.
   */
  rpg: {
    id: 'werkstatt',
    name: 'Werkstatt',
    leer: 'Eine Welt zum Bespielen – sie beginnt mit einem von vier Dingen.',
    eingang: '/tisch',
    anfaenge: [
      { titel: 'Charakter erstellen', ziel: '/baukasten' },
      { titel: 'Weltkarte beginnen', ziel: '/weltkarte' },
      { titel: 'Einen Ort erstellen', ziel: '/kapitel/architektur' },
      { titel: 'Erstes Abenteuer anlegen', ziel: '/kapitel/geschichten' },
    ],
  },
};

/**
 * Der Raum zu einer Art – oder keiner.
 *
 * `undefined` ist eine gültige Antwort und bedeutet: **das Buch von gestern.**
 * Ein Band ohne gewählte Art behält die Oberfläche, die er hatte. Gäbe es hier
 * einen Rückfall, wäre die Zusage aus `buchart.ts` gebrochen, und zwar an der
 * einen Stelle, an der es niemandem auffiele.
 */
export function raumFuer(art: Buchart | undefined): Arbeitsraum | undefined {
  return art ? ARBEITSRAEUME[art] : undefined;
}

/**
 * Wo dieses Buch aufgeschlagen wird.
 *
 * Der Rückfall ist die Adresse, die Dragoncore seit jeher benutzt: das
 * Lesebändchen, sonst die Besitzseite. Ein Buch mit Arbeitsraum bekommt
 * dessen Eingang – aber **nur beim ersten Mal**. Danach zählt auch dort das
 * Lesebändchen: Wer beim letzten Mal in Kapitel sieben aufgehört hat, will
 * nicht jedes Mal in der Eingangshalle stehen.
 */
export function eingangFuer(
  art: Buchart | undefined,
  lesebaendchen: string | undefined,
): string {
  if (lesebaendchen) return lesebaendchen;
  return raumFuer(art)?.eingang ?? '/besitz';
}
