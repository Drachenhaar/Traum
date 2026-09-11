/**
 * Das Inhaltsverzeichnis eines Romans – und was daraus gewachsen ist.
 *
 * Der Auftrag beschreibt es genau:
 *
 *     Roman        Prolog · Kapitel 1 · Kapitel 2
 *     Bewohner     Denis · Elara · Marun
 *     Orte         Nebelwald · Mondsee
 *     Gegenstände  Silberner Anhänger
 *
 * Der erste Teil ist das Manuskript. Die drei anderen sind **nicht gepflegt,
 * sondern gelesen**: Sie stehen dort, weil die Namen im Text vorkommen. Wer
 * eine Figur nicht mehr erwähnt, sieht sie hier verblassen – ohne dass er
 * etwas löschen müsste.
 *
 * ---
 *
 * **Drei Ränge, und der Unterschied ist der ganze Sinn.**
 *
 * `imText`     – die Welt kennt es, und es steht im Manuskript.
 * `nurWelt`    – die Welt kennt es, im Manuskript steht es nicht.
 * `nurText`    – im Manuskript steht es, die Welt kennt es nicht.
 *
 * Der dritte ist der wertvolle. Er ist die Antwort auf „Der Autor soll diese
 * Informationen nicht vorher manuell ausfüllen müssen": Was er geschrieben
 * hat, liegt hier und wartet auf einen einzigen Griff.
 *
 * Der zweite ist der ehrlichste. Eine Figur, die in der Welt steht und im
 * Text nicht vorkommt, ist entweder noch nicht dran oder vergessen – und
 * beides soll man sehen können, ohne dass Dragoncore entscheidet, welches.
 */

import type { Entry } from '../../types';
import { erkenne } from './randnotizen';
import { findeNamen, type Namensart, type Namensfund } from './namen';
import { istRomanTeil } from './struktur';

/* ------------------------------------------------------- Die Abteilungen -- */

export interface Abteilung {
  id: Namensart;
  /** Wie sie im Verzeichnis heisst. */
  titel: string;
  /** Welche Eintragsarten hier stehen. */
  typen: Set<string>;
}

/**
 * Die drei Abteilungen des Auftrags – und ausdrücklich nur drei.
 *
 * Ein Roman hat keine Fraktionen, keine Zeitalter, keine Materialien; er hat
 * Menschen, Orte und Dinge. Alles Weitere gibt es in Dragoncore weiterhin und
 * ist über die Kapitel erreichbar – es steht nur nicht im Verzeichnis eines
 * Romans, weil es beim Schreiben nichts beantwortet.
 */
export const ABTEILUNGEN: Abteilung[] = [
  {
    id: 'person',
    titel: 'Bewohner',
    typen: new Set(['character', 'creature', 'animal', 'voice']),
  },
  {
    id: 'ort',
    titel: 'Orte',
    typen: new Set(['location', 'architecture', 'biome']),
  },
  {
    id: 'ding',
    titel: 'Gegenstände',
    typen: new Set(['artifact', 'prop', 'furniture', 'clothing', 'material']),
  },
];

/* --------------------------------------------------------- Das Ergebnis --- */

export interface Bewohnerzeile {
  entry: Entry;
  /** Wie oft der Name im Manuskript steht. Null heisst: gar nicht. */
  anzahl: number;
}

export interface Verzeichnisabteilung {
  id: Namensart;
  titel: string;
  /** Was die Welt kennt und was im Text vorkommt – häufigstes zuerst. */
  imText: Bewohnerzeile[];
  /** Was die Welt kennt und was im Text fehlt. */
  nurWelt: Entry[];
  /** Was im Text steht und die Welt noch nicht kennt. */
  nurText: Namensfund[];
}

export interface Verzeichnis {
  abteilungen: Verzeichnisabteilung[];
  /** Wie viele Vorschläge insgesamt warten – für die Zeile über allem. */
  vorschlaege: number;
}

/**
 * Das Verzeichnis bauen.
 *
 * `manuskript` ist der ganze Text aller Szenen, aneinandergehängt. Bewusst
 * *ein* Text und nicht Szene für Szene: Eine Figur, die in Kapitel eins und
 * in Kapitel sieben vorkommt, ist einmal im Verzeichnis und nicht zweimal.
 */
export function baueVerzeichnis(manuskript: string, welt: Entry[]): Verzeichnis {
  const weltteile = welt.filter((e) => !e.deletedAt && !istRomanTeil(e.type));

  /* Was die Welt kennt und im Text vorkommt. */
  const gefunden = new Map<string, number>();
  for (const v of erkenne(manuskript, weltteile)) gefunden.set(v.entry.id, v.anzahl);

  /* Was im Text steht und die Welt nicht kennt. */
  const funde = findeNamen(manuskript, weltteile);

  const abteilungen = ABTEILUNGEN.map<Verzeichnisabteilung>((a) => {
    const dazu = weltteile.filter((e) => a.typen.has(e.type));
    const imText: Bewohnerzeile[] = [];
    const nurWelt: Entry[] = [];
    for (const e of dazu) {
      const anzahl = gefunden.get(e.id) ?? 0;
      if (anzahl > 0) imText.push({ entry: e, anzahl });
      else nurWelt.push(e);
    }
    return {
      id: a.id,
      titel: a.titel,
      imText: imText.sort(
        (x, y) => y.anzahl - x.anzahl || x.entry.title.localeCompare(y.entry.title, 'de'),
      ),
      nurWelt: nurWelt.sort((x, y) => x.title.localeCompare(y.title, 'de')),
      nurText: funde.filter((f) => f.art === a.id),
    };
  });

  return { abteilungen, vorschlaege: funde.length };
}

