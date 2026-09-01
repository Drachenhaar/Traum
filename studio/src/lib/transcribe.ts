/**
 * Die Setzerei.
 *
 * Hier wird ein geschriebenes Blatt in eine Buchseite übersetzt: Man legt Text
 * ein – etwa aus ChatGPT – und heraus kommt ein fertiger Eintrag mit gefüllten
 * Feldern.
 *
 * Das geschieht vollständig im Browser. Kein Dienst, kein Schlüssel, keine
 * Übertragung. Das geht, weil geschriebene Beschreibungen fast immer denselben
 * wenigen Mustern folgen:
 *
 *     ## Waldkoi
 *     **Art:** Schleierkarpfen
 *     Größe: 40 cm
 *     - Verhalten: schwimmt durch Luft wie durch Wasser
 *
 * Der Parser erkennt Überschriften, „Feld: Wert“-Zeilen, Aufzählungen,
 * Farbwerte und Fließtext – und ordnet die Beschriftungen den Feldern der
 * jeweiligen Vorlage zu.
 *
 * Grundsatz: Nichts wird stillschweigend verworfen. Was sich nicht zuordnen
 * lässt, wird gemeldet (`unmatched`) oder landet als Textblock auf der Seite.
 */

import type { Block, Entry, EntryStatus, EntryType, FieldValue } from '../types';
import { ENTRY_STATUSES } from '../types';
import { leseZeit } from './chronik/zeit';
import { allTemplates, templateFor, type FieldDef, type TemplateDef } from './templates';
import { RELATION_TYPES } from './relations';
import { newId } from './utils';

/* --------------------------------------------------------------- Werkzeuge */

/**
 * Vergleichsform mit erhaltenen Wortgrenzen.
 *
 * Wichtig für die Suche nach Eintragsnamen: „Nebeleiche“ darf nicht in
 * „Nebeleichenholz“ gefunden werden, sonst entstehen Beziehungen, die im Text
 * nie gemeint waren.
 */
function normWords(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

/** Vergleichsform: ohne Umlaute, Satzzeichen und Groß-/Kleinschreibung. */
function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Markdown-Auszeichnung entfernen – wir wollen den Text, nicht die Sterne.
 *
 * Die einfache Auszeichnung braucht eine Grenze vor dem Stern, sonst zerlegt
 * sie Woerter wie `schnee_wehe`. Diese Grenze steht hier bewusst als
 * gefangene Gruppe `(^|\W)` und nicht als Rueckschau `(?<!\w)`: Safari
 * beherrscht Rueckschau erst ab Version 16.4, und aeltere Fassungen
 * uebersetzen einen regulaeren Ausdruck erst beim ersten Gebrauch. Der
 * Ausdruck war deshalb keine Ladefehler-, sondern eine Zeitbombe – das Buch
 * oeffnete sich, und erst beim Setzen einer Seite brach alles ab.
 *
 * `\W` schliesst den Zeilenumbruch ein und deckt damit auch den Zeilenanfang
 * ab; die Vorausschau `(?!\w)` darf bleiben, die kennt Safari seit jeher.
 */
function stripMarkup(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|\W)[*_](.+?)[*_](?!\w)/g, '$1$2')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .trim();
}

/**
 * Englische und umgangssprachliche Beschriftungen auf die Feldnamen der
 * Vorlagen abbilden. ChatGPT antwortet je nach Frage mal so, mal so.
 */
