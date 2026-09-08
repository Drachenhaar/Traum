/**
 * Der Stapel – viele Zeichnungen auf einmal hereinlegen.
 *
 * ---
 *
 * **Warum das keine Bequemlichkeit ist, sondern die Bedingung.**
 *
 * Ein Teil von Hand anzulegen kostet vier Handgriffe: Gruppe, Schicht,
 * Ansicht, Datei. Bei zwanzig Zeichnungen ist das erträglich. Bei
 * zweitausend sind es achttausend Handgriffe, und dann wird der Vorrat nie
 * gefüllt – nicht weil die Zeichnungen fehlten, sondern weil das Einräumen
 * länger dauert als das Zeichnen.
 *
 * Also sagt der **Dateiname**, wohin die Datei gehört. Das ist keine neue
 * Erfindung: Wer Bilder erzeugt, benennt sie ohnehin, und ein Name ist die
 * einzige Angabe, die eine Datei von sich aus mitbringen kann.
 *
 *     haar_locken_vorn.png          → Schicht „Haar vorn", Teil „Locken", von vorn
 *     haar_locken_links.png         → dasselbe Teil, von links
 *     haar_locken_vorn_linie.png    → die Tusche dazu
 *     kopf_schmal_vorn.png          → Schicht „Kopf", Teil „Schmal"
 *
 * ---
 *
 * **Die eine Regel, die alles trägt: gleicher Name, gleiches Teil.**
 *
 * Drei Dateien mit demselben Schicht- und Teilnamen werden **ein** Teil mit
 * drei Ansichten – nicht drei Teile. Das ist genau die Zusage aus
 * `baukasten.ts`: Ein Teil ist eine Sache, die es aus mehreren Richtungen
 * gibt. Würde der Stapel daraus drei Teile machen, müsste man beim Drehen
 * jede Schicht neu wählen, und dieselbe Figur wäre in drei Ansichten drei
 * Figuren.
 *
 * ---
 *
 * **Was hier nichts zu suchen hat.**
 *
 * Diese Datei liest Namen und plant. Sie schreibt nichts, sie kennt keine
 * Datenbank und kein Bild. Das ist der Grund, warum sie prüfbar ist: Man gibt
 * ihr hundert Namen und sieht nach, was sie daraus machen würde – ohne eine
 * einzige Datei anzufassen.
 */

import { ANSICHTEN, SCHICHTEN, type Ansicht, type SchichtName } from './baukasten';

/* =======================================================================
 * 1 · DIE WORTE
 * ==================================================================== */

/**
 * Wie eine Schicht im Dateinamen heissen darf.
 *
 * Mehr als ein Wort je Schicht, und das ist Absicht: Niemand tippt
 * zuverlässig `ausruestung`, und wer `waffe` schreibt, meint dasselbe. Die
 * Nachsicht kostet hier eine Zeile und spart drüben eine Enttäuschung.
 *
 * Der Schichtname selbst steht immer dabei – er wird unten dazugelegt, damit
 * er nicht vergessen werden kann.
 */
const SCHICHTWORTE: Record<SchichtName, string[]> = {
  grund: ['hintergrund', 'grund', 'bg'],
  hinterhaar: ['hinterhaar', 'haarhinten', 'haarrueckseite'],
  koerper: ['koerper', 'body', 'figur', 'gestalt'],
  gewand: ['gewand', 'kleidung', 'kleid', 'oberteil', 'wams'],
  schmuck: ['schmuck', 'halsschmuck', 'kette', 'amulett'],
  kopf: ['kopf', 'head', 'gesicht', 'kopfform'],
  ohren: ['ohren', 'ohr'],
  augen: ['augen', 'auge'],
  brauen: ['brauen', 'braue', 'augenbrauen'],
  nase: ['nase'],
  mund: ['mund', 'lippen', 'lippe'],
  bart: ['bart'],
  male: ['male', 'mal', 'narbe', 'narben', 'tattoo', 'zeichen'],
  haar: ['haar', 'haare', 'frisur'],
  kopfschmuck: ['kopfschmuck', 'helm', 'krone', 'kranz', 'band', 'kapuze'],
  ausruestung: ['ausruestung', 'waffe', 'gurt', 'tasche', 'ruestung'],
  beiwerk: ['beiwerk', 'vordergrund'],
};

const ANSICHTSWORTE: Record<Ansicht, string[]> = {
  vorn: ['vorn', 'vorne', 'front', 'v'],
  links: ['links', 'left', 'l'],
  rechts: ['rechts', 'right', 'r'],
};

