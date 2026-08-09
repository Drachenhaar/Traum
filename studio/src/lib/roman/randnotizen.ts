/**
 * Was am Rand des Manuskripts steht.
 *
 * Drei Dinge, alle drei aus vorhandenen Daten und nach festen Regeln – hier
 * ist keine KI am Werk, und es wird auch keine behauptet. Was diese Datei
 * kann, kann sie, weil Titel Zeichenketten sind und Beziehungen Verben haben.
 *
 *   1. Erkennen, welche Weltbestandteile im Text vorkommen.        (§20)
 *   2. Vorschlagen, welche Beziehung ein Satz behauptet.           (§21)
 *   3. Melden, wenn die Welt zur Szenenzeit etwas anderes sagt.    (§22)
 *
 * Der wichtigste Satz ueber alle drei: **Nichts davon speichert etwas.** Die
 * Funktionen geben Vorschlaege zurueck. Ob daraus Welt wird, entscheidet der
 * Verfasser mit einem Knopfdruck – und wenn er nie drueckt, ist das eine
 * gueltige Antwort, keine offene Aufgabe.
 *
 * Und die Gegenprobe, die den ganzen Ansatz ehrlich haelt: Es wird nie etwas
 * erfunden. Ein Vorschlag entsteht nur, wenn **beide** Enden bereits als
 * Eintrag existieren. „Mara besitzt die Schmiede" wird nicht vorgeschlagen,
 * solange es keine Mara gibt – dann steht dort nichts, und das ist richtig.
 */

import type { Entry, Relation } from '../../types';
import type { RelationIndex } from '../relations';
import { RELATION_TYPES, relationType } from '../relations';
import { DEFAULT_KALENDER, type Kalender, leseZeit, leseZeitraum, ordnung, bestandBei } from '../chronik/zeit';
import { istRomanTeil } from './struktur';

/* ------------------------------------------------------- Wortgrenzen */

/*
 * Warum von Hand und nicht mit `\b`?
 *
 * Zwei Gruende. Erstens ist `\b` in JavaScript an ASCII gebunden: Nach „Mooshalde"
 * stimmt es, nach „Nebelfrü" nicht, weil „ü" fuer die Regex kein Buchstabe ist.
 * Zweitens muesste jeder Titel fuer eine Regex maskiert werden – ein Titel darf
 * aber „Sankt Aelfric (der Zweite)" heissen, und dann faellt das um.
 *
 * Ein Zeichenvergleich hat keins der beiden Probleme.
 */
const BUCHSTABE = /[\p{L}\p{N}]/u;

function istGrenze(text: string, pos: number): boolean {
  if (pos < 0 || pos >= text.length) return true;
  return !BUCHSTABE.test(text[pos]);
}

/** Alle Fundstellen von `nadel` in `heu`, nur an Wortgrenzen. */
function fundstellen(heu: string, nadel: string): number[] {
  if (!nadel) return [];
  const treffer: number[] = [];
  let von = 0;
  for (;;) {
    const i = heu.indexOf(nadel, von);
    if (i < 0) break;
    if (istGrenze(heu, i - 1) && istGrenze(heu, i + nadel.length)) treffer.push(i);
    von = i + nadel.length;
  }
  return treffer;
}

/**
 * Titel, die zu kurz oder zu allgemein sind, um im Fliesstext etwas zu
 * bedeuten. „Er", „Tag", „Haus" wuerden auf jeder Seite anschlagen und die
 * Randspalte in Rauschen verwandeln.
 */
const ZU_KURZ = 3;

function taugtAlsNadel(entry: Entry): boolean {
  const t = entry.title.trim();
  return t.length > ZU_KURZ && !istRomanTeil(entry.type);
}

/* ---------------------------------------------------------- 1. Erkennen */

export interface Vorkommen {
  entry: Entry;
  /** Wie oft der Titel im Text steht. */
  anzahl: number;
  /** Zeichenposition des ersten Vorkommens – fuer „hinspringen". */
  erstePosition: number;
}

/**
 * Welche bekannten Weltbestandteile stehen in diesem Text?
 *
 * Verglichen wird kleingeschrieben, damit „mooshalde" am Satzanfang genauso
 * zaehlt. Das kostet eine Handvoll Fehltreffer bei Titeln, die zufaellig
 * gewoehnliche Woerter sind – dafuer entgeht keiner, der wirklich gemeint war.
 */
