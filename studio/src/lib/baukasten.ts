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
 * 2 · DIE ANSICHTEN
 * ==================================================================== */

/**
 * Aus welcher Richtung die Figur gesehen wird.
 *
 * ---
 *
 * **Warum das kein Zierrat ist, sondern die zweite tragende Achse.**
 *
 * Ein Baukasten mit einer einzigen Blickrichtung erzeugt eine Galerie, in der
 * jede Figur den Betrachter frontal ansieht – gleiche Haltung, gleiche
 * Position, hundertmal. Die Teile mögen verschieden sein; das Blatt sieht
 * trotzdem aus wie ein Passbildbogen.
 *
 * Deshalb ist die Ansicht **keine Eigenschaft der Zeichnung, sondern eine
 * Eigenschaft des Bildnisses.** Man wählt sie einmal, und jede Schicht holt
 * daraufhin die Zeichnung, die dazu gehört: dasselbe Haar, von vorn oder von
 * der Seite. Ein Teil ist damit nicht mehr ein Bild, sondern eine *Sache*, die
 * es aus mehreren Richtungen gibt.
 *
 * ---
 *
 * **Links und rechts, und warum beide da sind.**
 *
 * Eine einzige Seitenansicht hätte gereicht – man spiegelt sie eben. Für
 * vieles stimmt das auch, und genau dafür gibt es unten die Spiegelregel.
 * Aber nicht für alles: Ein Scheitel liegt links oder rechts, eine Narbe sitzt
 * auf einer Wange, ein Schwert hängt an einer Hüfte. Wer nur eine Seite
 * zeichnen kann, bekommt die andere geschenkt; wer beide zeichnet, bekommt
 * sie auch beide.
 */
export type Ansicht = 'vorn' | 'links' | 'rechts';

export interface Ansichtsart {
  name: Ansicht;
  label: string;
  hinweis: string;
}

export const ANSICHTEN: Ansichtsart[] = [
  { name: 'vorn', label: 'Von vorn', hinweis: 'Die Figur sieht den Betrachter an.' },
  { name: 'links', label: 'Nach links', hinweis: 'Die Figur wendet sich nach links.' },
  { name: 'rechts', label: 'Nach rechts', hinweis: 'Die Figur wendet sich nach rechts.' },
];

export const ANSICHT_VORGABE: Ansicht = 'vorn';

/**
 * Die Gegenseite – die einzige Ansicht, die sich aus einer anderen ergibt.
 *
 * `vorn` hat keine: Ein Gesicht von vorn ist aus keiner Seitenansicht
 * herzuleiten, und umgekehrt genauso wenig. Wer das trotzdem täte, bekäme ein
 * frontales Gesicht auf einem seitlichen Körper – und das sieht nicht nach
 * „noch nicht gezeichnet" aus, sondern nach kaputt.
 */
const GEGENSEITE: Partial<Record<Ansicht, Ansicht>> = {
  links: 'rechts',
  rechts: 'links',
};

export const ansichtVon = (bau: Bildbau): Ansicht => bau.ansicht ?? ANSICHT_VORGABE;

export const istAnsicht = (wert: unknown): wert is Ansicht =>
  ANSICHTEN.some((a) => a.name === wert);

/* =======================================================================
 * 3 · DIE TEILE
 * ==================================================================== */

/** Die eingebauten Grundformen – Silhouetten, keine Zeichnungen. */
export type Grundform =
  | 'kopf-rund'
  | 'kopf-schmal'
  | 'kopf-kantig'
  | 'kopf-profil'
  | 'schultern'
  | 'schultern-seite'
  | 'scheibe';

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
  /**
   * Die Zeichnungen dieses Teils, je Ansicht eine.
   *
   * Hier stand einmal ein einzelnes `quelle`, und das war die Annahme, ein
   * Teil *sei* eine Zeichnung. Es ist keine: „Locken" ist eine Frisur, und
   * die gibt es von vorn und von der Seite. Zwei Teile daraus zu machen wäre
   * der bequeme Weg gewesen und hätte den Zweck zerstört – dann müsste man
   * beim Ansichtswechsel jede Schicht von Hand neu wählen, und eine Figur
   * wäre in zwei Ansichten zwei verschiedene Figuren.
   *
   * Keine Ansicht ist Pflicht. Ein Teil mit nur einer Zeichnung ist gültig
   * und erscheint eben nur dort, wo es etwas zu zeigen hat.
   */
  ansichten: Partial<Record<Ansicht, Quelle>>;
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

