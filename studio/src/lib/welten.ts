/**
 * Die Welt.
 *
 * Die oberste der drei Ebenen: **Welt – Buch – Darstellung.** Ein Roman, ein
 * Artbook und eine Kampagne können auf demselben Boden stehen, ohne einander
 * zu sein. Diese Datei beantwortet, was eine Welt *ist* und wie sie heisst.
 *
 * Zwei Entscheidungen tragen sie:
 *
 * **Erstens: Der Name der Welt ist ein Datensatz, nicht mehr ein geliehener
 * Buchtitel.** Vorher hiess eine Welt wie der älteste Band, der sie eröffnet
 * hatte. Unter drei Bänden derselben Welt stand deshalb dreimal „Die Chroniken
 * des Nebelwaldes" – der Titel eines Buches an der Stelle, an der der Name
 * einer Welt hingehört. Der geliehene Name bleibt trotzdem als Rückfall
 * bestehen: Eine Welt ohne eigenen Namen ist kein Fehler, sondern eine, die
 * noch niemand benannt hat.
 *
 * **Zweitens: Zwei Bücher ohne Weltkennung teilen nichts.** `undefined ===
 * undefined` ist wahr, und genau daran wäre in einer Bibliothek aus
 * Bestandsbüchern jeder mit jedem verwandt geworden. Zwei Unbekannte sind
 * nicht dasselbe.
 *
 * **Was hier bewusst noch nicht steht:** Einträge, Beziehungen, Bilder, Zeit,
 * Karten. Die hängen weiterhin an `bookId`. Diese Datei ist der Anfang der
 * Weltebene und nicht ihr Ende.
 */

import type { LibraryBook, StoredWelt } from '../types';

/* ------------------------------------------------------- Eine neue Welt ---- */

