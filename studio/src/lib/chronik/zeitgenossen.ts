/**
 * Zeitgenossen.
 *
 * Wer eine Seite datiert, tut es bisher fuer eine Achse im Anhang – weit weg
 * von der Seite selbst. Der Aufwand liegt hier, der Nutzen dort. Genau daran
 * scheitern die meisten Datumsfelder in Software: Niemand fuellt sie aus,
 * weil nichts zurueckkommt.
 *
 * Also kommt etwas zurueck, und zwar auf der Seite selbst: Wer gleichzeitig
 * lebte. Was waehrend dieser Zeit geschah. Was es damals noch nicht gab.
 *
 * Das ist keine neue Datenhaltung – es faellt aus dem Zeitraum ab, den es
 * schon gibt. Und es macht aus zwei Jahreszahlen den Satz, der in jedem
 * guten Weltenbuch steht: *Zu seinen Lebzeiten geschah …*
 */

import type { Entry } from '../../types';
import { type Kalender, type Zeitraum, DEFAULT_KALENDER } from './zeit';
import type { Datierter } from './zustand';

export interface Zeitgenossen {
  /** Was sich zeitlich mit dieser Seite ueberschneidet. */
  gleichzeitig: Datierter[];
  /** Was innerhalb dieser Spanne begann – die Ereignisse ihrer Zeit. */
  begannWaehrend: Datierter[];
  /** Was endete, waehrend es bestand. */
  endeteWaehrend: Datierter[];
}

/** Ueberschneiden sich zwei Zeitraeume? Offene Enden zaehlen als „reicht weiter". */
function ueberschneidet(a: Zeitraum, b: Zeitraum): boolean {
  if (a.von !== undefined && b.bis !== undefined && a.von > b.bis) return false;
  if (b.von !== undefined && a.bis !== undefined && b.von > a.bis) return false;
  return true;
}

/**
 * Die Zeitgenossen einer Seite.
 *
 * `grenze` begrenzt die Ausgabe. Ohne sie stuenden bei einer langlebigen Welt
 * hundert Namen unter jeder Seite, und hundert Namen sind kein Zusammenhang,
 * sondern eine Liste.
 */
export function zeitgenossenVon(
  entry: Entry,
  alle: Datierter[],
  grenze = 8,
  _k: Kalender = DEFAULT_KALENDER,
): Zeitgenossen | undefined {
  const selbst = alle.find((d) => d.entry.id === entry.id);
  if (!selbst?.datiert) return undefined;

  const gleichzeitig: Datierter[] = [];
  const begannWaehrend: Datierter[] = [];
  const endeteWaehrend: Datierter[] = [];

  for (const d of alle) {
    if (d.entry.id === entry.id || !d.datiert) continue;
    if (!ueberschneidet(selbst.zeit, d.zeit)) continue;

    gleichzeitig.push(d);

    const innerhalb = (n: number | undefined) =>
      n !== undefined &&
      (selbst.zeit.von === undefined || n >= selbst.zeit.von) &&
      (selbst.zeit.bis === undefined || n <= selbst.zeit.bis);

    if (innerhalb(d.zeit.von)) begannWaehrend.push(d);
    if (innerhalb(d.zeit.bis)) endeteWaehrend.push(d);
  }

  /*
   * Was zuerst begann, steht zuerst – so liest man eine Zeit. Undatierte
   * Anfaenge (offen nach hinten) gelten als das Aelteste.
   */
  const nachZeit = (a: Datierter, b: Datierter) =>
    (a.zeit.von ?? -Infinity) - (b.zeit.von ?? -Infinity);

  return {
    gleichzeitig: gleichzeitig.sort(nachZeit).slice(0, grenze),
    begannWaehrend: begannWaehrend.sort(nachZeit).slice(0, grenze),
    endeteWaehrend: endeteWaehrend.sort(nachZeit).slice(0, grenze),
  };
}