/** Fläche oder Linie – die zwei Bilder eines tönbaren Teils. */
export type Bildart = 'flaeche' | 'linie';

const ARTWORTE: Record<Bildart, string[]> = {
  flaeche: ['flaeche', 'flache', 'fill', 'farbe'],
  linie: ['linie', 'line', 'tusche', 'kontur', 'lineart'],
};

/**
 * Ein Wort auf seine vergleichbare Form bringen.
 *
 * Umlaute werden umschrieben und nicht weggeworfen: `körper` und `koerper`
 * sind dasselbe Wort, `krper` ist keines. Wer die Umlaute nur entfernte,
 * machte aus `Rüstung` ein `Rstung` und fände es nie wieder.
 */
export function schlicht(wort: string): string {
  return wort
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

/** Wortliste → Schicht. Einmal gebaut, nicht bei jedem Namen neu. */
const WORT_ZU_SCHICHT = new Map<string, SchichtName>();
for (const schicht of SCHICHTEN) {
  /* Der Schichtname selbst zuerst – er kann so nicht vergessen werden. */
  WORT_ZU_SCHICHT.set(schlicht(schicht.name), schicht.name);
  for (const wort of SCHICHTWORTE[schicht.name] ?? []) {
    WORT_ZU_SCHICHT.set(schlicht(wort), schicht.name);
  }
}

const WORT_ZU_ANSICHT = new Map<string, Ansicht>();
for (const a of ANSICHTEN) {
  WORT_ZU_ANSICHT.set(schlicht(a.name), a.name);
  for (const wort of ANSICHTSWORTE[a.name]) WORT_ZU_ANSICHT.set(schlicht(wort), a.name);
}

const WORT_ZU_ART = new Map<string, Bildart>();
for (const art of ['flaeche', 'linie'] as Bildart[]) {
  for (const wort of ARTWORTE[art]) WORT_ZU_ART.set(schlicht(wort), art);
}

/** Alle Worte, die eine Schicht benennen – für die Hilfe auf der Seite. */
export const SCHICHTWORTLISTE = (schicht: SchichtName): string[] => [
  schicht,
  ...(SCHICHTWORTE[schicht] ?? []).filter((w) => schlicht(w) !== schlicht(schicht)),
];

/* =======================================================================
 * 2 · EINEN NAMEN DEUTEN
 * ==================================================================== */

export interface Deutung {
  schicht: SchichtName;
  /** Der Name des Teils, wie er im Buch stehen soll. */
  name: string;
  ansicht: Ansicht;
  art: Bildart;
}

/**
 * Was dieser Dateiname sagt – oder nichts.
 *
 * Die Regel ist bewusst eng: **Das erste Wort nennt die Schicht.** Sie liesse
 * sich auch irgendwo im Namen suchen, und das wäre schlechter, nicht besser:
 * „Kopf" ist auch ein Teilname, „Band" ebenso, und eine Regel, die mal so und
 * mal so greift, ist bei zweitausend Dateien nicht mehr zu überblicken. Eine
 * Regel, die man in einem Satz sagen kann, kann man auch anwenden.
 *
 * Ansicht und Art werden **hinten** gesucht und dürfen fehlen. Ohne Ansicht
 * gilt `vorn`, ohne Art gilt `flaeche` – die häufigsten Fälle brauchen also
 * gar keine Angabe.
 */
export function deuteNamen(dateiname: string): Deutung | null {
  /* Pfadanteile und Endung weg – manche Browser liefern ganze Pfade. */
  const stamm = dateiname
    .replace(/\\/g, '/')
    .split('/')
    .pop()!
    .replace(/\.[^.]+$/, '');

  const worte = stamm.split(/[\s_.-]+/).filter(Boolean);
  if (worte.length === 0) return null;

  const schicht = WORT_ZU_SCHICHT.get(schlicht(worte[0]));
  if (!schicht) return null;

  const rest = worte.slice(1);

  /*
   * Von hinten abtragen: erst die Art, dann die Ansicht.
   *
   * In dieser Reihenfolge, weil `..._vorn_linie` die natürliche Schreibweise
   * ist – die Art steht ganz hinten. Andersherum bliebe „linie" im Teilnamen
   * stehen, und aus „Locken" würde „Locken Linie".
   */
  let art: Bildart = 'flaeche';
  if (rest.length > 0) {
    const gedeutet = WORT_ZU_ART.get(schlicht(rest[rest.length - 1]));
    if (gedeutet) {
      art = gedeutet;
      rest.pop();
    }
  }

  let ansicht: Ansicht = 'vorn';
  if (rest.length > 0) {
    const gedeutet = WORT_ZU_ANSICHT.get(schlicht(rest[rest.length - 1]));
    if (gedeutet) {
      ansicht = gedeutet;
      rest.pop();
    }
  }

  /*
   * Was übrig ist, ist der Name. Bleibt nichts übrig, heisst das Teil wie
   * seine Schicht – `kopf_vorn.png` ergibt ein Teil „Kopf" und keinen
   * namenlosen Eintrag.
   */
  const name = rest.length > 0 ? grossAnfangen(rest.join(' ')) : grossAnfangen(worte[0]);

  return { schicht, name, ansicht, art };
}

function grossAnfangen(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* =======================================================================
 * 3 · EINEN STAPEL PLANEN
 * ==================================================================== */

/** Was aus einer Gruppe gleichnamiger Dateien werden soll. */
export interface Teilplan {
  schicht: SchichtName;
  name: string;
  /** Je Ansicht die Dateinamen für Fläche und Linie. */
  ansichten: Partial<Record<Ansicht, { flaeche?: string; linie?: string }>>;
}

export interface Stapelplan {
  plaene: Teilplan[];
  /** Namen, aus denen sich nichts lesen liess – sie werden nicht angefasst. */
  unklar: string[];
  /**
   * Dateien, die dieselbe Stelle belegen wollten.
   *
   * Zwei Bilder für „Haar / Locken / vorn / Fläche" können nicht beide gelten.
   * Das zweite wird nicht heimlich genommen und nicht heimlich verworfen –
   * es wird genannt, und der Verfasser entscheidet.
   */
  doppelt: string[];
}

/**
 * Aus vielen Dateinamen einen Plan machen.
 *
 * Gleiche Schicht und gleicher Name ergeben **ein** Teil. Die Reihenfolge der
 * Pläne folgt der Reihenfolge, in der die Dateien kamen – wer seine Dateien
 * sortiert hat, findet sie sortiert wieder.
 */
export function planeStapel(dateinamen: readonly string[]): Stapelplan {
  const nachSchluessel = new Map<string, Teilplan>();
  const plaene: Teilplan[] = [];
  const unklar: string[] = [];
  const doppelt: string[] = [];

  for (const dateiname of dateinamen) {
    const deutung = deuteNamen(dateiname);
    if (!deutung) {
      unklar.push(dateiname);
      continue;
    }

    const schluessel = `${deutung.schicht} ${schlicht(deutung.name)}`;
    let plan = nachSchluessel.get(schluessel);
    if (!plan) {
      plan = { schicht: deutung.schicht, name: deutung.name, ansichten: {} };
      nachSchluessel.set(schluessel, plan);
      plaene.push(plan);
    }

    const fach = (plan.ansichten[deutung.ansicht] ??= {});
    if (fach[deutung.art]) {
      doppelt.push(dateiname);
      continue;
    }
    fach[deutung.art] = dateiname;
  }

  return { plaene, unklar, doppelt };
}

/**
 * Was ein Plan überhaupt hergibt.
 *
 * Ein Teil ohne eine einzige Fläche kann nichts zeigen: Eine Linie allein ist
 * eine Zeichnung, die sich nicht einfärben lässt und keine Fläche hat, über
 * der sie liegen könnte. Solche Pläne werden gemeldet, nicht angelegt.
 */
export function planIstBrauchbar(plan: Teilplan): boolean {
  return Object.values(plan.ansichten).some((a) => !!a.flaeche);
}

/** Kurze Auskunft über einen Stapel – für die Vorschau vor dem Einlesen. */
export interface Stapelauskunft {
  dateien: number;
  teile: number;
  ohneFlaeche: number;
  unklar: number;
  doppelt: number;
  /** Wie viele Teile je Schicht entstehen – in Schichtreihenfolge. */
  jeSchicht: { schicht: SchichtName; anzahl: number }[];
}

export function auskunft(plan: Stapelplan, dateien: number): Stapelauskunft {
  const brauchbar = plan.plaene.filter(planIstBrauchbar);
  const zaehler = new Map<SchichtName, number>();
  for (const p of brauchbar) zaehler.set(p.schicht, (zaehler.get(p.schicht) ?? 0) + 1);

  return {
    dateien,
    teile: brauchbar.length,
    ohneFlaeche: plan.plaene.length - brauchbar.length,
    unklar: plan.unklar.length,
    doppelt: plan.doppelt.length,
    jeSchicht: SCHICHTEN.filter((s) => zaehler.has(s.name)).map((s) => ({
      schicht: s.name,
      anzahl: zaehler.get(s.name)!,
    })),
  };
}