/** Eine Zeichnung, wie sie in einer bestimmten Ansicht gebraucht wird. */
export interface Zeichnung {
  quelle: Quelle;
  /**
   * Ob sie dafür umgedreht werden muss.
   *
   * Steht hier und wird nicht beim Zeichnen entschieden: Wer die Regel an der
   * Zeichenstelle wiederholt, hat sie an zwei Orten, und der zweite geht
   * irgendwann falsch.
   */
  gespiegelt: boolean;
}

/**
 * Welche Zeichnung dieses Teil in dieser Ansicht zeigt – oder keine.
 *
 * Die Leiter, in genau dieser Reihenfolge:
 *
 *   1. Die Zeichnung für **diese** Ansicht. Immer die erste Wahl.
 *   2. Die der **Gegenseite**, umgedreht. Wer Haar von links zeichnet,
 *      bekommt rechts geschenkt – bei einer Frisur mit Scheitel ist das
 *      falsch herum, und deshalb schlägt eine eigene Zeichnung sie sofort.
 *   3. Nichts. Die Schicht fällt aus.
 *
 * Was ausdrücklich **nicht** in der Leiter steht, ist `vorn` als Rückfall für
 * die Seiten. Ein frontales Gesicht auf einem seitlich stehenden Körper sieht
 * nicht unfertig aus, sondern kaputt – und eine fehlende Schicht ist immer
 * besser als eine falsche. Wer dieselbe Zeichnung überall haben will (einen
 * Dunst im Grund etwa), weist sie allen Ansichten zu; dafür gibt es auf der
 * Seite einen Handgriff, und danach steht es als Angabe da statt als Regel.
 */
export function zeichnungFuer(teil: Teil, ansicht: Ansicht): Zeichnung | null {
  const eigen = teil.ansichten[ansicht];
  if (eigen) return { quelle: eigen, gespiegelt: false };

  const gegen = GEGENSEITE[ansicht];
  const gespiegelt = gegen ? teil.ansichten[gegen] : undefined;
  if (gespiegelt) return { quelle: gespiegelt, gespiegelt: true };

  return null;
}

/** In welchen Ansichten dieses Teil überhaupt etwas zeigt – eigenes zuerst. */
export function ansichtenVon(teil: Teil): Ansicht[] {
  return ANSICHTEN.filter((a) => zeichnungFuer(teil, a.name) !== null).map((a) => a.name);
}

/** Ob dieses Teil eine **eigene** Zeichnung für diese Ansicht hat. */
export const hatEigeneZeichnung = (teil: Teil, ansicht: Ansicht): boolean =>
  teil.ansichten[ansicht] !== undefined;

/* =======================================================================
 * 4 · DER BILDBAU
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
  /**
   * Aus welcher Richtung diese Figur zu sehen ist.
   *
   * Eine Angabe für das ganze Bildnis und nicht je Schicht – ein Kopf von
   * vorn auf einem Körper von der Seite ist kein Bildnis, sondern ein Fehler.
   * Fehlt sie, gilt `vorn`; damit bleibt jeder Bildbau von vorher gültig.
   */
  ansicht?: Ansicht;
  lagen: Partial<Record<SchichtName, Lage>>;
}

export const LEERER_BAU: Bildbau = { lagen: {} };

