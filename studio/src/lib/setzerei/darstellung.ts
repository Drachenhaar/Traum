/**
 * Wie ein Feld aussieht – getrennt davon, was es ist.
 *
 * `FieldDef.kind` in `lib/templates.ts` sagt, **was gespeichert wird**: ein
 * Text, eine Liste, eine Auswahl, eine Farbpalette. Das ist das Datenmodell,
 * und es bleibt unangetastet. Was es nicht sagt, ist, **wie man es hinschreibt** –
 * und genau da beginnt der Unterschied zwischen einem Formular und einer
 * Setzerei.
 *
 * Zwei Felder mit derselben `kind` verdienen oft verschiedene Oberflächen:
 *
 *     zitat          textarea  →  ein Zitat, typografisch gesetzt
 *     randbemerkung  textarea  →  eine Notiz, von Hand geschrieben
 *     background     textarea  →  Fliesstext
 *
 * Alle drei sind derselbe String im Eintrag. Sie als denselben grauen Kasten
 * zu zeigen ist technisch richtig und für den Schreibenden falsch.
 *
 * ---
 *
 * **Warum abgeleitet und nicht in `FieldDef` eingetragen.**
 *
 * Ein Feld mehr in `FieldDef` hiesse: achtundzwanzig Vorlagen mit
 * dreihundert Feldern durchgehen und überall eine Zeile ergänzen – und beim
 * nächsten neuen Feld wieder daran denken. Eine Ableitung deckt alles ab und
 * kann nicht vergessen werden. Wer eine Ausnahme braucht, trägt einen
 * Schlüssel in die Tabellen unten ein; wer keine braucht, bekommt die
 * richtige Oberfläche umsonst.
 */

import type { EntryType } from '../../types';
import type { FieldDef } from '../templates';

/**
 * Die Oberflächen.
 *
 * Bewusst weniger als Feldarten, nicht mehr: Jede zusätzliche Art zu tippen
 * ist eine Art mehr, die man lernen muss.
 */
export type Darstellung =
  /** Eine Zeile, direkt aufs Papier geschrieben. */
  | 'zeile'
  /** Ein Absatz – ruhig, ohne Rahmen, wächst mit. */
  | 'satz'
  /** Ein Zitat, typografisch gesetzt statt eingetippt. */
  | 'zitat'
  /** Eine handschriftliche Randbemerkung. */
  | 'notiz'
  /** Eine aus wenigen Möglichkeiten – als Marken, nicht als Klappliste. */
  | 'einwahl'
  /** Mehrere kurze Werte – je eine Marke, kein Komma. */
  | 'marken'
  /** Ja oder nein. */
  | 'jaNein'
  /** Verweise auf vorhandene Seiten des Buches. */
  | 'verweis'
  /** Farbfelder mit Namen; der Hexwert liegt darunter. */
  | 'palette'
  /** Bilder. */
  | 'bilder';

/**
 * Felder, die trotz gleicher `kind` anders geschrieben werden wollen.
 *
 * Kurz halten. Jede Zeile hier ist eine Ausnahme, und Ausnahmen sind der
 * Anfang von Sonderfällen.
 */
const EIGENART: Record<string, Darstellung> = {
  zitat: 'zitat',
  randbemerkung: 'notiz',
};

/** Wie schreibt man dieses Feld? */
export function darstellungVon(def: FieldDef): Darstellung {
  const eigen = EIGENART[def.key];
  if (eigen) return eigen;

  switch (def.kind) {
    case 'textarea':
      return 'satz';
    case 'select':
      return 'einwahl';
    case 'tags':
      return 'marken';
    case 'boolean':
      return 'jaNein';
    case 'entries':
      return 'verweis';
    case 'palette':
      return 'palette';
    case 'images':
      return 'bilder';
    case 'text':
    default:
      return 'zeile';
  }
}

/* --------------------------------------------------------------- Weltwissen */

