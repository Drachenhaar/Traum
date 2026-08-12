/**
 * Wer was sieht.
 *
 * Ein Beobachter bekommt die Welt und gibt Beobachtungen zurück. Er bekommt
 * keinen Speicher, keine Schreibfunktion und keine Oberfläche – die Trennung
 * von Untersuchen und Verändern ist hier keine Vereinbarung, sondern eine
 * Frage der Erreichbarkeit: In dieser Datei ist nichts importiert, mit dem
 * sich etwas ändern ließe.
 *
 * **Zwei der drei Beobachter sind Anpassungen, kein Neubau.** `welt/regeln.ts`
 * und `spiegel/regeln.ts` untersuchen seit Langem genau das, was der Auftrag
 * beschreibt, und tun es gut. Sie hier nachzubauen hätte zwei Regelwerke
 * ergeben, die dasselbe über dieselbe Welt sagen – mit verschiedenen Worten
 * und verschiedener Sicherheit. Stattdessen übersetzen zwei kurze Funktionen
 * ihre Ergebnisse in die gemeinsame Form.
 *
 * Ein neuer Beobachter ist ein Eintrag in `BEOBACHTER` und sonst nichts.
 */

import type { Entry, Relation } from '../../types';
import { weltsicht } from '../welt/abfrage';
import { WELTREGELN } from '../welt/regeln';
import { spiegle } from '../spiegel/regeln';
import { relationsOf, buildRelationIndex } from '../relations';
import { templateFor } from '../templates';
import type { Beobachtung } from './beobachtung';

export interface Welt {
  entries: Entry[];
  relations: Relation[];
}

export interface Beobachter {
  art: string;
  /** Was dieser Beobachter sucht – für die Stelle, an der man nachlesen will. */
  beschreibung: string;
  sieh: (w: Welt) => Beobachtung[];
}

/* ------------------------------------------- 1 Die Struktur der Welt ----- */

/**
 * Welche Weltregeln einen technischen Zustand melden – und welche nicht.
 *
 * Das Dragoncore-Gesetz, als Liste. Ein Ende vor dem Anfang kann niemand
 * gemeint haben; ein Wesen, das weit von seiner Nahrung lebt, sehr wohl.
 * Nur was hier steht, darf je zu einer Warnung werden.
 *
 * Die Liste ist bewusst kurz und wird es bleiben. Im Zweifel ist etwas
 * schöpferisch – eine Welt, die für ihre Eigenheiten getadelt wird, ist eine
 * Welt, in der man nichts mehr wagt.
 *
 * Hier standen zwei Fehler, und beide waren still:
 *
 * Der Name war falsch – `zeitregeln` heißt die *Variable*, die Regel heißt
 * `zeit`. Die Menge traf also nie zu, und nichts hätte je eine Warnung werden
 * können. Ein System, das nie warnt, sieht genauso aus wie eines, das
 * zurückhaltend ist; gemerkt hätte es niemand.
 *
 * Und die Regel allein genügt nicht. `zeit` meldet beides: „endet vor seinem
 * Anfang" – das kann niemand gemeint haben – und „trägt noch keine Zeit",
 * was in einer wachsenden Welt der Normalzustand ist. Technisch ist deshalb
 * nur der Widerspruch, nie die Lücke.
 */
const TECHNISCHE_REGELN = new Set(['zeit']);

function naturVon(regelId: string, art: 'widerspruch' | 'frage' | 'luecke') {
  return TECHNISCHE_REGELN.has(regelId) && art === 'widerspruch'
    ? ('technisch' as const)
    : ('schoepferisch' as const);
}

const struktur: Beobachter = {
  art: 'weltstruktur',
  beschreibung: 'Zustände, die niemand so gemeint haben kann – und offene Enden.',
  sieh: (w) => {
    const sicht = weltsicht(w.entries, w.relations);
    const aus: Beobachtung[] = [];
    for (const regel of WELTREGELN) {
      let befunde;
      try {
        befunde = regel.pruefe(sicht);
      } catch {
        /* Eine Regel, die stolpert, bringt nicht das ganze Buch zum Schweigen. */
        continue;
      }
      for (const f of befunde) {
        const belege = f.betrifft
          .map((id) => ({ entryId: id, warum: sicht.byId.get(id)?.title ?? '' }))
          .filter((b) => b.warum);
        if (!belege.length) continue;
        aus.push({
          id: `struktur:${f.id}`,
          art: `weltstruktur:${regel.id}`,
          betrifft: f.betrifft[0],
          natur: naturVon(regel.id, f.art),
          stand: 'beobachtung',
          text: f.text,
          belege,
          /*
           * Ein Widerspruch ist sicherer als eine Luecke: Dort steht etwas
           * gegeneinander, hier fehlt nur etwas – und Fehlendes ist in einer
           * wachsenden Welt der Normalzustand.
           */
          zuversicht: f.art === 'widerspruch' ? 0.8 : f.art === 'frage' ? 0.55 : 0.3,
        });
      }
    }
    return aus;
  },
};

/* -------------------------------------------------- 2 Das Werk im Ganzen - */