function neueKennung(): string {
  return `welt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function neueWelt(patch: Partial<StoredWelt> = {}): StoredWelt {
  const jetzt = Date.now();
  return { id: neueKennung(), name: '', createdAt: jetzt, updatedAt: jetzt, ...patch };
}

/**
 * Einen gespeicherten Weltdatensatz einlesen – auch wenn er alt oder
 * beschädigt ist.
 *
 * Wie überall in diesem Programm gilt: Was hereinkommt, ist nicht
 * notwendigerweise das, was hinausging. Eine Welt ohne Kennung ist keine.
 */
export function heileWelt(roh: unknown): StoredWelt | null {
  if (!roh || typeof roh !== 'object') return null;
  const w = roh as Partial<StoredWelt>;
  if (typeof w.id !== 'string' || !w.id) return null;
  const jetzt = Date.now();
  return {
    id: w.id,
    name: typeof w.name === 'string' ? w.name : '',
    tagline: typeof w.tagline === 'string' && w.tagline.trim() ? w.tagline : undefined,
    createdAt: typeof w.createdAt === 'number' ? w.createdAt : jetzt,
    updatedAt: typeof w.updatedAt === 'number' ? w.updatedAt : jetzt,
  };
}

/* ------------------------------------------------------- Wer teilt was? ---- */

/**
 * Gehören diese beiden Bände zur selben Welt?
 *
 * Sieht trivial aus und ist es nicht: Ein Band ohne `worldId` teilt seine Welt
 * mit **niemandem**, auch nicht mit einem anderen Band ohne `worldId`.
 */
export function selbeWelt(a: LibraryBook | undefined, b: LibraryBook | undefined): boolean {
  return !!a?.worldId && !!b?.worldId && a.worldId === b.worldId;
}

/** Eine Welt, wie die Oberfläche sie braucht: mit Namen und mit ihren Bänden. */
export interface Weltsicht {
  id: string;
  name: string;
  /** Steht der Name im Datensatz – oder ist er vom ältesten Band geliehen? */
  benannt: boolean;
  buecher: LibraryBook[];
}

/**
 * Der Name einer Welt.
 *
 * In drei Stufen, von der stärksten zur schwächsten Auskunft:
 *
 *   1. Was jemand ihr gegeben hat.
 *   2. Der Weltname des ältesten Bandes – das, was bisher angezeigt wurde.
 *   3. Der Titel des ältesten Bandes.
 *
 * Die zweite und dritte Stufe sind geliehen und deshalb an `benannt` als
 * solche erkennbar. Die Oberfläche darf einen geliehenen Namen leiser setzen
 * oder zum Benennen einladen – behaupten, die Welt heisse so, darf sie nicht.
 */
export function nameFuer(welt: StoredWelt | undefined, buecher: LibraryBook[]): {
  name: string;
  benannt: boolean;
} {
  const eigen = welt?.name?.trim();
  if (eigen) return { name: eigen, benannt: true };

  const nachAlter = [...buecher].sort((a, b) => a.createdAt - b.createdAt);
  const geliehen =
    nachAlter.find((b) => b.worldName?.trim())?.worldName?.trim() ||
    nachAlter.find((b) => b.title?.trim())?.title?.trim();
  return { name: geliehen || 'Unbenannte Welt', benannt: false };
}

/**
 * Die Welten einer Bibliothek – jede mit ihren Bänden.
 *
 * Geteilte zuerst, danach nach Namen. Eine feste Reihenfolge zählt hier mehr
 * als eine kluge: Ein Regal, dessen Welten bei jedem Aufschlagen anders
 * sortiert sind, ist kein Ort.
 *
 * Gespeicherte Welten *ohne* Bände kommen nicht vor. Sie entstehen, wenn ein
 * Buch gelöscht wird, und sind dann keine Welt mehr, sondern ein Rest – ein
 * Eintrag in einer Liste, den niemand wählen kann und niemand versteht.
 */
export function weltenVon(buecher: LibraryBook[], welten: StoredWelt[] = []): Weltsicht[] {
  const nach = new Map<string, LibraryBook[]>();
  for (const b of buecher) {
    if (!b.worldId) continue;
    const liste = nach.get(b.worldId);
    if (liste) liste.push(b);
    else nach.set(b.worldId, [b]);
  }

  const gespeichert = new Map(welten.map((w) => [w.id, w]));
  const sicht: Weltsicht[] = [];
  for (const [id, liste] of nach) {
    const nachAlter = [...liste].sort((a, b) => a.createdAt - b.createdAt);
    const { name, benannt } = nameFuer(gespeichert.get(id), nachAlter);
    sicht.push({ id, name, benannt, buecher: nachAlter });
  }

  return sicht.sort(
    (a, b) => b.buecher.length - a.buecher.length || a.name.localeCompare(b.name, 'de'),
  );
}

/**
 * Die Welten, die zur Auswahl stehen, wenn ein neues Buch entsteht.
 *
 * Alle – auch die mit nur einem Band. Genau darum geht es: Ein zweiter Band in
 * einer bisher einsamen Welt ist der erste Fall, in dem die Welt überhaupt
 * etwas bedeutet. Archivierte Bände zählen mit; ein Buch wegzuräumen heisst
 * nicht, seine Welt aufzugeben.
 */
export function waehlbareWelten(buecher: LibraryBook[], welten: StoredWelt[] = []): Weltsicht[] {
  return weltenVon(buecher, welten);
}

/** Die Welt, zu der dieser Band gehört – wenn sie mehr als ihn umfasst. */
export function weltVon(
  buch: LibraryBook,
  alle: LibraryBook[],
  welten: StoredWelt[] = [],
): Weltsicht | undefined {
  if (!buch.worldId) return undefined;
  return weltenVon(alle, welten).find((w) => w.id === buch.worldId);
}

/**
 * Die Weltzeile, die unter einem Band im Regal steht – wenn überhaupt.
 *
 * Sie erscheint **nur**, wenn mindestens ein zweiter Band dieselbe Welt teilt.
 * Steht ein Weltname unter einem einzelnen Buch, ist das eine Behauptung ohne
 * Gegenüber: Jedes Buch hat eine Welt, das sagt nichts. Erst der zweite Band
 * macht daraus eine Verbindung, und dann ist die Zeile eine Auskunft.
 */
export function weltzeileFuer(
  buch: LibraryBook,
  alle: LibraryBook[],
  welten: StoredWelt[] = [],
): string | undefined {
  const welt = weltVon(buch, alle, welten);
  if (!welt || welt.buecher.length < 2) return undefined;
  return welt.name;
}
