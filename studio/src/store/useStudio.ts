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
  Block,
  CanvasBoard,
  CreativeGoal,
  CustomTypeDef,
  Entry,
  EntryType,
  LibraryBook,
  NavItem,
  Relation,
  Revision,
  Settings,
  StoredImageMeta,
  StoredKlang,
} from '../types';
import { emptyFields, setCustomTypes, templateFor } from '../lib/templates';
import { createBlock, duplicateBlock } from '../lib/blocks';
import { deleteImage as deleteImageFiles } from '../lib/images';
import { newId } from '../lib/utils';
import { DEFAULT_NAV } from '../lib/nav';
import {
  buchAusAltenEinstellungen,
  neuesBuch,
  regalfolge,
  sichtbareEinstellungen,
  zerlegeAenderung,
} from '../lib/bibliothek';
import { seedIfEmpty } from '../db/seed';
import { buildRelationIndex, makeRelation, type RelationIndex } from '../lib/relations';
import { kinderVon, naechsteOrdnung } from '../lib/roman/struktur';
import { heileBeziehungen, heileEintraege } from '../lib/heilung';
import { DEFAULT_STAGE } from '../lib/pipeline';
import { MAX_KLANG_BYTES, alleStill, dauerVon } from '../lib/atmosphaere';

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

  /**
   * Die Bibliothek: alle Bände, auch die archivierten.
   *
   * Sie liegt vollständig im Speicher, und das ist kein Widerspruch zu „nicht
   * alle Bücher laden": Ein Band ist ein paar hundert Byte – Titel, Einband,
   * Lesebändchen. Was Platz braucht, sind seine Einträge, und die kommen nur
   * für das aufgeschlagene Buch.
   */
  books: LibraryBook[];
  /** Welches Buch aufgeschlagen ist. Alles unten hängt daran. */
  activeBookId?: string;
  /** Die Klänge dieses Buches. Nur die Angaben – die Dateien bleiben liegen. */
  klaenge: StoredKlang[];

  init: () => Promise<void>;

  /* Die Bibliothek */
  oeffneBuch: (id: string) => Promise<void>;
  schliesseBuch: () => void;
  erstelleBuch: (patch?: Partial<LibraryBook>) => Promise<LibraryBook>;
  archiviereBuch: (id: string, archiviert: boolean) => Promise<void>;
  dupliziereBuch: (id: string) => Promise<LibraryBook | null>;
  loescheBuch: (id: string) => Promise<void>;
  /**
   * Zu welchem Buch gehört diese Seite? Für Verweise, die aus einem anderen
   * Buch kommen – siehe `components/book/BuchWeiche.tsx`.
   */
  buchVonEintrag: (entryId: string) => Promise<string | undefined>;

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

  /* Klänge */
  legeKlang: (datei: File) => Promise<StoredKlang | null>;
  entferneKlang: (id: string) => Promise<void>;

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
  saveBook: (patch: Partial<LibraryBook>) => LibraryBook;
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
      /* Die Fassung gehoert dem Buch, nicht nur dem Eintrag – sonst waere sie
         nach dem endgueltigen Loeschen des Eintrags heimatlos. */
      bookId: entry.bookId,
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

/**
 * Alles, was noch zu keinem Buch gehört, diesem zuschlagen.
 *
 * Das Netz unter der Datenbankaufwertung. Die Tabellen stehen einzeln da und
 * nicht in einer Schleife, weil Dexies Tabellentypen sich nicht zu einem
 * gemeinsamen Aufruf vereinigen lassen – eine Schleife bräuchte hier ein
 * `as never`, und das wäre genau an der Stelle gelogen, an der die Daten
 * eines Menschen umgeschrieben werden.
 */
async function stempele(bookId: string): Promise<void> {
  const ohneBuch = <T extends { bookId?: string }>(z: T) => !z.bookId;

  const entries = await db.entries.filter(ohneBuch).toArray();
  if (entries.length) await db.entries.bulkPut(entries.map((z) => ({ ...z, bookId })));

  const relations = await db.relations.filter(ohneBuch).toArray();
  if (relations.length) await db.relations.bulkPut(relations.map((z) => ({ ...z, bookId })));

  const images = await db.images.filter(ohneBuch).toArray();
  if (images.length) await db.images.bulkPut(images.map((z) => ({ ...z, bookId })));

  const boards = await db.boards.filter(ohneBuch).toArray();
  if (boards.length) await db.boards.bulkPut(boards.map((z) => ({ ...z, bookId })));

  const revisions = await db.revisions.filter(ohneBuch).toArray();
  if (revisions.length) await db.revisions.bulkPut(revisions.map((z) => ({ ...z, bookId })));
}

