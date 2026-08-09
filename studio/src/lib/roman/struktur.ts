/**
 * Die Struktur eines Romans – aus Beziehungen gelesen, nicht aus Feldern.
 *
 * Ein Roman enthaelt Kapitel, ein Kapitel enthaelt Szenen. Beides sind
 * `contains`-Kanten, dieselben, mit denen ein Ort ein Gebaeude enthaelt. Es
 * gibt hier keine Romandatenbank und keine Romanwelt: Eine Szene ist ein
 * Eintrag, ihre Figuren sind Figuren, ihr Ort ist ein Ort.
 *
 * Zwei Ordnungen laufen nebeneinander und duerfen sich widersprechen:
 *
 *   Erzaehlreihenfolge  – `fields.ordnung`, die Reihenfolge im Buch
 *   Weltzeit            – `beginn`/`ende`, wann es in der Welt geschieht
 *
 * Kapitel 7 darf 1038 spielen und Kapitel 8 dann 1012. Eine Ruecklende ist
 * kein Fehler, sondern der Normalfall, sobald jemand ernsthaft erzaehlt.
 */

import type { Entry, Relation } from '../../types';
import type { RelationIndex } from '../relations';
import { asText } from '../templates';

export const ROMAN_TYPEN = ['roman', 'kapitel', 'szene'] as const;

/** Gehoert dieser Eintrag zum Romanteil des Buches? */
export function istRomanTeil(type: string): boolean {
  return (ROMAN_TYPEN as readonly string[]).includes(type);
}

/* ------------------------------------------------------------- Reihenfolge */

/**
 * Die Erzaehlreihenfolge eines Eintrags unter seinen Geschwistern.
 *
 * Bewusst eine schlichte Zahl im Feld statt einer Kantenposition: Sie
 * ueberlebt Export und Import ohne Sonderbehandlung, und wer die Sicherung
 * im Editor oeffnet, sieht sofort, was sie bedeutet.
 */
export function ordnungVon(entry: Entry): number {
  const roh = Number(asText(entry.fields.ordnung));
  return Number.isFinite(roh) ? roh : 0;
}

/** Nach Erzaehlreihenfolge sortieren; bei Gleichstand nach Anlagezeit. */
export function nachOrdnung(liste: Entry[]): Entry[] {
  return [...liste].sort(
    (a, b) => ordnungVon(a) - ordnungVon(b) || a.createdAt - b.createdAt,
  );
}

/** Die naechste freie Position hinter allen Geschwistern. */
export function naechsteOrdnung(geschwister: Entry[]): string {
  const hoechste = geschwister.reduce((max, e) => Math.max(max, ordnungVon(e)), 0);
  return String(hoechste + 1);
}

/**
 * Eine Liste neu durchnummerieren – das Ergebnis einer Verschiebung.
 *
 * Gibt nur die Eintraege zurueck, deren Nummer sich wirklich aendert. Wer
 * alles schreibt, schreibt auch alles in den Verlauf, und dann besteht die
 * Fassungsgeschichte eines Kapitels aus Umsortierungen statt aus Text.
 */
export function neuNummerieren(reihenfolge: Entry[]): { id: string; ordnung: string }[] {
  const aenderungen: { id: string; ordnung: string }[] = [];
  reihenfolge.forEach((e, i) => {
    const soll = String(i + 1);
    if (asText(e.fields.ordnung) !== soll) aenderungen.push({ id: e.id, ordnung: soll });
  });
  return aenderungen;
}

/** Ein Element innerhalb seiner Liste verschieben. */
export function verschiebe<T>(liste: T[], von: number, nach: number): T[] {
  if (von === nach || von < 0 || von >= liste.length) return liste;
  const ziel = Math.min(Math.max(nach, 0), liste.length - 1);
  const kopie = [...liste];
  const [herausgenommen] = kopie.splice(von, 1);
  kopie.splice(ziel, 0, herausgenommen);
  return kopie;
}

/* ------------------------------------------------------------------- Baum */

export interface KapitelKnoten {
  kapitel: Entry;
  szenen: Entry[];
}

export interface RomanBaum {
  roman: Entry;
  kapitel: KapitelKnoten[];
  /** Szenen, die direkt am Roman haengen – ohne Kapitel dazwischen. */
  lose: Entry[];
}

/** Die direkten Kinder eines Knotens: alles, was er `enthaelt`. */
export function kinderVon(
  index: RelationIndex,
  byId: Map<string, Entry>,
  elternId: string,
  type: string,
): Entry[] {
  const kinder: Entry[] = [];
  for (const rel of index.out.get(elternId) ?? []) {
    if (rel.type !== 'contains') continue;
    const kind = byId.get(rel.toId);
    if (kind && !kind.deletedAt && kind.type === type) kinder.push(kind);
  }
  return nachOrdnung(kinder);
}

