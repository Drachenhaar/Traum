/**
 * Die Weltabfrage.
 *
 * Bis hierher hat jede Funktion, die etwas über die Welt wissen wollte, ihren
 * eigenen Weg durch den Graphen gesucht: die Faltkarte anders als das
 * Register, der Zeitstrahl anders als der Spiegel, die Randnotizen anders als
 * die Erkennung. Das ging, solange es fünf Stellen waren. Bei fünfzehn laufen
 * sie auseinander, und dann behauptet dieselbe Welt an zwei Orten
 * Verschiedenes.
 *
 * Diese Datei ist deshalb kein neues System, sondern ein **Dach**. Sie erfindet
 * nichts: `findPath`, `neighbourhood`, `relationsOf`, `weltzustand`, `datiere`
 * gibt es längst und bleiben, wo sie sind. Was hier entsteht, ist eine
 * gemeinsame Sicht auf die Welt und ein gemeinsames Vokabular, mit dem alles
 * Weitere – Regeln, Entdeckungen, Reisen, später die Zeit – dieselbe Frage
 * auch wirklich gleich stellt.
 *
 * Drei Regeln für alles hier drin:
 *
 *   **Nur lesen.** Keine Funktion in dieser Datei ändert je etwas. Wer eine
 *   schreibende Funktion hier hineinschreibt, nimmt der ganzen Schicht ihre
 *   Unbedenklichkeit.
 *
 *   **Einmal rechnen.** Eine `Weltsicht` wird gebaut und dann oft gefragt.
 *   Sie enthält die Indizes, die sonst jede Abfrage neu bauen würde.
 *
 *   **Der Papierkorb zählt nicht.** Was entnommen ist, ist nicht in der Welt.
 */

import type { Entry, Relation, StoredImageMeta } from '../../types';
import {
  buildRelationIndex,
  findPath,
  relationsOf,
  type ReadableRelation,
  type RelationIndex,
} from '../relations';
import { neighbourhood } from '../graph';
import {
  DEFAULT_KALENDER,
  bestandBei,
  jahrLaenge,
  leseZeitraum,
  type Kalender,
} from '../chronik/zeit';
import { datiere, weltzustand, type Datierter, type Weltzustand } from '../chronik/zustand';

/**
 * Alles, was man über diese Welt wissen muss, in einer Hand.
 *
 * Bewusst reine Daten und keine Klasse: Eine Weltsicht lässt sich weitergeben,
 * in einem `useMemo` halten, in einem Test von Hand bauen und in einem
 * Arbeiterprozess verschicken. Eine Klasse mit Methoden könnte nichts davon
 * besser.
 */
export interface Weltsicht {
  /** Alles, auch Entnommenes – für die Chronik und den Papierkorb. */
  alle: Entry[];
  /** Was in der Welt ist. Der Regelfall. */
  lebende: Entry[];
  byId: Map<string, Entry>;
  relations: Relation[];
  index: RelationIndex;
  bilder: StoredImageMeta[];
  /** Die Einträge mit gelesener Zeit – einmal gerechnet. */
  datierte: Datierter[];
  kalender: Kalender;
  /** Nach Typ, damit Regeln nicht jedes Mal filtern. */
  nachTyp: Map<string, Entry[]>;
}

export function weltsicht(
  entries: Entry[],
  relations: Relation[],
  bilder: StoredImageMeta[] = [],
  kalender: Kalender = DEFAULT_KALENDER,
): Weltsicht {
  const lebende = entries.filter((e) => !e.deletedAt);
  const lebt = new Set(lebende.map((e) => e.id));
  /*
   * Kanten, deren Enden im Papierkorb liegen, gehoeren nicht zur Welt.
   * Wuerden sie hierbleiben, faende eine Regel Widersprueche zwischen Dingen,
   * die der Verfasser laengst entfernt hat.
   */
  const echte = relations.filter((r) => lebt.has(r.fromId) && lebt.has(r.toId));

  const nachTyp = new Map<string, Entry[]>();
  for (const e of lebende) {
    const liste = nachTyp.get(e.type);
    if (liste) liste.push(e);
    else nachTyp.set(e.type, [e]);
  }

  return {
    alle: entries,
    lebende,
    byId: new Map(lebende.map((e) => [e.id, e])),
    relations: echte,
    index: buildRelationIndex(echte),
    bilder,
    datierte: datiere(lebende, kalender),
    kalender,
    nachTyp,
  };
}