/**
 * Liegt hier etwas herrenlos herum?
 *
 * Ein Eintrag ohne Buch ist seit der Bibliothek unsichtbar – keine Ansicht
 * fragt nach ihm, kein Register führt ihn, keine Suche findet ihn. Er ist
 * nicht gelöscht, aber er ist fort, und das ist der schlimmere Fall: Es gibt
 * keine Meldung und keinen Papierkorb, aus dem man ihn holen könnte.
 *
 * Deshalb wird bei jedem Start nachgesehen. Nicht durch Lesen aller Einträge
 * – das wären bei zehntausend Seiten mehrere Sekunden vor dem ersten Bild –,
 * sondern durch zwei Zählungen über den Index: Was insgesamt da ist gegen
 * das, was allen Bänden zusammen gehört. Stimmen sie überein, war es das.
 *
 * Erst wenn sie auseinandergehen, wird gesucht und geheilt. Das kostet dann
 * einen Durchlauf – einmal, und danach nie wieder.
 */
async function findeHerrenloses(buecher: LibraryBook[]): Promise<boolean> {
  const gesamt = await db.entries.count();
  if (gesamt === 0) return false;
  let zugeordnet = 0;
  for (const b of buecher) {
    zugeordnet += await db.entries.where('bookId').equals(b.id).count();
  }
  return zugeordnet < gesamt;
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

  /**
   * Einstellungen ablegen – an zwei Orten, aus einem Aufruf.
   *
   * Jede Stelle im Projekt schreibt weiterhin `persistSettings({ ...settings,
   * irgendwas })`, so wie es sie schon immer getan hat. Was sich geändert
   * hat, liegt hier: Der Weltname landet im Band, die Erinnerung ans Sichern
   * im Gerät. Welcher Schlüssel wohin gehört, steht an genau einer Stelle –
   * in `BUCH_SCHLUESSEL`.
   *
   * Der Grund für diesen Trichter: Die Trennung nach §24 des Auftrags soll in
   * den *Daten* stehen, nicht in fünfzig Komponenten. Wer sie in die
   * Komponenten trägt, hat sie fünfzigmal, und beim einundfünfzigsten Mal
   * falsch.
   */
  const persistSettings = (naechste: Settings) => {
    const { global, buch } = zerlegeAenderung(naechste);
    const zeile = { ...FRESH_SETTINGS, ...global, id: 'settings' as const };
    void db.settings.put(zeile);

    const aktiv = naechste.book;
    if (!aktiv) {
      set({ settings: { ...naechste, ...zeile, book: undefined } });
      return;
    }
    const band: LibraryBook = { ...aktiv, ...buch };
    set((s) => ({
      settings: { ...naechste, book: band },
      books: s.books.map((b) => (b.id === band.id ? band : b)),
    }));
    void db.books.put(band);
  };

  /** Die Daten eines Buches holen – und nur die. */
  const ladeBuchinhalt = async (bookId: string) => {
    const [roheEintraege, roheKanten, images, boards, klaenge] = await Promise.all([
      db.entries.where('bookId').equals(bookId).toArray(),
      db.relations.where('bookId').equals(bookId).toArray(),
      db.images.where('bookId').equals(bookId).toArray(),
      db.boards.where('bookId').equals(bookId).toArray(),
      db.klaenge.where('bookId').equals(bookId).toArray(),
    ]);
    const entries = heileEintraege(roheEintraege);
    const relations = heileBeziehungen(roheKanten);
    return { entries, relations, images, boards, klaenge };
  };

  return {
    ready: false,
    entries: [],
    relations: [],
    relIndex: buildRelationIndex([]),
    images: [],
    boards: [],
    settings: DEFAULT_SETTINGS,
    books: [],
    activeBookId: undefined,
    klaenge: [],
    toasts: [],
    saving: false,
    savedAt: 0,

    init() {
      if (initPromise) return initPromise;

      initPromise = (async () => {
        try {
          const [stored, buecher] = await Promise.all([
            db.settings.get('settings'),
            db.books.toArray(),
          ]);
          const global: Settings = stored
            ? { ...DEFAULT_SETTINGS, ...stored, nav: mergeNav(stored.nav) }
            : DEFAULT_SETTINGS;

          /*
           * Der Nachzügler.
           *
           * Die Datenbankfassung 3 macht aus einem alten Einzelbuch den ersten
           * Band der Bibliothek – aber nur, wenn sie überhaupt läuft. Eine
           * Installation, die zwischendurch schon auf Fassung 3 gehoben wurde
           * und *danach* erst ein Buch bekam (etwa durch das Zurückspielen
           * einer alten Sicherung), hätte Inhalte ohne Band. Deshalb steht die
           * Übernahme hier ein zweites Mal – als Netz, nicht als Regel.
           */
          if (!buecher.length && (stored?.book || (stored && wirktBenutzt(global)))) {
            const erster = buchAusAltenEinstellungen(stored as unknown as Record<string, unknown>);
            await db.books.put(erster);
            buecher.push(erster);
            global.activeBookId = erster.id;
            await stempele(erster.id);
          }

          /*
           * Und ein Netz darunter.
           *
           * Was aus irgendeinem Grund ohne Band in der Datenbank liegt – ein
           * abgebrochener Import, eine Sicherung aus einer Zwischenfassung,
           * ein Fehler, den wir noch nicht kennen –, wäre unsichtbar. Es
           * bekommt das Buch, das gerade vorne liegt.
           *
           * Das ist eine Vermutung, und sie kann bei mehreren Bänden das
           * falsche Buch treffen. Sie ist trotzdem richtig: Eine Seite im
           * falschen Buch kann man verschieben. Eine Seite in keinem Buch
           * findet niemand je wieder.
           */
          if (buecher.length && (await findeHerrenloses(buecher))) {
            const heimat =
              buecher.find((b) => b.id === global.activeBookId && !b.archived) ??
              regalfolge(buecher.filter((b) => !b.archived))[0] ??
              buecher[0];
            await stempele(heimat.id);
          }

          /*
           * Welches Buch liegt offen?
           *
           * Das zuletzt aufgeschlagene, wenn es das noch gibt – sonst das
           * vorderste im Regal. Nie eines, das im Archiv steht: Wer ein Buch
           * weggeräumt hat, will es beim nächsten Start nicht wieder in der
           * Hand halten.
           */
          const offen =
            buecher.find((b) => b.id === global.activeBookId && !b.archived) ??
            regalfolge(buecher.filter((b) => !b.archived))[0];
          global.activeBookId = offen?.id;

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
          if (offen) {
            const seeded = await seedIfEmpty(global.seedVersion, offen.id);
            if (seeded) global.seedVersion = seeded;
          } else {
            global.seedVersion = SEED_VERSION;
          }

          const settings = sichtbareEinstellungen(global, offen);
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
           *
           * Geladen wird nur, was zum offenen Band gehört. Neunzehn andere
           * Bücher dürfen tausende Einträge haben; sie kosten hier nichts.
           */
          const inhalt = offen
            ? await ladeBuchinhalt(offen.id)
            : { entries: [], relations: [], images: [], boards: [], klaenge: [] };

          await db.settings.put({ ...FRESH_SETTINGS, ...zerlegeAenderung(settings).global, id: 'settings' });
          set({
            ...inhalt,
            relIndex: buildRelationIndex(inhalt.relations),
            settings,
            books: buecher,
            activeBookId: offen?.id,
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

    /* ------------------------------------------------------- Bibliothek */

    /**
     * Ein Buch aufschlagen.
     *
     * Zwei Dinge passieren gleichzeitig, und beide sind wichtig: Der Inhalt
     * des alten Buches verlässt den Speicher, und der des neuen kommt herein.
     * Erst dadurch bleibt eine Bibliothek aus zwanzig Bänden so schnell wie
     * ein einzelnes Buch.
     */
    async oeffneBuch(id) {
      const buch = get().books.find((b) => b.id === id);
      if (!buch) {
        get().notify('Dieses Buch steht nicht mehr im Regal.', 'error');
        return;
      }
      /* Ausstehende Schreibvorgaenge gehoeren noch zum alten Buch. */
      await flushNow(setSaving);
      lastRevisionAt.clear();
      /* Der Wald des einen Bandes darf nicht im anderen weiterrauschen. */
      alleStill();

      const geoeffnet: LibraryBook = { ...buch, lastOpenedAt: Date.now() };
      const inhalt = await ladeBuchinhalt(id);
      const global = { ...get().settings, activeBookId: id };
      const settings = sichtbareEinstellungen(global, geoeffnet);
      setCustomTypes(settings.customTypes ?? []);
      set((s) => ({
        ...inhalt,
        relIndex: buildRelationIndex(inhalt.relations),
        settings,
        activeBookId: id,
        books: s.books.map((b) => (b.id === id ? geoeffnet : b)),
      }));
      await db.books.put(geoeffnet);
      await db.settings.put({
        ...FRESH_SETTINGS,
        ...zerlegeAenderung(settings).global,
        id: 'settings',
      });
    },

    /**
     * Ein Buch zuklappen.
     *
     * Es bleibt aktiv – wer die Bibliothek nur ansieht und dasselbe Buch
     * wieder aufschlägt, soll nicht neu laden müssen. Aufgeräumt wird erst,
     * wenn ein anderes geöffnet wird.
     */
    schliesseBuch() {
      void flushNow(setSaving);
    },

    async erstelleBuch(patch = {}) {
      const buch = neuesBuch(patch);
      await db.books.put(buch);
      set((s) => ({ books: [...s.books, buch] }));
      return buch;
    },

    async archiviereBuch(id, archiviert) {
      const buch = get().books.find((b) => b.id === id);
      if (!buch) return;
      const naechstes = { ...buch, archived: archiviert, updatedAt: Date.now() };
      set((s) => ({ books: s.books.map((b) => (b.id === id ? naechstes : b)) }));
      await db.books.put(naechstes);
      get().notify(
        archiviert ? `„${buch.title}“ steht jetzt im Archiv.` : `„${buch.title}“ steht wieder im Regal.`,
        'success',
      );
    },

    /**
     * Ein Buch abschreiben.
     *
     * Alles bekommt neue Kennungen, sonst zeigten die Beziehungen der Kopie
     * auf die Einträge des Originals – und zwei Bücher teilten sich still
     * ihre Welt. Bilder werden *nicht* zweitgeschrieben: Die Datei bleibt
     * eine, beide Bände zeigen darauf.
     */
    async dupliziereBuch(id) {
      const quelle = get().books.find((b) => b.id === id);
      if (!quelle) return null;
      const kopie = neuesBuch({
        ...quelle,
        id: undefined as unknown as string,
        title: `${quelle.title} (Abschrift)`,
        worldId: quelle.worldId,
        lastSpreadKey: undefined,
        archived: false,
      });
      kopie.id = `buch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

      const [entries, relations, images, boards] = await Promise.all([
        db.entries.where('bookId').equals(id).toArray(),
        db.relations.where('bookId').equals(id).toArray(),
        db.images.where('bookId').equals(id).toArray(),
        db.boards.where('bookId').equals(id).toArray(),
      ]);

      const neueId = new Map(entries.map((e) => [e.id, newId('e')]));
      const kopierteEintraege = entries.map((e) => ({
        ...clone(e),
        id: neueId.get(e.id)!,
        bookId: kopie.id,
      }));
      const kopierteKanten = relations
        .filter((r) => neueId.has(r.fromId) && neueId.has(r.toId))
        .map((r) => ({
          ...clone(r),
          id: newId('rel'),
          bookId: kopie.id,
          fromId: neueId.get(r.fromId)!,
          toId: neueId.get(r.toId)!,
        }));
      /*
       * Bilder bekommen einen zweiten Datensatz, aber keine zweite Datei:
       * Die Metadaten gehoeren dem Buch, der Blob gehoert der Kennung – und
       * die bleibt dieselbe. Ein Artbook zu verdoppeln kostet so ein paar
       * Kilobyte statt ein paar hundert Megabyte.
       */
      const kopierteBilder = images.map((m) => ({ ...m, bookId: kopie.id }));
      const kopierteBoegen = boards.map((b) => ({
        ...clone(b),
        id: newId('board'),
        bookId: kopie.id,
      }));

      await db.transaction('rw', [db.books, db.entries, db.relations, db.images, db.boards], async () => {
        await db.books.put(kopie);
        if (kopierteEintraege.length) await db.entries.bulkPut(kopierteEintraege);
        if (kopierteKanten.length) await db.relations.bulkPut(kopierteKanten);
        if (kopierteBoegen.length) await db.boards.bulkPut(kopierteBoegen);
        for (const m of kopierteBilder) await db.images.put(m);
      });
      set((s) => ({ books: [...s.books, kopie] }));
      get().notify(`„${kopie.title}“ steht im Regal.`, 'success');
      return kopie;
    },

    /**
     * Ein Buch endgültig aus der Bibliothek nehmen.
     *
     * Die zweite, ausdrückliche Handlung nach dem Archivieren. Hier ist
     * nichts mehr zurückzuholen, deshalb fragt die Oberfläche davor.
     */
    async loescheBuch(id) {
      const buch = get().books.find((b) => b.id === id);
      const bilder = await db.images.where('bookId').equals(id).primaryKeys();
      await db.transaction(
        'rw',
        [db.books, db.entries, db.relations, db.images, db.imageBlobs, db.boards, db.revisions],
        async () => {
          await db.entries.where('bookId').equals(id).delete();
          await db.relations.where('bookId').equals(id).delete();
          await db.boards.where('bookId').equals(id).delete();
          await db.revisions.where('bookId').equals(id).delete();
          await db.images.where('bookId').equals(id).delete();
          /*
           * Die Dateien nur, wenn kein anderes Buch mehr auf sie zeigt.
           * Nach einer Abschrift tun das zwei.
           */
          for (const bildId of bilder as string[]) {
            const nochDa = await db.images.where('id').equals(bildId).count();
            if (!nochDa) await db.imageBlobs.delete(bildId);
          }
          await db.books.delete(id);
        },
      );
      set((s) => ({ books: s.books.filter((b) => b.id !== id) }));
      if (get().activeBookId === id) {
        set({ entries: [], relations: [], relIndex: buildRelationIndex([]), images: [], boards: [] });
        const naechstes = regalfolge(get().books.filter((b) => !b.archived))[0];
        if (naechstes) await get().oeffneBuch(naechstes.id);
        else set({ activeBookId: undefined, settings: { ...get().settings, book: undefined } });
      }
      if (buch) get().notify(`„${buch.title}“ ist aus der Bibliothek genommen.`, 'success');
    },

    /**
     * Zu welchem Buch gehört diese Seite?
     *
     * Für Verweise von außen. Eintragskennungen sind über die ganze
     * Bibliothek eindeutig, also lässt sich zu jeder Adresse das Buch finden
     * – auch zu einer aus einem Band, der gerade nicht offen liegt. Deshalb
     * musste die Buchkennung nicht in jede Adresse.
     */
    async buchVonEintrag(entryId) {
      const hier = get().entries.find((e) => e.id === entryId);
      if (hier) return hier.bookId ?? get().activeBookId;
      const gespeichert = await db.entries.get(entryId);
      return gespeichert?.bookId;
    },

    /* --------------------------------------------------------- Einträge */

    async createEntry(type, patch = {}) {
      const now = Date.now();
      const tpl = templateFor(type);
      const entry: Entry = {
        id: newId('e'),
        bookId: get().activeBookId,
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
        bookId: get().activeBookId,
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
        .map((r) => ({
          ...makeRelation(
            r.fromId === id ? copy.id : r.fromId,
            r.toId === id ? copy.id : r.toId,
            r.type,
            r.note,
          ),
          bookId: get().activeBookId,
        }));
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
      const rel = { ...makeRelation(fromId, toId, type, note), bookId: get().activeBookId };
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
      const naechste =
        toId && toId !== fromId
          ? [...uebrig, { ...makeRelation(fromId, toId, type), bookId: get().activeBookId }]
          : uebrig;
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

    /* ----------------------------------------------------------- Klänge */

    /**
     * Einen Klang ins Buch legen.
     *
     * Die Datei bleibt, wie sie ist – kein Umkodieren, kein Verkleinern. Bei
     * einem Bild lohnt sich das, weil eine Vorschau genügt; bei einem Klang
     * gibt es keine Vorschau, und jede Umrechnung wäre ein Qualitätsverlust
     * ohne Gegenwert.
     */
    async legeKlang(datei) {
      if (!datei.type.startsWith('audio/')) {
        get().notify(`„${datei.name}“ ist keine Klangdatei.`, 'error');
        return null;
      }
      if (datei.size > MAX_KLANG_BYTES) {
        get().notify(
          `„${datei.name}“ ist größer als ${Math.round(MAX_KLANG_BYTES / 1024 / 1024)} MB. Eine Atmosphäre ist ein Raum, kein Hörbuch – eine kurze Schleife trägt weiter.`,
          'error',
        );
        return null;
      }

      const dauer = await dauerVon(datei);
      const now = Date.now();
      const klang: StoredKlang = {
        id: newId('klang'),
        bookId: get().activeBookId,
        title: datei.name.replace(/\.[^.]+$/, ''),
        fileName: datei.name,
        mime: datei.type,
        size: datei.size,
        dauer,
        createdAt: now,
        updatedAt: now,
      };
      await db.transaction('rw', [db.klaenge, db.klangBlobs], async () => {
        await db.klaenge.put(klang);
        await db.klangBlobs.put({ id: klang.id, datei });
      });
      set((s) => ({ klaenge: [klang, ...s.klaenge] }));
      return klang;
    },

    /**
     * Einen Klang wieder herausnehmen.
     *
     * Und ihn von jeder Seite lösen, die ihn trug. Ohne das bliebe eine
     * Atmosphäre stehen, die auf eine Datei zeigt, die es nicht mehr gibt –
     * die Seite behauptete zu klingen und wäre stumm.
     */
    async entferneKlang(id) {
      const betroffen = get().entries.filter((e) => e.atmosphaere?.klangId === id);
      const bereinigt = betroffen.map((e) => ({ ...e, atmosphaere: undefined, updatedAt: Date.now() }));
      set((s) => ({
        klaenge: s.klaenge.filter((k) => k.id !== id),
        entries: s.entries.map((e) => bereinigt.find((b) => b.id === e.id) ?? e),
      }));
      await db.transaction('rw', [db.klaenge, db.klangBlobs, db.entries], async () => {
        await db.klaenge.delete(id);
        await db.klangBlobs.delete(id);
        if (bereinigt.length) await db.entries.bulkPut(bereinigt);
      });
      get().notify(
        betroffen.length
          ? `Klang entfernt – ${betroffen.length} ${betroffen.length === 1 ? 'Seite ist' : 'Seiten sind'} wieder still.`
          : 'Klang entfernt.',
        'success',
      );
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
        bookId: get().activeBookId,
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
      const book: LibraryBook = alt
        ? { ...alt, ...patch, id: alt.id, createdAt: alt.createdAt, updatedAt: Date.now() }
        : neuesBuch(patch);

      const settings = { ...get().settings, book };
      if (book.title.trim()) settings.worldName = book.title.trim();
      if (book.subtitle?.trim()) settings.worldTagline = book.subtitle.trim();

      /*
       * Ein Buch, das es noch nicht gab, kommt hier in die Bibliothek – und
       * wird sofort das aufgeschlagene. Das ist der Weg der Erschaffung: Sie
       * kennt keine Bibliothek, sie schreibt ein Buch, und die Bibliothek
       * nimmt es auf.
       */
      if (!alt) {
        settings.activeBookId = book.id;
        set((s) => ({ books: [...s.books, book], activeBookId: book.id }));
      }
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
      const vorher = get().settings.tischmodus === true;
      persistSettings({ ...get().settings, ...patch });
      /*
       * Der Tischmodus aendert, welche Eintraege sichtbar sind – aber nicht
       * die Eintraege selbst. Und genau daran haengt fast jede Ansicht:
       * `useMemo(() => livingEntries(entries), [entries])`. Ohne neue
       * Kennung der Liste rechnet keiner dieser Memos noch einmal, und die
       * verborgene Seite stuende weiter im Register, obwohl der Filter
       * laengst greift.
       *
       * Das ist der Preis dafuer, dass `livingEntries` den Modus selbst
       * nachschlaegt, statt ihn an zwanzig Aufrufstellen durchgereicht zu
       * bekommen. Der Preis ist eine Zeile hier – die Alternative waeren
       * zwanzig Stellen, an denen man es vergessen kann, und beim Spielleiter
       * faellt so ein Vergessen erst am Tisch auf.
       */
      if (patch.tischmodus !== undefined && (patch.tischmodus === true) !== vorher) {
        set((s) => ({ entries: [...s.entries] }));
      }
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

    /**
     * Alles noch einmal aus der Datenbank holen.
     *
     * Nach einem Import, nach einer Wiederherstellung, nach einer Heilung.
     * Auch die Bibliothek wird neu gelesen – ein Import kann Baende gebracht
     * haben, die es beim letzten Laden noch nicht gab.
     */
    async reloadFromDb() {
      const [gespeichert, buecher] = await Promise.all([
        db.settings.get('settings'),
        db.books.toArray(),
      ]);
      const global: Settings = gespeichert
        ? { ...DEFAULT_SETTINGS, ...gespeichert, nav: mergeNav(gespeichert.nav) }
        : { ...get().settings };
      const offen =
        buecher.find((b) => b.id === global.activeBookId && !b.archived) ??
        regalfolge(buecher.filter((b) => !b.archived))[0];
      const settings = sichtbareEinstellungen(global, offen);
      setCustomTypes(settings.customTypes ?? []);
      const inhalt = offen
        ? await ladeBuchinhalt(offen.id)
        : { entries: [], relations: [], images: [], boards: [], klaenge: [] };
      set({
        ...inhalt,
        relIndex: buildRelationIndex(inhalt.relations),
        settings,
        books: buecher,
        activeBookId: offen?.id,
      });
    },

    async wipeAll() {
      if (flushTimer) clearTimeout(flushTimer);
      pendingEntries.clear();
      pendingImages.clear();
      pendingBoards.clear();
      lastRevisionAt.clear();
      alleStill();
      await wipeDatabase();
      setCustomTypes([]);
      set({
        entries: [],
        relations: [],
        relIndex: buildRelationIndex([]),
        images: [],
        boards: [],
        books: [],
        activeBookId: undefined,
        klaenge: [],
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

/**
 * Lebende Einträge – ohne den Papierkorb, und ohne das, was am Tisch zu ist.
 *
 * Die zweite Bedingung steht hier und nicht an zwanzig Aufrufstellen, und das
 * ist der ganze Punkt. Dieselbe Funktion speist Inhalt, Register, Suche,
 * Karte, Zeitstrahl, Reise, Spiegel und das Blättern selbst. Sie einzeln zu
 * ändern hieße, eine Liste zu pflegen, die genau einmal unvollständig sein
 * muss – und die eine vergessene Stelle wäre dann die, an der ein Titel doch
 * durchrutscht.
 *
 * Der Tischmodus wird direkt aus dem Speicher gelesen statt durchgereicht.
 * Das ist eine bewusste Unsauberkeit: Die Alternative wäre ein zusätzliches
 * Argument an zwanzig Aufrufen, das an neunzehn davon niemand vergessen darf.
 *
 * Was hier ausdrücklich *nicht* gefiltert wird: die Eintragsseite selbst, der
 * Bearbeiter und jede Sicherung. Die greifen nicht hierher, und das ist
 * richtig – ein Geheimnis, das man selbst nicht mehr aufmachen kann, ist
 * kein Geheimnis, sondern ein Verlust.
 */
export function livingEntries(entries: Entry[]): Entry[] {
  const amTisch = useStudio.getState().settings.tischmodus === true;
  return entries.filter((e) => !e.deletedAt && !(amTisch && e.geheim?.ganzeSeite));
}

export function countByType(entries: Entry[], type: EntryType): number {
  return entries.filter((e) => e.type === type && !e.deletedAt).length;
}
