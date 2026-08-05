/**
 * Vorlagen: beschreiben deklarativ, welche zusätzlichen Felder ein Eintragstyp hat.
 *
 * Die Formulare in der Detailansicht werden aus diesen Definitionen erzeugt.
 * Neue Felder oder ganz neue Typen brauchen daher nur einen Eintrag hier –
 * kein neues Formular, keine Datenbank-Migration.
 */

import type { EntryType, FieldValue } from '../types';

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'tags'
  | 'select'
  | 'boolean'
  | 'images'
  | 'entries'
  | 'palette';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: string[];
  hint?: string;
  /** Feld in der Kompaktansicht der Karte anzeigen */
  compact?: boolean;
}

export interface TemplateDef {
  type: EntryType;
  /** Einzahl / Mehrzahl für Überschriften und Buttons */
  label: string;
  labelPlural: string;
  /** Titel, den ein neu angelegter Eintrag bekommt (korrekter Artikel) */
  newTitle: string;
  icon: string;
  /** Vorgeschlagene Kategorien für diesen Typ */
  categories: string[];
  fields: FieldDef[];
  /** Blöcke, die ein neuer Eintrag dieses Typs von Anfang an bekommt */
  starterBlocks?: { type: string; data: Record<string, unknown> }[];
}

const PALETTE_FIELD: FieldDef = {
  key: 'palette',
  label: 'Farbpalette',
  kind: 'palette',
  hint: 'Farben antippen zum Bearbeiten',
};