export interface Gezeichnet {
  schicht: Schicht;
  teil: Teil;
  lage: Lage;
  /** Die Zeichnung für die Ansicht dieses Bildnisses. */
  zeichnung: Zeichnung;
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
  const ansicht = ansichtVon(bau);
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
    /*
     * Und ein Teil ohne Zeichnung für diese Ansicht fällt aus – nach
     * derselben Regel wie ein gelöschtes Teil: eine Schicht weniger, kein
     * zerstörtes Bildnis. Die Wahl bleibt im Bildbau stehen und kommt zurück,
     * sobald die Ansicht wieder passt oder die Zeichnung nachgereicht wird.
     */
    const zeichnung = zeichnungFuer(teil, ansicht);
    if (!zeichnung) continue;
    folge.push({ schicht, teil, lage, zeichnung });
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
export function anweisung(gezeichnet: Gezeichnet): Anweisung {
  const { teil, lage, zeichnung } = gezeichnet;
  return {
    /*
     * Zwei Gründe zu spiegeln, und sie heben einander auf.
     *
     * Der eine kommt vom Verfasser („dieses Haar bitte andersherum"), der
     * andere von der Ansicht (die Gegenseite wird umgedreht benutzt). Wer
     * beides will, will das Teil in seiner ursprünglichen Richtung – deshalb
     * `!==` und keine Oder-Verknüpfung. Mit `||` hätte ein Häkchen bei
     * „Gespiegelt" in der einen Ansicht gewirkt und in der anderen nicht,
     * und der Fehler wäre erst beim Umschalten aufgefallen.
     */
    spiegel: (lage.spiegel === true) !== zeichnung.gespiegelt,
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
  ansicht: Ansicht = ANSICHT_VORGABE,
): Bildbau {
  const lagen: Partial<Record<SchichtName, Lage>> = {};

  SCHICHTEN.forEach((schicht, i) => {
    /*
     * Gewürfelt wird nur, was in dieser Ansicht auch zu sehen ist.
     *
     * Sonst wirft man mit voller Hand und bekommt ein halbleeres Bildnis:
     * Die Teile stünden im Bildbau, hätten für diese Richtung aber keine
     * Zeichnung und fielen beim Zeichnen wieder heraus. Der Wurf sähe je
     * nach Ansicht verschieden gut aus, ohne dass jemand sagen könnte, warum.
     */
    const auswahl = vorrat.filter(
      (t) => t.schicht === schicht.name && zeichnungFuer(t, ansicht) !== null,
    );
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

  return { ansicht, lagen };
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
  /* Die Ansicht kommt mit. Sie ist keine Kennung, sondern eine Entscheidung. */
  return { ...(bau.ansicht ? { ansicht: bau.ansicht } : {}), lagen };
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

/**
 * Wie viele Bildnisse dieser Vorrat hergibt – ohne Farbe und Versatz.
 *
 * Ohne Ansicht gezählt wird über **alle** Ansichten summiert und nicht bloss
 * mal drei genommen: Ein Vorrat, der nur von vorn gezeichnet ist, gibt seitlich
 * nichts her, und ihn trotzdem zu verdreifachen wäre eine Zahl, die schmeichelt.
 * Sie soll zeigen, was die nächste Zeichnung einbringt – dann muss sie stimmen.
 */
export function moeglichkeiten(vorrat: readonly Teil[], ansicht?: Ansicht): number {
  if (!ansicht) {
    return ANSICHTEN.reduce((summe, a) => summe + moeglichkeiten(vorrat, a.name), 0);
  }

  let zahlDerWege = 1;
  for (const schicht of SCHICHTEN) {
    const menge = vorrat.filter(
      (t) => t.schicht === schicht.name && zeichnungFuer(t, ansicht) !== null,
    ).length;
    /* »Nichts« ist bei jeder Schicht eine Möglichkeit – ausser es gibt keine. */
    if (menge > 0) zahlDerWege *= menge + 1;
  }
  return zahlDerWege - 1;
}

/* =======================================================================
 * 7 · HEILUNG
 * ==================================================================== */

/**
 * Ein Teil, so wie der Rest des Programms es erwarten darf.
 *
 * Zwei Aufgaben in einer, und beide sind derselbe Vorgang:
 *
 *   1. **Die Wanderung.** Ein Teil aus der ersten Fassung trug ein einzelnes
 *      `quelle` und wusste nichts von Ansichten. Es wird zu einem Teil, dessen
 *      Zeichnung von vorn gilt – das ist die einzige Auslegung, die nichts
 *      erfindet.
 *   2. **Die Heilung.** Was aus einer Sicherung kommt, kann alles sein. Eine
 *      unbekannte Schicht, eine Ansicht, die es nicht gibt, eine Quelle ohne
 *      Art: alles fällt weg, statt später beim Zeichnen zu stolpern.
 *
 * Beides hier und nicht in einer Wanderung der Datenbank, weil Teile auf zwei
 * Wegen hereinkommen – aus der eigenen Tabelle und aus einer eingelesenen
 * Datei. Eine Datenbankwanderung fasst nur den ersten an, und der zweite ist
 * der ungeprüftere von beiden.
 *
 * Gibt `null` zurück, wenn nichts Zeichenbares übrigbleibt.
 */
export function heileTeil(roh: unknown): Teil | null {
  if (!roh || typeof roh !== 'object') return null;
  const t = roh as Record<string, unknown>;

  const id = typeof t.id === 'string' ? t.id : '';
  if (!id) return null;

  const schicht = t.schicht;
  if (typeof schicht !== 'string' || !SCHICHT_RANG.has(schicht as SchichtName)) return null;

  const ansichten: Partial<Record<Ansicht, Quelle>> = {};
  if (t.ansichten && typeof t.ansichten === 'object' && !Array.isArray(t.ansichten)) {
    for (const [name, wert] of Object.entries(t.ansichten as Record<string, unknown>)) {
      if (!istAnsicht(name)) continue;
      const quelle = heileQuelle(wert);
      if (quelle) ansichten[name] = quelle;
    }
  }
  /* Die alte Fassung: eine Zeichnung, und die galt von vorn. */
  if (!ansichten.vorn) {
    const alt = heileQuelle(t.quelle);
    if (alt) ansichten.vorn = alt;
  }

  /* Ein Teil ohne eine einzige Zeichnung kann nichts zeigen und ist keines. */
  if (Object.keys(ansichten).length === 0) return null;

  return {
    id,
    schicht: schicht as SchichtName,
    name: typeof t.name === 'string' && t.name ? t.name : 'Ohne Namen',
    ansichten,
    toenbar: t.toenbar === true,
    ...(typeof t.bedeutung === 'string' && t.bedeutung ? { bedeutung: t.bedeutung } : {}),
  };
}

const GRUNDFORMEN_NAMEN = new Set<string>([
  'kopf-rund',
  'kopf-schmal',
  'kopf-kantig',
  'kopf-profil',
  'schultern',
  'schultern-seite',
  'scheibe',
]);

function heileQuelle(roh: unknown): Quelle | null {
  if (!roh || typeof roh !== 'object') return null;
  const q = roh as Record<string, unknown>;
  if (q.art === 'bild' && typeof q.bildId === 'string' && q.bildId) {
    return { art: 'bild', bildId: q.bildId };
  }
  if (q.art === 'grundform' && typeof q.form === 'string' && GRUNDFORMEN_NAMEN.has(q.form)) {
    return { art: 'grundform', form: q.form as Grundform };
  }
  return null;
}

/** Alle Bildkennungen, die dieses Teil benutzt – über alle Ansichten. */
export function bildkennungen(teil: Teil): string[] {
  return Object.values(teil.ansichten)
    .filter((q): q is Extract<Quelle, { art: 'bild' }> => q.art === 'bild')
    .map((q) => q.bildId);
}

export { SCHICHT_RANG };