const SYNONYMS: Record<string, string[]> = {
  species: ['species', 'art', 'gattung', 'spezies', 'rasse'],
  size: ['size', 'grosse', 'groesse', 'masse', 'dimensions', 'hohe', 'hoehe'],
  role: ['role', 'rolle', 'funktion', 'beruf'],
  age: ['age', 'alter', 'altersgruppe'],
  personality: ['personality', 'personlichkeit', 'wesen', 'charakter', 'temperament'],
  background: ['background', 'hintergrund', 'herkunft', 'geschichte', 'biografie'],
  behaviour: ['behaviour', 'behavior', 'verhalten', 'lebensweise'],
  appearance: ['appearance', 'aussehen', 'erscheinung', 'optik'],
  face: ['face', 'gesicht', 'gesichtsmerkmale', 'gesichtszuge'],
  hair: ['hair', 'haare', 'haar', 'frisur'],
  clothing: ['clothing', 'kleidung', 'gewand', 'tracht', 'outfit'],
  atmosphere: ['atmosphere', 'atmosphare', 'stimmung', 'mood', 'ambiente'],
  light: ['light', 'licht', 'beleuchtung', 'lighting', 'tageszeit'],
  sound: ['sound', 'klang', 'gerausch', 'akustik', 'audio'],
  climate: ['climate', 'klima', 'wetter'],
  weather: ['weather', 'wetter', 'jahreszeiten', 'seasons'],
  ground: ['ground', 'boden', 'bewuchs', 'untergrund', 'terrain'],
  region: ['region', 'gebiet', 'lage', 'location'],
  material: ['material', 'materials', 'werkstoff'],
  finish: ['finish', 'oberflache', 'oberflaeche', 'textur', 'texture'],
  hardness: ['hardness', 'harte', 'haerte', 'festigkeit'],
  aging: ['aging', 'alterung', 'patina', 'verwitterung'],
  usage: ['usage', 'verwendung', 'nutzung', 'gebrauch', 'einsatz'],
  style: ['style', 'stil', 'baustil', 'formensprache'],
  construction: ['construction', 'konstruktion', 'bauweise', 'aufbau'],
  details: ['details', 'detail', 'besonderheiten', 'merkmale'],
  interior: ['interior', 'innenraum', 'innen', 'inneres'],
  purpose: ['purpose', 'zweck', 'aufgabe', 'funktion'],
  handling: ['handling', 'handhabung', 'bedienung'],
  growth: ['growth', 'wuchsform', 'wuchs', 'wachstum'],
  season: ['season', 'jahreszeit', 'zyklus', 'bluetezeit', 'blutezeit'],
  magic: ['magic', 'magie', 'besondereeigenschaften', 'zauber'],
  source: ['source', 'quelle', 'ursprung', 'herkunft', 'wohersiekommt'],
  cost: ['cost', 'kosten', 'preis', 'waskostetsie'],
  rule: ['rule', 'regel', 'grundsatz', 'prinzip'],
  because: ['because', 'warum', 'begrundung', 'grund', 'weil'],
  diet: ['diet', 'nahrung', 'ernahrung', 'futter'],
  locomotion: ['locomotion', 'bewegung', 'bewegungsarten', 'fortbewegung'],
  bodyParts: ['bodyparts', 'korperteile', 'koerperteile', 'anatomie'],
  prompt: ['prompt', 'promptext', 'bildprompt'],
  negativePrompt: ['negativeprompt', 'negativerprompt', 'negativ'],
  model: ['model', 'modell'],
  mood: ['mood', 'stimmung', 'gefuhl', 'gefuehl'],
  instruments: ['instruments', 'instrumente', 'besetzung'],
  tempo: ['tempo', 'geschwindigkeit', 'takt'],
  era: ['era', 'zeit', 'zeitalter', 'epoche'],
  summary: ['summary', 'kurzfassung', 'zusammenfassung', 'uberblick'],
  hook: ['hook', 'aufhanger', 'aufhaenger', 'einstieg'],
  reward: ['reward', 'belohnung', 'ertrag'],
  intent: ['intent', 'absicht', 'ziel'],
  palette: ['palette', 'farbpalette', 'farben', 'colors', 'colours', 'farbklang'],
};

/** Beschriftungen, die nicht in die Vorlage gehören, sondern zum Eintrag selbst. */
const CORE_LABELS: Record<string, string[]> = {
  title: ['title', 'name', 'titel', 'bezeichnung'],
  subtitle: ['subtitle', 'untertitel', 'beiname', 'epitheton', 'kurzbeschreibung'],
  category: ['category', 'kategorie', 'gruppe', 'klasse'],
  description: ['description', 'beschreibung', 'ubersicht', 'uberblick', 'einleitung', 'text'],
  tags: ['tags', 'schlagworte', 'schlagworter', 'stichworte', 'keywords'],
  status: ['status', 'zustand', 'reifegrad'],
  type: ['type', 'typ', 'eintragsart', 'art des eintrags'],
  /*
   * Weltzeit im Manuskript.
   *
   * Bewusst nur eindeutige Woerter. „von" und „bis" waeren naheliegend und
   * waeren falsch: „Von: dem Haendler am Markt" ist keine Jahreszahl. Ein
   * falsch gelesenes Datum ist schlimmer als ein ungelesenes – es steht dann
   * auf der Achse und behauptet etwas.
   */
  /*
   * Jeweils beide Schreibgewohnheiten: `norm()` macht aus „Gründung" ein
   * „grundung", aus „Gruendung" dagegen ein „gruendung". Wer nur eine Form
   * hinterlegt, liest die andere nicht – das ist mir hier passiert.
   */
  beginn: [
    'beginn', 'begonnen', 'anfang', 'entstehung', 'entstanden',
    'grundung', 'gruendung', 'gegrundet', 'gegruendet',
    'geburt', 'geboren', 'geburtsjahr', 'erbaut',
  ],
  ende: [
    'ende', 'endet', 'untergang', 'aufgelost', 'aufgeloest',
    'zerstort', 'zerstoert', 'tod', 'gestorben', 'todesjahr', 'verfallen',
  ],
};

