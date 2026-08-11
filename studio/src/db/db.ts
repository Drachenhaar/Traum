/**
 * IndexedDB-Anbindung über Dexie.
 *
 * Tabellen:
 *  - entries      → alle Inhalte
 *  - relations    → die bedeutungstragenden Kanten zwischen Einträgen
 *  - images       → Bild-Metadaten (schnell durchsuchbar)
 *  - imageBlobs   → die Dateien als Blob (getrennt, damit Listen leicht bleiben)
 *  - revisions    → Zeitleiste: jede Fassung bleibt zurückholbar
 *  - boards       → Concept-Art-Flächen
 *  - settings     → Navigation, eigene Typen, Ziele
 *
 * Bilder liegen als Blob vor – kein Base64, kein localStorage.
 */

import Dexie, { type Table } from 'dexie';
import type {
  CanvasBoard,
  Entry,
  LibraryBook,
  Relation,
  Revision,
  Settings,
  StoredImageBlob,
  StoredImageMeta,
} from '../types';
import { DEFAULT_NAV } from '../lib/nav';
import { buchAusAltenEinstellungen } from '../lib/bibliothek';

/**
 * Version der Beispieldaten. Liegt hier (und nicht in seed.ts), damit zwischen
 * Datenbank und Beispieldaten kein Ringschluss der Imports entsteht.
 */
export const SEED_VERSION = 2;

export class StudioDatabase extends Dexie {
  entries!: Table<Entry, string>;
  relations!: Table<Relation, string>;
  images!: Table<StoredImageMeta, string>;
  imageBlobs!: Table<StoredImageBlob, string>;
  revisions!: Table<Revision, string>;
  boards!: Table<CanvasBoard, string>;
  settings!: Table<Settings, string>;
  books!: Table<LibraryBook, string>;