/**
 * Welche Textfelder auf vorhandene Seiten zeigen können.
 *
 * „Herkunft: Nebelwald" ist heute ein String. Wenn es den Nebelwald als Ort
 * längst gibt, ist der String die schlechtere Wahrheit: Er sagt dasselbe,
 * aber das Buch weiss nichts davon – kein Verweis, kein Rückweg, und wer den
 * Ort umbenennt, hat zwei Namen für eine Sache.
 *
 * Die Setzerei bietet deshalb bei diesen Feldern an, was es schon gibt. Wird
 * gewählt, entsteht **beides**: der Text bleibt stehen (das Datenmodell
 * ändert sich nicht), und dazu eine echte Kante über `addRelation`.
 *
 * ---
 *
 * **Wo die Zuordnung ehrlich dünn ist.**
 *
 * Für „Volk" und „Zugehörigkeit" gibt es heute keinen eigenen Eintragstyp.
 * Sie zeigen deshalb auf die Typen, die so etwas tragen *können* – eine
 * Sammlung für einen Orden, ein Lore-Eintrag für ein Volk. Das ist keine
 * saubere Modellierung, sondern die beste verfügbare; ein eigener Typ wäre
 * die bessere und ist eine andere Entscheidung.
 */
export const WELTBEZUG: Record<string, EntryType[]> = {
  /* Orte */
  herkunft: ['location', 'biome'],
  region: ['location', 'biome'],
  habitat: ['location', 'biome'],
  territory: ['location', 'biome'],
  places: ['location', 'biome'],
  foundAt: ['location'],
  origin: ['location', 'biome'],
  sleep: ['location'],
  scene: ['location'],

  /* Wesen */
  volk: ['creature', 'animal', 'lore'],
  species: ['creature', 'animal'],
  owner: ['character'],
  maker: ['character'],
  speaker: ['character'],
  teller: ['character'],
  listener: ['character'],

  /* Gruppen */
  zugehoerigkeit: ['collection', 'lore', 'location'],
};

/** Kann dieses Feld auf eine vorhandene Seite zeigen? */
export function weltbezugVon(key: string): EntryType[] | undefined {
  return WELTBEZUG[key];
}

/* ----------------------------------------------------------------- Fragen */

/**
 * Was ein leeres Feld statt eines leeren Kastens sagt.
 *
 * Die meisten Vorlagen tragen die Frage längst mit sich – `hint` ist bei
 * vielen Feldern als Frage geschrieben („Was will diese Figur – heute, und
 * was ihr ganzes Leben lang?"). Sie stand bisher klein und grau *unter* dem
 * Feld, wo man sie liest, nachdem man nicht mehr weiterweiss.
 *
 * Hier wird sie zur Aufforderung. Wo eine Vorlage keine mitbringt, entsteht
 * aus der Beschriftung eine – lieber schlicht als schlau: „Herkunft?" ist
 * eine Frage, „Erzähl uns von der Herkunft!" ist eine Zumutung.
 */
export function frageFuer(def: FieldDef): string {
  const hint = def.hint?.trim();
  /*
   * Nur echte Fragen übernehmen. Manche Hinweise sind Formatangaben
   * („durch Komma getrennt", „z. B. Schleierflossen, Hörner") – die gehören
   * in den Prompt für ChatGPT, nicht auf das Papier.
   */
  if (hint && hint.endsWith('?')) return hint;
  return `${def.label}?`;
}

/**
 * Hinweise, die eine Maschine braucht und ein Mensch nicht.
 *
 * `angabenFor` in `lib/transcribe.ts` erzeugt sie für den ChatGPT-Prompt und
 * für das Gerüst – dort sind sie richtig und bleiben. Auf dem Papier haben
 * sie nichts verloren: Wer Marken antippt, muss nicht wissen, dass sie
 * intern durch Komma getrennt gespeichert werden.
 */
export function istFormatangabe(hint: string | undefined): boolean {
  if (!hint) return false;
  return /durch Komma getrennt|#RRGGBB|eines von:|ja oder nein|z\. ?B\./i.test(hint);
}
