/**
 * Zentrale Datentypen von Dragoncore Studio.
 *
 * Leitgedanke: Alles ist ein Eintrag (`Entry`). Was ein Eintrag *ist*, sagt sein
 * `type` – und Typen sind Daten, keine Klassen. Deshalb ist `EntryType` ein
 * String: neue Inhaltsarten entstehen ohne eine Zeile neuen Code.
 *
 * Der zweite Grundpfeiler sind `Relation`s. Eine Beziehung hat eine Bedeutung
 * („lebt in“, „besteht aus“, „stammt von“) und eine Richtung. Aus vielen
 * bedeutungstragenden Kanten entsteht der Weltgraph.
 */

/** Typ-Kennung eines Eintrags. Eingebaute Typen siehe `lib/types-registry.ts`. */
export type EntryType = string;

export type EntryStatus = 'Idee' | 'In Arbeit' | 'Überarbeitung' | 'Freigegeben' | 'Archiviert';

export const ENTRY_STATUSES: EntryStatus[] = [
  'Idee',
  'In Arbeit',
  'Überarbeitung',
  'Freigegeben',
  'Archiviert',
];

/* ------------------------------------------------------------------ Blöcke */

export type BlockType =
  | 'heading'
  | 'text'
  | 'quote'
  | 'note'
  | 'image'
  | 'gallery'
  | 'moodboard'
  | 'palette'
  | 'materials'
  | 'references'
  | 'checklist'
  | 'prompt'
  | 'assetList'
  | 'divider'
  | 'spacer';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface PaletteSwatch {
  id: string;
  color: string;
  name: string;
  note: string;
}

export interface MaterialSwatch {
  id: string;
  name: string;
  color: string;
  finish: string;
  note: string;
}

export interface ReferenceCard {
  id: string;
  title: string;
  note: string;
  source: string;
  imageId?: string;
}

export interface MoodboardTile {
  id: string;
  imageId?: string;
  caption: string;
}

export interface BlockData {
  level?: 1 | 2 | 3;
  text?: string;
  source?: string;
  tone?: 'info' | 'warn' | 'idea';
  imageId?: string;
  caption?: string;
  imageIds?: string[];
  tiles?: MoodboardTile[];
  columns?: number;
  swatches?: PaletteSwatch[];
  materials?: MaterialSwatch[];
  cards?: ReferenceCard[];
  items?: ChecklistItem[];
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  entryIds?: string[];
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  collapsed?: boolean;
  data: BlockData;
}

/* ------------------------------------------------------------------ Eintrag */

export type FieldValue = string | string[] | boolean;

export interface Entry {
  id: string;
  title: string;
  subtitle: string;
  type: EntryType;
  category: string;
  description: string;
  tags: string[];
  status: EntryStatus;
  favorite: boolean;
  coverImage?: string;
  createdAt: number;
  updatedAt: number;
  /**
   * Alte, ungerichtete Verknüpfungen. Bleibt für Altdaten und Import erhalten,
   * wird beim Start in echte `Relation`s überführt.
   */
  linkedEntryIds: string[];
  blocks: Block[];
  fields: Record<string, FieldValue>;
  /** Produktionsstufe (nur bei Assets genutzt), siehe `lib/pipeline.ts` */
  pipelineStage?: string;
  /** Papierkorb: gelöschte Einträge bleiben wiederherstellbar */
  deletedAt?: number;
}

/* --------------------------------------------------------------- Beziehungen */

export interface Relation {
  id: string;
  /** Ausgangseintrag */
  fromId: string;
  /** Zieleintrag */
  toId: string;
  /** Beziehungsart, siehe `lib/relations.ts` */
  type: string;
  /** Optionale Anmerkung („nur im Winter“, „zweite Generation“ …) */
  note?: string;
  createdAt: number;
}

/* -------------------------------------------------------------------- Bilder */

export interface StoredImageMeta {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  prompt: string;
  negativePrompt: string;
  source: string;
  status: EntryStatus;
  favorite: boolean;
  linkedEntryIds: string[];
  fileName: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
}

export interface StoredImageBlob {
  id: string;
  full: Blob;
  thumb: Blob;
}

/* ------------------------------------------------------------------ Verlauf */

/** Zeitpunkt-Aufnahme eines Eintrags – Grundlage für Zeitleiste und Rückkehr. */
export interface Revision {
  id: string;
  entryId: string;
  at: number;
  /** Was ist passiert? „angelegt“, „bearbeitet“, „gelöscht“ … */
  action: 'created' | 'edited' | 'deleted' | 'restored';
  /** Kurzbeschreibung für die Zeitleiste */
  summary: string;
  snapshot: Entry;
}

/* ----------------------------------------------------------- Concept Canvas */

export type CanvasItemKind = 'image' | 'note' | 'entry' | 'stroke' | 'frame';

export interface CanvasItem {
  id: string;
  kind: CanvasItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Bild-ID, Eintrags-ID oder Text – je nach Art */
  refId?: string;
  text?: string;
  color?: string;
  /** Freihandlinie: Punkte relativ zur Position */
  points?: number[];
  rotation?: number;
  z: number;
}

export interface CanvasBoard {
  id: string;
  name: string;
  items: CanvasItem[];
  /** Kamera beim letzten Verlassen – man kehrt dorthin zurück */
  camera: { x: number; y: number; zoom: number };
  createdAt: number;
  updatedAt: number;
}

/* -------------------------------------------------------------- Navigation */

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  removable: boolean;
  hidden: boolean;
}

/* ------------------------------------------------------------ Einstellungen */

/** Ein selbst angelegter Eintragstyp – gleichberechtigt mit den eingebauten. */
export interface CustomTypeDef {
  type: string;
  label: string;
  labelPlural: string;
  newTitle: string;
  icon: string;
  accent: string;
  categories: string[];
  fields: { key: string; label: string; kind: string; hint?: string }[];
}

export interface CreativeGoal {
  id: string;
  text: string;
  /** Zieltyp und Zielzahl, z. B. 10 Kreaturen */
  entryType?: string;
  target: number;
  done: boolean;
  createdAt: number;
}

export interface Settings {
  id: 'settings';
  nav: NavItem[];
  lastBackupAt?: number;
  backupReminderDays: number;
  seedVersion: number;
  customTypes: CustomTypeDef[];
  goals: CreativeGoal[];
  /** Zuletzt geöffnete Einträge – „Weitermachen, wo du warst“ */
  recentIds: string[];
  /** Name der Welt, erscheint in Art Bible und Story-Modus */
  worldName: string;
  worldTagline: string;
}

export type ViewMode = 'grid' | 'list' | 'detail';

export interface EntryFilter {
  query: string;
  types: EntryType[];
  categories: string[];
  statuses: EntryStatus[];
  tags: string[];
  favoritesOnly: boolean;
  cutoutOnly: boolean;
  animatableOnly: boolean;
  orientation: '' | 'hoch' | 'quer' | 'quadratisch';
}

export const EMPTY_FILTER: EntryFilter = {
  query: '',
  types: [],
  categories: [],
  statuses: [],
  tags: [],
  favoritesOnly: false,
  cutoutOnly: false,
  animatableOnly: false,
  orientation: '',
};
