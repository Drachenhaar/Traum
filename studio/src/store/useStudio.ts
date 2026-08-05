/**
 * Globaler App-State (Zustand).
 *
 * Alle Einträge und Bild-Metadaten liegen im Speicher – das hält Suche und
 * Filter sofort reaktionsfähig. Jede Änderung wird zusätzlich in IndexedDB
 * geschrieben (Autospeichern, gebündelt über einen kurzen Debounce).
 */

import { create } from 'zustand';
import { SEED_VERSION, db, wipeDatabase } from '../db/db';
import type {
  Block,
  Entry,
  EntryStatus,
  EntryType,
  NavItem,
  Settings,
  StoredImageMeta,
} from '../types';
import { emptyFields, templateFor } from '../lib/templates';
import { createBlock, duplicateBlock } from '../lib/blocks';
import { deleteImage as deleteImageFiles } from '../lib/images';
import { newId } from '../lib/utils';
import { DEFAULT_NAV } from '../lib/nav';
import { seedIfEmpty } from '../db/seed';

export interface Toast {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface StudioState {
  ready: boolean;
  entries: Entry[];
  images: StoredImageMeta[];
  settings: Settings;
  toasts: Toast[];
  /** Läuft gerade ein Speichervorgang? Für den dezenten Hinweis oben rechts. */
  saving: boolean;
  /** Zeitpunkt des letzten erfolgreichen Speicherns – zeigt kurz „Gespeichert“. */
  savedAt: number;

  init: () => Promise<void>;

  /* Einträge */
  createEntry: (type: EntryType, patch?: Partial<Entry>) => Promise<Entry>;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  duplicateEntry: (id: string) => Promise<Entry | null>;
  deleteEntry: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  linkEntries: (a: string, b: string) => void;
  unlinkEntries: (a: string, b: string) => void;

  /* Blöcke */
  addBlock: (entryId: string, type: Block['type'], index?: number) => void;
  updateBlock: (entryId: string, blockId: string, data: Partial<Block['data']>) => void;
  setBlockCollapsed: (entryId: string, blockId: string, collapsed: boolean) => void;
  moveBlock: (entryId: string, from: number, to: number) => void;
  duplicateBlockAt: (entryId: string, blockId: string) => void;
  deleteBlock: (entryId: string, blockId: string) => void;

  /* Bilder */
  addImages: (metas: StoredImageMeta[]) => void;
  updateImage: (id: string, patch: Partial<StoredImageMeta>) => void;
  deleteImage: (id: string) => Promise<void>;

  /* Einstellungen */
  updateNav: (nav: NavItem[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  /* Daten komplett ersetzen (Import / Zurücksetzen) */
  replaceAll: (entries: Entry[], images: StoredImageMeta[]) => void;
  reloadFromDb: () => Promise<void>;
  wipeAll: () => Promise<void>;

  /* Hinweise */
  notify: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
}

/* ------------------------------------------------- Autospeichern in IndexedDB */

const pendingEntries = new Map<string, Entry>();
const pendingImages = new Map<string, StoredImageMeta>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(setSaving: (v: boolean) => void) {
  if (flushTimer) clearTimeout(flushTimer);
  setSaving(true);
  flushTimer = setTimeout(() => {
    void flushNow(setSaving);
  }, 450);
}

async function flushNow(setSaving: (v: boolean) => void) {
  const entries = [...pendingEntries.values()];
  const images = [...pendingImages.values()];
  pendingEntries.clear();
  pendingImages.clear();
  try {
    if (entries.length) await db.entries.bulkPut(entries);
    if (images.length) await db.images.bulkPut(images);
  } catch (err) {
    console.error('Speichern fehlgeschlagen', err);
  } finally {
    setSaving(false);
  }
}

/** Beim Verlassen der Seite noch offene Änderungen wegschreiben. */
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    void flushNow(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushNow(() => {});
  });
}

/** Läuft die Initialisierung bereits? Verhindert doppeltes Anlegen der Beispieldaten. */
let initPromise: Promise<void> | null = null;

/* ------------------------------------------------------------------- Store */

const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  nav: DEFAULT_NAV,
  backupReminderDays: 14,
  seedVersion: 0,
};

