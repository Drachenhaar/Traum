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
  /**
   * Die Fragen des Kapitels.
   *
   * Das Buch erklärt nicht, wie Welten funktionieren – es hilft dabei, die
   * eigene zu entdecken. Deshalb steht auf jeder Kapitelseite kein Merksatz,
   * sondern eine Handvoll Fragen. Sie sind das eigentliche Werkzeug.
   */
  questions: string[];
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
    id: 'naturgesetze',
    title: 'Naturgesetze',
    intro:
      'Bevor irgendetwas wächst, muss feststehen, was gilt. Wie vergeht die Zeit? Kann jemand sterben – und was geschieht danach? Was ist unmöglich? Diese Seiten beantworten das ein für alle Mal, damit alles Weitere darauf vertrauen kann.',
    questions: [
      'Wie funktioniert Zeit in dieser Welt? Läuft sie überall gleich schnell?',
      'Kann jemand sterben? Was geschieht danach – und wer weiß davon?',
      'Was ist hier unmöglich, egal wie sehr man es versucht?',
      'Welche Regel gilt immer, ohne eine einzige Ausnahme?',
      'Was würde zerbrechen, wenn dieses Gesetz fiele?',
    ],
    types: ['law'],
    accent: '#8E7BA6',
    ribbon: '#8E7BA6',
  },
  {
    id: 'essenz',
    title: 'Essenz der Welt',
    intro:
      'Woran sich alles messen lässt. Diese Seiten stehen bewusst am Anfang: Wer sie gelesen hat, versteht jede folgende Zeichnung schneller.',
    questions: [
      'Wenn deine Welt ein einziges Gefühl wäre – welches?',
      'Was würde ein Fremder nach zehn Schritten bemerken?',
      'Welche Form kommt überall vor, ohne dass es jemand geplant hat?',
      'Was gibt es hier ausdrücklich nicht?',
    ],
    types: ['dna'],
    accent: '#A8853F',
    ribbon: '#D4AF37',
  },
  {
    id: 'lebendige-welt',
    title: 'Die lebendige Welt',
    intro:
      'Ein Ort ist keine Landkarte. Er hat eine Stunde, ein Wetter, einen Geruch. Dieselbe Lichtung ist im Morgengrauen ein anderer Ort als in der Nacht – und beide gehören dir.',
    questions: [
      'Wie riecht dein Wald nach dem Regen?',
      'Welche Geräusche hört man hier in der Nacht? Und welche fehlen?',
      'Woher kommt der Nebel – und wann verschwindet er wieder?',
      'Wie verändert sich dieser Ort im Winter?',
      'Welche Farbe hat das Licht eine Stunde vor Sonnenuntergang?',
      'Was fühlt man hier, wenn man allein ist?',
    ],
    types: ['moment', 'location', 'biome'],
    accent: '#55604A',
    ribbon: '#6B7A58',
  },
  {
    id: 'natur',
    title: 'Natur',
    intro:
      'Nichts steht still. Alles wächst, altert, vergeht und kommt zurück. Wer diese Kreisläufe kennt, muss Landschaften nicht mehr erfinden – sie ergeben sich.',
    questions: [
      'Was wächst hier zuerst, wenn Feuer durchgegangen ist?',
      'Wer frisst wen? Und was geschieht, wenn ein Glied der Kette fehlt?',
      'Was bleibt zurück, wenn etwas vergeht?',
      'Welche zwei Wesen brauchen einander, ohne es zu wissen?',
      'Wie lange dauert ein Jahr an diesem Ort?',
    ],
    types: ['plant', 'cycle'],
    accent: '#525B44',
    ribbon: '#4E6B3E',
  },
  {
    id: 'tiere',
    title: 'Tiere',
    intro:
      'Tiere sind kein Schmuck. Sie haben Reviere, Wege, Schlafplätze und Stimmen. Man erkennt eine Welt daran, was sich in ihr bewegt, wenn niemand hinsieht.',
    questions: [
      'Was tut dieses Tier, wenn es sich unbeobachtet glaubt?',
      'Wo verbringt es die Nacht – und mit wem?',
      'Woran erkennt man, dass es hier war?',
      'Zieht es fort? Woher weiß es den Weg?',
      'Wie klingt es, und was bedeutet welcher Laut?',
    ],
    types: ['animal', 'creature'],
    accent: '#8C6D31',
    ribbon: '#8C6D31',
  },
  {
    id: 'bewohner',
    title: 'Bewohner',
    intro:
      'Keine Figuren, keine Rollen – Menschen und Wesen mit Wünschen, Ängsten und Gewohnheiten. Wer weiß, wo jemand im Morgengrauen steht, braucht keine Beschreibung mehr.',
    questions: [
      'Was will diese Figur – heute, und was ihr ganzes Leben lang?',
      'Wovor hat sie Angst? Weiß sie es selbst?',
      'Was tut sie jeden Tag, ohne darüber nachzudenken?',
      'An welchen Tag denkt sie am häufigsten zurück?',
      'Wohin geht sie, wenn sie allein sein will?',
      'Wer würde sie vermissen?',
    ],
    types: ['character'],
    accent: '#A8853F',
    ribbon: '#C08A4A',
  },
  {
    id: 'stimmen',
    title: 'Stimmen',
    intro:
      'Wie eine Welt spricht, verrät mehr als jede Landkarte. Begrüßungen, Streit, Schweigen. Kleine Szenen, keine Dialogsysteme.',
    questions: [
      'Wie begrüßt man sich hier? Und wie verabschiedet man sich für immer?',
      'Woran erkennt man diese Stimme mit geschlossenen Augen?',
      'Was verschweigt diese Figur gerade – und warum?',
      'Welche Wörter benutzt nur sie?',
      'Wie klingt Streit hier? Laut, oder sehr leise?',
    ],
    types: ['voice'],
    accent: '#8B6A4F',
    ribbon: '#8B6A4F',
  },
  {
    id: 'artefakte',
    title: 'Artefakte',
    intro:
      'Kein Inventar. Jeder Gegenstand hat ein Alter, eine Herkunft und jemanden, der ihn zuletzt in der Hand hielt. Diese Seiten sind Museumstafeln.',
    questions: [
      'Was hat dieser Gegenstand gesehen?',
      'Wer trug ihn zuletzt – freiwillig?',
      'Welche Kerbe erzählt welche Nacht?',
      'Ließe er sich heute noch herstellen?',
      'Wofür steht er, auch ohne Worte?',
    ],
    types: ['artifact', 'prop', 'furniture', 'clothing'],
    accent: '#B08D57',
    ribbon: '#B08D57',
  },
  {
    id: 'architektur',
    title: 'Architektur & Gebautes',
    intro:
      'Alles, was von Hand gemacht wurde, verrät etwas über seine Erbauer: was sie fürchteten, was sie besaßen, wie lange sie bleiben wollten.',
    questions: [
      'Warum steht dieses Bauwerk genau hier?',
      'Was fürchteten die Erbauer, als sie diese Mauer zogen?',
      'Was ist später dazugekommen – und von wem?',
      'Wie klingt ein Schritt in diesem Raum?',
    ],
    types: ['architecture'],
    accent: '#6B5B45',
    ribbon: '#8A6A45',
  },
  {
    id: 'materialien',
    title: 'Materialien',
    intro:
      'Woraus die Welt gemacht ist. Oberfläche, Alterung, Verhalten im Licht – die Regeln, nach denen alles andere aussieht.',
    questions: [
      'Wie fühlt sich das an, wenn man mit der Hand darüberfährt?',
      'Wie altert es? Wird es schöner oder schäbig?',
      'Woher kommt es, und wer holt es?',
      'Was passiert damit im Regen?',
    ],
    types: ['material'],
    accent: '#8C7A62',
    ribbon: '#8C7A62',
  },
  {
    id: 'kraefte',
    title: 'Kräfte',
    intro:
      'Keine Werte, keine Stufen. Kräfte entstehen irgendwo, haben Grenzen und kosten etwas. Was nichts kostet, verändert auch nichts.',
    questions: [
      'Woher kommt diese Kraft? Wer hat sie zuerst bemerkt?',
      'Was kostet sie den, der sie benutzt?',
      'Was kann sie ausdrücklich nicht?',
      'Was hat sich in der Welt verändert, seit es sie gibt?',
      'Wer wünschte, es gäbe sie nicht?',
    ],
    types: ['magic'],
    accent: '#9C86B0',
    ribbon: '#8E7BA6',
  },
  {
    id: 'geschichten',
    title: 'Geschichten',
    intro:
      'Legenden, Gerüchte, Lieder und Bräuche. Eine Welt wird wahr, sobald ihre Bewohner einander etwas über sie erzählen – auch wenn es nicht stimmt.',
    questions: [
      'Wie erzählt man diese Geschichte in drei Sätzen am Feuer?',
      'Wie klingt sie zwei Täler weiter?',
      'Wer erzählt sie – Großmütter, Betrunkene, Kinder beim Spiel?',
      'Was tut man deswegen bis heute, ohne zu wissen, warum?',
      'Und was ist wirklich geschehen?',
    ],
    types: ['lore', 'quest', 'music'],
    accent: '#7C6A57',
    ribbon: '#7C6A57',
  },
  {
    id: 'werkstatt',
    title: 'Die Werkstatt',
    intro:
      'Assets, Prompts, Konzeptarbeit und Animation. Der produzierende Teil des Buches – hier wird aus der Welt ein Spiel.',
    questions: [
      'Was muss zuerst existieren, damit alles andere gebaut werden kann?',
      'Woran erkennt man, dass ein Stück fertig ist?',
    ],
    types: ['asset', 'prompt', 'concept', 'animation', 'ui'],
    accent: '#B08D57',
    ribbon: '#B08D57',
  },
  {
    id: 'notizen',
    title: 'Notizen & Sammlungen',
    intro: 'Loses, Angefangenes, Gesammeltes. Nicht alles muss schon fertig sein, um im Buch zu stehen.',
    questions: [
      'Welcher Gedanke lässt dich seit Tagen nicht los?',
      'Was gehört zusammen, obwohl du noch nicht weißt, warum?',
    ],
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
  /**
   * Kapitel, die es noch nicht gibt.
   *
   * Sie bekommen keine Seiten – ein Buch zählt keine leeren Blätter mit. Aber
   * sie werden im Inhaltsverzeichnis genannt, denn sonst könnte niemand
   * entdecken, dass es sie geben *könnte*. Ihre Fragen stehen bereit, auch
   * wenn noch keine Antwort geschrieben ist.
   */
  emptyChapters: ChapterDef[];
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
  const emptyChapters: ChapterDef[] = [];

  for (const chapter of CHAPTERS) {
    const mine = living
      .filter((e) => chapterOfType(e.type).id === chapter.id)
      .sort(
        (a, b) =>
          a.type.localeCompare(b.type) ||
          (a.category || '').localeCompare(b.category || '', 'de') ||
          a.title.localeCompare(b.title, 'de'),
      );

    // Leere Kapitel bekommen keine Seiten – aber sie bleiben nennbar.
    if (mine.length === 0) {
      emptyChapters.push(chapter);
      continue;
    }

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

  return { spreads, indexOf, pageOfEntry, chapters, emptyChapters, totalPages: page - FIRST_PAGE };
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
