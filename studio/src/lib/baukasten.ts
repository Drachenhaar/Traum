/**
 * Der Charakterbaukasten – die Ordnung, nicht die Bilder.
 *
 * Ein Bildnis entsteht hier aus **Schichten**: hinten der Grund, davor der
 * Körper, dann Gewand, Kopf, Augen, Male, Haar. In jede Schicht kommt
 * höchstens ein Teil, und ein Teil ist immer nur eine *Kennung* – nie ein
 * Bild. Das ist dieselbe Regel wie in `bildnis.ts`, und sie ist der Grund,
 * warum später Zeichnungen getauscht werden können, ohne dass hier eine
 * Zeile angefasst wird.
 *
 * ---
 *
 * **Der Baukasten muss ohne Assets stehen und mit jedem Asset besser werden.**
 *
 * Das ist die Anforderung, an der so etwas sonst scheitert: Ein Baukasten,
 * der erst mit fünfhundert Zeichnungen etwas taugt, taugt am ersten Tag
 * nichts – und dann zeichnet niemand die fünfhundert. Deshalb:
 *
 * - Eine Schicht ohne Teil zeichnet **nichts**. Kein Platzhalter, kein
 *   Fehler, keine Lücke im Stapel.
 * - Ein Teil, das es nicht mehr gibt, wird übersprungen. Der Rest steht
 *   weiter. Ein gelöschtes Bild darf kein Bildnis zerstören.
 * - Neue Teile ändern **nie** ein bestehendes Bildnis. Wer heute eine Figur
 *   baut und morgen zwanzig Zeichnungen hinzufügt, findet seine Figur
 *   unverändert vor.
 *
 * ---
 *
 * **Woher die Vielfalt kommt, wenn es wenige Teile gibt.**
 *
 * Nicht aus der Zahl der Zeichnungen allein. Jede Lage trägt ausserdem eine
 * Farbe, eine Spiegelung, einen Versatz und eine Grösse. Aus zehn Haaren
 * werden damit sehr viel mehr als zehn Frisuren, und der Verfasser zeichnet
 * zehnmal statt hundertmal.
 *
 * Eingefärbt wird nur, was dafür gezeichnet ist. Eine bunte Zeichnung
 * einzufärben ergibt Matsch – deshalb sagt das Teil selbst, ob es tönbar
 * ist, und eine Farbe an einem nicht tönbaren Teil wird nicht etwa
 * ignoriert, sondern gar nicht erst gesetzt.
 */

import { zahl } from './karte/zufall';

/* =======================================================================
 * 1 · DIE SCHICHTEN
 * ==================================================================== */

export type SchichtName =
  | 'grund'
  | 'hinterhaar'
  | 'koerper'
  | 'gewand'
  | 'kopf'
  | 'augen'
  | 'mund'
  | 'male'
  | 'haar'
  | 'kopfschmuck'
  | 'beiwerk';

export interface Schicht {
  name: SchichtName;
  label: string;
  hinweis: string;
}

/**
 * Die Schichten in **Zeichenreihenfolge**, von hinten nach vorn.
 *
 * Die Reihenfolge ist eine Eigenschaft der Schicht, nicht des Teils. Das
 * klingt selbstverständlich und ist der ganze Punkt: Wer ein Teil hinzufügt,
 * kann damit den Stapel nicht durcheinanderbringen. Ein Haar liegt vor dem
 * Kopf, weil es ein Haar ist – nicht, weil es zufällig später angelegt wurde.
 *
 * `hinterhaar` und `haar` sind zwei Schichten und nicht eine. Ohne die
 * hintere gäbe es keine Frisur, die hinter den Schultern liegt, und alle
 * Figuren trügen die Haare vorn.
 */
export const SCHICHTEN: Schicht[] = [
  { name: 'grund', label: 'Grund', hinweis: 'Was hinter allem liegt – Dunst, Wappen, Landschaft.' },
  { name: 'hinterhaar', label: 'Haar hinten', hinweis: 'Was hinter den Schultern fällt.' },
  { name: 'koerper', label: 'Körper', hinweis: 'Schultern und Hals.' },
  { name: 'gewand', label: 'Gewand', hinweis: 'Was getragen wird.' },
  { name: 'kopf', label: 'Kopf', hinweis: 'Die Form des Gesichts.' },
  { name: 'augen', label: 'Augen', hinweis: 'Der Blick.' },
  { name: 'mund', label: 'Mund', hinweis: 'Der Zug um den Mund.' },
  { name: 'male', label: 'Male', hinweis: 'Narben, Zeichen, Tätowierungen – was eine Geschichte hat.' },
  { name: 'haar', label: 'Haar vorn', hinweis: 'Was ins Gesicht fällt.' },
  { name: 'kopfschmuck', label: 'Kopfschmuck', hinweis: 'Band, Kranz, Kapuze, Helm.' },
  { name: 'beiwerk', label: 'Beiwerk', hinweis: 'Was vor allem anderen liegt.' },
];

