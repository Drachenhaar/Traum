/**
 * Globaler App-State (Zustand).
 *
 * Einträge, Beziehungen und Bild-Metadaten liegen im Arbeitsspeicher – so
 * antworten Suche, Filter und Graph ohne Verzögerung. Jede Änderung wird
 * gebündelt nach IndexedDB geschrieben (Autospeichern).
 *
 * Der Beziehungsindex wird bei jeder Änderung neu gebaut. Das klingt teuer,
 * ist es aber nicht: es sind zwei Maps über eine Liste – und dafür ist jede
 * Abfrage danach in konstanter Zeit beantwortet.
 */

import { create } from 'zustand';
import { FRESH_SETTINGS, SEED_VERSION, db, wipeDatabase } from '../db/db';
import type {
  BookIdentity,
  Block,
  CanvasBoard,
  CreativeGoal,
  CustomTypeDef,
  Entry,
  EntryType,
  NavItem,
  Relation,
  Revision,
  Settings,
  StoredImageMeta,
} from '../types';
import { emptyFields, setCustomTypes, templateFor } from '../lib/templates';
import { createBlock, duplicateBlock } from '../lib/blocks';
import { deleteImage as deleteImageFiles } from '../lib/images';
import { newId } from '../lib/utils';
import { DEFAULT_NAV } from '../lib/nav';
import { newBookIdentity } from '../lib/bookIdentity';
import { seedIfEmpty } from '../db/seed';
import { buildRelationIndex, makeRelation, type RelationIndex } from '../lib/relations';
import { kinderVon, naechsteOrdnung } from '../lib/roman/struktur';
import { heileBeziehungen, heileEintraege } from '../lib/heilung';
import { DEFAULT_STAGE } from '../lib/pipeline';

export interface Toast {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface StudioState {
  ready: boolean;
  entries: Entry[];
  relations: Relation[];
  relIndex: RelationIndex;
  images: StoredImageMeta[];
  boards: CanvasBoard[];
  settings: Settings;
  toasts: Toast[];
  saving: boolean;
  savedAt: number;

  init: () => Promise<void>;

  /* Einträge */
  createEntry: (type: EntryType, patch?: Partial<Entry>) => Promise<Entry>;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  duplicateEntry: (id: string) => Promise<Entry | null>;
  deleteEntry: (id: string) => Promise<void>;
  restoreEntry: (id: string) => Promise<void>;
  purgeEntry: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  noteVisit: (id: string) => void;

  /* Beziehungen */
  addRelation: (fromId: string, toId: string, type: string, note?: string) => void;
  removeRelation: (relationId: string) => void;
  setRelationType: (relationId: string, type: string) => void;
  updateRelation: (relationId: string, patch: Partial<Relation>) => void;
  flipRelation: (relationId: string) => void;
  /**
   * Eine Kante, von der es nur eine geben darf – Perspektivfigur, Schauplatz.
   * `null` loest sie. Wer eine zweite setzt, ersetzt die erste.
   */
  setSingleRelation: (fromId: string, type: string, toId: string | null) => void;

  /* Roman */
  createUnter: (elternId: string, type: EntryType, titel?: string) => Promise<Entry>;
  ordneNeu: (aenderungen: { id: string; ordnung: string }[]) => void;

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

  /* Flächen (Concept Canvas) */
  createBoard: (name: string) => Promise<CanvasBoard>;
  updateBoard: (id: string, patch: Partial<CanvasBoard>) => void;
  deleteBoard: (id: string) => Promise<void>;

  /* Verlauf */
  revisionsOf: (entryId: string) => Promise<Revision[]>;
  recentRevisions: (limit?: number) => Promise<Revision[]>;
  restoreRevision: (revisionId: string) => Promise<void>;

  /* Das Buch selbst */
  saveBook: (patch: Partial<BookIdentity>) => BookIdentity;
  savePromptTemplate: (id: string, content: string) => void;
  resetPromptTemplate: (id: string) => void;

