/**
 * Der Entwurf – eine Seite, bevor es sie gibt.
 *
 * Zwischen „Manuskript eingelegt" und „steht im Buch" liegt Arbeit: Werte
 * prüfen, Fragen beantworten, Verbindungen wählen. Diese Arbeit braucht einen
 * Ort, und der darf nicht die Datenbank sein.
 *
 * Warum nicht: Wer beim Veredeln das Fenster schliesst, hinterliesse sonst
 * einen halben Eintrag im Buch – ohne Titel vielleicht, mit drei Feldern,
 * unauffindbar zwischen den echten. Ein Buch, in dem Bruchstücke liegen, weil
 * jemand einmal etwas angefangen hat, ist kein Buch mehr, sondern ein
 * Arbeitstisch. Deshalb: `createEntry` genau einmal, ganz am Ende.
 *
 * ---
 *
 * **Der Entwurf ist keine zweite Wahrheit.**
 *
 * Er hat dieselben Felder wie ein `Entry` und dieselben Schlüssel – er ist ein
 * `Entry` ohne Kennung, ohne Zeitstempel, ohne Platz im Regal. Kein eigenes
 * Format, keine Übersetzung, keine Zuordnungstabelle. `alsEntry()` macht aus
 * ihm etwas, das jede Seitendarstellung lesen kann, ohne dass irgendetwas
 * gespeichert würde.
 */

import type { Block, Entry, EntryStatus, EntryType, FieldValue } from '../../types';
import type { Mention, Transcript } from '../transcribe';
import { templateFor } from '../templates';

/**
 * Die drei Arbeitszustände.
 *
 * Auf dem Telefon ist immer genau einer der Hauptinhalt. Sie liegen hier und
 * nicht in der Seite, weil auch die Schrittfolge sie kennen muss – zwei
 * Aufzählungen für dieselben drei Wörter wären der Anfang von dreien.
 */
export type SetzereiPhase = 'manuskript' | 'veredeln' | 'seite';

export interface SetzereiDraft {
  type: EntryType;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  beginn: string;
  ende: string;
  tags: string[];
  fields: Record<string, FieldValue>;
  blocks: Block[];
  status?: EntryStatus;
  /** Was der Erkennungslauf im Text an vorhandenen Seiten gefunden hat. */
  mentions: Mention[];
  /**
   * Welche davon verbunden werden sollen. Alle, bis jemand eine abwählt –
   * der Erkennungslauf hat sie nicht zufällig gefunden.
   */
  verbinden: string[];
  /**
   * Was der Verfasser selbst angefasst hat.
   *
   * Nur dafür da, ein zweites Übernehmen aus dem Manuskript zu überstehen:
   * Wer zurückgeht, den Text ändert und erneut übernimmt, soll seine eigenen
   * Eintragungen behalten und die übrigen aufgefrischt bekommen. Ohne diese
   * Liste wäre „zurück zum Manuskript" eine Falle.
   */
  beruehrt: string[];
}

/** Aus einem gelesenen Manuskript wird ein Entwurf. */
export function draftAus(t: Transcript, type: EntryType): SetzereiDraft {
  return {
    type,
    title: t.title,
    subtitle: t.subtitle,
    category: t.category,
    description: t.description,
    beginn: t.beginn,
    ende: t.ende,
    tags: t.tags,
    fields: { ...t.fields },
    blocks: t.blocks,
    status: t.status,
    mentions: t.mentions,
    verbinden: t.mentions.map((m) => m.entryId),
    beruehrt: [],
  };
}

/**
 * Ein zweites Mal übernehmen, ohne die eigene Arbeit zu verlieren.
 *
 * Der Fall: Jemand geht zurück zum Manuskript, ergänzt eine Zeile und setzt
 * erneut. Alles, was er im Veredeln selbst geschrieben hat, muss stehen
 * bleiben; alles andere kommt frisch aus dem Text. Die Verbindungen, die er
 * abgewählt hat, bleiben abgewählt – auch das ist eine Entscheidung.
 */
