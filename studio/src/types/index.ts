/**
 * Zentrale Datentypen von Dragoncore Studio.
 *
 * Grundidee: Es gibt genau EINEN generischen Eintragstyp (`Entry`).
 * Spezialisierungen (Charakter, Kreatur, Asset, Prompt …) entstehen über
 *  - `type`   → welche Vorlage/Ansicht verwendet wird
 *  - `fields` → typspezifische Felder (deklarativ in `lib/templates.ts` beschrieben)
 *  - `blocks` → frei anordenbarer Seiteninhalt
 *
 * Dadurch lässt sich das Modell später erweitern, ohne die Datenbank zu migrieren.
 */

export type EntryType =
  | 'page'
  | 'character'
  | 'creature'
  | 'plant'
  | 'architecture'
  | 'asset'
  | 'prompt'
  | 'location'
  | 'collection';

export const ENTRY_TYPES: EntryType[] = [
  'page',
  'character',
  'creature',
  'plant',
  'architecture',
  'asset',
  'prompt',
  'location',
  'collection',
];

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
  finish: string; // z. B. "matt", "seidig", "rau"
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

/** Nutzdaten je Blocktyp. Bewusst locker gehalten, damit neue Typen leicht ergänzt werden. */
export interface BlockData {
  /** heading */
  level?: 1 | 2 | 3;
  /** heading, text, quote, note, prompt, assetList, gallery, moodboard … */
  text?: string;
  /** quote */
  source?: string;
  /** note */
  tone?: 'info' | 'warn' | 'idea';
  /** image */
  imageId?: string;
  caption?: string;
  /** gallery / moodboard */
  imageIds?: string[];
  tiles?: MoodboardTile[];
  columns?: number;
  /** palette */
  swatches?: PaletteSwatch[];
  /** materials */
  materials?: MaterialSwatch[];
  /** references */
  cards?: ReferenceCard[];
  /** checklist */
  items?: ChecklistItem[];
  /** prompt */
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  /** assetList */
  entryIds?: string[];
  /** spacer */
  size?: 'sm' | 'md' | 'lg';
  /** heading/text – optionale Beschriftung */
  title?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  collapsed?: boolean;
  data: BlockData;
}

/* ------------------------------------------------------------------ Eintrag */

/** Typspezifische Felder – Werte sind Strings, String-Arrays oder Booleans. */
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
  /** ID eines Bildes aus der `images`-Tabelle */
  coverImage?: string;
  createdAt: number;
  updatedAt: number;
  linkedEntryIds: string[];
  blocks: Block[];
  /** Felder der jeweiligen Vorlage (Charakter, Kreatur, Asset, Prompt …) */
  fields: Record<string, FieldValue>;
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

/** Bilddaten liegen getrennt von den Metadaten, damit Listen schnell bleiben. */
export interface StoredImageBlob {
  id: string;
  full: Blob;
  thumb: Blob;
}

/* ------------------------------------------------------------- Navigation */

export interface NavItem {
  id: string;
  label: string;
  /** Lucide-Icon-Name, siehe `lib/icons.ts` */
  icon: string;
  path: string;
  /** Feste Einträge lassen sich ausblenden und umsortieren, aber nicht löschen. */
  removable: boolean;
  hidden: boolean;
}

/* --------------------------------------------------------------- Sonstiges */

export interface Settings {
  id: 'settings';
  nav: NavItem[];
  /** Zeitpunkt der letzten manuellen Sicherung */
  lastBackupAt?: number;
  /** Erinnerung an Sicherung nach X Tagen */
  backupReminderDays: number;
  seedVersion: number;
}

export type ViewMode = 'grid' | 'list' | 'detail';

export interface EntryFilter {
  query: string;
  types: EntryType[];
  categories: string[];
  statuses: EntryStatus[];
  tags: string[];
  favoritesOnly: boolean;
  /** Asset-spezifisch */
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
