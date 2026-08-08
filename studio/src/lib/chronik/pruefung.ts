/**
 * Was der Chronik auffaellt.
 *
 * Der Auftrag verlangt, dass hier niemals Fakten erfunden werden – nur
 * Widersprueche erkannt, Luecken gezeigt, Fragen gestellt. Genau deshalb sind
 * das feste Regeln und keine Maschine, die Text errät: Eine Regel kann
 * irren, aber sie kann sich nichts ausdenken. Sie prueft, was dasteht, gegen
 * das, was ebenfalls dasteht.
 *
 * Und sie aendert nie etwas. Jeder Befund ist eine Frage an den Verfasser,
 * keine Korrektur. „Die Kontrolle bleibt immer beim Benutzer."
 */

import type { Relation } from '../../types';
import type { Datierter } from './zustand';
import { type Kalender, DEFAULT_KALENDER, schreibeZeit } from './zeit';

export interface Befund {
  id: string;
  /** Wie dringend – `frage` ist ein Hinweis, `widerspruch` ein echter Konflikt. */
  art: 'widerspruch' | 'frage' | 'luecke';
  /** Die betroffenen Eintraege, der erste ist der Hauptbetroffene. */
  betrifft: string[];
  text: string;
}

/**
 * Alle Regeln an einem Ort.
 *
 * Eine neue Regel ist eine Funktion in dieser Liste. Sie bekommt alles, was
 * sie braucht, und gibt Befunde zurueck – sie darf nichts anfassen.
 */
type Regel = (
  datierte: Datierter[],
  relations: Relation[],
  k: Kalender,
) => Befund[];

/** Nachschlagen ohne wiederholtes Suchen. */
function index(datierte: Datierter[]): Map<string, Datierter> {
  return new Map(datierte.map((d) => [d.entry.id, d]));
}

/* ------------------------------------------------------------- Regeln ---- */

/** Ende vor Beginn. */
const endeVorBeginn: Regel = (datierte, _r, k) =>
  datierte
    .filter((d) => d.zeit.von !== undefined && d.zeit.bis !== undefined && d.zeit.bis < d.zeit.von)
    .map((d) => ({
      id: `ende-vor-beginn:${d.entry.id}`,
      art: 'widerspruch' as const,
      betrifft: [d.entry.id],
      text: `„${d.entry.title}“ endet ${schreibeZeit(d.zeit.ende!, k)}, beginnt aber erst ${schreibeZeit(d.zeit.beginn!, k)}.`,
    }));

/** Eine Zeitangabe, die dasteht, aber nicht zu lesen ist. */
const unlesbareZeit: Regel = (datierte) =>
  datierte
    .filter((d) => d.unlesbar)
    .map((d) => ({
      id: `unlesbar:${d.entry.id}`,
      art: 'frage' as const,
      betrifft: [d.entry.id],
      text: `Die Zeitangabe bei „${d.entry.title}“ konnte nicht gelesen werden – sie steht auf keiner Achse. Als Jahr genügt „1032“.`,
    }));

/**
 * Ursache nach Wirkung.
 *
 * Nur wenn beide Enden datiert sind. Fehlt eine Zeit, ist das keine
 * Verletzung, sondern eine Luecke – und die meldet eine andere Regel.
 */
const ursacheNachWirkung: Regel = (datierte, relations, k) => {
  const idx = index(datierte);
  const out: Befund[] = [];

  for (const r of relations) {
    if (r.type !== 'causes' && r.type !== 'precedes') continue;
    const a = idx.get(r.fromId);
    const b = idx.get(r.toId);
    if (!a || !b || a.zeit.von === undefined || b.zeit.von === undefined) continue;
    if (a.zeit.von <= b.zeit.von) continue;

    out.push({
      id: `ursache-nach-wirkung:${r.id}`,
      art: 'widerspruch',
      betrifft: [a.entry.id, b.entry.id],
      text:
        r.type === 'causes'
          ? `„${a.entry.title}“ (${schreibeZeit(a.zeit.beginn!, k)}) soll zu „${b.entry.title}“ (${schreibeZeit(b.zeit.beginn!, k)}) geführt haben – geschieht aber später.`
          : `„${a.entry.title}“ soll „${b.entry.title}“ vorausgegangen sein, ist aber später datiert.`,
    });
  }
  return out;
};