function matchesLabel(candidate: string, targets: string[]): boolean {
  const n = norm(candidate);
  if (!n) return false;
  return targets.some((t) => {
    const tn = norm(t);
    if (n === tn) return true;

    /*
     * Anfangsgleichheit lassen wir gelten – „Beschreib" meint „Beschreibung".
     * Massgeblich ist aber die *kuerzere* Seite, nicht die laengere. Vorher
     * genuegte es, dass ein Wort lang war, und damit traf „Art" auf „Art des
     * Eintrags": Die Zeile „Art: Schleierkarpfen" wurde als Typangabe
     * verbraucht und die Gattung landete nie auf der Seite – obwohl unsere
     * eigene Vorlage genau diese Zeile vorschlaegt.
     *
     * Drei Buchstaben sagen zu wenig, um eine laengere Beschriftung zu
     * meinen. Fuenf sind die Grenze.
     */
    const kuerzere = Math.min(n.length, tn.length);
    return kuerzere > 4 && (n.startsWith(tn) || tn.startsWith(n));
  });
}

/** Zu welchem Feld der Vorlage gehört diese Beschriftung? */
function findField(label: string, tpl: TemplateDef): FieldDef | undefined {
  const direct = tpl.fields.find((f) => matchesLabel(label, [f.label]));
  if (direct) return direct;

  return tpl.fields.find((f) => {
    const syn = SYNONYMS[f.key];
    return syn ? matchesLabel(label, syn) : false;
  });
}

/* ------------------------------------------------------------ Zerlegung ---- */

interface Pair {
  label: string;
  value: string;
}

interface Parsed {
  headings: string[];
  pairs: Pair[];
  /** Überschrift → Fließtext darunter */
  sections: Pair[];
  paragraphs: string[];
  bullets: string[];
}

