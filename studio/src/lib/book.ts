/**
 * Der Buchblock.
 *
 * Hier wird aus Daten ein Buch: Einträge werden Kapiteln zugeordnet, Kapitel
 * bekommen eine Reihenfolge, und daraus entstehen Doppelseiten mit echten
 * Seitenzahlen. Das ist der Grund, warum das Inhaltsverzeichnis stimmt und
 * warum das Buch dicker wird, wenn die Welt wächst – die Zahlen sind nicht
 * dekorativ, sie sind gerechnet.
 *
 * Blättern heißt: einen Schritt in dieser Liste weitergehen. Mehr Navigation
 * braucht ein Buch nicht.
 */

import type { Entry, EntryType } from '../types';
import { templateFor } from './templates';

/* ------------------------------------------------------------------ Kapitel */

export interface ChapterDef {
  id: string;
  title: string;
  /** Der Einleitungstext auf der Kapitelseite */
  intro: string;
  /** Welche Eintragsarten wohnen in diesem Kapitel? */
  types: EntryType[];
  accent: string;
  /** Farbe des Lesezeichens am Buchschnitt */
  ribbon: string;
}

/**
 * Die Kapitelfolge. Vorne stehen die Regeln, dann die Welt, dann was darin
 * lebt, dann was daraus gebaut wird – wie in einem echten Artbook.
 */
export const CHAPTERS: ChapterDef[] = [
  {
    id: 'essenz',
    title: 'Essenz der Welt',
    intro:
      'Woran sich alles messen lässt. Diese Seiten stehen bewusst am Anfang: Wer sie gelesen hat, versteht jede folgende Zeichnung schneller.',
    types: ['dna'],
    accent: '#A8853F',
    ribbon: '#D4AF37',
  },
  {
    id: 'welt',
    title: 'Die Welt',
    intro:
      'Landschaften, Regionen und Orte. Der Boden, auf dem alles Weitere steht – jede Kreatur, jedes Bauwerk, jeder Weg beginnt hier.',
    types: ['location', 'biome'],
    accent: '#55604A',
    ribbon: '#6B7A58',
  },
  {
    id: 'charaktere',
    title: 'Charaktere',
    intro:
      'Die Figuren dieser Welt. Wer sie sind, woher sie kommen, was sie tragen – und woran man sie in einer Silhouette erkennt.',
    types: ['character'],
    accent: '#A8853F',
    ribbon: '#C08A4A',
  },
  {
    id: 'kreaturen',
    title: 'Kreaturen',
    intro:
      'Die Wesen von Dragoncore sind auf die Landschaft angewiesen, die sie hervorgebracht hat. Sie sind kein Schmuck – sie sind Teil dieser Welt.',
    types: ['creature', 'animal'],
    accent: '#8C6D31',
    ribbon: '#8C6D31',
  },
  {
    id: 'pflanzen',
    title: 'Pflanzen',
    intro:
      'Das Herbarium. Was wächst, wo es wächst und was daraus wird – die stille Schicht, die eine Welt glaubhaft macht.',
    types: ['plant'],
    accent: '#525B44',
    ribbon: '#4E6B3E',
  },
  {
    id: 'architektur',
    title: 'Architektur & Gebautes',
    intro:
      'Bauwerke, Räume, Objekte und Kleidung. Alles, was von Hand gemacht wurde und deshalb etwas über seine Erbauer verrät.',
    types: ['architecture', 'furniture', 'prop', 'clothing'],
    accent: '#6B5B45',
    ribbon: '#8A6A45',
  },
  {
    id: 'materialien',
    title: 'Materialien',
    intro:
      'Woraus die Welt gemacht ist. Oberfläche, Alterung, Verhalten im Licht – die Regeln, nach denen alles andere aussieht.',
    types: ['material'],
    accent: '#8C7A62',
    ribbon: '#8C7A62',
  },
  {
    id: 'magie',
    title: 'Magie & Mysterien',
    intro:
      'Kräfte, Mythen, Geschichten und Klang. Magie ohne Preis wirkt beliebig – hier steht, was sie kostet.',
    types: ['magic', 'lore', 'quest', 'music'],
    accent: '#9C86B0',
    ribbon: '#8E7BA6',
  },
  {
    id: 'werkstatt',
    title: 'Die Werkstatt',
    intro:
      'Assets, Prompts, Konzeptarbeit und Animation. Der produzierende Teil des Buches – hier wird aus der Welt ein Spiel.',
    types: ['asset', 'prompt', 'concept', 'animation', 'ui'],
    accent: '#B08D57',
    ribbon: '#B08D57',
  },
  {
    id: 'notizen',
    title: 'Notizen & Sammlungen',
    intro: 'Loses, Angefangenes, Gesammeltes. Nicht alles muss schon fertig sein, um im Buch zu stehen.',
    types: ['page', 'collection'],
    accent: '#7C6A57',
    ribbon: '#7C6A57',
  },
];

const CHAPTER_OF_TYPE = new Map<EntryType, ChapterDef>();
for (const chapter of CHAPTERS) {
  for (const type of chapter.types) CHAPTER_OF_TYPE.set(type, chapter);
}

/** Unbekannte (selbst angelegte) Typen landen bei den Notizen, nie im Nichts. */
export function chapterOfType(type: EntryType): ChapterDef {
  return CHAPTER_OF_TYPE.get(type) ?? CHAPTERS[CHAPTERS.length - 1];
}