export function draftAuffrischen(
  alt: SetzereiDraft,
  t: Transcript,
  type: EntryType,
): SetzereiDraft {
  const neu = draftAus(t, type);
  const behalten = new Set(alt.beruehrt);

  const stamm = (schluessel: string, ausAlt: string, ausNeu: string) =>
    behalten.has(schluessel) ? ausAlt : ausNeu;

  const fields = { ...neu.fields };
  for (const key of alt.beruehrt) {
    if (key.startsWith('#')) continue;
    fields[key] = alt.fields[key];
  }

  /* Abgewählte Verbindungen bleiben abgewählt. */
  const abgewaehlt = new Set(alt.mentions.map((m) => m.entryId).filter((id) => !alt.verbinden.includes(id)));

  return {
    ...neu,
    title: stamm('#title', alt.title, neu.title),
    subtitle: stamm('#subtitle', alt.subtitle, neu.subtitle),
    category: stamm('#category', alt.category, neu.category),
    description: stamm('#description', alt.description, neu.description),
    beginn: stamm('#beginn', alt.beginn, neu.beginn),
    ende: stamm('#ende', alt.ende, neu.ende),
    tags: behalten.has('#tags') ? alt.tags : neu.tags,
    fields,
    /*
     * Blöcke bleiben, wenn welche von Hand dazugekommen sind – etwa ein
     * Zitat. Sonst kämen sie aus dem Text und würden hier überschrieben.
     */
    blocks: behalten.has('#blocks') ? alt.blocks : neu.blocks,
    verbinden: neu.mentions.map((m) => m.entryId).filter((id) => !abgewaehlt.has(id)),
    beruehrt: alt.beruehrt,
  };
}

/** Einen Wert setzen und ihn als „von Hand" merken. */
export function draftSetzen(d: SetzereiDraft, key: string, wert: FieldValue): SetzereiDraft {
  const beruehrt = d.beruehrt.includes(key) ? d.beruehrt : [...d.beruehrt, key];
  switch (key) {
    case '#title':
      return { ...d, title: String(wert), beruehrt };
    case '#subtitle':
      return { ...d, subtitle: String(wert), beruehrt };
    case '#category':
      return { ...d, category: String(wert), beruehrt };
    case '#description':
      return { ...d, description: String(wert), beruehrt };
    case '#beginn':
      return { ...d, beginn: String(wert), beruehrt };
    case '#ende':
      return { ...d, ende: String(wert), beruehrt };
    case '#tags':
      return { ...d, tags: Array.isArray(wert) ? wert : [], beruehrt };
    default:
      return { ...d, fields: { ...d.fields, [key]: wert }, beruehrt };
  }
}

/** Was in diesem Feld steht – gleichgültig, ob Stammangabe oder eigenes Feld. */
export function draftWert(d: SetzereiDraft, key: string): FieldValue | undefined {
  switch (key) {
    case '#title':
      return d.title;
    case '#subtitle':
      return d.subtitle;
    case '#category':
      return d.category;
    case '#description':
      return d.description;
    case '#beginn':
      return d.beginn;
    case '#ende':
      return d.ende;
    case '#tags':
      return d.tags;
    default:
      return d.fields[key];
  }
}

/** Blöcke ersetzen – für das Zitat, das über die Blockstruktur läuft. */
export function draftBloecke(d: SetzereiDraft, blocks: Block[]): SetzereiDraft {
  return {
    ...d,
    blocks,
    beruehrt: d.beruehrt.includes('#blocks') ? d.beruehrt : [...d.beruehrt, '#blocks'],
  };
}

/**
 * Der Entwurf als Eintrag – **nur zum Ansehen**.
 *
 * Nichts hiervon geht in die Datenbank. Die Kennung ist absichtlich sprechend
 * und kein `newId`: Wer sie irgendwo auftauchen sieht, weiss sofort, dass hier
 * etwas gespeichert wurde, das nie hätte gespeichert werden dürfen.
 */
export function alsEntry(d: SetzereiDraft): Entry {
  const jetzt = Date.now();
  return {
    id: 'entwurf-ungespeichert',
    title: d.title,
    subtitle: d.subtitle,
    type: d.type,
    category: d.category,
    description: d.description,
    tags: d.tags,
    status: d.status ?? 'Idee',
    favorite: false,
    createdAt: jetzt,
    updatedAt: jetzt,
    linkedEntryIds: [],
    blocks: d.blocks,
    fields: d.fields,
    beginn: d.beginn,
    ende: d.ende,
  } as Entry;
}

/* --------------------------------------------------------------- Erkennung */

