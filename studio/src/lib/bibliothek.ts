/**
 * Die Bibliothek.
 *
 * Dragoncore war ein Buch. Jetzt ist es der Ort, an dem Bücher stehen – und
 * das ist ausdrücklich *nur* eine Ebene darüber. Unter der Bibliothek liegt
 * dieselbe Maschine wie zuvor: dieselben Einträge, dieselben Beziehungen,
 * dieselbe Zeit, derselbe Roman. Es gibt kein zweites Weltmodell, keinen
 * `LibraryEntry` neben dem `Entry`, keine gespiegelte Datenhaltung.
 *
 * Diese Datei beantwortet drei Fragen und sonst keine:
 *
 *   1. Was ist ein neues Buch?
 *   2. Welche Einstellung gehört dem Gerät, welche dem Buch?
 *   3. In welcher Reihenfolge stehen Bücher im Regal?
 *
 * Die dritte ist die einzige mit einer Meinung: Zuletzt aufgeschlagene Bücher
 * stehen vorn. Nicht hervorgehoben, nicht mit einem Abzeichen versehen –
 * einfach vorn, wie ein Buch, das man gerade weggelegt hat.
 */

import type { CreativeGoal, CustomTypeDef, LibraryBook, Settings } from '../types';
import { DEFAULT_BOOK } from './bookIdentity';

/* ------------------------------------------------------------- Ein Buch ---- */

function neueKennung(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Ein neuer Band.
 *
 * Er bekommt sofort eine eigene `worldId`. Das klingt nach Vorgriff, ist aber
 * das Gegenteil: Solange jedes Buch seine eigene Welt ist, ist die Welt
 * einfach das Buch – und wenn später zwei Bücher dieselbe Welt teilen sollen,
 * muss man eine `worldId` gleichsetzen und nicht erst eine erfinden.
 */
export function neuesBuch(patch: Partial<LibraryBook> = {}): LibraryBook {
  const now = Date.now();
  return {
    id: neueKennung('buch'),
    ...DEFAULT_BOOK,
    worldName: '',
    worldTagline: '',
    recentIds: [],
    goals: [],
    customTypes: [],
    worldId: neueKennung('welt'),
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    ...patch,
  };
}

/** Trägt das Buch schon einen Namen? Daran – und nur daran – hängt alles. */
export function istEinBuch(buch: LibraryBook | undefined): buch is LibraryBook {
  return !!buch && typeof buch.id === 'string' && buch.title.trim().length > 0;
}

/**
 * Ein Bestandsbuch aus einer Zeile heraus, die noch alles enthielt.
 *
 * Der Weg für alle, die Dragoncore schon benutzt haben: Ihre Einstellungen
 * trugen Buchidentität *und* Weltname *und* Lesebändchen in derselben Zeile.
 * Hier wird daraus ein Band – ohne dass ein einziger Wert verlorengeht.
 */
export function buchAusAltenEinstellungen(alt: Record<string, unknown>): LibraryBook {
  const identitaet = (alt.book ?? {}) as Partial<LibraryBook>;
  const welt = typeof alt.worldName === 'string' ? alt.worldName : '';
  return {
    ...neuesBuch(),
    ...identitaet,
    /* Der Titel steht im Buch; fehlt er, war der Weltname der Titel. */
    title: identitaet.title?.trim() || welt.trim() || 'Dragoncore',
    worldName: welt || identitaet.title || 'Dragoncore',
    worldTagline: (alt.worldTagline as string) ?? '',
    lastSpreadKey: alt.lastSpreadKey as string | undefined,
    recentIds: (alt.recentIds as string[]) ?? [],
    visits: (alt.visits as Record<string, number>) ?? undefined,
    goals: (alt.goals as CreativeGoal[]) ?? [],
    customTypes: (alt.customTypes as CustomTypeDef[]) ?? [],
    promptTemplates: alt.promptTemplates as LibraryBook['promptTemplates'],
    weg: alt.weg as string | undefined,
    spiegelAus: alt.spiegelAus as boolean | undefined,
    spiegelVerlauf: alt.spiegelVerlauf as LibraryBook['spiegelVerlauf'],
    leitfaden: alt.leitfaden as LibraryBook['leitfaden'],
    createdAt: (identitaet.createdAt as number) ?? Date.now(),
    updatedAt: Date.now(),
    lastOpenedAt: Date.now(),
  };
}

/* --------------------------------------------- Gerät oder Buch? ------------ */

/**
 * Die Einstellungen, die dem *Buch* gehören.
 *
 * Diese Liste ist die ganze Trennung. Wer eine Einstellung hinzufügt,
 * entscheidet mit einer Zeile hier, ob sie in jedem Buch anders sein darf –
 * und muss sonst nichts anfassen.
 *
 * Faustregel: Alles, was von *dieser Welt* handelt, gehört ins Buch. Alles,
 * was von diesem Gerät handelt – wie oft ans Sichern erinnert wird, wie die
 * Navigation aussieht –, gehört daneben.
 */
export const BUCH_SCHLUESSEL = [
  'worldName',
  'worldTagline',
  'lastSpreadKey',
  'recentIds',
  'visits',
  'goals',
  'customTypes',
  'promptTemplates',
  'weg',
  'spiegelAus',
  'spiegelVerlauf',
  'leitfaden',
] as const;

export type BuchSchluessel = (typeof BUCH_SCHLUESSEL)[number];

const BUCH_SET = new Set<string>(BUCH_SCHLUESSEL);

/** Was die Oberfläche sieht: Geräteeinstellungen mit dem Buch darübergelegt. */
export function sichtbareEinstellungen(
  global: Settings,
  buch: LibraryBook | undefined,
): Settings {
  if (!buch) return { ...global, book: undefined };
  const sicht: Record<string, unknown> = { ...global, book: buch };
  const quelle = buch as unknown as Record<string, unknown>;
  for (const k of BUCH_SCHLUESSEL) {
    if (quelle[k] !== undefined) sicht[k] = quelle[k];
  }
  /*
   * Listen duerfen nie fehlen. Die Oberflaeche ruft `settings.goals.map`
   * ohne Fragezeichen, und ein Buch aus einer aelteren Sicherung hat
   * vielleicht keine.
   */
  sicht.recentIds = buch.recentIds ?? [];
  sicht.goals = buch.goals ?? [];
  sicht.customTypes = buch.customTypes ?? [];
  return sicht as unknown as Settings;
}

/** Eine Änderung in ihre beiden Hälften zerlegen. */
export function zerlegeAenderung(patch: Partial<Settings>): {
  global: Partial<Settings>;
  buch: Partial<LibraryBook>;
} {
  const global: Record<string, unknown> = {};
  const buch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    /*
     * `book` ist keine Einstellung, sondern das Buch selbst. Es kommt hier
     * nicht durch – dafuer gibt es `saveBook`. Wuerde es durchgereicht,
     * schriebe eine Einstellungsaenderung nebenbei den Einband um.
     */
    if (k === 'book' || k === 'id') continue;
    (BUCH_SET.has(k) ? buch : global)[k] = v;
  }
  return { global: global as Partial<Settings>, buch: buch as Partial<LibraryBook> };
}