const SCHICHT_RANG = new Map(SCHICHTEN.map((s, i) => [s.name, i]));

export const schichtVon = (name: SchichtName): Schicht | undefined =>
  SCHICHTEN.find((s) => s.name === name);

/* =======================================================================
 * 2 · DIE TEILE
 * ==================================================================== */

/** Die eingebauten Grundformen – Silhouetten, keine Zeichnungen. */
export type Grundform = 'kopf-rund' | 'kopf-schmal' | 'kopf-kantig' | 'schultern' | 'scheibe';

/**
 * Woher ein Teil sein Bild nimmt.
 *
 * Zwei Arten, und das bleibt so: eine gezeichnete Datei aus der Ablage, oder
 * eine der eingebauten Grundformen. Die Grundformen sind ausdrücklich
 * *keine* Portraits – sie sind Silhouetten, die sagen, wo eine Zeichnung
 * hingehört. `zeichen/embleme.tsx` hält fest, was vier Anläufe an einem
 * gezeichneten Drachen gekostet haben; ein gezeichnetes Gesicht als
 * eingebauter Vektor wäre derselbe Fehler noch einmal, nur grösser.
 */
export type Quelle =
  | { art: 'bild'; bildId: string }
  | { art: 'grundform'; form: Grundform };

export interface Teil {
  id: string;
  schicht: SchichtName;
  name: string;
  quelle: Quelle;
  /**
   * Ob das Teil eingefärbt werden darf.
   *
   * Nur für Zeichnungen, die in einem Ton gehalten sind. Eine bunte
   * Zeichnung einzufärben ergibt Matsch.
   */
  toenbar?: boolean;
  /**
   * Was dieses Teil in dieser Welt bedeutet.
   *
   * Der Unterschied zwischen einem Baukasten und einem Ankleidespiel. Eine
   * Narbe ist nicht „Narbe 3", sondern „von der Seilerbahn, im dritten
   * Winter". Meistens leer, und das ist in Ordnung – aber wo es steht, kann
   * die Figurenseite es lesen.
   */
  bedeutung?: string;
}

/* =======================================================================
 * 3 · DER BILDBAU
 * ==================================================================== */

export interface Lage {
  teilId?: string;
  /** Nur gesetzt, wenn das Teil tönbar ist. */
  farbe?: string;
  spiegel?: boolean;
  /** Versatz in Prozent der Bildbreite bzw. -höhe. */
  versatzX?: number;
  versatzY?: number;
  /** 1 = wie gezeichnet. */
  groesse?: number;
}

export interface Bildbau {
  lagen: Partial<Record<SchichtName, Lage>>;
}

export const LEERER_BAU: Bildbau = { lagen: {} };

export interface Gezeichnet {
  schicht: Schicht;
  teil: Teil;
  lage: Lage;
}

/**
 * Was gezeichnet wird, in der Reihenfolge, in der es gezeichnet wird.
 *
 * Die einzige Stelle, die den Stapel bestimmt – und sie liest die
 * Reihenfolge aus `SCHICHTEN`, nicht aus dem Bildbau. Ein Bildbau ist
 * deshalb eine Menge von Entscheidungen und keine Liste: In welcher
 * Reihenfolge seine Lagen im Speicher stehen, ist ohne Bedeutung.
 *
 * Übersprungen wird jede Lage ohne Teil und jede, deren Teil es nicht mehr
 * gibt. Ein gelöschtes Bild darf ein Bildnis nicht zerstören, sondern nur
 * um eine Schicht ärmer machen.
 */
