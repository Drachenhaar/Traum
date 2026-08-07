/**
 * Vorlagen für Bild- und Textmaschinen.
 *
 * Das Artbook setzt keine bestimmte Bild-KI voraus und schickt nichts fort.
 * Es hält nur den Text bereit, den der Verfasser mitnimmt – zu ChatGPT, zu
 * Claude, wohin er will – und nimmt das Ergebnis wieder entgegen.
 *
 * Bewusst als Register und nicht als ein einzelner fester Textblock: Es wird
 * nicht bei dieser einen Vorlage bleiben. Eine neue Vorlage ist ein Eintrag in
 * `PROMPT_TEMPLATES`; die Verwaltung – bearbeiten, kopieren, zuruecksetzen –
 * gilt dann ohne weiteres Zutun auch fuer sie.
 *
 * Gespeichert wird nur die *Abweichung*: Wer nichts aendert, hat nichts in der
 * Datenbank stehen und bekommt spaetere Verbesserungen der Werksfassung
 * mit. Wer aendert, behaelt seine Fassung.
 */

import type { StoredPromptTemplate } from '../types';

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  /** Wozu diese Vorlage da ist – steht ueber dem Textfeld. */
  note: string;
  /** Die geltende Fassung: die eigene, sonst die des Hauses. */
  content: string;
  defaultContent: string;
  /** Wann zuletzt geaendert; 0, solange die Werksfassung gilt. */
  updatedAt: number;
  /** Weicht die geltende Fassung von der Werksfassung ab? */
  geaendert: boolean;
}

const EMBLEM_PROMPT = `Erstelle ein einzelnes, zentrales Emblem für den Einband eines alten Fantasy-Artbooks.

MOTIV:
[Beschreibe hier dein Zeichen]

CHARAKTER:
[Welche Bedeutung soll das Zeichen tragen?]

STIL:
zeitlos,
elegant,
handgezeichnet,
hochwertige Fantasy-Artbook-Ästhetik,
wenige klare Formen,
als Prägesiegel oder Buchsymbol geeignet.

MATERIALWIRKUNG:
geprägtes Messing,
altes Gold,
oder dunkle Lederprägung.

KOMPOSITION:
ein einziges zentrales Symbol,
ruhige Silhouette,
ikonisch,
gut auch in kleiner Darstellung erkennbar,
kein komplexer Hintergrund.

NICHT IM BILD:
Schrift,
Buchstaben,
Titel,
Rahmen,
Landschaft,
Personen,
Gegenstände außerhalb des Emblems,
grelles Leuchten,
Neon,
moderne Logoästhetik,
Mockup eines Buches.

Wenn die verwendete Bild-KI Transparenz unterstützt:
freigestelltes Symbol auf transparentem Hintergrund.`;

/** Die Kennung der Emblem-Vorlage – anderswo im Programm gebraucht. */
export const EMBLEM_PROMPT_ID = 'emblem';

interface TemplateDef {
  id: string;
  name: string;
  category: string;
  note: string;
  defaultContent: string;
}

export const PROMPT_TEMPLATES: TemplateDef[] = [
  {
    id: EMBLEM_PROMPT_ID,
    name: 'Zeichen des Buches',
    category: 'Einband',
    note: 'Für eine Bild-KI deiner Wahl. Die eckigen Klammern sind für dich – ersetze sie, bevor du den Text mitnimmst.',
    defaultContent: EMBLEM_PROMPT,
  },
];

export function templateDefById(id: string): TemplateDef | undefined {
  return PROMPT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Die geltende Fassung einer Vorlage: die eigene, sonst die des Hauses.
 */
export function resolveTemplate(
  id: string,
  stored: StoredPromptTemplate[] | undefined,
): PromptTemplate | undefined {
  const def = templateDefById(id);
  if (!def) return undefined;

  const eigen = stored?.find((t) => t.id === id);
  const content = eigen?.content ?? def.defaultContent;

  return {
    ...def,
    content,
    updatedAt: eigen?.updatedAt ?? 0,
    geaendert: content.trim() !== def.defaultContent.trim(),
  };
}

/** Alle Vorlagen, mit den jeweils geltenden Fassungen. */
export function resolveTemplates(stored: StoredPromptTemplate[] | undefined): PromptTemplate[] {
  return PROMPT_TEMPLATES.map((d) => resolveTemplate(d.id, stored)).filter(
    (t): t is PromptTemplate => !!t,
  );
}
