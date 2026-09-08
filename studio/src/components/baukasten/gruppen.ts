/**
 * Die Gruppen der Werkzeugleiste.
 *
 * Siebzehn Schichten sind eine gute Datenstruktur und eine schlechte Liste zum
 * Ansehen. Der Entwurf zeigt sechs Gruppen an der linken Kante – Körper,
 * Gesicht, Haare, Kleidung, Ausrüstung, Besondere Merkmale –, und genau die
 * stehen hier.
 *
 * ---
 *
 * **Was diese Datei ausdrücklich nicht tut.**
 *
 * Sie ändert die Reihenfolge des Stapels nicht und darf es nicht. Wer eine
 * Gruppe umsortiert, verschiebt kein einziges Teil im Bildnis: Gezeichnet wird
 * weiter nach `SCHICHTEN`, und diese Liste sagt nur, wo man die Schicht
 * *findet*. Ordnung zum Ansehen und Ordnung zum Zeichnen sind zwei
 * verschiedene Dinge, und sie zu vermengen wäre die Art Bequemlichkeit, die
 * einen später einen Nachmittag kostet.
 *
 * Deshalb steht hier auch keine Schicht doppelt und keine fehlt – beides wird
 * geprüft (`tests/baukasten.test.mjs`). Eine Schicht, die in keiner Gruppe
 * steht, wäre in der Oberfläche unerreichbar, ohne dass irgendetwas
 * fehlschlägt: Sie wäre einfach fort.
 */

import type { SchichtName } from '../../lib/baukasten';

/** Welches Zeichen die Gruppe trägt. Aufgelöst in der Seite, nicht hier. */
export type Gruppenzeichen =
  | 'koerper'
  | 'gesicht'
  | 'haare'
  | 'kleidung'
  | 'ausruestung'
  | 'merkmale';

export interface Gruppe {
  id: Gruppenzeichen;
  label: string;
  hinweis: string;
  /** Die Schichten dieser Gruppe – in der Reihenfolge, in der man sie sucht. */
  schichten: SchichtName[];
}

export const GRUPPEN: Gruppe[] = [
  {
    id: 'koerper',
    label: 'Körper',
    hinweis: 'Die Gestalt, auf der alles andere sitzt.',
    schichten: ['koerper'],
  },
  {
    id: 'gesicht',
    label: 'Gesicht',
    hinweis: 'Sechs Schichten, aus denen ein Gesicht wird.',
    /*
     * Die Reihenfolge hier ist die des Suchens und nicht die des Zeichnens:
     * Man wählt erst die Kopfform, dann die Augen, und arbeitet sich nach
     * innen. Gezeichnet wird trotzdem nach `SCHICHTEN`.
     */
    schichten: ['kopf', 'augen', 'brauen', 'nase', 'mund', 'ohren'],
  },
  {
    id: 'haare',
    label: 'Haare',
    hinweis: 'Was vorn fällt, was hinten liegt, was am Kinn wächst.',
    schichten: ['haar', 'hinterhaar', 'bart'],
  },
  {
    id: 'kleidung',
    label: 'Kleidung',
    hinweis: 'Was getragen wird.',
    schichten: ['gewand', 'schmuck'],
  },
  {
    id: 'ausruestung',
    label: 'Ausrüstung',
    hinweis: 'Was sie führt und aufsetzt.',
    schichten: ['ausruestung', 'kopfschmuck'],
  },
  {
    id: 'merkmale',
    label: 'Besondere Merkmale',
    hinweis: 'Male und Zeichen – und der Grund, vor dem sie steht.',
    schichten: ['male', 'grund', 'beiwerk'],
  },
];

/** In welcher Gruppe eine Schicht zu finden ist. */
export function gruppeVon(schicht: SchichtName): Gruppe | undefined {
  return GRUPPEN.find((g) => g.schichten.includes(schicht));
}

/** Alle Schichten, die in Gruppen stehen – für die Prüfung auf Vollständigkeit. */
export const SCHICHTEN_IN_GRUPPEN: SchichtName[] = GRUPPEN.flatMap((g) => g.schichten);