export function erkenne(text: string, welt: Entry[]): Vorkommen[] {
  const heu = text.toLowerCase();
  if (!heu.trim()) return [];

  const gefunden: Vorkommen[] = [];
  for (const entry of welt) {
    if (entry.deletedAt || !taugtAlsNadel(entry)) continue;
    const stellen = fundstellen(heu, entry.title.trim().toLowerCase());
    if (stellen.length) {
      gefunden.push({ entry, anzahl: stellen.length, erstePosition: stellen[0] });
    }
  }
  return gefunden.sort((a, b) => a.erstePosition - b.erstePosition);
}

/* -------------------------------------------------------- 2. Vorschlagen */

/**
 * Verbformen je Beziehungsart.
 *
 * Die Beschriftung selbst ist schon eine dritte Person Gegenwart („besitzt",
 * „lebt in"), taugt also unveraendert. Ergaenzt wird nur die Vergangenheit –
 * ein Roman steht meistens in ihr.
 *
 * Bewusst kurz gehalten. Jede zusaetzliche Form erhoeht die Zahl der
 * Vorschlaege und senkt ihre Trefferquote, und ein Vorschlag, der meistens
 * falsch ist, ist schlimmer als keiner: Man hoert auf hinzusehen.
 */
const VERGANGENHEIT: Record<string, string[]> = {
  lives_in: ['lebte in', 'wohnte in', 'wohnt in'],
  contains: ['enthielt'],
  made_of: ['bestand aus'],
  comes_from: ['stammte von', 'stammte aus', 'stammt aus'],
  grows_in: ['wuchs in'],
  uses: ['benutzte', 'benutzten'],
  owns: ['besass', 'besaß', 'gehörte', 'gehoerte'],
  wears: ['trug'],
  ruled: ['herrschte über', 'regierte', 'regierte über'],
  member_of: ['gehörte zu', 'gehoerte zu'],
  married_to: ['heiratete', 'war vermählt mit'],
  parent_of: ['war der Vater von', 'war die Mutter von'],
  causes: ['führte zu', 'fuehrte zu', 'löste aus'],
};

interface Verbform {
  typ: string;
  wort: string;
}

const VERBFORMEN: Verbform[] = RELATION_TYPES.flatMap((def) => [
  { typ: def.id, wort: def.label.toLowerCase() },
  ...(VERGANGENHEIT[def.id] ?? []).map((w) => ({ typ: def.id, wort: w.toLowerCase() })),
])
  /* Lange Formen zuerst: „gehört zu" darf nicht an „gehört" verlorengehen. */
  .sort((a, b) => b.wort.length - a.wort.length);

export interface Vorschlag {
  /** Stabil ueber Neuberechnungen hinweg – die Oberflaeche merkt sich Ignoriertes daran. */
  id: string;
  vonId: string;
  nachId: string;
  typ: string;
  /** Der Satz, aus dem der Vorschlag stammt. Er ist der Beleg. */
  satz: string;
}

/** Grob in Saetze zerlegen. Genauer muss es nicht sein. */
function saetze(text: string): { text: string; von: number }[] {
  const out: { text: string; von: number }[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '.' || c === '!' || c === '?' || c === '\n') {
      const stueck = text.slice(start, i + 1);
      if (stueck.trim()) out.push({ text: stueck, von: start });
      start = i + 1;
    }
  }
  if (text.slice(start).trim()) out.push({ text: text.slice(start), von: start });
  return out;
}

/** Wie weit darf zwischen Verb und Ziel noch stehen? „besitzt die alte Schmiede" */
const LUECKE = 30;

/**
 * Welche Beziehungen behauptet dieser Text, die es noch nicht gibt?
 *
 * Gesucht wird das einfachste denkbare Muster: bekannter Titel, Verb,
 * bekannter Titel – alles im selben Satz. Das erkennt „Mara besitzt die alte
 * Schmiede" und verpasst „Die Schmiede, die Mara vor Jahren erbte, …". Das
 * ist Absicht. Eine Regel, die nur sichere Faelle meldet, darf man ignorieren
 * lernen; eine, die raet, muss man dauernd korrigieren.
 */