export const useStudio = create<StudioState>((set, get) => {
  const setSaving = (v: boolean) => set(v ? { saving: true } : { saving: false, savedAt: Date.now() });

  /** Eintrag im Speicher ändern und zum Schreiben vormerken. */
  const persistEntry = (entry: Entry) => {
    pendingEntries.set(entry.id, entry);
    scheduleFlush(setSaving);
  };

  const patchEntry = (id: string, mutate: (e: Entry) => Entry) => {
    let updated: Entry | null = null;
    set((state) => ({
      entries: state.entries.map((e) => {
        if (e.id !== id) return e;
        updated = { ...mutate(e), updatedAt: Date.now() };
        return updated;
      }),
    }));
    if (updated) persistEntry(updated);
  };

  return {
    ready: false,
    entries: [],
    images: [],
    settings: DEFAULT_SETTINGS,
    toasts: [],
    saving: false,
    savedAt: 0,

    init() {
      // React ruft Effekte im StrictMode absichtlich zweimal auf. Ohne diese
      // Sperre würden die Beispieldaten doppelt angelegt.
      if (initPromise) return initPromise;

      initPromise = (async () => {
        try {
          const stored = await db.settings.get('settings');
          const settings: Settings = stored
            ? { ...DEFAULT_SETTINGS, ...stored, nav: mergeNav(stored.nav) }
            : DEFAULT_SETTINGS;

          // Beispieldaten nur beim allerersten Start anlegen.
          const seeded = await seedIfEmpty(settings.seedVersion);
          if (seeded) settings.seedVersion = seeded;

          const [entries, images] = await Promise.all([db.entries.toArray(), db.images.toArray()]);
          await db.settings.put(settings);
          set({ entries, images, settings, ready: true });
        } catch (err) {
          console.error(err);
          set({ ready: true });
          get().notify(
            'Datenbank konnte nicht geladen werden. Läuft der Browser im privaten Modus?',
            'error',
          );
        }
      })();

      return initPromise;
    },

    /* --------------------------------------------------------- Einträge */

    async createEntry(type, patch = {}) {
      const now = Date.now();
      const tpl = templateFor(type);
      const entry: Entry = {
        id: newId('e'),
        title: patch.title ?? tpl.newTitle,
        subtitle: '',
        type,
        category: patch.category ?? '',
        description: '',
        tags: [],
        status: 'Idee',
        favorite: false,
        createdAt: now,
        updatedAt: now,
        linkedEntryIds: [],
        blocks: (tpl.starterBlocks ?? []).map((b) => {
          const block = createBlock(b.type as Block['type']);
          return { ...block, data: { ...block.data, ...b.data } };
        }),
        fields: emptyFields(type),
        ...patch,
      };
      set((s) => ({ entries: [entry, ...s.entries] }));
      await db.entries.put(entry);
      return entry;
    },

    updateEntry(id, patch) {
      patchEntry(id, (e) => ({ ...e, ...patch }));
    },

    async duplicateEntry(id) {
      const source = get().entries.find((e) => e.id === id);
      if (!source) return null;
      const now = Date.now();
      const copy: Entry = {
        ...structuredCloneSafe(source),
        id: newId('e'),
        title: `${source.title} (Kopie)`,
        createdAt: now,
        updatedAt: now,
        blocks: source.blocks.map(duplicateBlock),
      };
      set((s) => ({ entries: [copy, ...s.entries] }));
      await db.entries.put(copy);
      get().notify('Eintrag dupliziert.', 'success');
      return copy;
    },

    async deleteEntry(id) {
      // Verweise aus anderen Einträgen mitentfernen, damit keine toten Links bleiben.
      const affected: Entry[] = [];
      set((s) => ({
        entries: s.entries
          .filter((e) => e.id !== id)
          .map((e) => {
            if (!e.linkedEntryIds.includes(id)) return e;
            const next = { ...e, linkedEntryIds: e.linkedEntryIds.filter((x) => x !== id) };
            affected.push(next);
            return next;
          }),
      }));
      await db.entries.delete(id);
      if (affected.length) await db.entries.bulkPut(affected);
      get().notify('Eintrag gelöscht.', 'success');
    },

    toggleFavorite(id) {
      patchEntry(id, (e) => ({ ...e, favorite: !e.favorite }));
    },

    linkEntries(a, b) {
      if (a === b) return;
      patchEntry(a, (e) =>
        e.linkedEntryIds.includes(b) ? e : { ...e, linkedEntryIds: [...e.linkedEntryIds, b] },
      );
      patchEntry(b, (e) =>
        e.linkedEntryIds.includes(a) ? e : { ...e, linkedEntryIds: [...e.linkedEntryIds, a] },
      );
    },

    unlinkEntries(a, b) {
      patchEntry(a, (e) => ({ ...e, linkedEntryIds: e.linkedEntryIds.filter((x) => x !== b) }));
      patchEntry(b, (e) => ({ ...e, linkedEntryIds: e.linkedEntryIds.filter((x) => x !== a) }));
    },

    /* ----------------------------------------------------------- Blöcke */

    addBlock(entryId, type, index) {
      patchEntry(entryId, (e) => {
        const block = createBlock(type);
        const blocks = e.blocks.slice();
        blocks.splice(index ?? blocks.length, 0, block);
        return { ...e, blocks };
      });
    },

    updateBlock(entryId, blockId, data) {
      patchEntry(entryId, (e) => ({
        ...e,
        blocks: e.blocks.map((b) => (b.id === blockId ? { ...b, data: { ...b.data, ...data } } : b)),
      }));
    },

    setBlockCollapsed(entryId, blockId, collapsed) {
      patchEntry(entryId, (e) => ({
        ...e,
        blocks: e.blocks.map((b) => (b.id === blockId ? { ...b, collapsed } : b)),
      }));
    },

    moveBlock(entryId, from, to) {
      patchEntry(entryId, (e) => {
        if (from === to || from < 0 || to < 0 || from >= e.blocks.length || to >= e.blocks.length) {
          return e;
        }
        const blocks = e.blocks.slice();
        const [moved] = blocks.splice(from, 1);
        blocks.splice(to, 0, moved);
        return { ...e, blocks };
      });
    },

    duplicateBlockAt(entryId, blockId) {
      patchEntry(entryId, (e) => {
        const index = e.blocks.findIndex((b) => b.id === blockId);
        if (index < 0) return e;
        const blocks = e.blocks.slice();
        blocks.splice(index + 1, 0, duplicateBlock(e.blocks[index]));
        return { ...e, blocks };
      });
      get().notify('Block dupliziert.', 'success');
    },

    deleteBlock(entryId, blockId) {
      patchEntry(entryId, (e) => ({ ...e, blocks: e.blocks.filter((b) => b.id !== blockId) }));
    },

    /* ----------------------------------------------------------- Bilder */

    addImages(metas) {
      set((s) => ({ images: [...metas, ...s.images] }));
    },

    updateImage(id, patch) {
      let updated: StoredImageMeta | null = null;
      set((s) => ({
        images: s.images.map((m) => {
          if (m.id !== id) return m;
          updated = { ...m, ...patch, updatedAt: Date.now() };
          return updated;
        }),
      }));
      if (updated) {
        pendingImages.set(id, updated);
        scheduleFlush(setSaving);
      }
    },

    async deleteImage(id) {
      await deleteImageFiles(id);
      // Bild aus allen Einträgen und Blöcken entfernen.
      const touched: Entry[] = [];
      set((s) => ({
        images: s.images.filter((m) => m.id !== id),
        entries: s.entries.map((e) => {
          const next = removeImageFromEntry(e, id);
          if (next !== e) touched.push(next);
          return next;
        }),
      }));
      if (touched.length) await db.entries.bulkPut(touched);
      get().notify('Bild gelöscht.', 'success');
    },

    /* ---------------------------------------------------- Einstellungen */

    updateNav(nav) {
      const settings = { ...get().settings, nav };
      set({ settings });
      void db.settings.put(settings);
    },

    updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      void db.settings.put(settings);
    },

    replaceAll(entries, images) {
      set({ entries, images });
    },

    async wipeAll() {
      // Noch nicht geschriebene Änderungen verwerfen – sie dürfen die gerade
      // geleerte Datenbank nicht wieder befüllen.
      if (flushTimer) clearTimeout(flushTimer);
      pendingEntries.clear();
      pendingImages.clear();
      await wipeDatabase();
      set({ entries: [], images: [], settings: { ...DEFAULT_SETTINGS, seedVersion: SEED_VERSION } });
    },

    async reloadFromDb() {
      const [entries, images] = await Promise.all([db.entries.toArray(), db.images.toArray()]);
      set({ entries, images });
    },

    /* --------------------------------------------------------- Hinweise */

    notify(message, tone = 'info') {
      const id = newId('t');
      set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
      setTimeout(() => get().dismissToast(id), 3600);
    },

    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },
  };
});