const werk: Beobachter = {
  art: 'werk',
  beschreibung: 'Was über die ganze Welt hinweg wiederkehrt.',
  sieh: (w) =>
    spiegle({ entries: w.entries, relations: w.relations }).map((b) => ({
      id: `werk:${b.id}`,
      art: `werk:${b.zweck}`,
      natur: 'schoepferisch' as const,
      /*
       * Ein Motiv ist eine Beobachtung, eine Spannung eine Deutung. Der
       * Unterschied steht in der Kennzeichnung und nicht im Ton.
       */
      stand: b.zweck === 'frage' || b.zweck === 'widerspruch' ? 'vermutung' : 'beobachtung',
      text: b.text,
      belege: b.belege.map((id) => ({ entryId: id, warum: b.herkunft })),
      zuversicht: Math.max(0, Math.min(1, b.staerke)),
    })),
};

/* --------------------------------------------- 3 Eine Figur ist gewachsen  */

/** Welche Eintragsarten überhaupt einen Charakterspiegel tragen können. */
export const SPIEGELBAR = ['character'];

/**
 * Wie viel über eine Figur zusammengekommen sein muss.
 *
 * Nicht die Länge ihres Steckbriefs – die kann jemand in fünf Minuten
 * füllen –, sondern wie oft sie *anderswo* vorkommt. Eine Figur, über die
 * viel geschrieben wurde, hat viele Kanten, steht in Ereignissen und trägt
 * Zeit. Genau das macht einen Spiegel aussagekräftig, und genau das kann man
 * zählen.
 */
export interface Gewicht {
  kanten: number;
  ereignisse: number;
  hatZeit: boolean;
  eigenschaften: number;
  /** 0 bis 1 – wie tragfähig ein Spiegel dieser Figur wäre. */
  wert: number;
}

export function gewichtVon(entry: Entry, w: Welt): Gewicht {
  const index = buildRelationIndex(w.relations);
  const byId = new Map(w.entries.map((e) => [e.id, e]));
  const kanten = relationsOf(index, entry.id);
  const ereignisse = kanten.filter((r) => byId.get(r.otherId)?.type === 'event').length;
  const tpl = templateFor(entry.type);
  const eigenschaften = tpl.fields.filter((f) => {
    const v = entry.fields[f.key];
    return Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim().length > 0 : false;
  }).length;
  const hatZeit = Boolean(entry.beginn?.trim() || entry.ende?.trim());

  /*
   * Die Kanten wiegen am schwersten, weil ein Spiegel aus Beziehungen liest.
   * Die Eigenschaften wiegen am wenigsten: Sie sind das, was ohnehin auf der
   * Seite steht – ein Spiegel, der sie wiederholt, ist keiner.
   */
  const wert = Math.min(
    1,
    kanten.length / 10 + ereignisse / 5 + eigenschaften / 12 + (hatZeit ? 0.1 : 0),
  );
  return { kanten: kanten.length, ereignisse, hatZeit, eigenschaften, wert };
}

const figur: Beobachter = {
  art: 'figur',
  beschreibung: 'Figuren, über die außerhalb ihrer eigenen Seite viel entstanden ist.',
  sieh: (w) => {
    const aus: Beobachtung[] = [];
    const index = buildRelationIndex(w.relations);
    const byId = new Map(w.entries.map((e) => [e.id, e]));

    for (const e of w.entries) {
      if (e.deletedAt || !SPIEGELBAR.includes(e.type)) continue;
      const g = gewichtVon(e, w);
      if (g.wert < 0.6) continue;

      /*
       * Die Belege sind hier keine Begruendung, sondern die Sache selbst:
       * genau die Seiten, aus denen der Spiegel spaeter liest. Wer sie
       * anklickt, sieht, worueber geredet wird.
       */
      const belege = relationsOf(index, e.id)
        .map((r) => {
          const anderes = byId.get(r.otherId);
          return anderes && !anderes.deletedAt
            ? { entryId: anderes.id, warum: `${r.label} ${anderes.title}` }
            : null;
        })
        .filter((b): b is { entryId: string; warum: string } => !!b)
        .slice(0, 8);
      if (belege.length < 3) continue;

      aus.push({
        id: `figur:spiegel:${e.id}`,
        art: 'figur:spiegel',
        betrifft: e.id,
        natur: 'schoepferisch',
        stand: 'beobachtung',
        text: `Du hast inzwischen viel über ${e.title} erzählt – auch außerhalb ${e.title}s eigener Seite.`,
        belege,
        zuversicht: g.wert,
      });
    }
    return aus;
  },
};

/* ------------------------------------------------------------------------ */

export const BEOBACHTER: Beobachter[] = [struktur, werk, figur];

/**
 * Alles, was gerade zu sehen ist.
 *
 * Ein Beobachter, der stolpert, nimmt nicht die anderen mit. Das klingt nach
 * Kleinigkeit und ist der Grund, warum ein Fehler in einer Regel hier keine
 * Seite leer lässt.
 */
export function beobachte(w: Welt): Beobachtung[] {
  const aus: Beobachtung[] = [];
  for (const b of BEOBACHTER) {
    try {
      aus.push(...b.sieh(w));
    } catch {
      continue;
    }
  }
  return aus;
}
