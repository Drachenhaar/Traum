/**
 * Die Typ-Registry.
 *
 * Ein Eintragstyp ist hier nichts weiter als Daten: Beschriftung, Symbol,
 * Akzentfarbe und eine Liste von Feldern. Deshalb braucht ein neuer Inhaltstyp
 * keine einzige Zeile neuen Code – weder ein Formular noch eine Migration.
 * Selbst angelegte Typen (aus den Einstellungen) mischen sich gleichberechtigt
 * unter die eingebauten.
 */

import type { CustomTypeDef, EntryType, FieldValue } from '../types';

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
  compact?: boolean;
}

export interface TemplateDef {
  type: EntryType;
  label: string;
  labelPlural: string;
  newTitle: string;
  icon: string;
  /** Farbe im Weltgraphen und in kleinen Kennzeichnungen */
  accent: string;
  /** Gruppe in der Navigation */
  family: 'welt' | 'wesen' | 'natur' | 'bau' | 'produktion' | 'erzaehlung' | 'system';
  categories: string[];
  fields: FieldDef[];
  starterBlocks?: { type: string; data: Record<string, unknown> }[];
  /** Eigene Typen lassen sich bearbeiten und entfernen */
  custom?: boolean;
}

const PALETTE: FieldDef = {
  key: 'palette',
  label: 'Farbpalette',
  kind: 'palette',
  hint: 'Farben antippen zum Bearbeiten',
};

const REFS: FieldDef = { key: 'keyImages', label: 'Referenzbilder', kind: 'images' };

/* --------------------------------------------------------- Eingebaute Typen */

