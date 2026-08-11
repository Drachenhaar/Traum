/**
 * Was aus der Datenbank kommt, ist nicht automatisch heil.
 *
 * Die Typen in `types/index.ts` beschreiben, wie ein Eintrag aussehen *soll*.
 * Was tatsaechlich in IndexedDB liegt, hat aber eine Geschichte: eine Sicherung
 * aus einer aelteren Fassung, ein halb durchgelaufener Import, eine Datei, die
 * jemand von Hand bearbeitet hat, ein Schreibvorgang, den der Browser beim
 * Schliessen des Tabs abgeschnitten hat. TypeScript weiss davon nichts – es
 * beschreibt Absichten, nicht Bytes.
 *
 * Aufgefallen ist das bei einem Eintrag ohne `fields`. Eine einzige Zeile,
 * `entry.fields[f.key]`, warf dann „Cannot read properties of undefined", und
 * weil das beim Zeichnen passierte, riss es die ganze Seite. Danach stand das
 * Buch, bis jemand neu lud.
 *
 * Also wird hier einmal, an der einen Stelle, an der Daten hereinkommen,
 * geradegezogen. Danach darf sich jede Seite darauf verlassen, dass ein
 * Eintrag ein Eintrag ist.
 *
 * Die Regel dabei: **nichts wegwerfen, was sich retten laesst.** Ein Feld
 * falschen Typs wird ersetzt, nicht der ganze Eintrag verworfen. Wer eine
 * kaputte Sicherung einspielt, soll den lesbaren Teil seiner Welt behalten.
 */

import type { Block, Entry, Relation } from '../types';
import { ENTRY_STATUSES } from '../types';

const istListe = (v: unknown): v is unknown[] => Array.isArray(v);

/** Zeichenkette oder Ersatz – auch `null`, `0` und `{}` werden abgefangen. */
function text(v: unknown, ersatz = ''): string {
  return typeof v === 'string' ? v : ersatz;
}

/** Liste von Zeichenketten; alles andere faellt weg, statt spaeter zu stolpern. */
function textListe(v: unknown): string[] {
  return istListe(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function zahl(v: unknown, ersatz: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : ersatz;
}

/**
 * Ein Eintrag, so wie ihn der Rest des Programms erwarten darf.
 *
 * Gibt `null` zurueck, wenn nicht einmal eine Kennung da ist – ohne sie
 * liesse sich der Eintrag weder anzeigen noch speichern noch loeschen, und
 * ein Gespenst ohne Namen hilft niemandem.
 */
export function heileEintrag(roh: unknown): Entry | null {
  if (!roh || typeof roh !== 'object') return null;
  const e = roh as Record<string, unknown>;
  const id = text(e.id);
  if (!id) return null;

  const jetzt = Date.now();
  const status = ENTRY_STATUSES.includes(e.status as never)
    ? (e.status as Entry['status'])
    : 'Idee';

  /* Felder: nur Werte behalten, die als Feldwert taugen. */
  const fields: Entry['fields'] = {};
  if (e.fields && typeof e.fields === 'object' && !istListe(e.fields)) {
    for (const [k, v] of Object.entries(e.fields as Record<string, unknown>)) {
      if (typeof v === 'string' || typeof v === 'boolean') fields[k] = v;
      else if (istListe(v)) fields[k] = textListe(v);
    }
  }

  /* Bloecke: jeder braucht Kennung, Art und ein Datenobjekt. */
  const blocks: Block[] = istListe(e.blocks)
    ? (e.blocks as unknown[])
        .filter((b): b is Record<string, unknown> => !!b && typeof b === 'object')
        .filter((b) => text(b.id) && text(b.type))
        .map((b) => ({
          id: text(b.id),
          type: text(b.type) as Block['type'],
          collapsed: b.collapsed === true,
          data: b.data && typeof b.data === 'object' ? (b.data as Block['data']) : {},
        }))
    : [];

  return {
    id,
    /*
     * Die Buchzugehoerigkeit geht als erstes durch.
     *
     * Diese Heilung baut den Eintrag Feld fuer Feld neu auf – was hier nicht
     * steht, ist danach fort, und zwar auch in der Datenbank, sobald der
     * Eintrag das naechste Mal gespeichert wird. Ein vergessenes `bookId`
     * haette jeden bearbeiteten Eintrag lautlos aus seinem Buch fallen
     * lassen.
     */
    bookId: typeof e.bookId === 'string' ? e.bookId : undefined,
    /*
     * Ein Eintrag ohne Titel ist kein kaputter Eintrag, sondern einer, den
     * niemand wiederfindet. Er bekommt einen, der sagt, was los ist.
     */
    title: text(e.title) || 'Ohne Titel',
    subtitle: text(e.subtitle),
    type: text(e.type) || 'page',
    category: text(e.category),
    description: text(e.description),
    tags: textListe(e.tags),
    status,
    favorite: e.favorite === true,
    coverImage: typeof e.coverImage === 'string' ? e.coverImage : undefined,
    createdAt: zahl(e.createdAt, jetzt),
    updatedAt: zahl(e.updatedAt, jetzt),
    linkedEntryIds: textListe(e.linkedEntryIds),
    blocks,
    fields,
    pipelineStage: typeof e.pipelineStage === 'string' ? e.pipelineStage : undefined,
    beginn: typeof e.beginn === 'string' ? e.beginn : undefined,
    ende: typeof e.ende === 'string' ? e.ende : undefined,
    deletedAt: typeof e.deletedAt === 'number' ? e.deletedAt : undefined,
  };
}

/**
 * Eine Beziehung, die sich benutzen laesst.
 *
 * Ohne beide Enden ist sie keine – sie faellt weg. Dass ein Ende auf einen
 * Eintrag zeigt, den es nicht (mehr) gibt, ist dagegen kein Grund: Das
 * passiert bei jedem Papierkorb, und die Ansichten filtern es ohnehin.
 */
export function heileBeziehung(roh: unknown): Relation | null {
  if (!roh || typeof roh !== 'object') return null;
  const r = roh as Record<string, unknown>;
  const id = text(r.id);
  const fromId = text(r.fromId);
  const toId = text(r.toId);
  if (!id || !fromId || !toId) return null;

  return {
    id,
    /* Siehe oben: Was hier fehlt, faellt beim naechsten Speichern weg. */
    bookId: typeof r.bookId === 'string' ? r.bookId : undefined,
    fromId,
    toId,
    type: text(r.type) || 'related',
    note: typeof r.note === 'string' ? r.note : undefined,
    beginn: typeof r.beginn === 'string' ? r.beginn : undefined,
    ende: typeof r.ende === 'string' ? r.ende : undefined,
    zeitnotiz: typeof r.zeitnotiz === 'string' ? r.zeitnotiz : undefined,
    createdAt: zahl(r.createdAt, Date.now()),
  };
}

/** Ganze Listen geradeziehen; Unrettbares faellt heraus. */
export function heileEintraege(rohe: unknown[]): Entry[] {
  return rohe.map(heileEintrag).filter((e): e is Entry => e !== null);
}

export function heileBeziehungen(rohe: unknown[]): Relation[] {
  return rohe.map(heileBeziehung).filter((r): r is Relation => r !== null);
}
