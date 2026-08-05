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
  Relation,
  Revision,
  Settings,
  StoredImageBlob,
  StoredImageMeta,
} from '../types';
import { DEFAULT_NAV } from '../lib/nav';

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
  }
}

export const db = new StudioDatabase();

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
    [db.entries, db.relations, db.images, db.imageBlobs, db.revisions, db.boards, db.settings],
    async () => {
      await Promise.all([
        db.entries.clear(),
        db.relations.clear(),
        db.images.clear(),
        db.imageBlobs.clear(),
        db.revisions.clear(),
        db.boards.clear(),
        db.settings.clear(),
      ]);
      await db.settings.put({ ...FRESH_SETTINGS });
    },
  );
}

export { FRESH_SETTINGS };