export function chapterById(id: string): ChapterDef | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

/* ------------------------------------------------------------- Doppelseiten */

export type SpreadKind =
  | 'vorwort'
  | 'inhalt'
  | 'kapitel'
  | 'eintrag'
  | 'tafeln'
  | 'anhang';

export interface Spread {
  /** Stabiler Schlüssel – auch wenn sich Seitenzahlen verschieben */
  key: string;
  kind: SpreadKind;
  /** Linke Seitenzahl; rechts ist es immer diese plus eins */
  page: number;
  chapterId?: string;
  entryId?: string;
  /** Ziel für den Router */
  path: string;
  /** Beschriftung im Register und in der Kopfzeile */
  label: string;
}

export interface BookStructure {
  spreads: Spread[];
  /** Schnellzugriff: Schlüssel → Position im Buch */
  indexOf: Map<string, number>;
  /** Eintrags-ID → Seitenzahl, für Inhaltsverzeichnis und Register */
  pageOfEntry: Map<string, number>;
  chapters: {
    chapter: ChapterDef;
    entries: Entry[];
    /** Seitenzahl der Kapitelseite */
    page: number;
    /** Wie viele Seiten das Kapitel umfasst */
    pages: number;
    /** Alle Einträge freigegeben? Dann glänzt das Lesezeichen. */
    complete: boolean;
  }[];
  /** Gesamtzahl der Seiten – daraus entsteht die Rückendicke */
  totalPages: number;
}

/** Erste Seitenzahl des Buchblocks. Davor liegt in echten Büchern der Vorsatz. */
const FIRST_PAGE = 6;

/**
 * Baut das Buch aus den Einträgen.
 *
 * Reihenfolge innerhalb eines Kapitels: nach Kategorie, dann alphabetisch –
 * so steht Verwandtes beieinander, wie in einem gesetzten Buch.
 */
export function buildBook(entries: Entry[], imageCount: number): BookStructure {
  const spreads: Spread[] = [];
  let page = FIRST_PAGE;

  const push = (spread: Omit<Spread, 'page'>) => {
    spreads.push({ ...spread, page });
    page += 2;
  };

  push({ key: 'vorwort', kind: 'vorwort', path: '/vorwort', label: 'Vorwort' });
  push({ key: 'inhalt', kind: 'inhalt', path: '/inhalt', label: 'Inhaltsverzeichnis' });

  const living = entries.filter((e) => !e.deletedAt);
  const chapters: BookStructure['chapters'] = [];

  for (const chapter of CHAPTERS) {
    const mine = living
      .filter((e) => chapterOfType(e.type).id === chapter.id)
      .sort(
        (a, b) =>
          a.type.localeCompare(b.type) ||
          (a.category || '').localeCompare(b.category || '', 'de') ||
          a.title.localeCompare(b.title, 'de'),
      );

    // Leere Kapitel bekommen keine Seiten. Das Buch zeigt nur, was es gibt.
    if (mine.length === 0) continue;

    const startPage = page;
    push({
      key: `kapitel:${chapter.id}`,
      kind: 'kapitel',
      path: `/kapitel/${chapter.id}`,
      chapterId: chapter.id,
      label: chapter.title,
    });

    for (const entry of mine) {
      push({
        key: `eintrag:${entry.id}`,
        kind: 'eintrag',
        path: `/eintrag/${entry.id}`,
        chapterId: chapter.id,
        entryId: entry.id,
        label: entry.title,
      });
    }

    chapters.push({
      chapter,
      entries: mine,
      page: startPage,
      pages: page - startPage,
      complete: mine.every((e) => e.status === 'Freigegeben'),
    });
  }

  if (imageCount > 0) {
    push({ key: 'tafeln', kind: 'tafeln', path: '/tafeln', label: 'Tafelteil' });
  }
  push({ key: 'anhang', kind: 'anhang', path: '/anhang', label: 'Anhänge' });

  const indexOf = new Map<string, number>();
  const pageOfEntry = new Map<string, number>();
  spreads.forEach((s, i) => {
    indexOf.set(s.key, i);
    if (s.entryId) pageOfEntry.set(s.entryId, s.page);
  });

  return { spreads, indexOf, pageOfEntry, chapters, totalPages: page - FIRST_PAGE };
}

/* ----------------------------------------------------------------- Zustand */

/**
 * Wie dick ist der Rücken?
 *
 * Bewusst gedämpft (Wurzel statt linear): Die ersten Einträge sollen sichtbar
 * etwas verändern, das tausendste Bild soll das Buch nicht sprengen.
 */
export function spineThickness(totalPages: number): number {
  return Math.min(1, Math.sqrt(Math.max(0, totalPages)) / 26);
}

/** Wie abgegriffen ist eine Seite? 0 = neu, 1 = oft gelesen. */
export function pageWear(visits: number): number {
  if (visits <= 1) return 0;
  return Math.min(1, Math.log2(visits) / 6);
}

export function romanNumeral(n: number): string {
  const table: [number, string][] = [
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  let rest = n;
  let out = '';
  for (const [value, sign] of table) {
    while (rest >= value) {
      out += sign;
      rest -= value;
    }
  }
  return out;
}

/** Die Zusammenfassung eines Eintrags in einem Satz – für Register und Karte. */
export function entrySummary(entry: Entry): string {
  const tpl = templateFor(entry.type);
  return entry.subtitle || entry.description.split(/[.!?]/)[0] || tpl.label;
}
