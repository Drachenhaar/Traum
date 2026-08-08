/**
 * Der Zustand der Welt zu einem Zeitpunkt.
 *
 * „Wenn der Benutzer das Jahr 1032 oeffnet, sieht er ausschliesslich
 * Informationen, die bis 1032 existierten." Das ist der Kern – und der Grund,
 * warum es eine reine Funktion ist und keine Ansicht: Karte, Register,
 * Stammbaum und Zeitstrahl muessen alle dieselbe Antwort bekommen, sonst
 * zeigen sie verschiedene Jahrhunderte nebeneinander.
 *
 * Getrennt von Zeitlogik, Darstellung und Pruefung, wie der Auftrag es
 * verlangt: Hier wird nur gerechnet.
 */

import type { Entry, Relation } from '../../types';
import {
  type Kalender,
  type Zeitraum,
  DEFAULT_KALENDER,
  bestandBei,
  leseZeitraum,
} from './zeit';

/** Ein Eintrag mit gelesener Zeit – einmal berechnet, oft gebraucht. */
export interface Datierter {
  entry: Entry;
  zeit: Zeitraum;
  /** Traegt der Eintrag ueberhaupt eine lesbare Zeit? */
  datiert: boolean;
  /** Steht eine Zeit da, die wir nicht deuten konnten? */
  unlesbar: boolean;
}

export function datiere(entries: Entry[], k: Kalender = DEFAULT_KALENDER): Datierter[] {
  return entries
    .filter((e) => !e.deletedAt)
    .map((entry) => {
      const zeit = leseZeitraum(entry.beginn, entry.ende, k);
      const geschrieben = !!(entry.beginn?.trim() || entry.ende?.trim());
      const gelesen = zeit.von !== undefined || zeit.bis !== undefined;
      return {
        entry,
        zeit,
        datiert: gelesen,
        /* Etwas steht da, aber wir konnten es nicht lesen. */
        unlesbar: geschrieben && !gelesen,
      };
    });
}

/**
 * Die Welt zu einem Zeitpunkt.
 *
 * `bestand` – was zu diesem Augenblick existierte.
 * `nochNicht` – was es geben wird, aber noch nicht gibt.
 * `vergangen` – was es gab, aber nicht mehr.
 * `zeitlos` – was keine Zeit traegt. Nicht dasselbe wie „gibt es nicht":
 *   Eine Sprache oder eine Regel der Welt hat oft kein Datum, und sie zu
 *   verschweigen waere falscher, als sie zu zeigen.
 * `unlesbar` – was eine Zeit traegt, die wir nicht deuten konnten. Bewusst
 *   getrennt von `zeitlos`: Der Verfasser *hat* etwas hingeschrieben. Beides
 *   in einen Topf zu werfen ergaebe zwei Zahlen auf derselben Seite, die
 *   einander widersprechen – genau das stand hier vorher.
 */
export interface Weltzustand {
  bei: number;
  bestand: Datierter[];
  nochNicht: Datierter[];
  vergangen: Datierter[];
  zeitlos: Datierter[];
  unlesbar: Datierter[];
  /** Beziehungen, deren beide Enden zu diesem Zeitpunkt bestanden. */
  relationen: Relation[];
}

export function weltzustand(
  datierte: Datierter[],
  relations: Relation[],
  bei: number,
): Weltzustand {
  const bestand: Datierter[] = [];
  const nochNicht: Datierter[] = [];
  const vergangen: Datierter[] = [];
  const zeitlos: Datierter[] = [];
  const unlesbar: Datierter[] = [];

  for (const d of datierte) {
    if (!d.datiert) {
      (d.unlesbar ? unlesbar : zeitlos).push(d);
      continue;
    }
    if (bestandBei(d.zeit, bei)) bestand.push(d);
    else if (d.zeit.von !== undefined && bei < d.zeit.von) nochNicht.push(d);
    else vergangen.push(d);
  }

  /*
   * Eine Beziehung gilt, solange beide Enden bestehen. Das ist eine bewusste
   * Vereinfachung: Beziehungen tragen (noch) keine eigene Zeit. Eine Ehe, die
   * geschieden wurde, waehrend beide weiterlebten, kann das System heute nicht
   * abbilden – das gehoert zur Versionierung, die noch nicht gebaut ist.
   */
  const da = new Set([...bestand, ...zeitlos, ...unlesbar].map((d) => d.entry.id));
  const relationen = relations.filter((r) => da.has(r.fromId) && da.has(r.toId));

  return { bei, bestand, nochNicht, vergangen, zeitlos, unlesbar, relationen };
}

/** Die aeussersten Raender aller datierten Eintraege – die Spanne der Welt. */
export function spanne(datierte: Datierter[]): { von: number; bis: number } | undefined {
  let von = Number.POSITIVE_INFINITY;
  let bis = Number.NEGATIVE_INFINITY;

  for (const d of datierte) {
    if (d.zeit.von !== undefined) {
      von = Math.min(von, d.zeit.von);
      bis = Math.max(bis, d.zeit.von);
    }
    if (d.zeit.bis !== undefined) {
      von = Math.min(von, d.zeit.bis);
      bis = Math.max(bis, d.zeit.bis);
    }
  }

  if (!Number.isFinite(von) || !Number.isFinite(bis)) return undefined;
  return { von, bis };
}