/* --------------------------------------------------------- Die Romanspur -- */

/** Eine Szene mit ihrem Kapitel und dem Text darin. */
export interface Szenentext {
  szene: Entry;
  kapitel?: Entry;
  text: string;
}

export interface Spurszene {
  szene: Entry;
  kapitel?: Entry;
  /** Wie oft der Name in dieser Szene steht. */
  anzahl: number;
}

export interface Romanspur {
  /** Wo im Manuskript der Name vorkommt – in Erzählreihenfolge. */
  szenen: Spurszene[];
  /** Wie oft insgesamt. */
  anzahl: number;
  /** Wer und was in denselben Szenen steht – häufigstes zuerst. */
  zusammenMit: { entry: Entry; szenen: number }[];
}

/**
 * Was der Roman über diesen Eintrag weiss.
 *
 * Der Auftrag nennt für die Charakterseite: „Beziehungen, wichtige Orte,
 * wichtige Gegenstände, wichtige Ereignisse, Kapitel, in denen er vorkommt" –
 * und den Satz, auf den es ankommt: **„Der Autor soll diese Informationen
 * nicht vorher manuell ausfüllen müssen."**
 *
 * Hier steht die halbe Antwort darauf. Sie wird *gelesen* und nicht gepflegt:
 * Wer eine Szene umschreibt, ändert damit diese Liste, ohne sie anzufassen.
 * Wer eine Figur aus dem Buch streicht, sieht sie hier verschwinden.
 *
 * **Zusammen vorkommen ist keine Beziehung** – und das ist Absicht. Zwei
 * Figuren in derselben Szene können Geschwister sein, Feinde oder einander
 * nie begegnet. Was hier steht, ist eine Beobachtung („kommt oft zusammen
 * vor"), keine Behauptung. Wer daraus eine Beziehung machen will, sagt es
 * ausdrücklich – dafür gibt es `randnotizen.ts` mit seinen Vorschlägen aus
 * ganzen Sätzen.
 */
export function romanspur(
  entry: Entry,
  welt: Entry[],
  texte: Szenentext[],
): Romanspur {
  /*
   * Ohne Titel gibt es nichts zu suchen.
   *
   * Nicht bloss Sauberkeit: `erkenne` greift auf `entry.title.trim()` zu, und
   * ein Eintrag aus einer älteren Fassung kann gar keinen Titel haben. Hier
   * steht die Wache, die das abfängt.
   */
  const name = entry.title?.trim();
  if (!name) return { szenen: [], anzahl: 0, zusammenMit: [] };

  const nadel = [{ ...entry, title: name }];
  const szenen: Spurszene[] = [];
  let anzahl = 0;

  /*
   * Die anderen Weltbestandteile – ohne den, um den es geht.
   *
   * Mehr wird hier **nicht** gefiltert. Gelöschtes, Romanteile und zu kurze
   * Titel entscheidet `erkenne` selbst, und zwar für das ganze Buch an einer
   * einzigen Stelle. Dieselbe Regel zweimal zu schreiben heisst, sie eines
   * Tages nur einmal zu ändern.
   */
  const andere = welt.filter((e) => e.id !== entry.id);
  const mit = new Map<string, { entry: Entry; szenen: number }>();

  for (const t of texte) {
    const treffer = erkenne(t.text, nadel);
    if (!treffer.length) continue;
    anzahl += treffer[0].anzahl;
    szenen.push({ szene: t.szene, kapitel: t.kapitel, anzahl: treffer[0].anzahl });

    for (const v of erkenne(t.text, andere)) {
      const bisher = mit.get(v.entry.id);
      if (bisher) bisher.szenen++;
      else mit.set(v.entry.id, { entry: v.entry, szenen: 1 });
    }
  }

  return {
    szenen,
    anzahl,
    zusammenMit: [...mit.values()].sort(
      (a, b) => b.szenen - a.szenen || a.entry.title.localeCompare(b.entry.title, 'de'),
    ),
  };
}

/**
 * In welchen Kapiteln kommt diese Figur vor?
 *
 * Der Auftrag nennt das ausdrücklich als Teil der Charakterseite: „Kapitel, in
 * denen er vorkommt." Es wird gelesen und nicht gepflegt – wer eine Szene
 * umschreibt, ändert damit die Liste, ohne sie anzufassen.
 *
 * `teile` sind die Szenen oder Kapitel mit ihrem Text; zurück kommen die, in
 * denen der Titel steht, in der Reihenfolge, in der sie hereingereicht wurden.
 */
export function kommtVorIn(name: string, teile: { entry: Entry; text: string }[]): Entry[] {
  const sauber = name.trim();
  if (!sauber) return [];
  const nadel = [{ id: 'x', title: sauber, type: 'character' } as Entry];
  return teile.filter((t) => erkenne(t.text, nadel).length > 0).map((t) => t.entry);
}