/* ------------------------------------------------------- Nachschlagen ---- */

export function eintrag(sicht: Weltsicht, id: string): Entry | undefined {
  return sicht.byId.get(id);
}

export function vomTyp(sicht: Weltsicht, ...typen: string[]): Entry[] {
  return typen.flatMap((t) => sicht.nachTyp.get(t) ?? []);
}

/** Alle Beziehungen eines Eintrags, lesbar und in beide Richtungen. */
export function beziehungen(sicht: Weltsicht, id: string): ReadableRelation[] {
  return relationsOf(sicht.index, id);
}

/**
 * Einer Beziehungsart folgen.
 *
 * `hinaus` heißt: in Richtung der Kante, wie sie geschrieben steht
 * („Nebeleiche → wächst in → Nebelwald"). `herein` ist die Gegenrichtung
 * („Nebelwald ← beheimatet ← Nebeleiche"). Das ist die eine Bewegung, aus der
 * jede Regel und jede Reise besteht.
 */
export function folge(
  sicht: Weltsicht,
  id: string,
  art: string,
  richtung: 'hinaus' | 'herein' = 'hinaus',
): Entry[] {
  const kanten = richtung === 'hinaus' ? sicht.index.out.get(id) : sicht.index.in.get(id);
  return (kanten ?? [])
    .filter((r) => r.type === art)
    .map((r) => sicht.byId.get(richtung === 'hinaus' ? r.toId : r.fromId))
    .filter((e): e is Entry => !!e);
}

/** Hat dieser Eintrag überhaupt eine Kante dieser Art? */
export function hatBeziehung(
  sicht: Weltsicht,
  id: string,
  art: string,
  richtung: 'hinaus' | 'herein' | 'egal' = 'egal',
): boolean {
  const raus = (sicht.index.out.get(id) ?? []).some((r) => r.type === art);
  const rein = (sicht.index.in.get(id) ?? []).some((r) => r.type === art);
  if (richtung === 'hinaus') return raus;
  if (richtung === 'herein') return rein;
  return raus || rein;
}

/**
 * Die Umgebung eines Eintrags bis zu einer Tiefe.
 *
 * `neighbourhood` will eine schlichte Nachbarschaftskarte und keinen
 * gerichteten Index – für „wer steht in der Nähe" ist die Richtung
 * gleichgültig. Die Karte entsteht hier, weil sie sonst an drei Stellen
 * entstünde.
 */
export function umgebung(sicht: Weltsicht, id: string, tiefe = 2): Set<string> {
  const nachbarn = new Map<string, Set<string>>();
  const merke = (a: string, b: string) => {
    const s = nachbarn.get(a);
    if (s) s.add(b);
    else nachbarn.set(a, new Set([b]));
  };
  for (const r of sicht.relations) {
    merke(r.fromId, r.toId);
    merke(r.toId, r.fromId);
  }
  return neighbourhood(nachbarn, id, tiefe);
}

/** Der kürzeste Weg von einem Eintrag zum anderen. */
export function pfad(sicht: Weltsicht, von: string, nach: string): string[] | null {
  return findPath(sicht.index, von, nach);
}

/* ------------------------------------------------------------- Lücken ---- */

/**
 * Was von diesen Typen keine Kante dieser Art hat.
 *
 * Die Grundlage jeder Lückenregel: „Eine Pflanze ohne Biom", „ein Gebäude
 * ohne Ort", „ein Material ohne Herkunft". Bewusst eine Funktion und nicht
 * fünf – die Regeln unterscheiden sich nur in ihren Worten.
 */
export function ohneBeziehung(
  sicht: Weltsicht,
  typen: string[],
  art: string,
  richtung: 'hinaus' | 'herein' | 'egal' = 'egal',
): Entry[] {
  return vomTyp(sicht, ...typen).filter((e) => !hatBeziehung(sicht, e.id, art, richtung));
}