  constructor() {
    super('dragoncore-studio');

    // Fassung 1: die ursprüngliche Struktur (Einträge, Bilder, Einstellungen).
    this.version(1).stores({
      entries: 'id, type, category, status, favorite, updatedAt, createdAt, *tags',
      images: 'id, category, status, favorite, updatedAt, createdAt, *tags',
      imageBlobs: 'id',
      settings: 'id',
    });

    // Fassung 2: Beziehungen, Verlauf und Flächen kommen hinzu.
    this.version(2)
      .stores({
        entries: 'id, type, category, status, favorite, updatedAt, createdAt, deletedAt, pipelineStage, *tags',
        relations: 'id, fromId, toId, type, createdAt',
        images: 'id, category, status, favorite, updatedAt, createdAt, *tags',
        imageBlobs: 'id',
        revisions: 'id, entryId, at',
        boards: 'id, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        // Alte, ungerichtete Verknüpfungen werden zu echten Beziehungen.
        // Jede Kante nur einmal – vorher war sie auf beiden Seiten notiert.
        const entries = await tx.table<Entry>('entries').toArray();
        const seen = new Set<string>();
        const relations: Relation[] = [];

        for (const entry of entries) {
          for (const other of entry.linkedEntryIds ?? []) {
            const key = [entry.id, other].sort().join('|');
            if (seen.has(key)) continue;
            seen.add(key);
            relations.push({
              id: `rel_${key}`,
              fromId: entry.id,
              toId: other,
              type: 'related',
              createdAt: entry.updatedAt ?? Date.now(),
            });
          }
        }
        if (relations.length) await tx.table('relations').bulkPut(relations);
      });

    /*
     * Fassung 3: die Bibliothek.
     *
     * Bis hierher gab es genau ein Buch je Gerät, und deshalb brauchte kein
     * Datensatz zu sagen, zu welchem er gehört. Jetzt schon.
     *
     * Diese Aufwertung ist der heikelste Punkt des ganzen Umbaus: Sie läuft
     * auf Installationen, in denen Jahre Arbeit liegen. Sie tut deshalb genau
     * zwei Dinge, beide ohne etwas wegzunehmen:
     *
     *   1. Aus der bestehenden Zeile `settings` wird ein erster Band. Titel,
     *      Einband, Zeichen, Weltname, Lesebändchen, Ziele, eigene Typen –
     *      alles, was dieses Buch ausmachte, zieht in den Band um.
     *   2. Jeder vorhandene Datensatz bekommt dessen Kennung.
     *
     * Was nicht passiert: Nichts wird gelöscht, nichts umbenannt, nichts
     * neu berechnet. Die alten Schlüssel bleiben sogar in der
     * Einstellungszeile stehen – ungelesen, aber vorhanden. Sollte diese
     * Aufwertung je zurückgenommen werden müssen, findet das alte Dragoncore
     * seine Welt vor, als wäre nichts gewesen.
     */
    this.version(3)
      .stores({
        entries:
          'id, bookId, type, category, status, favorite, updatedAt, createdAt, deletedAt, pipelineStage, *tags, [bookId+type], [bookId+updatedAt]',
        relations: 'id, bookId, fromId, toId, type, createdAt',
        images: 'id, bookId, category, status, favorite, updatedAt, createdAt, *tags',
        imageBlobs: 'id',
        revisions: 'id, bookId, entryId, at',
        boards: 'id, bookId, updatedAt',
        settings: 'id',
        books: 'id, archived, lastOpenedAt, worldId, seriesId',
      })
      .upgrade(async (tx) => {
        const alt = (await tx.table('settings').get('settings')) as
          | Record<string, unknown>
          | undefined;

        /*
         * Ein Gerät ohne Einstellungszeile hatte noch nie ein Buch. Dort ist
         * nichts zu übernehmen – die Bibliothek beginnt leer, und der
         * nächste Start führt in die Erschaffung.
         */
        const leer =
          !alt &&
          (await tx.table('entries').count()) === 0 &&
          (await tx.table('images').count()) === 0;
        if (leer) return;

        const erster = buchAusAltenEinstellungen(alt ?? {});
        await tx.table('books').put(erster);
        if (alt) {
          await tx.table('settings').put({ ...alt, activeBookId: erster.id });
        }

        /* Alles, was schon da ist, gehört diesem Band. */
        for (const name of ['entries', 'relations', 'images', 'boards', 'revisions'] as const) {
          const tabelle = tx.table(name);
          const alle = (await tabelle.toArray()) as Record<string, unknown>[];
          if (!alle.length) continue;
          await tabelle.bulkPut(alle.map((z) => ({ ...z, bookId: erster.id })));
        }
      });
  }
}

export const db = new StudioDatabase();

/*
 * Die Geräteeinstellungen.
 *
 * Die buchbezogenen Werte darunter (`customTypes`, `goals`, `recentIds`,
 * `worldName`, `worldTagline`) stehen hier nur noch als Rückfalle, für den
 * Fall, dass kein Buch aufgeschlagen ist – in der Bibliothek etwa. Sobald
 * eines offen liegt, kommen sie aus dem Band. Siehe `lib/bibliothek.ts`.
 */
const FRESH_SETTINGS: Settings = {
  id: 'settings',
  nav: DEFAULT_NAV,
  backupReminderDays: 14,
  seedVersion: SEED_VERSION,
  customTypes: [],
  goals: [],
  recentIds: [],
  worldName: 'Dragoncore',
  worldTagline: 'Eine Welt, die sich erinnert',
};

/**
 * Löscht alles (für „Zurücksetzen“ in den Einstellungen).
 *
 * Danach werden frische Einstellungen mit bereits gesetzter Seed-Version
 * geschrieben – sonst kämen die Beispieldaten sofort zurück und „alles
 * gelöscht“ wäre schlicht nicht wahr.
 */
export async function wipeDatabase(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.entries,
      db.relations,
      db.images,
      db.imageBlobs,
      db.revisions,
      db.boards,
      db.settings,
      db.books,
    ],
    async () => {
      await Promise.all([
        db.entries.clear(),
        db.relations.clear(),
        db.images.clear(),
        db.imageBlobs.clear(),
        db.revisions.clear(),
        db.boards.clear(),
        db.settings.clear(),
        db.books.clear(),
      ]);
      await db.settings.put({ ...FRESH_SETTINGS });
    },
  );
}

export { FRESH_SETTINGS };
