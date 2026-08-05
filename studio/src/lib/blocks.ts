/**
 * Blocktypen: Beschreibung, Standardwerte und Hilfsfunktionen.
 *
 * Ein neuer Blocktyp braucht nur einen Eintrag in `BLOCK_DEFS` plus eine
 * Darstellung in `components/blocks/BlockBody.tsx`.
 */

import type { Block, BlockData, BlockType } from '../types';
import { newId } from './utils';

export interface BlockDef {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
  create: () => BlockData;
}

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: 'heading',
    label: 'Überschrift',
    icon: 'Heading',
    description: 'Abschnitt gliedern',
    create: () => ({ text: 'Neue Überschrift', level: 2 }),
  },
  {
    type: 'text',
    label: 'Fließtext',
    icon: 'AlignLeft',
    description: 'Beschreibender Absatz',
    create: () => ({ text: '' }),
  },
  {
    type: 'quote',
    label: 'Zitat',
    icon: 'Quote',
    description: 'Hervorgehobener Satz',
    create: () => ({ text: '', source: '' }),
  },
  {
    type: 'note',
    label: 'Notiz',
    icon: 'StickyNote',
    description: 'Hinweis oder Merker',
    create: () => ({ text: '', tone: 'info' }),
  },
  {
    type: 'image',
    label: 'Bild',
    icon: 'Image',
    description: 'Einzelnes Bild mit Bildunterschrift',
    create: () => ({ imageId: undefined, caption: '' }),
  },
  {
    type: 'gallery',
    label: 'Bildergalerie',
    icon: 'Images',
    description: 'Mehrere Bilder im Raster',
    create: () => ({ imageIds: [], columns: 3 }),
  },
  {
    type: 'moodboard',
    label: 'Moodboard',
    icon: 'LayoutGrid',
    description: 'Bilder mit kurzen Notizen',
    create: () => ({ tiles: [] }),
  },
  {
    type: 'palette',
    label: 'Farbpalette',
    icon: 'Palette',
    description: 'Farbwerte mit Namen',
    create: () => ({
      swatches: [
        { id: newId('sw'), color: '#3B2E23', name: 'Tiefes Braun', note: '' },
        { id: newId('sw'), color: '#A8853F', name: 'Messing', note: '' },
        { id: newId('sw'), color: '#F1EADC', name: 'Creme', note: '' },
      ],
    }),
  },
  {
    type: 'materials',
    label: 'Materialpalette',
    icon: 'Layers',
    description: 'Oberflächen und Materialien',
    create: () => ({ materials: [] }),
  },
  {
    type: 'references',
    label: 'Referenzkarten',
    icon: 'BookMarked',
    description: 'Referenzen mit Quelle und Notiz',
    create: () => ({ cards: [] }),
  },
  {
    type: 'checklist',
    label: 'Checkliste',
    icon: 'ListChecks',
    description: 'Aufgaben abhaken',
    create: () => ({ items: [] }),
  },
  {
    type: 'prompt',
    label: 'Prompt',
    icon: 'Sparkles',
    description: 'Prompt mit negativem Prompt',
    create: () => ({ prompt: '', negativePrompt: '', model: '' }),
  },
  {
    type: 'assetList',
    label: 'Asset-Liste',
    icon: 'Package',
    description: 'Verknüpfte Einträge auflisten',
    create: () => ({ entryIds: [], title: '' }),
  },
  {
    type: 'divider',
    label: 'Trennlinie',
    icon: 'Minus',
    description: 'Feine Linie',
    create: () => ({}),
  },
  {
    type: 'spacer',
    label: 'Freier Abstand',
    icon: 'MoveVertical',
    description: 'Luft zwischen Abschnitten',
    create: () => ({ size: 'md' }),
  },
];

const DEF_BY_TYPE = new Map(BLOCK_DEFS.map((d) => [d.type, d]));

export function blockDef(type: BlockType): BlockDef {
  return DEF_BY_TYPE.get(type) ?? BLOCK_DEFS[1];
}

export function createBlock(type: BlockType): Block {
  return { id: newId('blk'), type, data: blockDef(type).create() };
}

/** Block kopieren – inklusive neuer IDs für verschachtelte Elemente. */
export function duplicateBlock(block: Block): Block {
  const data: BlockData = JSON.parse(JSON.stringify(block.data));
  if (data.items) data.items = data.items.map((i) => ({ ...i, id: newId('itm') }));
  if (data.swatches) data.swatches = data.swatches.map((s) => ({ ...s, id: newId('sw') }));
  if (data.materials) data.materials = data.materials.map((m) => ({ ...m, id: newId('mat') }));
  if (data.cards) data.cards = data.cards.map((c) => ({ ...c, id: newId('ref') }));
  if (data.tiles) data.tiles = data.tiles.map((t) => ({ ...t, id: newId('tile') }));
  return { id: newId('blk'), type: block.type, collapsed: block.collapsed, data };
}

/** Kurzfassung des Inhalts – für eingeklappte Blöcke und die Suche. */
export function blockSummary(block: Block): string {
  const d = block.data;
  switch (block.type) {
    case 'heading':
    case 'text':
    case 'quote':
    case 'note':
      return (d.text ?? '').slice(0, 120);
    case 'image':
      return d.caption || (d.imageId ? 'Bild' : 'Noch kein Bild');
    case 'gallery':
      return `${d.imageIds?.length ?? 0} Bilder`;
    case 'moodboard':
      return `${d.tiles?.length ?? 0} Kacheln`;
    case 'palette':
      return `${d.swatches?.length ?? 0} Farben`;
    case 'materials':
      return `${d.materials?.length ?? 0} Materialien`;
    case 'references':
      return `${d.cards?.length ?? 0} Referenzen`;
    case 'checklist': {
      const items = d.items ?? [];
      return `${items.filter((i) => i.done).length} von ${items.length} erledigt`;
    }
    case 'prompt':
      return (d.prompt ?? '').slice(0, 120) || 'Noch kein Prompt';
    case 'assetList':
      return `${d.entryIds?.length ?? 0} Einträge`;
    case 'divider':
      return 'Trennlinie';
    case 'spacer':
      return `Abstand (${d.size ?? 'md'})`;
    default:
      return '';
  }
}

/** Kompletter Textinhalt eines Blocks – Grundlage der Volltextsuche. */
export function blockSearchText(block: Block): string {
  const d = block.data;
  const parts: string[] = [
    d.text ?? '',
    d.caption ?? '',
    d.source ?? '',
    d.prompt ?? '',
    d.negativePrompt ?? '',
    d.model ?? '',
    d.title ?? '',
  ];
  d.items?.forEach((i) => parts.push(i.text));
  d.swatches?.forEach((s) => parts.push(s.name, s.color, s.note));
  d.materials?.forEach((m) => parts.push(m.name, m.finish, m.note));
  d.cards?.forEach((c) => parts.push(c.title, c.note, c.source));
  d.tiles?.forEach((t) => parts.push(t.caption));
  return parts.filter(Boolean).join(' ');
}

/** Alle Bild-IDs, die ein Block verwendet – z. B. um Bilder sicher zu löschen. */
export function blockImageIds(block: Block): string[] {
  const d = block.data;
  const ids: string[] = [];
  if (d.imageId) ids.push(d.imageId);
  if (d.imageIds) ids.push(...d.imageIds);
  d.tiles?.forEach((t) => t.imageId && ids.push(t.imageId));
  d.cards?.forEach((c) => c.imageId && ids.push(c.imageId));
  return ids;
}