/** Was von diesen Typen noch kein einziges Bild trägt. */
export function ohneBild(sicht: Weltsicht, typen: string[]): Entry[] {
  const belegt = new Set<string>();
  for (const m of sicht.bilder) for (const id of m.linkedEntryIds ?? []) belegt.add(id);
  return vomTyp(sicht, ...typen).filter((e) => {
    if (e.coverImage) return false;
    if (belegt.has(e.id)) return false;
    /* Auch ein Bild in einem Feld oder Block zaehlt – sonst meldeten wir
       eine Luecke, die der Verfasser laengst gefuellt hat. */
    for (const wert of Object.values(e.fields)) {
      if (Array.isArray(wert) && wert.some((v) => v.startsWith('img_'))) return false;
    }
    return !e.blocks.some((b) => b.data.imageId || (b.data.imageIds?.length ?? 0) > 0);
  });
}

/* --------------------------------------------------------------- Zeit ---- */

/*
 * Achtung, hier lauert eine Falle – und sie hat mich beim ersten Test
 * erwischt.
 *
 * Die Zeitachse rechnet nicht in Jahren, sondern in **Ordnungszahlen**: Ein
 * Jahr besteht aus Monaten, Tagen und Stunden, damit „Frühjahr 1044" und
 * „12.4.1032" auf derselben Achse liegen können. `1044` ist deshalb *nicht*
 * das Jahr 1044, sondern der 1044. Bruchteil des ersten Jahres.
 *
 * Jede Funktion hier unten nimmt eine Ordnungszahl, und der Parameter heißt
 * auch so. Wer ein Jahr hat, schickt es durch `imJahr` – oder nimmt gleich
 * die `…ImJahr`-Fassung. Ein Parameter namens `jahr`, der keins ist, wäre
 * genau die Art von Lüge, die man erst nach dem dritten Fehlersuchen findet.
 */

/** Ein Jahr als Punkt auf der Achse – der erste Augenblick dieses Jahres. */
export function imJahr(jahr: number, kalender: Kalender = DEFAULT_KALENDER): number {
  return jahr * jahrLaenge(kalender);
}

/** Die Welt zu einem Zeitpunkt. Delegiert – es gibt genau eine Antwort. */
export function zustandBei(sicht: Weltsicht, zeitpunkt: number): Weltzustand {
  return weltzustand(sicht.datierte, sicht.relations, zeitpunkt, sicht.kalender);
}

/** Dasselbe, aber mit einer Jahreszahl, wie ein Mensch sie schreibt. */
export function zustandImJahr(sicht: Weltsicht, jahr: number): Weltzustand {
  return zustandBei(sicht, imJahr(jahr, sicht.kalender));
}

/**
 * Die Beziehungen eines Eintrags zu einem Zeitpunkt.
 *
 * Ohne eigene Zeitangabe gilt eine Beziehung, solange beide Enden bestehen –
 * dieselbe Regel wie im Weltzustand, und deshalb steht sie auch nur dort
 * geschrieben. Hier wird sie nur auf einen Eintrag verengt.
 */
export function beziehungenBei(sicht: Weltsicht, id: string, zeitpunkt: number): Relation[] {
  const zustand = zustandBei(sicht, zeitpunkt);
  const dabei = new Set(zustand.relationen.map((r) => r.id));
  return sicht.relations.filter(
    (r) => dabei.has(r.id) && (r.fromId === id || r.toId === id),
  );
}

/** Bestand dieser Eintrag zu diesem Zeitpunkt? Zeitlose gelten als bestehend. */
export function bestandZu(sicht: Weltsicht, id: string, zeitpunkt: number): boolean {
  const d = sicht.datierte.find((x) => x.entry.id === id);
  if (!d) return false;
  if (!d.datiert) return true;
  return bestandBei(d.zeit, zeitpunkt);
}

/** Galt diese Beziehung zu diesem Zeitpunkt? */
export function galtZu(sicht: Weltsicht, r: Relation, zeitpunkt: number): boolean {
  if (!bestandZu(sicht, r.fromId, zeitpunkt) || !bestandZu(sicht, r.toId, zeitpunkt)) return false;
  if (!r.beginn?.trim() && !r.ende?.trim()) return true;
  return bestandBei(leseZeitraum(r.beginn, r.ende, sicht.kalender), zeitpunkt);
}