/* ------------------------------------------------------------- Hilfsfunktionen */

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Gespeicherte Navigation mit neu hinzugekommenen Standard-Einträgen zusammenführen. */
function mergeNav(stored: NavItem[] | undefined): NavItem[] {
  if (!stored?.length) return DEFAULT_NAV;
  const known = new Set(stored.map((n) => n.id));
  const missing = DEFAULT_NAV.filter((n) => !known.has(n.id));
  return [...stored, ...missing];
}

/** Bild-ID aus Cover, Feldern und Blöcken eines Eintrags entfernen. */
function removeImageFromEntry(entry: Entry, imageId: string): Entry {
  let changed = false;
  const next: Entry = { ...entry };

  if (entry.coverImage === imageId) {
    next.coverImage = undefined;
    changed = true;
  }

  const fields = { ...entry.fields };
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value) && value.includes(imageId)) {
      fields[key] = value.filter((v) => v !== imageId);
      changed = true;
    }
  }
  if (changed) next.fields = fields;

  const blocks = entry.blocks.map((b) => {
    const d = b.data;
    let blockChanged = false;
    const data = { ...d };
    if (d.imageId === imageId) {
      data.imageId = undefined;
      blockChanged = true;
    }
    if (d.imageIds?.includes(imageId)) {
      data.imageIds = d.imageIds.filter((i) => i !== imageId);
      blockChanged = true;
    }
    if (d.tiles?.some((t) => t.imageId === imageId)) {
      data.tiles = d.tiles.map((t) => (t.imageId === imageId ? { ...t, imageId: undefined } : t));
      blockChanged = true;
    }
    if (d.cards?.some((c) => c.imageId === imageId)) {
      data.cards = d.cards.map((c) => (c.imageId === imageId ? { ...c, imageId: undefined } : c));
      blockChanged = true;
    }
    if (!blockChanged) return b;
    changed = true;
    return { ...b, data };
  });
  if (changed) next.blocks = blocks;

  return changed ? { ...next, updatedAt: Date.now() } : entry;
}

/* ---------------------------------------------------------- Kleine Selektoren */

export const selectEntryById = (id: string | undefined) => (s: StudioState) =>
  id ? s.entries.find((e) => e.id === id) : undefined;

export const selectImageById = (id: string | undefined) => (s: StudioState) =>
  id ? s.images.find((m) => m.id === id) : undefined;

export function countByType(entries: Entry[], type: EntryType): number {
  return entries.filter((e) => e.type === type).length;
}

export function countByStatus(entries: Entry[], status: EntryStatus): number {
  return entries.filter((e) => e.status === status).length;
}
