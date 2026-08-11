/** Zod-Schemata für Formulare (React Hook Form) und den JSON-Import. */

import { z } from 'zod';
import { ENTRY_STATUSES } from '../types';

const statusSchema = z.enum(ENTRY_STATUSES as [string, ...string[]]);
// Typen sind Daten, keine feste Liste – deshalb genügt hier ein String.
// Unbekannte Typen bekommen beim Anzeigen eine Ersatzvorlage.
const typeSchema = z.string().min(1);

/* ------------------------------------------------------------- Formulare */

export const entryMetaSchema = z.object({
  title: z.string().trim().min(1, 'Ein Titel ist nötig.').max(160, 'Höchstens 160 Zeichen.'),
  subtitle: z.string().max(200, 'Höchstens 200 Zeichen.'),
  category: z.string().max(80),
  description: z.string().max(4000, 'Höchstens 4000 Zeichen.'),
  status: statusSchema,
  tags: z.array(z.string()),
  /*
   * Weltzeit als freier Text – absichtlich ohne Formatprüfung.
   *
   * Wer „Frühjahr 1044“ schreiben will, soll das dürfen; das Buch liest, was
   * es lesen kann, und sagt auf dem Zeitstrahl, was es nicht verstanden hat.
   * Eine Prüfung hier würde die Eingabe verweigern und damit eine Notation
   * erzwingen, die dem Verfasser gehört, nicht uns.
   */
  beginn: z.string().max(60),
  ende: z.string().max(60),
});

export type EntryMetaValues = z.infer<typeof entryMetaSchema>;

export const imageMetaSchema = z.object({
  title: z.string().trim().min(1, 'Ein Titel ist nötig.').max(160),
  description: z.string().max(2000),
  category: z.string().max(80),
  prompt: z.string().max(4000),
  negativePrompt: z.string().max(4000),
  source: z.string().max(300),
  status: statusSchema,
  tags: z.array(z.string()),
});

export type ImageMetaValues = z.infer<typeof imageMetaSchema>;

/* ---------------------------------------------------------------- Import */

const blockSchema = z.object({
  id: z.string(),
  type: z.string(),
  collapsed: z.boolean().optional(),
  data: z.record(z.unknown()).default({}),
});

const entrySchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().default(''),
  type: typeSchema,
  category: z.string().default(''),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  status: statusSchema.default('Idee'),
  favorite: z.boolean().default(false),
  coverImage: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  linkedEntryIds: z.array(z.string()).default([]),
  blocks: z.array(blockSchema).default([]),
  fields: z.record(z.union([z.string(), z.array(z.string()), z.boolean()])).default({}),
  pipelineStage: z.string().optional(),
  deletedAt: z.number().optional(),
  /** Weltzeit – siehe `lib/chronik/zeit.ts`. */
  beginn: z.string().optional(),
  ende: z.string().optional(),
})
  /*
   * `passthrough` an jedem Schema, das gespeicherte Daten prueft.
   *
   * Zod verwirft, was nicht aufgezaehlt ist. Ein Schema mit fester Feldliste
   * ist damit eine stille Falle: Wer ein Feld ergaenzt und hier nicht daran
   * denkt, verliert es beim Einspielen – ohne Fehler, ohne Meldung, erst beim
   * Zurueckholen faellt es auf. Genau das ist zweimal passiert, erst mit der
   * Buchidentitaet, dann mit der Weltzeit.
   *
   * Beim Pruefen einer *eigenen* Sicherung ist zu viel durchzulassen der
   * harmlosere Fehler als zu wenig. Die bekannten Felder bleiben getippt,
   * damit der Rest des Programms weiter damit rechnen kann.
   */
  .passthrough();

const relationSchema = z
  .object({
    id: z.string(),
    fromId: z.string(),
    toId: z.string(),
    type: z.string(),
    note: z.string().optional(),
    /** Wann die Verbindung galt – nicht wann sie angelegt wurde. */
    beginn: z.string().optional(),
    ende: z.string().optional(),
    createdAt: z.number(),
  })
  .passthrough();

const canvasItemSchema = z.object({
  id: z.string(),
  kind: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  refId: z.string().optional(),
  text: z.string().optional(),
  color: z.string().optional(),
  points: z.array(z.number()).optional(),
  rotation: z.number().optional(),
  z: z.number(),
});

const boardSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(canvasItemSchema).default([]),
  camera: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const imageSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  category: z.string().default(''),
  prompt: z.string().default(''),
  negativePrompt: z.string().default(''),
  source: z.string().default(''),
  status: statusSchema.default('Idee'),
  favorite: z.boolean().default(false),
  linkedEntryIds: z.array(z.string()).default([]),
  fileName: z.string().default(''),
  mime: z.string().default('image/png'),
  size: z.number().default(0),
  width: z.number().default(0),
  height: z.number().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
  /** Bilddaten als Data-URL – nur im Vollexport enthalten. */
  dataUrl: z.string().optional(),
});

export const backupSchema = z.object({
  app: z.literal('dragoncore-studio'),
  version: z.number(),
  exportedAt: z.number(),
  entries: z.array(entrySchema),
  relations: z.array(relationSchema).default([]),
  boards: z.array(boardSchema).default([]),
  images: z.array(imageSchema).default([]),
  /*
   * Einstellungen mit `passthrough`.
   *
   * Vorher zaehlte dieses Schema die erlaubten Felder einzeln auf – und Zod
   * verwirft, was nicht dasteht. Jedes neue Feld waere damit beim Einspielen
   * stillschweigend verschwunden, ohne Fehler, ohne Meldung. Genau das ist mit
   * der Buchidentitaet passiert: Einband, Titel, Zeichen und das Datum
   * „Begonnen am“ ueberlebten keine Sicherung.
   *
   * Eine Liste, die man pflegen muss, damit nichts verlorengeht, ist die
   * falsche Bauart. Jetzt kommt alles durch, und die bekannten Felder bleiben
   * nur der Vollstaendigkeit halber getippt.
   */
  settings: z
    .object({
      nav: z.array(z.record(z.unknown())).optional(),
      backupReminderDays: z.number().optional(),
      customTypes: z.array(z.record(z.unknown())).optional(),
      goals: z.array(z.record(z.unknown())).optional(),
      worldName: z.string().optional(),
      worldTagline: z.string().optional(),
    })
    .passthrough()
    .optional(),

  /*
   * Die Bände.
   *
   * Fehlt dieses Feld, stammt die Datei aus der Zeit „ein Dragoncore = ein
   * Buch". Genau daran erkennt der Import sie – und legt sie als *neues*
   * Buch in die vorhandene Bibliothek, statt sie darüber zu schreiben.
   *
   * Steht ein einzelner Band darin, ist es eine Buchsicherung. Stehen
   * mehrere, ist es die ganze Bibliothek.
   */
  books: z.array(z.record(z.unknown())).optional(),
  /** `book` oder `library` – nur zur Erklärung, entschieden wird an `books`. */
  kind: z.string().optional(),
});

export type BackupFile = z.infer<typeof backupSchema>;

/** Export eines einzelnen Eintrags. */
export const singleEntrySchema = z.object({
  app: z.literal('dragoncore-studio'),
  kind: z.literal('entry'),
  version: z.number(),
  exportedAt: z.number(),
  entry: entrySchema,
  relations: z.array(relationSchema).default([]),
  images: z.array(imageSchema).default([]),
});

export type SingleEntryFile = z.infer<typeof singleEntrySchema>;