  /* Einstellungen */
  updateNav: (nav: NavItem[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  saveCustomType: (def: CustomTypeDef) => void;
  removeCustomType: (type: string) => void;
  addGoal: (goal: Omit<CreativeGoal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, patch: Partial<CreativeGoal>) => void;
  removeGoal: (id: string) => void;

  reloadFromDb: () => Promise<void>;
  wipeAll: () => Promise<void>;

  notify: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
}

/* ------------------------------------------------- Autospeichern in IndexedDB */

const pendingEntries = new Map<string, Entry>();
const pendingImages = new Map<string, StoredImageMeta>();
const pendingBoards = new Map<string, CanvasBoard>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(setSaving: (v: boolean) => void) {
  if (flushTimer) clearTimeout(flushTimer);
  setSaving(true);
  flushTimer = setTimeout(() => void flushNow(setSaving), 450);
}

async function flushNow(setSaving: (v: boolean) => void) {
  const entries = [...pendingEntries.values()];
  const images = [...pendingImages.values()];
  const boards = [...pendingBoards.values()];
  pendingEntries.clear();
  pendingImages.clear();
  pendingBoards.clear();
  try {
    if (entries.length) await db.entries.bulkPut(entries);
    if (images.length) await db.images.bulkPut(images);
    if (boards.length) await db.boards.bulkPut(boards);
  } catch (err) {
    console.error('Speichern fehlgeschlagen', err);
  } finally {
    setSaving(false);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => void flushNow(() => {}));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushNow(() => {});
  });
}

/* ---------------------------------------------------------------- Verlauf */

const MAX_REVISIONS_PER_ENTRY = 40;
/** Nicht jeder Tastendruck ist eine Fassung – höchstens alle zwei Minuten eine. */
const REVISION_INTERVAL = 120_000;
const lastRevisionAt = new Map<string, number>();

async function recordRevision(entry: Entry, action: Revision['action'], summary: string, force = false) {
  const now = Date.now();
  if (!force) {
    const last = lastRevisionAt.get(entry.id) ?? 0;
    if (now - last < REVISION_INTERVAL) return;
  }
  lastRevisionAt.set(entry.id, now);
  try {
    await db.revisions.put({
      id: newId('rev'),
      entryId: entry.id,
      at: now,
      action,
      summary,
      snapshot: JSON.parse(JSON.stringify(entry)) as Entry,
    });
    // Alte Fassungen ausdünnen, damit die Zeitleiste nicht unendlich wächst.
    const all = await db.revisions.where('entryId').equals(entry.id).sortBy('at');
    if (all.length > MAX_REVISIONS_PER_ENTRY) {
      const excess = all.slice(0, all.length - MAX_REVISIONS_PER_ENTRY).map((r) => r.id);
      await db.revisions.bulkDelete(excess);
    }
  } catch (err) {
    console.error('Fassung konnte nicht abgelegt werden', err);
  }
}

/* ------------------------------------------------------------------- Store */

let initPromise: Promise<void> | null = null;

const DEFAULT_SETTINGS: Settings = { ...FRESH_SETTINGS, seedVersion: 0 };

/**
 * Hat hier schon jemand gearbeitet?
 *
 * Nicht an den Einträgen ablesbar: Eine frische Installation bekommt
 * Beispieldaten und hätte damit sofort „Inhalt". Verräterisch sind nur die
 * Spuren eines Menschen – ein Lesebändchen, zuletzt geöffnete Seiten, ein
 * eigener Weltname, eigene Typen oder Ziele.
 */
function wirktBenutzt(s: Settings): boolean {
  return (
    !!s.lastSpreadKey ||
    (s.recentIds?.length ?? 0) > 0 ||
    (s.customTypes?.length ?? 0) > 0 ||
    (s.goals?.length ?? 0) > 0 ||
    !!s.lastBackupAt ||
    Object.keys(s.visits ?? {}).length > 0 ||
    (!!s.worldName && s.worldName !== FRESH_SETTINGS.worldName)
  );
}

export const useStudio = create<StudioState>((set, get) => {
  const setSaving = (v: boolean) =>
    set(v ? { saving: true } : { saving: false, savedAt: Date.now() });

  const persistEntry = (entry: Entry) => {
    pendingEntries.set(entry.id, entry);
    scheduleFlush(setSaving);
  };

  const patchEntry = (id: string, mutate: (e: Entry) => Entry, summary = 'bearbeitet') => {
    let updated: Entry | null = null;
    let previous: Entry | null = null;
    set((state) => ({
      entries: state.entries.map((e) => {
        if (e.id !== id) return e;
        previous = e;
        updated = { ...mutate(e), updatedAt: Date.now() };
        return updated;
      }),
    }));
    if (updated && previous) {
      persistEntry(updated);
      void recordRevision(previous, 'edited', summary);
    }
  };

  /** Beziehungen speichern und den Index neu aufbauen. */
  const commitRelations = (relations: Relation[]) => {
    set({ relations, relIndex: buildRelationIndex(relations) });
  };

  const persistSettings = (settings: Settings) => {
    set({ settings });
    void db.settings.put(settings);
  };

  return {
    ready: false,
    entries: [],
    relations: [],
    relIndex: buildRelationIndex([]),
    images: [],
    boards: [],
    settings: DEFAULT_SETTINGS,
    toasts: [],
    saving: false,
    savedAt: 0,

    init() {
      if (initPromise) return initPromise;

      initPromise = (async () => {
        try {
          const stored = await db.settings.get('settings');
          const settings: Settings = stored
            ? { ...DEFAULT_SETTINGS, ...stored, nav: mergeNav(stored.nav) }
            : DEFAULT_SETTINGS;

          /*
           * Beispieldaten nur noch für Bestandsinstallationen.
           *
           * Ein frisches Gerät geht jetzt durch das Onboarding, und dort wird
           * die Beispielwelt *gezeigt* statt eingeschrieben. Würde hier
           * trotzdem geimpft, stünden nach „Meine Welt beginnen“ vierzehn
           * fremde Einträge im eigenen Buch – genau das Gegenteil dessen, was
           * der Satz verspricht.
           *
           * Die Saatversion wird trotzdem gesetzt, sonst holte der nächste
           * Start das Impfen nach, sobald ein Buch existiert.
           */
          if (settings.book || wirktBenutzt(settings)) {
            const seeded = await seedIfEmpty(settings.seedVersion);
            if (seeded) settings.seedVersion = seeded;
          } else {
            settings.seedVersion = SEED_VERSION;
          }

          /*
           * Bestandsübernahme.
           *
           * Die Buchidentität gibt es erst seit kurzem. Wer das Artbook schon
           * benutzt hat, bekäme ohne diese Zeilen beim nächsten Start die
           * Erschaffung eines neuen Buches vorgesetzt – „Jede Welt beginnt mit
           * einem leeren Buch" – und müsste glauben, seine sei fort. Sie ist
           * es nicht; es fehlt nur der Einband.
           *
           * Also wird er aus dem gemacht, was schon da ist: aus dem Weltnamen,
           * dem Untertitel und dem Zeichen, das dieses Buch bisher trug.
           *
           * Nur bei sichtbaren Spuren von Gebrauch. Eine frische Installation
           * hat zwar Beispieldaten, aber kein Lesebändchen, keine zuletzt
           * geöffneten Seiten und den unveränderten Weltnamen – die soll die
           * Erschaffung sehen, denn für sie ist sie gedacht.
           */
          if (!settings.book && wirktBenutzt(settings)) {
            settings.book = newBookIdentity({
              title: settings.worldName?.trim() || 'Dragoncore',
              subtitle: settings.worldTagline ?? '',
              emblemType: 'preset',
              emblemId: 'dragoncore',
            });
          }

          setCustomTypes(settings.customTypes ?? []);

          /*
           * Beim Hereinkommen geradeziehen.
           *
           * Was in IndexedDB liegt, muss nicht sein, was die Typen versprechen:
           * eine Sicherung aus einer aelteren Fassung, ein halber Import, ein
           * abgeschnittener Schreibvorgang. Ein Eintrag ohne `fields` reichte,
           * um beim Zeichnen die ganze Seite zu reissen. Hier ist die einzige
           * Stelle, an der Daten hereinkommen – also wird hier einmal geheilt
           * und danach darf sich jede Seite darauf verlassen.
           */
          const [roheEintraege, roheKanten, images, boards] = await Promise.all([
            db.entries.toArray(),
            db.relations.toArray(),
            db.images.toArray(),
            db.boards.toArray(),
          ]);
          const entries = heileEintraege(roheEintraege);
          const relations = heileBeziehungen(roheKanten);

          await db.settings.put(settings);
          set({
            entries,
            relations,
            relIndex: buildRelationIndex(relations),
            images,
            boards,
            settings,
            ready: true,
          });
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
        pipelineStage: type === 'asset' ? DEFAULT_STAGE : undefined,
        ...patch,
      };
      set((s) => ({ entries: [entry, ...s.entries] }));
      await db.entries.put(entry);
      void recordRevision(entry, 'created', 'angelegt', true);
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
        ...clone(source),
        id: newId('e'),
        title: `${source.title} (Kopie)`,
        createdAt: now,
        updatedAt: now,
        blocks: source.blocks.map(duplicateBlock),
      };
      set((s) => ({ entries: [copy, ...s.entries] }));
      await db.entries.put(copy);

      // Beziehungen der Vorlage mitnehmen – eine Kopie ohne ihren Platz in der
      // Welt wäre ein loses Blatt.
      const inherited = get()
        .relations.filter((r) => r.fromId === id || r.toId === id)
        .map((r) =>
          makeRelation(
            r.fromId === id ? copy.id : r.fromId,
            r.toId === id ? copy.id : r.toId,
            r.type,
            r.note,
          ),
        );
      if (inherited.length) {
        await db.relations.bulkPut(inherited);
        commitRelations([...get().relations, ...inherited]);
      }

      void recordRevision(copy, 'created', 'als Kopie angelegt', true);
      get().notify('Eintrag dupliziert – mit allen Beziehungen.', 'success');
      return copy;
    },

    /** Löschen heißt hier: in den Papierkorb. Nichts geht unwiederbringlich verloren. */
    async deleteEntry(id) {
      const entry = get().entries.find((e) => e.id === id);
      if (!entry) return;
      await recordRevision(entry, 'deleted', 'gelöscht', true);
      const updated = { ...entry, deletedAt: Date.now(), updatedAt: Date.now() };
      set((s) => ({ entries: s.entries.map((e) => (e.id === id ? updated : e)) }));
      await db.entries.put(updated);
      get().notify('In den Papierkorb gelegt – über die Zeitleiste zurückholbar.', 'success');
    },

    async restoreEntry(id) {
      const entry = get().entries.find((e) => e.id === id);
      if (!entry) return;
      const updated = { ...entry, deletedAt: undefined, updatedAt: Date.now() };
      set((s) => ({ entries: s.entries.map((e) => (e.id === id ? updated : e)) }));
      await db.entries.put(updated);
      void recordRevision(updated, 'restored', 'zurückgeholt', true);
      get().notify('Zurückgeholt.', 'success');
    },

    /** Endgültig entfernen – samt Beziehungen und Fassungen. */
    async purgeEntry(id) {
      set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      const remaining = get().relations.filter((r) => r.fromId !== id && r.toId !== id);
      commitRelations(remaining);
      await db.transaction('rw', [db.entries, db.relations, db.revisions], async () => {
        await db.entries.delete(id);
        await db.relations.where('fromId').equals(id).delete();
        await db.relations.where('toId').equals(id).delete();
        await db.revisions.where('entryId').equals(id).delete();
      });
      get().notify('Endgültig gelöscht.', 'success');
    },

    toggleFavorite(id) {
      patchEntry(id, (e) => ({ ...e, favorite: !e.favorite }), 'Favorit geändert');
    },

    /** Merkt sich, woran zuletzt gearbeitet wurde („Weitermachen, wo du warst“). */
    noteVisit(id) {
      const { settings } = get();
      const recentIds = [id, ...(settings.recentIds ?? []).filter((x) => x !== id)].slice(0, 12);
      if (recentIds[0] === settings.recentIds?.[0] && recentIds.length === settings.recentIds?.length) {
        return;
      }
      persistSettings({ ...settings, recentIds });
    },

    /* ------------------------------------------------------ Beziehungen */

    addRelation(fromId, toId, type, note) {
      if (fromId === toId) return;
      const exists = get().relations.some(
        (r) =>
          r.type === type &&
          ((r.fromId === fromId && r.toId === toId) || (r.fromId === toId && r.toId === fromId)),
      );
      if (exists) return;
      const rel = makeRelation(fromId, toId, type, note);
      commitRelations([...get().relations, rel]);
      void db.relations.put(rel);
    },

    removeRelation(relationId) {
      commitRelations(get().relations.filter((r) => r.id !== relationId));
      void db.relations.delete(relationId);
    },

    setRelationType(relationId, type) {
      const next = get().relations.map((r) => (r.id === relationId ? { ...r, type } : r));
      commitRelations(next);
      const changed = next.find((r) => r.id === relationId);
      if (changed) void db.relations.put(changed);
    },

    /**
     * Eine Verbindung ändern – heute vor allem ihre Weltzeit.
     *
     * `id`, `fromId` und `toId` bleiben unangetastet: Wer eine Beziehung
     * umhängen will, löst sie und knüpft eine neue. Alles andere wäre eine
     * andere Beziehung mit der Kennung der alten.
     */
    updateRelation(relationId, patch) {
      const next = get().relations.map((r) =>
        r.id === relationId ? { ...r, ...patch, id: r.id, fromId: r.fromId, toId: r.toId } : r,
      );
      commitRelations(next);
      const changed = next.find((r) => r.id === relationId);
      if (changed) void db.relations.put(changed);
    },

    setSingleRelation(fromId, type, toId) {
      const uebrig = get().relations.filter((r) => !(r.fromId === fromId && r.type === type));
      const entfernt = get().relations.filter((r) => r.fromId === fromId && r.type === type);
      const naechste = toId && toId !== fromId ? [...uebrig, makeRelation(fromId, toId, type)] : uebrig;
      commitRelations(naechste);
      void db.transaction('rw', db.relations, async () => {
        if (entfernt.length) await db.relations.bulkDelete(entfernt.map((r) => r.id));
        const neu = naechste.find((r) => !uebrig.includes(r));
        if (neu) await db.relations.put(neu);
      });
    },

    /* ------------------------------------------------------------- Roman */

    /**
     * Einen Knoten anlegen und sofort einhaengen.
     *
     * Kapitel und Szene entstehen nie fuer sich: Ein Kapitel ohne Roman ist
     * ein verlorener Eintrag, den niemand wiederfindet. Deshalb sind Anlegen
     * und Einhaengen hier ein Vorgang und nicht zwei.
     */
    async createUnter(elternId, type, titel) {
      const { entries, relIndex } = get();
      const byId = new Map(entries.map((e) => [e.id, e]));
      const geschwister = kinderVon(relIndex, byId, elternId, type);
      const entry = await get().createEntry(type, {
        title: titel ?? templateFor(type).newTitle,
        fields: { ...emptyFields(type), ordnung: naechsteOrdnung(geschwister) },
      });
      get().addRelation(elternId, entry.id, 'contains');
      return entry;
    },

    ordneNeu(aenderungen) {
      if (!aenderungen.length) return;
      const nach = new Map(aenderungen.map((a) => [a.id, a.ordnung]));
      const jetzt = Date.now();
      const naechste = get().entries.map((e) => {
        const ordnung = nach.get(e.id);
        return ordnung === undefined
          ? e
          : { ...e, fields: { ...e.fields, ordnung }, updatedAt: jetzt };
      });
      set({ entries: naechste });
      void db.entries.bulkPut(naechste.filter((e) => nach.has(e.id)));
    },

    /** Richtung umkehren – „lebt in“ wird zu „beherbergt“. */
    flipRelation(relationId) {
      const next = get().relations.map((r) =>
        r.id === relationId ? { ...r, fromId: r.toId, toId: r.fromId } : r,
      );
      commitRelations(next);
      const changed = next.find((r) => r.id === relationId);
      if (changed) void db.relations.put(changed);
    },

    /* ----------------------------------------------------------- Blöcke */

    addBlock(entryId, type, index) {
      patchEntry(
        entryId,
        (e) => {
          const block = createBlock(type);
          const blocks = e.blocks.slice();
          blocks.splice(index ?? blocks.length, 0, block);
          return { ...e, blocks };
        },
        'Block hinzugefügt',
      );
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
      patchEntry(
        entryId,
        (e) => {
          if (from === to || from < 0 || to < 0 || from >= e.blocks.length || to >= e.blocks.length) {
            return e;
          }
          const blocks = e.blocks.slice();
          const [moved] = blocks.splice(from, 1);
          blocks.splice(to, 0, moved);
          return { ...e, blocks };
        },
        'Blöcke umsortiert',
      );
    },

    duplicateBlockAt(entryId, blockId) {
      patchEntry(
        entryId,
        (e) => {
          const index = e.blocks.findIndex((b) => b.id === blockId);
          if (index < 0) return e;
          const blocks = e.blocks.slice();
          blocks.splice(index + 1, 0, duplicateBlock(e.blocks[index]));
          return { ...e, blocks };
        },
        'Block dupliziert',
      );
      get().notify('Block dupliziert.', 'success');
    },

    deleteBlock(entryId, blockId) {
      patchEntry(entryId, (e) => ({ ...e, blocks: e.blocks.filter((b) => b.id !== blockId) }), 'Block gelöscht');
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
      const touched: Entry[] = [];
      set((s) => ({
        images: s.images.filter((m) => m.id !== id),
        entries: s.entries.map((e) => {
          const next = removeImageFromEntry(e, id);
          if (next !== e) touched.push(next);
          return next;
        }),
        boards: s.boards.map((b) => {
          const items = b.items.filter((i) => !(i.kind === 'image' && i.refId === id));
          if (items.length === b.items.length) return b;
          const next = { ...b, items, updatedAt: Date.now() };
          pendingBoards.set(b.id, next);
          return next;
        }),
      }));
      if (touched.length) await db.entries.bulkPut(touched);
      scheduleFlush(setSaving);
      get().notify('Bild gelöscht.', 'success');
    },

    /* ----------------------------------------------------------- Flächen */

    async createBoard(name) {
      const now = Date.now();
      const board: CanvasBoard = {
        id: newId('board'),
        name,
        items: [],
        camera: { x: 0, y: 0, zoom: 1 },
        createdAt: now,
        updatedAt: now,
      };
      set((s) => ({ boards: [board, ...s.boards] }));
      await db.boards.put(board);
      return board;
    },

    updateBoard(id, patch) {
      let updated: CanvasBoard | null = null;
      set((s) => ({
        boards: s.boards.map((b) => {
          if (b.id !== id) return b;
          updated = { ...b, ...patch, updatedAt: Date.now() };
          return updated;
        }),
      }));
      if (updated) {
        pendingBoards.set(id, updated);
        scheduleFlush(setSaving);
      }
    },

    async deleteBoard(id) {
      set((s) => ({ boards: s.boards.filter((b) => b.id !== id) }));
      pendingBoards.delete(id);
      await db.boards.delete(id);
      get().notify('Fläche gelöscht.', 'success');
    },

    /* ---------------------------------------------------------- Verlauf */

    async revisionsOf(entryId) {
      const list = await db.revisions.where('entryId').equals(entryId).sortBy('at');
      return list.reverse();
    },

    async recentRevisions(limit = 60) {
      const list = await db.revisions.orderBy('at').reverse().limit(limit).toArray();
      return list;
    },

    async restoreRevision(revisionId) {
      const revision = await db.revisions.get(revisionId);
      if (!revision) {
        get().notify('Diese Fassung gibt es nicht mehr.', 'error');
        return;
      }
      const current = get().entries.find((e) => e.id === revision.entryId);
      if (current) await recordRevision(current, 'edited', 'vor dem Zurückholen', true);

      const restored: Entry = { ...revision.snapshot, deletedAt: undefined, updatedAt: Date.now() };
      set((s) => ({
        entries: s.entries.some((e) => e.id === restored.id)
          ? s.entries.map((e) => (e.id === restored.id ? restored : e))
          : [restored, ...s.entries],
      }));
      await db.entries.put(restored);
      get().notify(`„${restored.title}“ zurückgeholt.`, 'success');
    },

    /* -------------------------------------------------------- Das Buch */

    /**
     * Die Buchidentität schreiben.
     *
     * Gibt es noch keine, entsteht sie hier – mit `createdAt`, das nie wieder
     * angefasst wird: Es ist das Datum auf der Besitzseite, der Tag, an dem
     * die Welt begonnen hat.
     *
     * Der Weltname wird mitgeführt. Er stand vor dem Buch schon in den
     * Einstellungen und wird an vielen Stellen gelesen; liefen die beiden
     * auseinander, hiesse das Buch auf dem Einband anders als im Register.
     */
    saveBook(patch) {
      const alt = get().settings.book;
      const book: BookIdentity = alt
        ? { ...alt, ...patch, id: alt.id, createdAt: alt.createdAt, updatedAt: Date.now() }
        : newBookIdentity(patch);

      const settings = { ...get().settings, book };
      if (book.title.trim()) settings.worldName = book.title.trim();
      if (book.subtitle?.trim()) settings.worldTagline = book.subtitle.trim();

      persistSettings(settings);
      return book;
    },

    savePromptTemplate(id, content) {
      const rest = (get().settings.promptTemplates ?? []).filter((t) => t.id !== id);
      persistSettings({
        ...get().settings,
        promptTemplates: [...rest, { id, content, updatedAt: Date.now() }],
      });
    },

    /** Die eigene Fassung verwerfen – danach gilt wieder die des Hauses. */
    resetPromptTemplate(id) {
      persistSettings({
        ...get().settings,
        promptTemplates: (get().settings.promptTemplates ?? []).filter((t) => t.id !== id),
      });
    },

    /* ---------------------------------------------------- Einstellungen */

    updateNav(nav) {
      persistSettings({ ...get().settings, nav });
    },

    updateSettings(patch) {
      persistSettings({ ...get().settings, ...patch });
    },

    saveCustomType(def) {
      const existing = get().settings.customTypes ?? [];
      const customTypes = existing.some((t) => t.type === def.type)
        ? existing.map((t) => (t.type === def.type ? def : t))
        : [...existing, def];
      setCustomTypes(customTypes);
      persistSettings({ ...get().settings, customTypes });
      get().notify(`Typ „${def.label}“ gespeichert.`, 'success');
    },

    removeCustomType(type) {
      const customTypes = (get().settings.customTypes ?? []).filter((t) => t.type !== type);
      setCustomTypes(customTypes);
      persistSettings({ ...get().settings, customTypes });
    },

    addGoal(goal) {
      const goals = [
        ...(get().settings.goals ?? []),
        { ...goal, id: newId('goal'), createdAt: Date.now() },
      ];
      persistSettings({ ...get().settings, goals });
    },

    updateGoal(id, patch) {
      const goals = (get().settings.goals ?? []).map((g) => (g.id === id ? { ...g, ...patch } : g));
      persistSettings({ ...get().settings, goals });
    },

    removeGoal(id) {
      const goals = (get().settings.goals ?? []).filter((g) => g.id !== id);
      persistSettings({ ...get().settings, goals });
    },

    async reloadFromDb() {
      const [roheEintraege, roheKanten, images, boards, settings] = await Promise.all([
        db.entries.toArray(),
        db.relations.toArray(),
        db.images.toArray(),
        db.boards.toArray(),
        db.settings.get('settings'),
      ]);
      const entries = heileEintraege(roheEintraege);
      const relations = heileBeziehungen(roheKanten);
      if (settings) setCustomTypes(settings.customTypes ?? []);
      set({
        entries,
        relations,
        relIndex: buildRelationIndex(relations),
        images,
        boards,
        ...(settings ? { settings: { ...DEFAULT_SETTINGS, ...settings, nav: mergeNav(settings.nav) } } : {}),
      });
    },

    async wipeAll() {
      if (flushTimer) clearTimeout(flushTimer);
      pendingEntries.clear();
      pendingImages.clear();
      pendingBoards.clear();
      lastRevisionAt.clear();
      await wipeDatabase();
      setCustomTypes([]);
      set({
        entries: [],
        relations: [],
        relIndex: buildRelationIndex([]),
        images: [],
        boards: [],
        settings: { ...FRESH_SETTINGS, seedVersion: SEED_VERSION },
      });
    },

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

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeNav(stored: NavItem[] | undefined): NavItem[] {
  if (!stored?.length) return DEFAULT_NAV;
  const known = new Set(stored.map((n) => n.id));
  const missing = DEFAULT_NAV.filter((n) => !known.has(n.id));
  return [...stored, ...missing];
}

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

/** Lebende Einträge – ohne das, was im Papierkorb liegt. */
export function livingEntries(entries: Entry[]): Entry[] {
  return entries.filter((e) => !e.deletedAt);
}

export function countByType(entries: Entry[], type: EntryType): number {
  return entries.filter((e) => e.type === type && !e.deletedAt).length;
}