/** Wo haengt dieser Eintrag? Der erste Elternteil, der ihn `enthaelt`. */
export function elternVon(
  index: RelationIndex,
  byId: Map<string, Entry>,
  kindId: string,
): Entry | undefined {
  for (const rel of index.in.get(kindId) ?? []) {
    if (rel.type !== 'contains') continue;
    const eltern = byId.get(rel.fromId);
    if (eltern && !eltern.deletedAt) return eltern;
  }
  return undefined;
}

export function romanBaum(
  index: RelationIndex,
  byId: Map<string, Entry>,
  romanId: string,
): RomanBaum | null {
  const roman = byId.get(romanId);
  if (!roman || roman.deletedAt) return null;
  return {
    roman,
    kapitel: kinderVon(index, byId, romanId, 'kapitel').map((kapitel) => ({
      kapitel,
      szenen: kinderVon(index, byId, kapitel.id, 'szene'),
    })),
    lose: kinderVon(index, byId, romanId, 'szene'),
  };
}

/** Alle Szenen eines Romans in Erzaehlreihenfolge – quer ueber die Kapitel. */
export function szenenFolge(baum: RomanBaum): Entry[] {
  return [...baum.kapitel.flatMap((k) => k.szenen), ...baum.lose];
}

/* ------------------------------------------------------------------ Woerter */

/**
 * Woerter zaehlen.
 *
 * Getrennt wird an Leerraum, nicht an Wortgrenzen: „Nebel-" am Zeilenende und
 * „Mooshalde" sind zwei Woerter, „18.04.1038" ist eines. Das ist die Zaehlung,
 * die jedes Schreibprogramm benutzt, und darum die, die der Verfasser erwartet.
 */
export function woerter(text: string): number {
  const sauber = text.trim();
  return sauber ? sauber.split(/\s+/).length : 0;
}

export function szeneWoerter(szene: Entry): number {
  return woerter(asText(szene.fields.manuskript));
}

export function baumWoerter(baum: RomanBaum): number {
  return szenenFolge(baum).reduce((summe, s) => summe + szeneWoerter(s), 0);
}

/* ------------------------------------------------------------------ Kontext */

/**
 * Was eine Szene mit der Welt verbindet – aus dem Graphen gelesen.
 *
 * Nichts davon ist doppelt gespeichert. Wer die Figur umbenennt, hat sie
 * hier umbenannt.
 */
export interface SzeneKontext {
  ort?: Entry;
  pov?: Entry;
  figuren: Entry[];
  /** Alles Weltliche zusammen – fuer die Randmarken. */
  weltbezuege: Entry[];
}

export function szeneKontext(
  index: RelationIndex,
  byId: Map<string, Entry>,
  szeneId: string,
): SzeneKontext {
  let ort: Entry | undefined;
  let pov: Entry | undefined;
  const figuren: Entry[] = [];

  const lebend = (id: string): Entry | undefined => {
    const e = byId.get(id);
    return e && !e.deletedAt ? e : undefined;
  };

  for (const rel of index.out.get(szeneId) ?? []) {
    if (rel.type === 'plays_at') ort ??= lebend(rel.toId);
    else if (rel.type === 'pov') pov ??= lebend(rel.toId);
  }
  /* Figuren zeigen auf die Szene, nicht umgekehrt: „erscheint in". */
  for (const rel of index.in.get(szeneId) ?? []) {
    if (rel.type !== 'appears_in') continue;
    const figur = lebend(rel.fromId);
    if (figur) figuren.push(figur);
  }

  const alle = new Map<string, Entry>();
  for (const e of [ort, pov, ...figuren]) if (e) alle.set(e.id, e);
  return { ort, pov, figuren, weltbezuege: [...alle.values()] };
}

/**
 * Die typografische Signatur einer Szene: „Elian · Arven · 1038".
 *
 * Leere Teile fallen weg, statt als Platzhalter dazustehen. Eine Szene ohne
 * Ort ist keine unfertige Szene.
 */
export function signatur(kontext: SzeneKontext, szene: Entry): string {
  return [kontext.pov?.title, kontext.ort?.title, szene.beginn?.trim()]
    .filter(Boolean)
    .join(' · ');
}

/* --------------------------------------------------------------- Kapitelzahl */

const ROEMISCH: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

/** „Kapitel VII" – roemisch, weil ein Kapitel keine Zeilennummer ist. */
export function roemisch(n: number): string {
  if (!Number.isFinite(n) || n < 1 || n > 3999) return String(n);
  let rest = Math.floor(n);
  let out = '';
  for (const [wert, zeichen] of ROEMISCH) {
    while (rest >= wert) {
      out += zeichen;
      rest -= wert;
    }
  }
  return out;
}

/* ----------------------------------------------------------------- Anlegen */

/** Die Kanten, die einen neuen Knoten an seinen Platz haengen. */
export function einhaengen(elternId: string, kindId: string): Pick<Relation, 'fromId' | 'toId' | 'type'> {
  return { fromId: elternId, toId: kindId, type: 'contains' };
}
