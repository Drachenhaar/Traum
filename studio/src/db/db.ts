/**
 * IndexedDB-Anbindung über Dexie.
 *
 * Drei Tabellen:
 *  - entries      → alle Inhalte (Seiten, Charaktere, Assets, Prompts …)
 *  - images       → Bild-Metadaten (schnell durchsuchbar)
 *  - imageBlobs   → die eigentlichen Dateien als Blob (getrennt, damit Listen leicht bleiben)
 *  - settings     → Navigation & App-Einstellungen
 *
 * Bilder werden bewusst als Blob gespeichert – kein Base64, kein localStorage.
 */

import Dexie, { type Table } from 'dexie';
import type { Entry, Settings, StoredImageBlob, StoredImageMeta } from '../types';
import { DEFAULT_NAV } from '../lib/nav';

/**
 * Version der Beispieldaten. Liegt hier (und nicht in seed.ts), damit zwischen
 * Datenbank und Beispieldaten kein Ringschluss der Imports entsteht.
 */
export const SEED_VERSION = 1;

export class StudioDatabase extends Dexie {
  entries!: Table<Entry, string>;
  images!: Table<StoredImageMeta, string>;
  imageBlobs!: Table<StoredImageBlob, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('dragoncore-studio');

    this.version(1).stores({
      // Indizes: nach denen wird sortiert/gefiltert. `*tags` = Multi-Entry-Index.
      entries: 'id, type, category, status, favorite, updatedAt, createdAt, *tags',
      images: 'id, category, status, favorite, updatedAt, createdAt, *tags',
      imageBlobs: 'id',
      settings: 'id',
    });
  }
}

export const db = new StudioDatabase();

/**
 * Löscht die komplette Datenbank (für „Alles zurücksetzen“ in den Einstellungen).
 *
 * Wichtig: Es werden anschließend frische Einstellungen mit bereits gesetzter
 * Seed-Version geschrieben. Sonst würde die App die Beispieldaten sofort wieder
 * anlegen – und „alles gelöscht“ wäre schlicht nicht wahr.
 */
export async function wipeDatabase(): Promise<void> {
  await db.transaction('rw', db.entries, db.images, db.imageBlobs, db.settings, async () => {
    await Promise.all([
      db.entries.clear(),
      db.images.clear(),
      db.imageBlobs.clear(),
      db.settings.clear(),
    ]);
    await db.settings.put({
      id: 'settings',
      nav: DEFAULT_NAV,
      backupReminderDays: 14,
      seedVersion: SEED_VERSION,
    });
  });
}