/* ------------------------------------------------------------- Das Regal ---- */

/**
 * Die Reihenfolge im Regal.
 *
 * Zuletzt aufgeschlagen zuerst, danach das Neueste. Ein Buch, das noch nie
 * offen lag, zählt sein Entstehen als letztes Öffnen – sonst stünde ein
 * gerade angelegtes Buch ganz hinten.
 */
export function regalfolge(buecher: LibraryBook[]): LibraryBook[] {
  return [...buecher].sort(
    (a, b) => (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt),
  );
}

/** Was im Regal steht (alles, was nicht archiviert ist). */
export function imRegal(buecher: LibraryBook[]): LibraryBook[] {
  return regalfolge(buecher.filter((b) => !b.archived));
}

export function imArchiv(buecher: LibraryBook[]): LibraryBook[] {
  return regalfolge(buecher.filter((b) => b.archived));
}

/** Was auf dem Buchrücken steht. */
export function rueckentext(buch: LibraryBook): string {
  return buch.spine?.text?.trim() || buch.title.trim() || 'Ohne Titel';
}

/**
 * Wie lange ein Buch schon zu ist – in der Sprache des Buches, nicht in
 * Zeitstempeln. Erscheint klein unter dem Rücken.
 */
export function zuletztOffen(buch: LibraryBook, jetzt = Date.now()): string {
  const wann = buch.lastOpenedAt ?? buch.createdAt;
  const tage = Math.floor((jetzt - wann) / 86_400_000);
  if (tage <= 0) return 'heute zuletzt offen';
  if (tage === 1) return 'gestern zuletzt offen';
  if (tage < 7) return `vor ${tage} Tagen zuletzt offen`;
  if (tage < 31) {
    const wochen = Math.round(tage / 7);
    return wochen === 1 ? 'vor einer Woche zuletzt offen' : `vor ${wochen} Wochen zuletzt offen`;
  }
  if (tage < 365) {
    const monate = Math.round(tage / 30);
    return monate === 1 ? 'vor einem Monat zuletzt offen' : `vor ${monate} Monaten zuletzt offen`;
  }
  const jahre = Math.round(tage / 365);
  return jahre === 1 ? 'vor einem Jahr zuletzt offen' : `vor ${jahre} Jahren zuletzt offen`;
}