const KEY_VALUE = /^\s*(?:[-*•>]\s*)?\*{0,2}([\p{L}][\p{L}\s/&()'-]{1,38})\*{0,2}\s*[:：]\s*(.+?)\s*$/u;
const HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*$/;
const BULLET = /^\s*[-*•]\s+(.+?)\s*$/;

function parseDocument(raw: string): Parsed {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const out: Parsed = { headings: [], pairs: [], sections: [], paragraphs: [], bullets: [] };

  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const text = stripMarkup(buffer.join(' ').replace(/\s+/g, ' ')).trim();
    buffer = [];
    if (!text) return;
    if (currentHeading) {
      out.sections.push({ label: currentHeading, value: text });
      currentHeading = null;
    } else {
      out.paragraphs.push(text);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    if (!raw.trim()) {
      flush();
      continue;
    }

    /*
     * Erst entschärfen, dann erkennen. ChatGPT schreibt „**Art:** Nebelgeist“ –
     * die Sternchen stehen dabei *um den Doppelpunkt herum*. Wer zuerst nach
     * dem Muster sucht und danach aufräumt, behält sie im Wert stehen.
     */
    const line = stripMarkup(raw);
    if (!line) {
      flush();
      continue;
    }

    // Unterstrichene Überschrift (Setext): Text, darunter === oder ---
    const next = lines[i + 1];
    if (next && /^\s*(={3,}|-{3,})\s*$/.test(next)) {
      flush();
      out.headings.push(line);
      currentHeading = line;
      i++;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      flush();
      const h = heading[1].trim();
      out.headings.push(h);
      currentHeading = h;
      continue;
    }

    const pair = line.match(KEY_VALUE);
    if (pair && pair[2].trim()) {
      flush();
      out.pairs.push({ label: pair[1].trim(), value: pair[2].trim() });
      continue;
    }

    const bullet = line.match(BULLET);
    if (bullet) {
      flush();
      out.bullets.push(bullet[1].trim());
      continue;
    }

    buffer.push(line);
  }
  flush();

  return out;
}

/* -------------------------------------------------------------- Typ raten */

/**
 * Welche Vorlage passt?
 *
 * Zuerst zählt eine ausdrückliche Angabe („Typ: Kreatur“). Sonst gewinnt die
 * Vorlage, deren Feldnamen am häufigsten im Dokument vorkommen – ein Text mit
 * „Art, Größe, Verhalten, Körperteile“ ist ziemlich sicher eine Kreatur.
 */
export function guessType(raw: string, parsed: Parsed): { type: EntryType; score: number } {
  const templates = allTemplates();

  const explicit = parsed.pairs.find((p) => matchesLabel(p.label, CORE_LABELS.type));
  if (explicit) {
    const hit = templates.find(
      (t) => matchesLabel(explicit.value, [t.label]) || matchesLabel(explicit.value, [t.labelPlural]),
    );
    if (hit) return { type: hit.type, score: 1 };
  }

  const haystack = norm(raw);
  let best = { type: 'page' as EntryType, score: 0 };

  for (const tpl of templates) {
    let score = 0;

    // Der Name der Vorlage taucht im Text auf
    if (haystack.includes(norm(tpl.label))) score += 3;
    // Kategorien der Vorlage
    for (const cat of tpl.categories) {
      if (cat.length > 3 && haystack.includes(norm(cat))) score += 1;
    }
    // Wie viele Beschriftungen des Dokuments passen auf Felder dieser Vorlage?
    for (const pair of parsed.pairs) {
      if (findField(pair.label, tpl)) score += 2;
    }
    for (const section of parsed.sections) {
      if (findField(section.label, tpl)) score += 2;
    }

    if (score > best.score) best = { type: tpl.type, score };
  }

  return best.score > 0 ? best : { type: 'page', score: 0 };
}

/* ------------------------------------------------------------ Wertzuweisung */

function splitList(value: string): string[] {
  return value
    .split(/[,;·|]|\s+·\s+/)
    .map((s) => stripMarkup(s).trim())
    .filter(Boolean);
}

const HEX = /#[0-9a-fA-F]{6}\b/g;

/**
 * Farbwerte samt Namen einsammeln.
 *
 * Meist stehen mehrere Farben in einer Zeile:
 *   „Farbpalette: Nebelgrau #8A9490, Moosgrün #55604A, Glimmgold #A8853F“
 * Deshalb wird der Name jeweils aus dem Stück zwischen der vorigen und der
 * aktuellen Farbe gelesen – nicht aus dem gesamten Zeilenanfang.
 */
function extractPalette(raw: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const line of raw.split('\n')) {
    const pattern = new RegExp(HEX.source, 'g');
    let match: RegExpExecArray | null;
    let cursor = 0;

    while ((match = pattern.exec(line)) !== null) {
      const hex = match[0];
      const key = hex.toLowerCase();
      const segment = line.slice(cursor, match.index);
      cursor = match.index + hex.length;

      if (seen.has(key)) continue;
      seen.add(key);

      /* Nur das letzte Listenglied vor der Farbe ist ihr Name … */
      const parts = stripMarkup(segment).split(/[,;•]/);
      let name = (parts[parts.length - 1] ?? '').trim();
      /* … und eine vorangestellte Beschriftung („Farbpalette:“) gehört nicht dazu. */
      const colon = name.lastIndexOf(':');
      if (colon >= 0) name = name.slice(colon + 1);

      name = name
        .replace(/^[-*•\s]+/, '')
        .replace(/[–—-]\s*$/, '')
        .trim();

      found.push(name ? `${hex}|${name}` : hex);
    }
  }
  return found;
}

function coerce(field: FieldDef, value: string): FieldValue | undefined {
  switch (field.kind) {
    case 'boolean': {
      const n = norm(value);
      if (['ja', 'yes', 'true', 'wahr', 'x'].includes(n)) return true;
      if (['nein', 'no', 'false', 'falsch'].includes(n)) return false;
      return undefined;
    }
    case 'tags':
      return splitList(value);
    case 'select': {
      const hit = field.options?.find((o) => o && matchesLabel(value, [o]));
      return hit ?? undefined;
    }
    case 'palette':
      return extractPalette(value);
    case 'images':
    case 'entries':
      // Aus Text lassen sich keine Bilder oder Verweise erzeugen.
      return undefined;
    default:
      return value;
  }
}

/* ------------------------------------------------------------- Erwähnungen */

export interface Mention {
  entryId: string;
  title: string;
  /** Vorgeschlagene Beziehungsart, wenn die Beschriftung eine verrät */
  relationType?: string;
  /** Woher der Vorschlag stammt, für die Anzeige */
  via: string;
}

/**
 * Namen bestehender Einträge im Text finden.
 *
 * Steht der Name hinter einer Beschriftung, die einer Beziehungsart entspricht
 * („Heimat: Nebelwald“), schlagen wir gleich die richtige Art vor. Sonst bleibt
 * es bei „verwandt mit“ – der Nutzer entscheidet.
 */
/**
 * Verraet diese Beschriftung eine Beziehungsart?
 *
 * „Herkunft: Nebelwald" ist mehr als ein Name in einem Feld – es ist eine
 * Kante `comes_from`. Diese Zuordnung stand als Innerei in `findMentions`
 * und wird jetzt auch von der Setzerei gebraucht: Wer dort ein Feld von Hand
 * mit einer vorhandenen Seite verbindet, soll dieselbe Kante bekommen wie
 * jemand, dessen Manuskript den Namen einfach hinschreibt.
 *
 * Sie hier herauszuziehen statt sie ein zweites Mal aufzuschreiben ist der
 * ganze Punkt: Zwei Tabellen fuer dieselbe Zuordnung waeren zwei Wahrheiten,
 * und beim naechsten neuen Wort waere eine davon veraltet. Der Fehler war
 * schon da – die Setzerei legte ein vages `related` neben das `comes_from`
 * des Parsers, zwei Kanten fuer dieselbe Aussage.
 */
const EXTRA_RELATION_WORDS: Record<string, string[]> = {
  lives_in: ['heimat', 'heimatvon', 'lebtin', 'wohnort', 'zuhause', 'habitat', 'vorkommen'],
  grows_in: ['wachstin', 'standort', 'biom'],
  made_of: ['bestehtaus', 'material', 'materialien', 'werkstoff'],
  comes_from: ['stammtvon', 'herkunft', 'quelle'],
  contains: ['enthalt', 'enthaelt', 'teilvon', 'gehortzu'],
  owns: ['besitzt', 'ausrustung', 'ausruestung', 'gegenstande'],
  wears: ['tragt', 'traegt', 'kleidung'],
  related: ['verwandt', 'verbunden', 'beziehung', 'beziehungen'],
};

export function beziehungFuer(label: string): string | undefined {
  for (const r of RELATION_TYPES) {
    if (matchesLabel(label, [r.label, r.inverse])) return r.id;
  }
  for (const [id, words] of Object.entries(EXTRA_RELATION_WORDS)) {
    if (matchesLabel(label, words)) return id;
  }
  return undefined;
}

export function findMentions(raw: string, pairs: Pair[], entries: Entry[]): Mention[] {
  const out: Mention[] = [];
  const seen = new Set<string>();
  const haystack = normWords(raw);

  for (const entry of entries) {
    if (entry.deletedAt) continue;
    const title = entry.title.trim();
    if (title.length < 3) continue;
    /* Mit Leerzeichen umschlossen suchen – nur ganze Wörter zählen. */
    const needle = normWords(title).slice(1, -1);
    if (!needle || !haystack.includes(` ${needle} `)) continue;
    if (seen.has(entry.id)) continue;

    /* Steht der Name als Wert hinter einer sprechenden Beschriftung? */
    let relationType: string | undefined;
    let via = 'im Text erwähnt';
    for (const pair of pairs) {
      if (!normWords(pair.value).includes(` ${needle} `)) continue;
      const guess = beziehungFuer(pair.label);
      if (guess) {
        relationType = guess;
        via = pair.label;
        break;
      }
      via = pair.label;
    }

    seen.add(entry.id);
    out.push({ entryId: entry.id, title, relationType, via });
  }

  return out.slice(0, 12);
}

/* ------------------------------------------------------------- Das Ergebnis */

export interface Transcript {
  title: string;
  subtitle: string;
  category: string;
  description: string;
  status?: EntryStatus;
  /** Weltzeit, roh wie geschrieben – siehe `lib/chronik/zeit.ts`. */
  beginn: string;
  ende: string;
  tags: string[];
  fields: Record<string, FieldValue>;
  blocks: Block[];
  suggestedType: EntryType;
  typeScore: number;
  /** Zugeordnete Felder – für die Vorschau */
  matched: { label: string; fieldLabel: string; value: string }[];
  /** Nicht zuordenbar – wird als Notiz auf der Seite abgelegt, nie verworfen */
  unmatched: Pair[];
  mentions: Mention[];
}

/**
 * Ein geschriebenes Blatt in einen Eintrag übersetzen.
 *
 * `type` überschreibt die Erkennung, sobald der Nutzer selbst wählt.
 */
export function transcribe(raw: string, entries: Entry[], type?: EntryType): Transcript {
  const text = raw.trim();
  const parsed = parseDocument(text);

  /* Reines JSON? Dann sind die Schlüssel bereits die Beschriftungen. */
  if (/^\s*\{[\s\S]*\}\s*$/.test(text)) {
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      for (const [key, value] of Object.entries(data)) {
        if (value === null || typeof value === 'object') {
          if (Array.isArray(value)) parsed.pairs.push({ label: key, value: value.join(', ') });
          continue;
        }
        parsed.pairs.push({ label: key, value: String(value) });
      }
    } catch {
      /* Kein gültiges JSON – der Zeilenparser hat es ohnehin schon zerlegt. */
    }
  }

  const guessed = guessType(text, parsed);
  const finalType = type ?? guessed.type;
  const tpl = templateFor(finalType);

  const result: Transcript = {
    title: '',
    subtitle: '',
    category: '',
    description: '',
    beginn: '',
    ende: '',
    tags: [],
    fields: {},
    blocks: [],
    suggestedType: guessed.type,
    typeScore: guessed.score,
    matched: [],
    unmatched: [],
    mentions: [],
  };

  const usedPairs = new Set<Pair>();

  /* ---------------------------------------------------- Kernangaben zuerst */
  const takeCore = (key: keyof typeof CORE_LABELS): string | undefined => {
    const pair = parsed.pairs.find((p) => !usedPairs.has(p) && matchesLabel(p.label, CORE_LABELS[key]));
    if (!pair) return undefined;
    usedPairs.add(pair);
    return pair.value;
  };

  result.title = takeCore('title') ?? '';
  result.subtitle = takeCore('subtitle') ?? '';
  result.category = takeCore('category') ?? '';
  const descFromPair = takeCore('description');
  const tagsRaw = takeCore('tags');
  const statusRaw = takeCore('status');

  /*
   * Zeitangaben: erst ansehen, dann nehmen.
   *
   * „Tod: im Nebel verschollen" ist eine schoene Zeile und kein Datum. Wuerde
   * sie hier verbraucht, waere sie doppelt verloren – sie stuende weder auf
   * der Achse noch als Notiz auf der Seite. Deshalb wird der Eintrag nur dann
   * als benutzt vermerkt, wenn sich wirklich eine Zeit daraus lesen laesst;
   * sonst faellt er den gewoehnlichen Regeln zu.
   */
  const nimmZeit = (key: 'beginn' | 'ende'): string => {
    const pair = parsed.pairs.find(
      (p) => !usedPairs.has(p) && matchesLabel(p.label, CORE_LABELS[key]),
    );
    if (!pair || !leseZeit(pair.value)) return '';
    usedPairs.add(pair);
    return pair.value.trim();
  };
  result.beginn = nimmZeit('beginn');
  result.ende = nimmZeit('ende');
  takeCore('type');

  if (tagsRaw) result.tags = splitList(tagsRaw);
  if (statusRaw) {
    const hit = ENTRY_STATUSES.find((s) => matchesLabel(statusRaw, [s]));
    if (hit) result.status = hit;
  }

  /* Kein „Titel:“ angegeben? Dann ist die erste Überschrift der Titel. */
  if (!result.title && parsed.headings.length > 0) result.title = parsed.headings[0];
  if (!result.title && parsed.paragraphs.length > 0) {
    const first = parsed.paragraphs[0];
    if (first.length <= 80) {
      result.title = first;
      parsed.paragraphs.shift();
    } else {
      result.title = first.split(/[.!?–—]/)[0].slice(0, 70).trim();
    }
  }

  /* Kategorie aus der Vorlage erraten, wenn sie im Text vorkommt. */
  if (!result.category) {
    const hit = tpl.categories.find((c) => norm(text).includes(norm(c)));
    if (hit) result.category = hit;
  }

  /* ------------------------------------------------- Felder aus der Vorlage */
  for (const pair of parsed.pairs) {
    if (usedPairs.has(pair)) continue;
    const field = findField(pair.label, tpl);
    if (!field) continue;
    const value = coerce(field, pair.value);
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    result.fields[field.key] = value;
    result.matched.push({ label: pair.label, fieldLabel: field.label, value: pair.value });
    usedPairs.add(pair);
  }

  /* Abschnitte („## Verhalten“ + Absatz) auf Textfelder abbilden. */
  const usedSections = new Set<Pair>();
  let sectionDescription = '';
  for (const section of parsed.sections) {
    /* „## Beschreibung“ gehört zum Eintrag selbst, nicht in die Vorlage. */
    if (!sectionDescription && matchesLabel(section.label, CORE_LABELS.description)) {
      sectionDescription = section.value;
      usedSections.add(section);
      continue;
    }
    const field = findField(section.label, tpl);
    if (!field || result.fields[field.key]) continue;
    const value = coerce(field, section.value);
    if (value === undefined || value === '') continue;
    result.fields[field.key] = value;
    result.matched.push({ label: section.label, fieldLabel: field.label, value: section.value });
    usedSections.add(section);
  }

  /* -------------------------------------------------------------- Farben */
  const palette = extractPalette(text);
  if (palette.length && tpl.fields.some((f) => f.kind === 'palette') && !result.fields.palette) {
    result.fields.palette = palette;
    result.matched.push({
      label: 'Farbwerte',
      fieldLabel: 'Farbpalette',
      value: palette.map((p) => p.split('|')[0]).join(' '),
    });
  }

  /* --------------------------------------------------------- Beschreibung */
  const leftoverParagraphs = parsed.paragraphs.filter((p) => p !== result.title);
  result.description = descFromPair || sectionDescription || leftoverParagraphs[0] || '';

  /*
   * Untertitel: die erste kurze Zeile, die noch keine Aufgabe hat. Gliederungs-
   * überschriften wie „Beschreibung“ sind ausdrücklich keine Untertitel.
   */
  if (!result.subtitle && parsed.headings.length > 1) {
    const second = parsed.headings[1];
    const isStructural =
      Object.values(CORE_LABELS).some((words) => matchesLabel(second, words)) ||
      !!findField(second, tpl);
    if (second.length <= 60 && !isStructural) result.subtitle = second;
  }

  /* ------------------------------------------- Schlagworte aus Aufzählungen */
  if (result.tags.length === 0 && parsed.bullets.length > 0) {
    const short = parsed.bullets.filter((b) => b.length <= 28 && !b.includes(':'));
    if (short.length >= 2) result.tags = short.slice(0, 8);
  }

  /* ------------------------------------- Was übrig bleibt, kommt auf die Seite */
  const rest = leftoverParagraphs.filter((p) => p !== result.description);
  for (const paragraph of rest) {
    result.blocks.push({ id: newId('blk'), type: 'text', data: { text: paragraph } });
  }
  for (const section of parsed.sections) {
    if (usedSections.has(section)) continue;
    result.blocks.push({ id: newId('blk'), type: 'heading', data: { level: 2, text: section.label } });
    result.blocks.push({ id: newId('blk'), type: 'text', data: { text: section.value } });
  }

  result.mentions = findMentions(text, parsed.pairs, entries);

  /*
   * Nicht zugeordnete Beschriftungen sichtbar machen – aber nicht doppelt:
   * „Heimat: Nebelwald“ ist schon zu einer Beziehung geworden und muss nicht
   * zusätzlich als Notiz auf der Seite kleben.
   */
  const becameRelation = new Set(
    result.mentions.filter((m) => m.relationType).map((m) => norm(m.via)),
  );
  for (const pair of parsed.pairs) {
    if (usedPairs.has(pair)) continue;
    if (becameRelation.has(norm(pair.label))) continue;
    result.unmatched.push(pair);
  }
  if (result.unmatched.length > 0) {
    result.blocks.push({
      id: newId('blk'),
      type: 'note',
      data: {
        tone: 'info',
        text: result.unmatched.map((p) => `${p.label}: ${p.value}`).join('\n'),
      },
    });
  }

  return result;
}