export function schlageVor(
  text: string,
  welt: Entry[],
  vorhandene: Relation[],
  grenze = 6,
): Vorschlag[] {
  const kandidaten = welt.filter((e) => !e.deletedAt && taugtAlsNadel(e));
  if (!kandidaten.length || !text.trim()) return [];

  const schonDa = new Set(vorhandene.map((r) => `${r.fromId}>${r.toId}>${r.type}`));
  const gesehen = new Set<string>();
  const out: Vorschlag[] = [];

  for (const satz of saetze(text)) {
    const klein = satz.text.toLowerCase();

    /* Wo steht welcher bekannte Titel in diesem Satz? */
    const stellen: { entry: Entry; von: number; bis: number }[] = [];
    for (const entry of kandidaten) {
      for (const i of fundstellen(klein, entry.title.trim().toLowerCase())) {
        stellen.push({ entry, von: i, bis: i + entry.title.trim().length });
      }
    }
    if (stellen.length < 2) continue;

    for (const { typ, wort } of VERBFORMEN) {
      for (const vi of fundstellen(klein, wort)) {
        const vEnde = vi + wort.length;
        /* Der Naechststehende links vor dem Verb und rechts dahinter. */
        const links = stellen
          .filter((s) => s.bis <= vi)
          .sort((a, b) => b.bis - a.bis)[0];
        const rechts = stellen
          .filter((s) => s.von >= vEnde && s.von - vEnde <= LUECKE)
          .sort((a, b) => a.von - b.von)[0];
        if (!links || !rechts || links.entry.id === rechts.entry.id) continue;

        const schluessel = `${links.entry.id}>${rechts.entry.id}>${typ}`;
        if (schonDa.has(schluessel) || gesehen.has(schluessel)) continue;
        /* Auch die Gegenrichtung zaehlt als vorhanden – es ist dieselbe Kante. */
        if (schonDa.has(`${rechts.entry.id}>${links.entry.id}>${typ}`)) continue;

        gesehen.add(schluessel);
        out.push({
          id: schluessel,
          vonId: links.entry.id,
          nachId: rechts.entry.id,
          typ,
          satz: satz.text.trim(),
        });
        if (out.length >= grenze) return out;
      }
    }
  }
  return out;
}

/** Ein Vorschlag als Satz: „Mara → besitzt → Schmiede". */
export function liesVorschlag(v: Vorschlag, byId: Map<string, Entry>): string {
  const von = byId.get(v.vonId)?.title ?? '?';
  const nach = byId.get(v.nachId)?.title ?? '?';
  return `${von} → ${relationType(v.typ).label} → ${nach}`;
}

/* ------------------------------------------------------ 3. Widerspruch */

export interface Widerspruch {
  entry: Entry;
  /** Was die Welt sagt – als fertiger Satz. */
  text: string;
  art: 'nochNicht' | 'vergangen';
}

/**
 * Was sagt die Welt zur Zeit dieser Szene?
 *
 * Nur ueber Dinge, die diese Szene selbst benennt – Ort, Perspektivfigur,
 * beteiligte Figuren. Der Rest der Welt geht die Szene nichts an.
 *
 * Der Ton ist Absicht: „gilt zu diesem Zeitpunkt als zerstoert" behauptet
 * keinen Fehler. Vielleicht ist die Szene eine Ruecklende, vielleicht irrt
 * der Zeitstrahl, vielleicht steht die Ruine noch. Der Verfasser weiss es,
 * das Programm nicht.
 */
export function pruefeZeit(
  szeneZeit: string | undefined,
  bezuege: Entry[],
  k: Kalender = DEFAULT_KALENDER,
): Widerspruch[] {
  const z = leseZeit(szeneZeit, k);
  if (!z) return [];
  const jetzt = ordnung(z, k);

  const out: Widerspruch[] = [];
  for (const e of bezuege) {
    if (!e.beginn?.trim() && !e.ende?.trim()) continue;
    const raum = leseZeitraum(e.beginn, e.ende, k);
    if (bestandBei(raum, jetzt)) continue;

    const nochNicht = raum.von !== undefined && jetzt < raum.von;
    out.push({
      entry: e,
      art: nochNicht ? 'nochNicht' : 'vergangen',
      text: nochNicht
        ? `${e.title} beginnt in der Welt erst ${e.beginn?.trim()}.`
        : `${e.title} gilt zu diesem Zeitpunkt als vergangen – ${e.ende?.trim()}.`,
    });
  }
  return out;
}

/* --------------------------------------------------------------- Zusammen */

export interface Randnotizen {
  vorkommen: Vorkommen[];
  vorschlaege: Vorschlag[];
  widersprueche: Widerspruch[];
}

export function randnotizen(
  text: string,
  szeneZeit: string | undefined,
  welt: Entry[],
  bezuege: Entry[],
  relationen: Relation[],
  k: Kalender = DEFAULT_KALENDER,
): Randnotizen {
  return {
    vorkommen: erkenne(text, welt),
    vorschlaege: schlageVor(text, welt, relationen),
    widersprueche: pruefeZeit(szeneZeit, bezuege, k),
  };
}

/** Nur fuer den Index gebraucht, aber hier zuhause: Kanten eines Eintrags. */
export function kantenVon(index: RelationIndex, id: string): Relation[] {
  return [...(index.out.get(id) ?? []), ...(index.in.get(id) ?? [])];
}