export function zeichenfolge(bau: Bildbau, vorrat: readonly Teil[]): Gezeichnet[] {
  const nachId = new Map(vorrat.map((t) => [t.id, t]));
  const folge: Gezeichnet[] = [];

  for (const schicht of SCHICHTEN) {
    const lage = bau.lagen[schicht.name];
    if (!lage?.teilId) continue;
    const teil = nachId.get(lage.teilId);
    if (!teil) continue;
    /*
     * Ein Teil gehört in seine Schicht, nicht in die, in der es steht.
     * Wer ein Haar in die Augenschicht schreibt, bekommt es nicht gezeichnet
     * – sonst hinge die Reihenfolge doch wieder am Bildbau.
     */
    if (teil.schicht !== schicht.name) continue;
    folge.push({ schicht, teil, lage });
  }

  return folge;
}

/** Wie eine Lage gezeichnet wird, mit allen Vorgaben eingesetzt. */
export interface Anweisung {
  spiegel: boolean;
  versatzX: number;
  versatzY: number;
  groesse: number;
  /** Nur gesetzt, wenn das Teil tönbar ist – sonst nie. */
  farbe?: string;
}

/**
 * Die Vorgaben einer Lage einsetzen.
 *
 * Die Farbe wird hier **weggelassen**, wenn das Teil nicht tönbar ist. Nicht
 * ignoriert an der Zeichenstelle, sondern hier entfernt: Sonst müsste jede
 * Stelle, die zeichnet, dieselbe Regel noch einmal kennen, und die erste,
 * die sie vergisst, färbt eine bunte Zeichnung ein.
 */
export function anweisung(teil: Teil, lage: Lage): Anweisung {
  return {
    spiegel: lage.spiegel === true,
    versatzX: lage.versatzX ?? 0,
    versatzY: lage.versatzY ?? 0,
    groesse: lage.groesse ?? 1,
    ...(teil.toenbar && lage.farbe ? { farbe: lage.farbe } : {}),
  };
}

/* =======================================================================
 * 4 · WÜRFELN
 * ==================================================================== */

export interface Wurfmass {
  /** Schichten, die immer besetzt werden, wenn es dafür Teile gibt. */
  immer: SchichtName[];
  /** Schichten, die nur manchmal besetzt werden. */
  manchmal: SchichtName[];
  /** Wie wahrscheinlich eine „manchmal“-Schicht besetzt wird. */
  neigung: number;
}

export const WURF: Wurfmass = {
  immer: ['koerper', 'kopf', 'augen', 'haar'],
  manchmal: ['grund', 'hinterhaar', 'gewand', 'mund', 'male', 'kopfschmuck', 'beiwerk'],
  neigung: 0.45,
};

/**
 * Ein Bildnis aus dem Vorrat würfeln.
 *
 * Gegen das leere Blatt: Ein Baukasten, der mit elf leeren Schichten
 * anfängt, ist eine Aufgabe. Einer, der mit einem fertigen Gesicht anfängt,
 * ist eine Einladung – man ändert lieber etwas, das schon dasteht.
 *
 * Aus derselben Saat kommt immer dasselbe. Das ist kein Zierrat: Der Wurf
 * hängt an der Kennung der Figur, und damit sieht dieselbe Figur bei jedem
 * Aufschlagen gleich aus, solange niemand etwas ändert.
 */
export function wuerfle(
  saat: number,
  vorrat: readonly Teil[],
  palette: readonly string[] = [],
  mass: Wurfmass = WURF,
): Bildbau {
  const lagen: Partial<Record<SchichtName, Lage>> = {};

  SCHICHTEN.forEach((schicht, i) => {
    const auswahl = vorrat.filter((t) => t.schicht === schicht.name);
    if (auswahl.length === 0) return;

    const pflicht = mass.immer.includes(schicht.name);
    if (!pflicht) {
      if (!mass.manchmal.includes(schicht.name)) return;
      if (zahl(saat, i, 0, 11) > mass.neigung) return;
    }

    const teil = auswahl[Math.floor(zahl(saat, i, 1, 11) * auswahl.length) % auswahl.length];
    const lage: Lage = { teilId: teil.id };

    if (teil.toenbar && palette.length > 0) {
      lage.farbe = palette[Math.floor(zahl(saat, i, 2, 11) * palette.length) % palette.length];
    }
    /* Ein Hauch Versatz, damit gewürfelte Gesichter nicht alle gleich sitzen. */
    lage.versatzX = Math.round((zahl(saat, i, 3, 11) * 2 - 1) * 20) / 10;
    lage.versatzY = Math.round((zahl(saat, i, 4, 11) * 2 - 1) * 20) / 10;

    lagen[schicht.name] = lage;
  });

  return { lagen };
}