/* ------------------------------------------------------- Vorlage für ChatGPT */

/**
 * Ein Prompt, der genau das Format erzeugt, das die Setzerei am sichersten
 * liest. Wer ihn benutzt, bekommt eine vollständig gefüllte Seite.
 */
/** Eine Angabe, die eine Seite dieses Typs kennt: der Name und, wenn noetig, ein Hinweis. */
export interface Angabe {
  /**
   * Der Schluessel im Eintrag. Die fuenf Angaben, die jede Seite hat, stehen
   * nicht in `fields` und bekommen darum ein vorangestelltes Rautezeichen –
   * so kann kein eigenes Feld sie versehentlich treffen.
   */
  key: string;
  label: string;
  hint: string;
}

/**
 * Die Angaben einer Seite – die eine Quelle fuer alle drei Verwendungen:
 * den Prompt fuer ChatGPT, das Geruest zum Einsetzen ins Manuskript und die
 * Liste, die beim Schreiben sichtbar bleibt.
 *
 * Vorher stand diese Ableitung nur im Prompt. Die Folge: Wer die Vorlage
 * nicht kopiert hatte, musste sich jedes Feld merken – und der Platzhalter
 * im Eingabefeld verschwand ausgerechnet beim ersten Tastendruck.
 */
export function angabenFor(type: EntryType): Angabe[] {
  const tpl = templateFor(type);

  const eigene: Angabe[] = tpl.fields
    .filter((f) => f.kind !== 'images' && f.kind !== 'entries')
    .map((f) => ({
      key: f.key,
      label: f.label,
      hint:
        f.kind === 'select' && f.options?.length
          ? `eines von: ${f.options.filter(Boolean).join(', ')}`
          : f.kind === 'boolean'
            ? 'ja oder nein'
            : f.kind === 'tags'
              ? 'durch Komma getrennt'
              : f.kind === 'palette'
                ? 'Name #RRGGBB, durch Komma getrennt'
                : '',
    }));

  return [
    { key: '#title', label: 'Titel', hint: '' },
    { key: '#subtitle', label: 'Untertitel', hint: '' },
    { key: '#category', label: 'Kategorie', hint: `eines von: ${tpl.categories.join(', ')}` },
    { key: '#description', label: 'Beschreibung', hint: 'zwei bis vier Sätze' },
    { key: '#tags', label: 'Schlagworte', hint: 'durch Komma getrennt' },
    /* Weltzeit gehört in die Vorlage – sonst datiert niemand beim Schreiben,
       sondern erst hinterher, Seite für Seite. */
    { key: '#beginn', label: 'Beginn', hint: 'Jahr in der Welt, z. B. 1032' },
    { key: '#ende', label: 'Ende', hint: 'leer lassen, wenn es fortbesteht' },
    ...eigene,
  ];
}