/** Ein Kind, das vor seinem Elternteil geboren wurde. */
const kindVorElternteil: Regel = (datierte, relations, k) => {
  const idx = index(datierte);
  const out: Befund[] = [];

  for (const r of relations) {
    if (r.type !== 'parent_of') continue;
    const eltern = idx.get(r.fromId);
    const kind = idx.get(r.toId);
    if (!eltern || !kind || eltern.zeit.von === undefined || kind.zeit.von === undefined) continue;
    if (eltern.zeit.von < kind.zeit.von) continue;

    out.push({
      id: `kind-vor-eltern:${r.id}`,
      art: 'widerspruch',
      betrifft: [kind.entry.id, eltern.entry.id],
      text: `„${kind.entry.title}“ (${schreibeZeit(kind.zeit.beginn!, k)}) ist Kind von „${eltern.entry.title}“ (${schreibeZeit(eltern.zeit.beginn!, k)}) – und wäre damit nicht jünger.`,
    });
  }
  return out;
};

/**
 * Jemand, der laengst tot ist, haengt an etwas Spaeterem.
 *
 * Das ist der Fall aus dem Auftrag: „Diese Figur ist laut Zeitstrahl bereits
 * verstorben, erscheint aber zwanzig Jahre spaeter erneut."
 */
const nachDemEnde: Regel = (datierte, relations, k) => {
  const idx = index(datierte);
  const out: Befund[] = [];
  /* Nur Kanten, bei denen ein spaeteres Auftreten wirklich seltsam waere. */
  const verdaechtig = new Set(['appears_in', 'ruled', 'lives_in', 'owns', 'uses', 'member_of']);

  for (const r of relations) {
    if (!verdaechtig.has(r.type)) continue;

    for (const [wer, wo] of [
      [idx.get(r.fromId), idx.get(r.toId)],
      [idx.get(r.toId), idx.get(r.fromId)],
    ] as const) {
      if (!wer || !wo) continue;
      if (wer.zeit.bis === undefined || wo.zeit.von === undefined) continue;
      if (wo.zeit.von <= wer.zeit.bis) continue;

      out.push({
        id: `nach-dem-ende:${r.id}:${wer.entry.id}`,
        art: 'widerspruch',
        betrifft: [wer.entry.id, wo.entry.id],
        text: `„${wer.entry.title}“ endet ${schreibeZeit(wer.zeit.ende!, k)}, hängt aber an „${wo.entry.title}“, das erst ${schreibeZeit(wo.zeit.beginn!, k)} beginnt. Möchtest du das prüfen?`,
      });
    }
  }
  return out;
};

/**
 * Was noch keine Zeit traegt.
 *
 * Bewusst keine Meldung je Eintrag – bei einer jungen Welt waeren das
 * hunderte, und hundert Hinweise sind kein Hinweis. Eine Zeile, die sagt, wie
 * viele es sind.
 */
const ohneZeit: Regel = (datierte) => {
  const offen = datierte.filter((d) => !d.datiert && !d.unlesbar);
  if (offen.length === 0) return [];
  return [
    {
      id: 'ohne-zeit',
      art: 'luecke',
      betrifft: offen.slice(0, 12).map((d) => d.entry.id),
      text:
        offen.length === 1
          ? `Eine Seite trägt noch keine Zeit: „${offen[0].entry.title}“.`
          : `${offen.length} Seiten tragen noch keine Zeit. Sie liegen außerhalb der Chronik, bis sie eine bekommen.`,
    },
  ];
};

const REGELN: Regel[] = [
  endeVorBeginn,
  ursacheNachWirkung,
  kindVorElternteil,
  nachDemEnde,
  unlesbareZeit,
  ohneZeit,
];

/**
 * Alle Regeln anwenden.
 *
 * Widersprueche zuerst: Sie sind das, wovon der Verfasser wissen muss.
 * Luecken zuletzt – sie sind kein Fehler, sondern unfertige Arbeit.
 */
export function pruefe(
  datierte: Datierter[],
  relations: Relation[],
  k: Kalender = DEFAULT_KALENDER,
): Befund[] {
  const rang = { widerspruch: 0, frage: 1, luecke: 2 };
  return REGELN.flatMap((regel) => regel(datierte, relations, k)).sort(
    (a, b) => rang[a.art] - rang[b.art],
  );
}
