/**
 * Die Art eines Buches.
 *
 * Die neue Grundregel lautet: **Die Welt ist gemeinsam. Das Buch bestimmt, wie
 * man sie erlebt.** Diese Datei ist die eine Hälfte davon – die Frage, *was*
 * ein Band ist. Welche Oberfläche daraus folgt, entscheidet der Arbeitsraum;
 * hier steht nur, welche Arten es gibt und woran man sie erkennt.
 *
 * Drei Entscheidungen sind hier gefallen, und alle drei hätten anders
 * ausfallen können:
 *
 * **Erstens: `art` darf fehlen – und ein Buch ohne `art` bleibt, was es war.**
 * Das ist der Unterschied zwischen einem Umbau und einem Überfall. Auf diesen
 * Geräten liegt Arbeit; ein Band, der gestern ein Buch mit allen Werkzeugen
 * war, darf sich nicht über Nacht in einen Schreibraum verwandeln, nur weil
 * ein Programm eine Vermutung hatte. Wer keine Art gewählt hat, bekommt die
 * Oberfläche von gestern, bis er wählt.
 *
 * **Zweitens: Es wird vorgeschlagen, nicht gestempelt.**
 * `vorschlagFuer` liest aus dem vorhandenen Profil, was dieses Buch wohl sein
 * möchte. Das Ergebnis ist ein Vorschlag für eine Frage an den Verfasser und
 * niemals eine Zuweisung. Denselben Weg geht `profilVon` seit jeher – dort
 * steht der Grund ausgeschrieben: Ein abgeleiteter Wert, der in die Datenbank
 * wandert, ist danach nicht mehr von einer Entscheidung zu unterscheiden.
 *
 * **Drittens: Die Art ist grob und bleibt es.**
 * Drei Arten, nicht zwölf. Sie beschreiben nicht das Werk, sondern die
 * Tätigkeit: schreiben, gestalten, spielen. Ein historischer Roman und ein
 * Krimi sind dieselbe Art, weil man an beiden dasselbe tut. Kommen später
 * weitere dazu – ein Drehbuch, ein Kochbuch, ein Lehrbuch –, ist das ein
 * Eintrag in `BUCHARTEN` und ein Arbeitsraum, kein Umbau.
 */

import type { LibraryBook } from '../types';
import type { Absicht } from './profil';
import { profilVon } from './profil';

/* ----------------------------------------------------------- Die Arten ---- */

/**
 * Die Arten, in denen ein Band erscheinen kann.
 *
 * Englische Bezeichner, wie im Auftrag genannt – sie stehen in der Datenbank
 * und in jeder Sicherung, und dort zählt Beständigkeit mehr als Sprache. Was
 * der Verfasser liest, steht in `name` und ist deutsch.
 */
export type Buchart = 'novel' | 'artbook' | 'rpg';

export interface BuchartDef {
  id: Buchart;
  /** Wie sie sich nennt – das Wort unter dem Buch im Regal. */
  name: string;
  /** Die Frage beantwortet, in der ersten Person. */
  satz: string;
  /** Was man darin hauptsächlich tut. Ein Verb, kein Funktionsumfang. */
  taetigkeit: string;
  /**
   * Der Arbeitsraum, der dazu geladen wird.
   *
   * Steht hier und nicht im Router, damit eine neue Art an *einer* Stelle
   * entsteht. Der Router schlägt nur nach.
   */
  raum: 'schreibraum' | 'gestaltung' | 'werkstatt';
}

export const BUCHARTEN: BuchartDef[] = [
  {
    id: 'novel',
    name: 'Roman',
    satz: 'Ich möchte eine Geschichte schreiben.',
    taetigkeit: 'Schreiben',
    raum: 'schreibraum',
  },
  {
    id: 'artbook',
    name: 'Artbook',
    satz: 'Ich möchte meine Welt zeigen.',
    taetigkeit: 'Gestalten',
    raum: 'gestaltung',
  },
  {
    id: 'rpg',
    name: 'D&D / Rollenspiel',
    satz: 'Ich möchte eine Welt zum Spielen bauen.',
    taetigkeit: 'Vorbereiten',
    raum: 'werkstatt',
  },
];

export function buchartById(id: string | undefined): BuchartDef | undefined {
  return BUCHARTEN.find((a) => a.id === id);
}

/** Ist das eine Art, die wir kennen? Alles andere wird wie „keine" behandelt. */
export function istBuchart(wert: unknown): wert is Buchart {
  return typeof wert === 'string' && BUCHARTEN.some((a) => a.id === wert);
}

/* --------------------------------------------------- Was ein Buch ist ----- */