/** Eine Zeile, wie sie im Prompt steht: mit Hinweis in Klammern. */
function promptZeile(a: Angabe): string {
  return a.hint ? `${a.label}: (${a.hint})` : `${a.label}: `;
}

/**
 * Das nackte Geruest zum Einsetzen ins Manuskript: nur Namen und
 * Doppelpunkt, ohne Hinweise. Die Hinweise muessen hier fehlen – sonst
 * laese die Setzerei die Klammer als Wert und schriebe „(zwei bis vier
 * Saetze)" als Beschreibung ins Buch.
 */
export function blankTemplateFor(type: EntryType): string {
  return angabenFor(type)
    .map((a) => `${a.label}: `)
    .join('\n');
}

export function promptTemplateFor(type: EntryType, worldName: string): string {
  const tpl = templateFor(type);

  return [
    `Du hilfst mir beim Weltenbau für "${worldName || 'Dragoncore'}".`,
    ``,
    `Beschreibe: ${tpl.newTitle} — [hier deine Idee einsetzen]`,
    ``,
    `Antworte ausschließlich in genau diesem Format, eine Angabe pro Zeile,`,
    `ohne Einleitung und ohne Aufzählungszeichen:`,
    ``,
    ...angabenFor(type).map(promptZeile),
  ].join('\n');
}
