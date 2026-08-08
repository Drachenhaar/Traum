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
  /**
   * Weltzeit: wann das hier begann und endete.
   *
   * Bewusst der rohe Text, den der Verfasser geschrieben hat – „1032",
   * „Frühjahr 1044", „12.4.1032" – und keine Zahl, in die wir seine
   * Schreibweise übersetzt haben. Gelesen wird beim Rechnen; siehe
   * `lib/chronik/zeit.ts`. Was sich nicht sicher deuten lässt, bleibt stehen
   * und wird angezeigt, taucht nur nicht auf der Achse auf.
   *
   * Beides darf fehlen. Ein Ort ohne Ende besteht bis heute, eine Figur ohne
   * Anfang war immer schon da – das ist eine Aussage, kein fehlender Wert.
   */
  beginn?: string;
  ende?: string;
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

/** Woher das Zeichen des Buches stammt. */
export type EmblemType = 'preset' | 'upload' | 'generated';

/**
 * Die Identität des Buches: Titel, Einband, Zeichen.
 *
 * Eine eigene Entität, keine Ansammlung von Einstellungen. Sie ist die
 * Grundlage für alles, was dieses Buch später ausweist – Besitzseite,
 * Kapitelmarken, Siegel auf geteilten Weltfragmenten, Ausgaben als PDF.
 * Deshalb hat sie eine eigene `id`, die bestehen bleibt, auch wenn der Titel
 * sich ändert.
 */
export interface BookIdentity {
  id: string;
  title: string;
  subtitle?: string;
  /** Schlüssel aus COVER_MATERIALS */
  coverMaterial: string;
  /** Schlüssel aus COVER_COLORS */
  coverColor: string;
  emblemType: EmblemType;
  /** Schlüssel aus EMBLEM_PRESETS – wenn das Zeichen aus der Bibliothek kommt */
  emblemId?: string;
  /**
   * Id eines Bildes aus der Bildverwaltung – wenn das Zeichen hochgeladen oder
   * von einer Bild-KI erzeugt wurde. Bewusst nur die Id: Die Datei liegt als
   * Blob in `imageBlobs`, wie jedes andere Bild auch.
   */
  emblemImageId?: string;
  /** Feineinstellung des eingelegten Bildes auf dem Einband. */
  emblemScale?: number;
  emblemRotation?: number;
  /** Der Text, mit dem das Zeichen erzeugt wurde – bleibt als Herkunft erhalten. */
  emblemPrompt?: string;
  /** Wer das Buch begonnen hat. Erscheint auf der Besitzseite. */
  owner?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Die abweichende Fassung einer Prompt-Vorlage.
 *
 * Nur die Abweichung wird gespeichert – wer nichts ändert, bekommt spätere
 * Verbesserungen der Werksfassung mit.
 */
export interface StoredPromptTemplate {
  id: string;
  content: string;
  updatedAt: number;
}

export interface Settings {
  id: 'settings';
  nav: NavItem[];
  /**
   * Das Buch selbst. Fehlt es, hat dieses Gerät noch keines – dann beginnt
   * beim Start die Erschaffung statt das Lesen.
   */
  book?: BookIdentity;
  /** Eigene Fassungen von Prompt-Vorlagen. */
  promptTemplates?: StoredPromptTemplate[];
  /**
   * Der Charakterspiegel lässt sich vollständig abschalten.
   *
   * Nicht verstecken – abschalten. Wer ihn nicht will, soll ihn nicht haben,
   * und zwar ohne Begründung und ohne Nachfrage.
   */
  spiegelAus?: boolean;
  /**
   * Frühere Spiegelungen: was der Spiegel zu einem früheren Zeitpunkt als
   * stärkste Motive gesehen hat. Daraus entsteht eine Chronik des kreativen
   * Vorgangs – „vor einem Jahr war dies eines der stärksten Motive".
   */
  spiegelVerlauf?: { at: number; motive: string[] }[];
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
  /**
   * Wo das Buch zuletzt zugeklappt wurde. Beim nächsten Öffnen schlägt es
   * genau dort wieder auf – wie ein Buch mit Lesebändchen.
   */
  lastSpreadKey?: string;
  /**
   * Wie oft eine Seite gelesen wurde. Daraus entsteht die Abnutzung: oft
   * besuchte Seiten wirken eine Spur wärmer und griffiger.
   */
  visits?: Record<string, number>;
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