/**
 * Die Art dieses Bandes – oder `undefined`, wenn er keine hat.
 *
 * Bewusst ohne Rückfall. Ein Buch ohne Art ist kein Fehler und kein halber
 * Zustand: Es ist ein Band aus der Zeit vor den Arbeitsräumen, und es soll
 * genau so weiterlaufen wie bisher. Gäbe diese Funktion hier eine Vorgabe
 * zurück, wäre jedes Bestandsbuch am nächsten Morgen ein Roman.
 */
export function buchartVon(buch: Pick<LibraryBook, 'art'> | undefined): Buchart | undefined {
  return istBuchart(buch?.art) ? buch.art : undefined;
}

/**
 * Was dieses Buch wohl sein möchte.
 *
 * Aus dem Profil abgeleitet, das seit jeher an jedem Band hängt. Der Wert
 * dient genau einem Zweck: die Frage vorzubelegen, wenn ein Bestandsbuch zum
 * ersten Mal nach seiner Art gefragt wird. Er wird nie gespeichert und
 * entscheidet nie über eine Oberfläche.
 *
 * `welt` wird zum Artbook und nicht zum Roman: „Orte, Kulturen, Geschichte und
 * Regeln miteinander verbinden" ist ein Weltband, den man ansieht – und von
 * den drei Arten steht das gestaltete Buch dem am nächsten. `entwerfen` wird
 * zum Rollenspiel, weil beide dasselbe wollen: ein System, das man bedient.
 */
const AUS_ABSICHT: Record<Absicht, Buchart> = {
  erzaehlen: 'novel',
  zeigen: 'artbook',
  welt: 'artbook',
  spiel: 'rpg',
  entwerfen: 'rpg',
  /*
   * „Noch offen" wird zum Roman – der leiseste der drei Räume.
   *
   * Wer sich nicht festgelegt hat, soll nicht in der Werkstatt landen. Der
   * Schreibraum ist die Art, die am wenigsten behauptet: eine Seite und ein
   * Anfang. Aus ihm heraus lässt sich alles andere noch entscheiden.
   */
  frei: 'novel',
};

export function vorschlagFuer(buch: Pick<LibraryBook, 'profil' | 'weg'> | undefined): Buchart {
  return AUS_ABSICHT[profilVon(buch).absicht] ?? 'novel';
}

/**
 * Die Absicht, die zu einer Art gehört – die Gegenrichtung.
 *
 * Sie wird gebraucht, weil Dragoncore **zweimal fast dasselbe gefragt hat**:
 * „Was möchtest du erschaffen?" mit sechs Absichten, und gleich danach „Was
 * möchtest du erstellen?" mit drei Arten. Zwei fast gleiche Fragen
 * hintereinander sind genau die Verwirrung, gegen die dieser Umbau antritt.
 *
 * Aufgelöst wird sie in diese Richtung: **Die Art ist die Frage, die Absicht
 * ist die Ableitung.** Die Art entscheidet über den Arbeitsraum und ist damit
 * die folgenreichere; das Profil ordnet nur Werkzeuge und lässt sich in „Mein
 * Buch" jederzeit ändern.
 *
 * Die Zuordnung ist absichtlich nicht die Umkehrung von `AUS_ABSICHT`: Diese
 * ist nicht umkehrbar (zwei Absichten führen auf `artbook`, zwei auf `rpg`).
 * Gewählt wird je Art die Absicht, deren Tiefe und Anmutung am besten passt –
 * ein Roman soll sanft und als Buch erscheinen, eine Kampagne tief.
 */
const ZUR_ABSICHT: Record<Buchart, Absicht> = {
  novel: 'erzaehlen',
  artbook: 'zeigen',
  rpg: 'spiel',
};

export function absichtFuer(art: Buchart | undefined): Absicht {
  return art ? ZUR_ABSICHT[art] : 'frei';
}

/**
 * Die Art, die gilt – gewählt, sonst vorgeschlagen.
 *
 * Für alles, was *irgendeine* Antwort braucht und keine Oberfläche umschaltet:
 * das Wort unter dem Buchrücken, eine Gruppierung im Regal, ein Filter. Wer
 * über die Oberfläche entscheidet, fragt `buchartVon` und behandelt
 * `undefined` als eigenen Fall.
 */
export function artOderVorschlag(buch: LibraryBook | undefined): Buchart {
  return buchartVon(buch) ?? vorschlagFuer(buch);
}

/*
 * Die Welt steht jetzt in `lib/welten.ts`.
 *
 * Sie hat hier gewohnt, solange sie nur eine Kennung an einem Buch war. Seit
 * sie ein eigener Datensatz mit eigenem Namen ist, ist sie die Ebene *über*
 * dem Buch und keine Eigenschaft davon – und dann gehört sie nicht in die
 * Datei, die beschreibt, was ein Buch ist.
 */