/**
 * Was das Buch im Manuskript gefunden hat – als Satz, nicht als Liste.
 *
 * „Ein Name, eine Art, eine Größe und ein Ort zeichnen sich bereits ab."
 *
 * Ausschliesslich aus dem Transkript abgeleitet; nichts wird geraten und
 * nichts erfunden. Genannt werden höchstens vier Dinge – wer sieben aufzählt,
 * hat wieder eine Feldliste, nur in Prosa.
 */
export function erkanntesInWorten(t: Transcript, type: EntryType): string {
  const tpl = templateFor(type);
  const teile: string[] = [];

  if (t.title.trim()) teile.push('Ein Name');
  if (t.category.trim()) teile.push('eine Einordnung');

  /*
   * Die eigenen Felder in der Reihenfolge der Vorlage – so steht das
   * Wichtigste zuerst, denn so ist die Vorlage gebaut.
   *
   * ---
   *
   * **Ohne Artikel, und zwar mit Absicht.**
   *
   * Die erste Fassung setzte einen davor und riet ihn aus der Endung. Am
   * Gerät kam heraus: „Ein Name, eine Einordnung, **ein art** und **eine
   * größe** zeichnen sich bereits ab." Zwei Fehler in einem Halbsatz – der
   * falsche Artikel („die Art"), und ein kleingeschriebenes deutsches
   * Substantiv.
   *
   * Das Geschlecht eines beliebigen Feldnamens lässt sich nicht ableiten, und
   * ein Wörterbuch dafür wäre für einen Halbsatz zu viel – zumal jeder selbst
   * angelegte Typ eigene Beschriftungen mitbringt. Also nennt der Satz die
   * Dinge beim Namen und schreibt sie gross, wie es sich gehört. „Ein Name,
   * eine Einordnung, Art und Größe zeichnen sich bereits ab." Das ist immer
   * richtig, und richtig schlägt hübsch.
   */
  for (const f of tpl.fields) {
    if (teile.length >= 4) break;
    const wert = t.fields[f.key];
    const leer = wert == null || wert === '' || wert === false || (Array.isArray(wert) && !wert.length);
    if (leer) continue;
    teile.push(f.label);
  }

  if (teile.length < 4 && t.description.trim()) teile.push('eine Beschreibung');

  if (!teile.length) return '';
  if (teile.length === 1) return `${gross(teile[0])} zeichnet sich bereits ab.`;
  const letzte = teile.pop()!;
  return `${gross(teile.join(', '))} und ${letzte} zeichnen sich bereits ab.`;
}

/**
 * Der Artikel eines Eintragstyps – „Ich erkenne **eine** Kreatur".
 *
 * Hier gibt es keine Ratearbeit, denn das Geschlecht steht längst in der
 * Vorlage: `newTitle` heisst „Neue Kreatur", „Neuer Ort", „Neues Biom". Wer
 * einen Typ angelegt hat, hat den Artikel dort schon richtig gewählt – ihn
 * ein zweites Mal zu bestimmen hiesse, dieselbe Auskunft an zwei Stellen zu
 * halten und beim nächsten Typ eine davon zu vergessen.
 *
 * Selbst angelegte Typen dürfen jede Beschriftung tragen; passt keine, steht
 * „ein" da. Ein schiefer Artikel ist ein Schönheitsfehler, eine erfundene
 * Auskunft wäre einer im Inhalt.
 */
export function artikelFuer(type: EntryType): string {
  const t = templateFor(type).newTitle;
  if (/\bneue\b/i.test(t)) return 'eine';
  if (/\bneuer\b/i.test(t)) return 'einen';
  return 'ein';
}

function gross(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Wie viele Bausteine das Manuskript hergab.
 *
 * Gezählt wird, was tatsächlich irgendwo landet: gefüllte Stammangaben,
 * gefüllte Felder, übernommene Textblöcke. Nicht gezählt wird, was nicht
 * zugeordnet werden konnte – das kommt als Notiz auf die Seite und ist ein
 * Rest, kein Fund.
 */
export function bausteineIn(t: Transcript): number {
  const stamm = [t.title, t.subtitle, t.category, t.description, t.beginn, t.ende]
    .filter((s) => s.trim()).length;
  const marken = t.tags.length ? 1 : 0;
  const eigene = Object.values(t.fields).filter(
    (v) => v != null && v !== '' && v !== false && (!Array.isArray(v) || v.length > 0),
  ).length;
  return stamm + marken + eigene + t.blocks.length;
}