const BUILTIN: TemplateDef[] = [
  /* ---------------------------------------------------------------- Welt */
  {
    type: 'location',
    label: 'Ort',
    labelPlural: 'Orte',
    newTitle: 'Neuer Ort',
    icon: 'Mountain',
    accent: '#55604A',
    family: 'welt',
    categories: ['Region', 'Siedlung', 'Bauwerk', 'Innenraum', 'Landmarke', 'Weg'],
    fields: [
      { key: 'region', label: 'Region', kind: 'text', compact: true },
      { key: 'atmosphere', label: 'Atmosphäre', kind: 'textarea' },
      { key: 'light', label: 'Licht & Tageszeit', kind: 'textarea' },
      { key: 'sound', label: 'Klang', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'biome',
    label: 'Biom',
    labelPlural: 'Biome',
    newTitle: 'Neues Biom',
    icon: 'Trees',
    accent: '#3A422F',
    family: 'welt',
    categories: ['Wald', 'Moor', 'Küste', 'Gebirge', 'Ebene', 'Höhle', 'Wasser'],
    fields: [
      { key: 'climate', label: 'Klima', kind: 'text', compact: true },
      { key: 'ground', label: 'Boden & Bewuchs', kind: 'textarea' },
      { key: 'weather', label: 'Wetter & Jahreszeiten', kind: 'textarea' },
      { key: 'lifeforms', label: 'Typische Lebensformen', kind: 'tags' },
      PALETTE,
      REFS,
    ],
  },

  /* --------------------------------------------------------------- Wesen */
  {
    type: 'character',
    label: 'Charakter',
    labelPlural: 'Charaktere',
    newTitle: 'Neuer Charakter',
    icon: 'User',
    accent: '#A8853F',
    family: 'wesen',
    categories: ['Hauptfigur', 'Nebenfigur', 'Begleiter', 'Statist'],
    fields: [
      { key: 'role', label: 'Rolle', kind: 'text', compact: true },
      { key: 'age', label: 'Alter / Altersgruppe', kind: 'text', compact: true },
      { key: 'personality', label: 'Persönlichkeit', kind: 'textarea' },
      { key: 'background', label: 'Hintergrund', kind: 'textarea' },
      { key: 'face', label: 'Gesichtsmerkmale', kind: 'textarea' },
      { key: 'hair', label: 'Haare', kind: 'textarea' },
      { key: 'clothing', label: 'Kleidung', kind: 'textarea' },
      PALETTE,
      { key: 'turnaround', label: 'Turnaround-Bilder', kind: 'images' },
      { key: 'expressions', label: 'Ausdrucksbilder', kind: 'images' },
      { key: 'motionRefs', label: 'Bewegungsreferenzen', kind: 'images' },
      { key: 'animationNotes', label: 'Animationsnotizen', kind: 'textarea' },
    ],
  },
  {
    type: 'creature',
    label: 'Kreatur',
    labelPlural: 'Kreaturen',
    newTitle: 'Neue Kreatur',
    icon: 'Bird',
    accent: '#8C6D31',
    family: 'wesen',
    categories: ['Kreatur', 'Geistwesen', 'Schwarmwesen', 'Urwesen'],
    fields: [
      { key: 'species', label: 'Art', kind: 'text', compact: true },
      { key: 'size', label: 'Größe', kind: 'text', compact: true },
      { key: 'behaviour', label: 'Verhalten', kind: 'textarea' },
      { key: 'personality', label: 'Wesen', kind: 'textarea' },
      PALETTE,
      { key: 'bodyParts', label: 'Körperteile', kind: 'tags', hint: 'z. B. Schleierflossen, Hörner' },
      { key: 'locomotion', label: 'Bewegungsarten', kind: 'tags', hint: 'z. B. schweben, gleiten' },
      { key: 'turnaround', label: 'Turnaround', kind: 'images' },
      { key: 'animationNotes', label: 'Animationsnotizen', kind: 'textarea' },
    ],
  },
  {
    type: 'animal',
    label: 'Tier',
    labelPlural: 'Tiere',
    newTitle: 'Neues Tier',
    icon: 'Rabbit',
    accent: '#7A8467',
    family: 'wesen',
    categories: ['Säugetier', 'Vogel', 'Fisch', 'Insekt', 'Reptil'],
    fields: [
      { key: 'species', label: 'Art', kind: 'text', compact: true },
      { key: 'size', label: 'Größe', kind: 'text', compact: true },
      { key: 'behaviour', label: 'Verhalten', kind: 'textarea' },
      { key: 'diet', label: 'Nahrung', kind: 'text' },
      { key: 'locomotion', label: 'Bewegungsarten', kind: 'tags' },
      PALETTE,
      REFS,
    ],
  },

  /* --------------------------------------------------------------- Natur */
  {
    type: 'plant',
    label: 'Pflanze',
    labelPlural: 'Pflanzen',
    newTitle: 'Neue Pflanze',
    icon: 'Leaf',
    accent: '#525B44',
    family: 'natur',
    categories: ['Baum', 'Strauch', 'Blume', 'Moos & Flechte', 'Wasserpflanze', 'Pilz'],
    fields: [
      { key: 'species', label: 'Art', kind: 'text', compact: true },
      { key: 'size', label: 'Größe', kind: 'text', compact: true },
      { key: 'season', label: 'Jahreszeit / Zyklus', kind: 'text' },
      { key: 'growth', label: 'Wuchsform', kind: 'textarea' },
      { key: 'magic', label: 'Besondere Eigenschaften', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'material',
    label: 'Material',
    labelPlural: 'Materialien',
    newTitle: 'Neues Material',
    icon: 'Layers',
    accent: '#8C7A62',
    family: 'natur',
    categories: ['Holz', 'Stein', 'Metall', 'Textil', 'Glas', 'Organisch', 'Magisch'],
    fields: [
      { key: 'finish', label: 'Oberfläche', kind: 'text', compact: true, placeholder: 'matt, seidig, rau' },
      { key: 'hardness', label: 'Härte / Verhalten', kind: 'text', compact: true },
      { key: 'appearance', label: 'Aussehen im Licht', kind: 'textarea' },
      { key: 'aging', label: 'Alterung', kind: 'textarea' },
      { key: 'usage', label: 'Typische Verwendung', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },

  /* ------------------------------------------------------------ Gebautes */
  {
    type: 'architecture',
    label: 'Architektur',
    labelPlural: 'Architektur',
    newTitle: 'Neues Bauwerk',
    icon: 'Landmark',
    accent: '#6B5B45',
    family: 'bau',
    categories: ['Gebäude', 'Innenraum', 'Detail', 'Ruine', 'Konstruktion', 'Brücke'],
    fields: [
      { key: 'style', label: 'Baustil', kind: 'text', compact: true },
      { key: 'scale', label: 'Maßstab', kind: 'text', compact: true },
      { key: 'construction', label: 'Konstruktion', kind: 'textarea' },
      { key: 'details', label: 'Charakteristische Details', kind: 'textarea' },
      { key: 'interior', label: 'Innenraum', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'prop',
    label: 'Objekt',
    labelPlural: 'Objekte & Props',
    newTitle: 'Neues Objekt',
    icon: 'Package',
    accent: '#9A7C4E',
    family: 'bau',
    categories: ['Werkzeug', 'Behälter', 'Schmuck', 'Waffe', 'Buch', 'Instrument'],
    fields: [
      { key: 'purpose', label: 'Zweck', kind: 'text', compact: true },
      { key: 'size', label: 'Größe', kind: 'text', compact: true },
      { key: 'handling', label: 'Handhabung', kind: 'textarea' },
      { key: 'details', label: 'Details & Gebrauchsspuren', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'furniture',
    label: 'Möbel',
    labelPlural: 'Möbel',
    newTitle: 'Neues Möbelstück',
    icon: 'Armchair',
    accent: '#7E6A4E',
    family: 'bau',
    categories: ['Sitzen', 'Liegen', 'Ablage', 'Aufbewahrung', 'Licht'],
    fields: [
      { key: 'style', label: 'Stil', kind: 'text', compact: true },
      { key: 'size', label: 'Maße', kind: 'text', compact: true },
      { key: 'construction', label: 'Bauweise', kind: 'textarea' },
      { key: 'wear', label: 'Abnutzung', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'clothing',
    label: 'Kleidung',
    labelPlural: 'Kleidung',
    newTitle: 'Neues Kleidungsstück',
    icon: 'Shirt',
    accent: '#8A7357',
    family: 'bau',
    categories: ['Oberteil', 'Mantel', 'Kopfbedeckung', 'Schuhwerk', 'Accessoire'],
    fields: [
      { key: 'fabric', label: 'Stoff', kind: 'text', compact: true },
      { key: 'cut', label: 'Schnitt', kind: 'textarea' },
      { key: 'movement', label: 'Verhalten in Bewegung', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },

  /* ---------------------------------------------------------- Produktion */
  {
    type: 'asset',
    label: 'Asset',
    labelPlural: 'Assets',
    newTitle: 'Neues Asset',
    icon: 'Box',
    accent: '#B08D57',
    family: 'produktion',
    categories: ['Objekt', 'Kleidung', 'Architektur', 'Pflanze', 'Kreatur', 'Effekt', 'UI', 'Hintergrund'],
    fields: [
      { key: 'assetId', label: 'Asset-ID', kind: 'text', compact: true, hint: 'z. B. OBJ_STERNENBUCHPULT_01' },
      { key: 'subcategory', label: 'Unterkategorie', kind: 'text', compact: true },
      { key: 'perspective', label: 'Perspektive', kind: 'select', options: ['', 'Front', 'Seite', '3/4', 'Iso', 'Top-down', 'Frei'], compact: true },
      { key: 'orientation', label: 'Orientierung', kind: 'select', options: ['', 'hoch', 'quer', 'quadratisch'], compact: true },
      { key: 'pivot', label: 'Pivot-Hinweis', kind: 'text' },
      { key: 'cutout', label: 'Freigestellt', kind: 'boolean', compact: true },
      { key: 'animatable', label: 'Animierbar', kind: 'boolean', compact: true },
      { key: 'fileFormat', label: 'Dateiformat', kind: 'select', options: ['', 'PNG', 'WEBP', 'SVG', 'JPG', 'PSD', 'GLB'], compact: true },
      { key: 'lod', label: 'LOD-Stufen', kind: 'text', compact: true, placeholder: 'z. B. LOD0, LOD1' },
      { key: 'conceptImages', label: 'Konzept', kind: 'images' },
      { key: 'referenceImages', label: 'Referenz', kind: 'images' },
      { key: 'approvedImages', label: 'Freigegebene Fassung', kind: 'images' },
      { key: 'gameImages', label: 'Spielfassung', kind: 'images' },
      { key: 'prompt', label: 'Prompt', kind: 'textarea' },
      { key: 'negativePrompt', label: 'Negativer Prompt', kind: 'textarea' },
      { key: 'exportNote', label: 'Export-Hinweis', kind: 'textarea' },
    ],
  },
  {
    type: 'prompt',
    label: 'Prompt',
    labelPlural: 'Prompts',
    newTitle: 'Neuer Prompt',
    icon: 'Sparkles',
    accent: '#C0A468',
    family: 'produktion',
    categories: ['Basisstil', 'Charakter', 'Kreatur', 'Umgebung', 'Objekt', 'Effekt', 'UI'],
    fields: [
      { key: 'model', label: 'Modell', kind: 'text', compact: true, placeholder: 'z. B. Midjourney v6' },
      { key: 'prompt', label: 'Prompt', kind: 'textarea' },
      { key: 'negativePrompt', label: 'Negativer Prompt', kind: 'textarea' },
      { key: 'aspectRatio', label: 'Seitenverhältnis', kind: 'text', compact: true },
      { key: 'resolution', label: 'Auflösung', kind: 'text', compact: true },
      { key: 'seed', label: 'Seed', kind: 'text', compact: true },
      { key: 'rating', label: 'Bewertung', kind: 'select', options: ['', '★', '★★', '★★★', '★★★★', '★★★★★'], compact: true },
      { key: 'isTemplate', label: 'Als Vorlage markiert', kind: 'boolean', compact: true },
      { key: 'referenceImages', label: 'Referenzbilder', kind: 'images' },
      { key: 'resultImages', label: 'Ergebnisbilder', kind: 'images' },
      { key: 'notes', label: 'Notizen', kind: 'textarea' },
    ],
  },
  {
    type: 'concept',
    label: 'Concept Art',
    labelPlural: 'Concept Art',
    newTitle: 'Neues Konzept',
    icon: 'Brush',
    accent: '#A0785A',
    family: 'produktion',
    categories: ['Umgebung', 'Figur', 'Objekt', 'Stimmung', 'Komposition'],
    fields: [
      { key: 'intent', label: 'Was soll es zeigen?', kind: 'textarea' },
      { key: 'stage', label: 'Reifegrad', kind: 'select', options: ['', 'Skizze', 'Ausarbeitung', 'Final'], compact: true },
      { key: 'sketches', label: 'Skizzen', kind: 'images' },
      { key: 'finals', label: 'Ausgearbeitet', kind: 'images' },
      PALETTE,
    ],
  },
  {
    type: 'animation',
    label: 'Animation',
    labelPlural: 'Animationen',
    newTitle: 'Neue Animation',
    icon: 'Film',
    accent: '#6E7B6B',
    family: 'produktion',
    categories: ['Zyklus', 'Übergang', 'Effekt', 'Kamera', 'Idle'],
    fields: [
      { key: 'loop', label: 'Endlos', kind: 'boolean', compact: true },
      { key: 'duration', label: 'Dauer', kind: 'text', compact: true, placeholder: 'z. B. 2,4 s' },
      { key: 'easing', label: 'Bewegungsverlauf', kind: 'text', compact: true },
      { key: 'principle', label: 'Bewegungsgedanke', kind: 'textarea', hint: 'Woher kommt die Bewegung, wohin geht sie?' },
      { key: 'frames', label: 'Einzelbilder', kind: 'images' },
    ],
  },
  {
    type: 'ui',
    label: 'UI-Element',
    labelPlural: 'UI & Icons',
    newTitle: 'Neues UI-Element',
    icon: 'MousePointer',
    accent: '#5E6B7A',
    family: 'produktion',
    categories: ['Icon', 'Rahmen', 'Knopf', 'Cursor', 'Anzeige'],
    fields: [
      { key: 'purpose', label: 'Aufgabe', kind: 'text', compact: true },
      { key: 'sizes', label: 'Größen', kind: 'text', compact: true },
      { key: 'states', label: 'Zustände', kind: 'tags', hint: 'ruhend, aktiv, gesperrt' },
      { key: 'shapes', label: 'Formensprache', kind: 'textarea' },
      REFS,
    ],
  },

  /* ---------------------------------------------------------- Erzählung */
  {
    type: 'lore',
    label: 'Lore',
    labelPlural: 'Lore',
    newTitle: 'Neuer Lore-Eintrag',
    icon: 'ScrollText',
    accent: '#7C6A57',
    family: 'erzaehlung',
    categories: ['Mythos', 'Geschichte', 'Volk', 'Sprache', 'Brauch', 'Zeitalter'],
    fields: [
      { key: 'era', label: 'Zeit', kind: 'text', compact: true },
      { key: 'summary', label: 'Kurzfassung', kind: 'textarea' },
      { key: 'truth', label: 'Was ist wirklich geschehen?', kind: 'textarea', hint: 'Darf von der Erzählung abweichen' },
      REFS,
    ],
  },
  {
    type: 'quest',
    label: 'Quest',
    labelPlural: 'Quests',
    newTitle: 'Neue Quest',
    icon: 'Flag',
    accent: '#8B6A4F',
    family: 'erzaehlung',
    categories: ['Haupt', 'Neben', 'Entdeckung', 'Begegnung'],
    fields: [
      { key: 'hook', label: 'Aufhänger', kind: 'textarea' },
      { key: 'steps', label: 'Stationen', kind: 'tags' },
      { key: 'reward', label: 'Was bleibt danach?', kind: 'textarea' },
      { key: 'mood', label: 'Stimmung', kind: 'text', compact: true },
    ],
  },
  {
    type: 'magic',
    label: 'Magie',
    labelPlural: 'Magie & Effekte',
    newTitle: 'Neue Magie',
    icon: 'Wand',
    accent: '#9C86B0',
    family: 'erzaehlung',
    categories: ['Kraft', 'Ritual', 'Erscheinung', 'Fluch', 'Segen'],
    fields: [
      { key: 'source', label: 'Woher kommt sie?', kind: 'textarea' },
      { key: 'cost', label: 'Was kostet sie?', kind: 'textarea', hint: 'Magie ohne Preis wirkt beliebig' },
      { key: 'appearance', label: 'Wie sieht man sie?', kind: 'textarea' },
      { key: 'sound', label: 'Wie klingt sie?', kind: 'text' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'music',
    label: 'Musik',
    labelPlural: 'Musik & Klang',
    newTitle: 'Neues Klangstück',
    icon: 'Music',
    accent: '#6F7E8C',
    family: 'erzaehlung',
    categories: ['Thema', 'Umgebung', 'Übergang', 'Instrument', 'Geräusch'],
    fields: [
      { key: 'instruments', label: 'Instrumente', kind: 'tags' },
      { key: 'tempo', label: 'Tempo & Takt', kind: 'text', compact: true },
      { key: 'mood', label: 'Stimmung', kind: 'text', compact: true },
      { key: 'description', label: 'Wie klingt es?', kind: 'textarea' },
    ],
  },

  /* -------------------------------------------------------------- System */
  {
    type: 'dna',
    label: 'DNA-Regel',
    labelPlural: 'Welt-DNA',
    newTitle: 'Neue Regel',
    icon: 'Dna',
    accent: '#A8853F',
    family: 'system',
    categories: [
      'Gefühl',
      'Werte',
      'Formensprache',
      'Material',
      'Licht',
      'Animation',
      'Kreaturen',
      'Architektur',
      'Pflanzen',
      'Klang',
      'UI',
    ],
    fields: [
      { key: 'rule', label: 'Die Regel', kind: 'textarea', hint: 'Ein Satz, an dem sich alles messen lässt' },
      { key: 'because', label: 'Warum?', kind: 'textarea' },
      { key: 'doThis', label: 'So ja', kind: 'tags' },
      { key: 'notThis', label: 'So nicht', kind: 'tags' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'page',
    label: 'Seite',
    labelPlural: 'Seiten',
    newTitle: 'Neue Seite',
    icon: 'FileText',
    accent: '#7C6A57',
    family: 'system',
    categories: ['Notiz', 'Recherche', 'Plan', 'Protokoll'],
    fields: [],
    starterBlocks: [{ type: 'text', data: { text: '' } }],
  },
  {
    type: 'collection',
    label: 'Sammlung',
    labelPlural: 'Sammlungen',
    newTitle: 'Neue Sammlung',
    icon: 'Library',
    accent: '#8A8070',
    family: 'system',
    categories: ['Moodboard', 'Sequenz', 'Lieferung', 'Recherche'],
    fields: [
      { key: 'purpose', label: 'Zweck', kind: 'text', compact: true },
      { key: 'keyImages', label: 'Bilder', kind: 'images' },
    ],
  },
];

/* ------------------------------------------------------------ Registry ------ */

let registry: Map<string, TemplateDef> = new Map(BUILTIN.map((t) => [t.type, t]));

/** Selbst angelegte Typen einspielen (beim Start und nach jeder Änderung). */
export function setCustomTypes(defs: CustomTypeDef[]): void {
  const next = new Map(BUILTIN.map((t) => [t.type, t]));
  for (const def of defs) {
    next.set(def.type, {
      type: def.type,
      label: def.label,
      labelPlural: def.labelPlural,
      newTitle: def.newTitle,
      icon: def.icon,
      accent: def.accent,
      family: 'system',
      categories: def.categories,
      fields: def.fields.map((f) => ({
        key: f.key,
        label: f.label,
        kind: (f.kind as FieldKind) ?? 'text',
        hint: f.hint,
      })),
      custom: true,
    });
  }
  registry = next;
}

export const BUILTIN_TYPES = BUILTIN;

export function allTemplates(): TemplateDef[] {
  return [...registry.values()];
}

/**
 * Vorlage zu einem Typ. Unbekannte Typen (etwa aus einem Import) bekommen eine
 * brauchbare Ersatzvorlage, statt die App scheitern zu lassen.
 */
export function templateFor(type: EntryType): TemplateDef {
  const found = registry.get(type);
  if (found) return found;
  return {
    type,
    label: type,
    labelPlural: type,
    newTitle: `Neu: ${type}`,
    icon: 'Circle',
    accent: '#8A8070',
    family: 'system',
    categories: [],
    fields: [],
  };
}

export const FAMILY_LABELS: Record<TemplateDef['family'], string> = {
  welt: 'Welt',
  wesen: 'Wesen',
  natur: 'Natur',
  bau: 'Gebautes',
  produktion: 'Produktion',
  erzaehlung: 'Erzählung',
  system: 'Werkzeuge',
};

export function templatesByFamily(): { family: TemplateDef['family']; label: string; items: TemplateDef[] }[] {
  const order: TemplateDef['family'][] = ['welt', 'wesen', 'natur', 'bau', 'produktion', 'erzaehlung', 'system'];
  return order
    .map((family) => ({
      family,
      label: FAMILY_LABELS[family],
      items: allTemplates().filter((t) => t.family === family),
    }))
    .filter((g) => g.items.length > 0);
}

/* ------------------------------------------------------------- Feldzugriff */

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

export function asText(v: FieldValue | undefined): string {
  return typeof v === 'string' ? v : '';
}
export function asList(v: FieldValue | undefined): string[] {
  return Array.isArray(v) ? v : [];
}
export function asBool(v: FieldValue | undefined): boolean {
  return v === true;
}

/** Farbe eines Eintragstyps – überall dort, wo Herkunft sichtbar werden soll. */
export function accentOf(type: EntryType): string {
  return templateFor(type).accent;
}