/** Trägt dieser Bildbau überhaupt etwas? */
export function istLeer(bau: Bildbau, vorrat: readonly Teil[]): boolean {
  return zeichenfolge(bau, vorrat).length === 0;
}

/* =======================================================================
 * 5 · UMSCHREIBEN
 * ==================================================================== */

/**
 * Einen Bildbau auf neue Teilkennungen umschreiben.
 *
 * Gebraucht an genau zwei Stellen: beim Abschreiben eines Buches und beim
 * Einlesen einer Sicherung. Beide Male bekommen die Teile neue Kennungen, und
 * beide Male zeigt der Bildbau der Figuren noch auf die alten.
 *
 * `kopie.ts` beschreibt oben ausführlich, was passiert, wenn so ein Verweis
 * beim Abschreiben stehenbleibt: Zwei Bücher teilen sich still einen
 * Datensatz, und das Löschen des einen nimmt dem anderen etwas weg. Ein
 * Bildbau, der auf die Teile des Originals zeigt, ist derselbe Fehler – die
 * Abschrift verlöre ihre Gesichter, sobald das Original geht.
 *
 * Eine Lage, deren Teil **nicht** in der Karte steht, wird fallengelassen und
 * nicht etwa mit alter Kennung behalten. Die Karte enthält alle Teile des
 * Bestandes; was darin fehlt, zeigt also aus dem Buch heraus. Eine Figur mit
 * einer Schicht weniger ist richtig – eine Figur, die auf das Haar eines
 * fremden Buches zeigt, ist es nicht.
 */
export function bauUmschreiben(
  bau: Bildbau | undefined,
  karte: Map<string, string>,
): Bildbau | undefined {
  if (!bau) return bau;
  const lagen: Partial<Record<SchichtName, Lage>> = {};
  for (const [schicht, lage] of Object.entries(bau.lagen) as [SchichtName, Lage][]) {
    if (!lage) continue;
    /* Eine Lage ohne Teil trägt nur Farbe und Versatz – sie zeigt nirgendwohin. */
    if (!lage.teilId) {
      lagen[schicht] = lage;
      continue;
    }
    const neu = karte.get(lage.teilId);
    if (!neu) continue;
    lagen[schicht] = { ...lage, teilId: neu };
  }
  return { lagen };
}

/**
 * Was an diesem Bildnis eine Bedeutung trägt.
 *
 * Der Unterschied zwischen einem Baukasten und einem Ankleidespiel: Was
 * hier zurückkommt, kann auf der Figurenseite stehen – „eine Narbe von der
 * Seilerbahn" ist eine Angabe über die Figur und nicht über die Datei.
 */
export function bedeutungen(bau: Bildbau, vorrat: readonly Teil[]): string[] {
  return zeichenfolge(bau, vorrat)
    .map((g) => g.teil.bedeutung?.trim())
    .filter((b): b is string => Boolean(b));
}

/** Nach Schichten sortierter Vorrat – für die Auswahl. */
export function nachSchichten(vorrat: readonly Teil[]): Map<SchichtName, Teil[]> {
  const gefaecher = new Map<SchichtName, Teil[]>();
  for (const schicht of SCHICHTEN) gefaecher.set(schicht.name, []);
  for (const teil of vorrat) {
    const fach = gefaecher.get(teil.schicht);
    /* Ein Teil in einer Schicht, die es nicht gibt, wird nicht gezeigt. */
    if (fach) fach.push(teil);
  }
  for (const [, fach] of gefaecher) {
    fach.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }
  return gefaecher;
}

/** Wie viele Bildnisse dieser Vorrat überhaupt hergibt – ohne Farbe und Versatz. */
export function moeglichkeiten(vorrat: readonly Teil[]): number {
  let zahlDerWege = 1;
  const gefaecher = nachSchichten(vorrat);
  for (const schicht of SCHICHTEN) {
    const menge = gefaecher.get(schicht.name)?.length ?? 0;
    /* »Nichts« ist bei jeder Schicht eine Möglichkeit – ausser es gibt keine. */
    if (menge > 0) zahlDerWege *= menge + 1;
  }
  return zahlDerWege - 1;
}

export { SCHICHT_RANG };
