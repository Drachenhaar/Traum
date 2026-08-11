/**
 * Die Epochen.
 *
 * „Zeitalter der Ersten Flamme" ist eine Zeitangabe wie „1032" – nur eine,
 * die man sich merken kann. Genau darum geht es: Nicht jede Welt zählt in
 * Jahreszahlen, und wer seine in Zeitaltern zählt, soll den Regler nicht auf
 * „Jahr 487" ziehen müssen, sondern auf „Ära der Nebelkönige".
 *
 * Eine Epoche ist deshalb **kein neuer Datenbestand**, sondern ein Eintrag
 * vom Typ `epoche`. Sie hat `beginn` und `ende` wie jeder andere Eintrag und
 * liegt damit automatisch auf derselben Achse wie alles übrige. Diese Datei
 * liest sie nur heraus und beantwortet zwei Fragen:
 *
 *   Welche Epochen gibt es, in welcher Reihenfolge?
 *   In welcher Epoche liegt dieser Zeitpunkt?
 *
 * Was hier bewusst *nicht* passiert: Es wird keine Epoche erfunden, keine
 * Lücke gefüllt, keine Reihenfolge korrigiert. Epochen dürfen sich
 * überlappen – in einer Welt mit zwei Reichen ist das eher der Normalfall –,
 * und sie dürfen Lücken lassen. Wer eine Zeit ohne Namen hat, hat eine Zeit
 * ohne Namen.
 */

import type { Entry } from '../../types';
import { ordnung, ordnungEnde, schreibeJahr, type Kalender } from '../chronik/zeit';
import { leseZeit } from '../chronik/zeit';
import { vomTyp, type Weltsicht } from './abfrage';

export interface Epoche {
  entry: Entry;
  /** Anfang auf der Achse. `undefined` heißt: seit jeher. */
  von?: number;
  /** Ende auf der Achse. `undefined` heißt: bis heute. */
  bis?: number;
}

/**
 * Alle Epochen dieser Welt, nach ihrem Beginn geordnet.
 *
 * Eine ohne Anfang steht vorn – „seit jeher" ist der früheste denkbare
 * Beginn, und alles andere hieße, die Urzeit ans Ende zu sortieren.
 */
export function epochen(sicht: Weltsicht): Epoche[] {
  return vomTyp(sicht, 'epoche')
    .map((entry) => ({
      entry,
      von: grenze(entry.beginn, sicht.kalender, 'anfang'),
      bis: grenze(entry.ende, sicht.kalender, 'ende'),
    }))
    .sort((a, b) => (a.von ?? Number.NEGATIVE_INFINITY) - (b.von ?? Number.NEGATIVE_INFINITY));
}

function grenze(
  roh: string | undefined,
  k: Kalender,
  seite: 'anfang' | 'ende',
): number | undefined {
  const z = leseZeit(roh, k);
  if (!z) return undefined;
  return seite === 'anfang' ? ordnung(z, k) : ordnungEnde(z, k);
}

/**
 * In welcher Epoche liegt dieser Zeitpunkt?
 *
 * Überlappen sich mehrere, gewinnt die *engste* – wer „Zeitalter der Ersten
 * Flamme" und darin „Der Große Brand" angelegt hat, will beim Ziehen des
 * Reglers den Brand lesen und nicht das Zeitalter. Die genauere Angabe ist
 * immer die nützlichere.
 */
export function epocheBei(liste: Epoche[], zeitpunkt: number): Epoche | undefined {
  const passend = liste.filter(
    (e) =>
      (e.von === undefined || zeitpunkt >= e.von) && (e.bis === undefined || zeitpunkt <= e.bis),
  );
  if (!passend.length) return undefined;
  return passend.reduce((eng, e) => (breite(e) < breite(eng) ? e : eng));
}

function breite(e: Epoche): number {
  if (e.von === undefined || e.bis === undefined) return Number.POSITIVE_INFINITY;
  return e.bis - e.von;
}

/**
 * Wie ein Zeitpunkt heißt.
 *
 * Gibt es eine Epoche, steht ihr Name da – und die Jahreszahl klein daneben,
 * denn beides zusammen ist mehr als eines allein. Gibt es keine, bleibt es
 * bei der Zahl. Kein „Unbekannte Epoche", kein Platzhalter: Eine Welt ohne
 * Zeitalter ist keine unfertige Welt.
 */
export function zeitname(
  liste: Epoche[],
  zeitpunkt: number,
  kalender: Kalender,
): { name?: string; jahr: string } {
  const jahr = schreibeJahr(Math.floor(zeitpunkt / jahrEinheit(kalender)), kalender);
  const e = epocheBei(liste, zeitpunkt);
  return { name: e?.entry.title, jahr };
}

function jahrEinheit(k: Kalender): number {
  return k.monate * k.tage * 24;
}