export const TEMPLATES: Record<EntryType, TemplateDef> = {
  page: {
    type: 'page',
    label: 'Seite',
    labelPlural: 'Seiten',
    newTitle: 'Neue Seite',
    icon: 'FileText',
    categories: ['Art Essenz', 'Art Bible', 'Animationen', 'Magie & Effekte', 'UI & Icons', 'Notizen'],
    fields: [],
    starterBlocks: [{ type: 'text', data: { text: '' } }],
  },

  location: {
    type: 'location',
    label: 'Ort',
    labelPlural: 'Welt & Orte',
    newTitle: 'Neuer Ort',
    icon: 'Mountain',
    categories: ['Region', 'Bauwerk', 'Biom', 'Innenraum', 'Landmarke'],
    fields: [
      { key: 'region', label: 'Region', kind: 'text', compact: true },
      { key: 'biome', label: 'Biom / Landschaft', kind: 'text', compact: true },
      { key: 'atmosphere', label: 'Atmosphäre', kind: 'textarea' },
      { key: 'light', label: 'Licht & Tageszeit', kind: 'textarea' },
      { key: 'sound', label: 'Klang & Geräusche', kind: 'textarea' },
      { key: 'inhabitants', label: 'Bewohner', kind: 'text' },
      PALETTE_FIELD,
      { key: 'keyImages', label: 'Schlüsselbilder', kind: 'images' },
      { key: 'relatedEntries', label: 'Verbundene Einträge', kind: 'entries' },
    ],
  },

  character: {
    type: 'character',
    label: 'Charakter',
    labelPlural: 'Charaktere',
    newTitle: 'Neuer Charakter',
    icon: 'User',
    categories: ['Hauptfigur', 'Nebenfigur', 'Begleiter', 'Statist'],
    fields: [
      { key: 'role', label: 'Rolle', kind: 'text', compact: true },
      { key: 'age', label: 'Alter / Altersgruppe', kind: 'text', compact: true },
      { key: 'personality', label: 'Persönlichkeit', kind: 'textarea' },
      { key: 'background', label: 'Hintergrund', kind: 'textarea' },
      { key: 'face', label: 'Gesichtsmerkmale', kind: 'textarea' },
      { key: 'hair', label: 'Haare', kind: 'textarea' },
      { key: 'clothing', label: 'Kleidung', kind: 'textarea' },
      PALETTE_FIELD,
      { key: 'companions', label: 'Begleiter', kind: 'text' },
      { key: 'turnaround', label: 'Turnaround-Bilder', kind: 'images' },
      { key: 'expressions', label: 'Ausdrucksbilder', kind: 'images' },
      { key: 'motionRefs', label: 'Bewegungsreferenzen', kind: 'images' },
      { key: 'animationNotes', label: 'Animationsnotizen', kind: 'textarea' },
      { key: 'prompts', label: 'Prompts', kind: 'entries', hint: 'Verknüpfte Prompt-Einträge' },
      { key: 'relatedEntries', label: 'Verbundene Orte & Objekte', kind: 'entries' },
    ],
  },

  creature: {
    type: 'creature',
    label: 'Kreatur',
    labelPlural: 'Kreaturen',
    newTitle: 'Neue Kreatur',
    icon: 'Bird',
    categories: ['Kreatur', 'Tier', 'Geistwesen', 'Schwarmwesen'],
    fields: [
      { key: 'species', label: 'Art', kind: 'text', compact: true },
      { key: 'size', label: 'Größe', kind: 'text', compact: true },
      { key: 'habitat', label: 'Lebensraum', kind: 'text', compact: true },
      { key: 'behaviour', label: 'Verhalten', kind: 'textarea' },
      { key: 'personality', label: 'Persönlichkeit', kind: 'textarea' },
      PALETTE_FIELD,
      { key: 'bodyParts', label: 'Körperteile', kind: 'tags', hint: 'z. B. Flossen, Schleier, Hörner' },
      { key: 'locomotion', label: 'Bewegungsarten', kind: 'tags', hint: 'z. B. schweben, gleiten' },
      { key: 'turnaround', label: 'Turnaround', kind: 'images' },
      { key: 'animationNotes', label: 'Animationsnotizen', kind: 'textarea' },
      { key: 'prompts', label: 'Prompts', kind: 'entries' },
      { key: 'relatedEntries', label: 'Verwandte Assets', kind: 'entries' },
    ],
  },

  plant: {
    type: 'plant',
    label: 'Pflanze',
    labelPlural: 'Pflanzen',
    newTitle: 'Neue Pflanze',
    icon: 'Leaf',
    categories: ['Baum', 'Strauch', 'Blume', 'Moos & Flechte', 'Wasserpflanze', 'Pilz'],
    fields: [
      { key: 'species', label: 'Art', kind: 'text', compact: true },
      { key: 'size', label: 'Größe', kind: 'text', compact: true },
      { key: 'habitat', label: 'Lebensraum', kind: 'text', compact: true },
      { key: 'season', label: 'Jahreszeit / Zyklus', kind: 'text' },
      { key: 'growth', label: 'Wuchsform', kind: 'textarea' },
      { key: 'magic', label: 'Magische Eigenschaften', kind: 'textarea' },
      PALETTE_FIELD,
      { key: 'keyImages', label: 'Referenzbilder', kind: 'images' },
      { key: 'relatedEntries', label: 'Verbundene Einträge', kind: 'entries' },
    ],
  },

  architecture: {
    type: 'architecture',
    label: 'Architektur',
    labelPlural: 'Architektur',
    newTitle: 'Neues Bauwerk',
    icon: 'Landmark',
    categories: ['Gebäude', 'Innenraum', 'Detail', 'Ruine', 'Konstruktion'],
    fields: [
      { key: 'style', label: 'Baustil', kind: 'text', compact: true },
      { key: 'material', label: 'Hauptmaterial', kind: 'text', compact: true },
      { key: 'scale', label: 'Maßstab', kind: 'text' },
      { key: 'construction', label: 'Konstruktion', kind: 'textarea' },
      { key: 'details', label: 'Charakteristische Details', kind: 'textarea' },
      { key: 'interior', label: 'Innenraum', kind: 'textarea' },
      PALETTE_FIELD,
      { key: 'keyImages', label: 'Referenzbilder', kind: 'images' },
      { key: 'relatedEntries', label: 'Verbundene Einträge', kind: 'entries' },
    ],
  },

  asset: {
    type: 'asset',
    label: 'Asset',
    labelPlural: 'Assets',
    newTitle: 'Neues Asset',
    icon: 'Package',
    categories: [
      'Objekt & Prop',
      'Kleidung',
      'Architektur',
      'Pflanze',
      'Kreatur',
      'Effekt',
      'UI & Icon',
      'Hintergrund',
    ],
    fields: [
      { key: 'assetId', label: 'Asset-ID', kind: 'text', compact: true, hint: 'z. B. OBJ_STERNENBUCHPULT_01' },
      { key: 'subcategory', label: 'Unterkategorie', kind: 'text', compact: true },
      { key: 'perspective', label: 'Perspektive', kind: 'select', options: ['', 'Front', 'Seite', '3/4', 'Iso', 'Top-down', 'Frei'], compact: true },
      { key: 'orientation', label: 'Orientierung', kind: 'select', options: ['', 'hoch', 'quer', 'quadratisch'], compact: true },
      { key: 'pivot', label: 'Pivot-Hinweis', kind: 'text', hint: 'Wo sitzt der Drehpunkt?' },
      { key: 'cutout', label: 'Freigestellt', kind: 'boolean', compact: true },
      { key: 'animatable', label: 'Animierbar', kind: 'boolean', compact: true },
      { key: 'fileFormat', label: 'Dateiformat', kind: 'select', options: ['', 'PNG', 'WEBP', 'SVG', 'JPG', 'PSD', 'GLB'], compact: true },
      { key: 'prompt', label: 'Prompt', kind: 'textarea' },
      { key: 'negativePrompt', label: 'Negativer Prompt', kind: 'textarea' },
      { key: 'keyImages', label: 'Weitere Bilder', kind: 'images' },
      { key: 'relatedEntries', label: 'Verwandte Assets', kind: 'entries' },
    ],
  },

  prompt: {
    type: 'prompt',
    label: 'Prompt',
    labelPlural: 'Prompts',
    newTitle: 'Neuer Prompt',
    icon: 'Sparkles',
    categories: ['Basisstil', 'Charakter', 'Kreatur', 'Umgebung', 'Objekt', 'Effekt', 'UI'],
    fields: [
      { key: 'model', label: 'Modell', kind: 'text', compact: true, placeholder: 'z. B. Midjourney v6' },
      { key: 'prompt', label: 'Prompt', kind: 'textarea' },
      { key: 'negativePrompt', label: 'Negativer Prompt', kind: 'textarea' },
      { key: 'aspectRatio', label: 'Seitenverhältnis', kind: 'text', compact: true, placeholder: 'z. B. 3:2' },
      { key: 'resolution', label: 'Auflösung', kind: 'text', compact: true, placeholder: 'z. B. 2048 × 1365' },
      { key: 'seed', label: 'Seed', kind: 'text', compact: true },
      { key: 'rating', label: 'Bewertung', kind: 'select', options: ['', '★', '★★', '★★★', '★★★★', '★★★★★'], compact: true },
      { key: 'isTemplate', label: 'Als Vorlage markiert', kind: 'boolean', compact: true },
      { key: 'referenceImages', label: 'Referenzbilder', kind: 'images' },
      { key: 'resultImages', label: 'Ergebnisbilder', kind: 'images' },
      { key: 'notes', label: 'Notizen', kind: 'textarea' },
      { key: 'relatedEntries', label: 'Erzeugte Assets & Einträge', kind: 'entries' },
    ],
  },

  collection: {
    type: 'collection',
    label: 'Sammlung',
    labelPlural: 'Sammlungen',
    newTitle: 'Neue Sammlung',
    icon: 'Library',
    categories: ['Moodboard', 'Sequenz', 'Lieferung', 'Recherche'],
    fields: [
      { key: 'purpose', label: 'Zweck', kind: 'text', compact: true },
      { key: 'members', label: 'Enthaltene Einträge', kind: 'entries' },
      { key: 'keyImages', label: 'Bilder', kind: 'images' },
    ],
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

export function templateFor(type: EntryType): TemplateDef {
  return TEMPLATES[type] ?? TEMPLATES.page;
}

/** Leere Startwerte für alle Felder einer Vorlage. */
export function emptyFields(type: EntryType): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of templateFor(type).fields) {
    if (f.kind === 'boolean') out[f.key] = false;
    else if (f.kind === 'tags' || f.kind === 'images' || f.kind === 'entries' || f.kind === 'palette')
      out[f.key] = [];
    else out[f.key] = '';
  }
  return out;
}

/** Hilfen für den typsicheren Zugriff auf Feldwerte. */
export function asText(v: FieldValue | undefined): string {
  return typeof v === 'string' ? v : '';
}
export function asList(v: FieldValue | undefined): string[] {
  return Array.isArray(v) ? v : [];
}
export function asBool(v: FieldValue | undefined): boolean {
  return v === true;
}
