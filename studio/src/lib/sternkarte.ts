/**
 * Aus einem Graphen eine Sternkarte machen.
 *
 * Zwei Dinge, die eine Kräftesimulation von sich aus nicht kann, die aber
 * jede gedruckte Sternkarte kann:
 *
 * 1. **Den Rahmen füllen.** Eine Simulation mit Zug zur Mitte wird rund.
 *    Ein Blatt ist es nie – und ein Himmel, der über einem hochkanten
 *    Bildfeld steht, auch nicht.
 * 2. **Nicht alles benennen.** Auf einer Sternkarte tragen die hellen Sterne
 *    Namen und die schwachen nicht. Das ist keine Notlösung – es ist der
 *    Grund, warum man eine Sternkarte lesen kann.
 *
 * Was hier einmal stand und wieder verschwunden ist: `kartenbild`, das aus
 * den Sternen einen Ausschnitt rechnete. Seit die Karte eine Kugel ist, in
 * der man steht, gibt es keinen Ausschnitt mehr zu rechnen – das Bildfeld
 * ist der Ausschnitt, und wie weit man sieht, entscheidet das Sichtfeld in
 * `himmel.ts`. Die Namen werden weiterhin hier gesetzt, jetzt auf den
 * Lagen, die die Projektion liefert.
 */

import type { GraphSimulation } from './graph';

/* =======================================================================
 * 1 · DEN RAHMEN FÜLLEN
 * ==================================================================== */

export interface EinpassMass {
  /** Schritte für die erste Setzung. */
  setzen: number;
  /** Schritte je Nachbesserung. */
  nachfassen: number;
  /** Wie oft höchstens nachgebessert wird. */
  runden: number;
  /** Ab welcher Abweichung es reicht (0.06 = sechs Prozent). */
  genau: number;
  /** Wie stark eine Korrektur zupackt. 1 = voll, kleiner = vorsichtiger. */
  daempfung: number;
}

/**
 * Die Masse, mit denen die Faltkarte einpasst.
 *
 * `nachfassen: 220` ist nachgemessen, nicht geschätzt: Bei 140 Schritten
 * kam eine kleine Welt (zwölf Sterne) nicht mehr zur Ruhe und endete
 * dreissig Prozent daneben. Bei 220 blieb keine der geprüften Welten –
 * zwölf, fünfzig, vierhundert Sterne – über fünf Prozent daneben.
 */
export const FALTKARTE: EinpassMass = {
  setzen: 420,
  nachfassen: 220,
  runden: 3,
  genau: 0.06,
  daempfung: 1,
};

/** Höhe durch Breite der Anordnung. */
function verhaeltnis(b: { minX: number; minY: number; maxX: number; maxY: number }): number {
  const breite = b.maxX - b.minX;
  const hoehe = b.maxY - b.minY;
  if (breite <= 0 || hoehe <= 0) return 1;
  return hoehe / breite;
}

/**
 * Die Anordnung setzen lassen, bis sie die Form des Rahmens hat.
 *
 * `ziel` ist Höhe durch Breite des Rahmens: 1.44 für ein Telefon hochkant,
 * 0.68 für ein Tablett quer.
 *
 * Warum nicht einfach ausrechnen: Der Zug je Achse bestimmt die Ausdehnung
 * je Achse, aber nur ungefähr – die Federn entlang der Kanten reden mit, und
 * bei wenigen Sternen verschiebt ein einzelner am Rand das ganze Mass. Ein
 * ausgerechneter Exponent lag bei einer wirklichen Welt um bis zu vierzig
 * Prozent daneben. Nachmessen und korrigieren liegt bei fünf.
 *
 * Warum nicht hinterher in die Breite ziehen: Weil dann die Abstände
 * zwischen den Sternen lögen. Hier bleibt jede Anordnung eine, die sich
 * wirklich so gesetzt hat.
 *
 * Gibt das erreichte Verhältnis zurück.
 */
export function einpassen(
  sim: GraphSimulation,
  ziel: number,
  mass: EinpassMass = FALTKARTE,
): number {
  sim.formen(ziel);
  for (let i = 0; i < mass.setzen; i++) sim.tick();
  if (sim.nodes.length === 0) return 1;

  /*
   * Die beste Runde wird behalten, nicht die letzte.
   *
   * Bei wenigen Sternen springt das Mass: Eine Korrektur kann übers Ziel
   * hinausschiessen und die nächste wieder zurück. Ohne dieses Gedächtnis
   * entschiede der Zufall, in welcher Runde die Schleife endet – mit ihm
   * kann Nachfassen das Ergebnis nur verbessern.
   */
  let besteAbweichung = Infinity;
  let besteLage: { x: number; y: number }[] = [];
  const sichern = () => sim.nodes.map((n) => ({ x: n.x, y: n.y }));

  const schranke = Math.log(1 + mass.genau);
  let streckung = ziel;

  for (let runde = 0; runde <= mass.runden; runde++) {
    const ist = verhaeltnis(sim.bounds());
    /* Im Logarithmus messen: zu flach und zu hoch wiegen dann gleich viel. */
    const abweichung = Math.abs(Math.log(ist / ziel));
    if (abweichung < besteAbweichung) {
      besteAbweichung = abweichung;
      besteLage = sichern();
    }
    if (abweichung < schranke || runde === mass.runden) break;

    streckung *= Math.pow(ziel / ist, mass.daempfung);
    sim.formen(streckung);
    sim.reheat(0.45);
    for (let i = 0; i < mass.nachfassen; i++) sim.tick();
  }

  sim.nodes.forEach((n, i) => {
    const lage = besteLage[i];
    if (lage) {
      n.x = lage.x;
      n.y = lage.y;
    }
  });
  return verhaeltnis(sim.bounds());
}

/* =======================================================================
 * 2 · NICHT ALLES BENENNEN
 * ==================================================================== */

export interface Stern {
  id: string;
  x: number;
  y: number;
  /** Radius der Scheibe. */
  r: number;
  label: string;
  /** Je grösser, desto eher bekommt dieser Stern seinen Namen. */
  rang: number;
}

export type Anker = 'middle' | 'start' | 'end';

export interface Namenszug {
  /** Wo die Schrift ansetzt. */
  x: number;
  /** Die Grundlinie. */
  y: number;
  anker: Anker;
}

export interface Kasten {
  l: number;
  o: number;
  r: number;
  u: number;
}

/**
 * Wie breit ein Wort ungefähr wird.
 *
 * Ohne Textmessung im Browser, denn die Namen werden im `useMemo` gesetzt –
 * lange bevor ein `<text>` existiert, das man messen könnte. Die Tabelle ist
 * grob, aber in die sichere Richtung grob: Sie schätzt eher zu breit, und
 * ein Name zu wenig ist besser als zwei, die übereinanderliegen.
 */
const SCHMAL = new Set(" .,:;'!|()[]-ijltfIr");
const BREIT = new Set('mwMW—…');

/**
 * Wie weit die Namen gesperrt gesetzt werden, in Geviert.
 *
 * Steht hier und nicht bei der Zeichnung, weil beide dieselbe Zahl brauchen:
 * Die Zeichnung setzt sie als `letter-spacing`, die Breitenschätzung muss
 * sie mitzählen. Zwei Zahlen wären eine zu viel – die Namen lägen dann um
 * genau diesen Betrag enger, als beim Abwägen angenommen wurde.
 *
 * Nachgemessen am Gerät, an dreissig gesetzten Namen: Mit der Sperrung
 * schätzt die Tabelle jeden Namen zu breit – der knappste kam auf 95.5
 * Prozent der Schätzung. Ohne sie wären neun von dreissig zu schmal
 * geschätzt gewesen, und genau diese neun hätten einander überlappen
 * dürfen. Die Zahl trägt also wirklich, auch wenn keine Prüfung im
 * Testlauf sie halten kann: Der Satz und die Schätzung benutzen dieselbe
 * Funktion, ein Fehler in ihr fiele beiden gleichzeitig zu – auffallen
 * kann er nur gegen wirklich gesetzte Schrift.
 */
export const SPERRUNG = 0.04;

export function schriftbreite(text: string, groesse: number): number {
  let em = 0;
  for (const c of text) {
    if (SCHMAL.has(c)) em += 0.32;
    else if (BREIT.has(c)) em += 0.88;
    else if (c !== c.toLowerCase() && c === c.toUpperCase()) em += 0.68;
    else em += 0.52;
    em += SPERRUNG;
  }
  return em * groesse;
}

/**
 * Die Lagen, die eine Karte für einen Namen kennt – in dieser Reihenfolge.
 *
 * Erst die vier geraden, dann die vier schrägen. Kartografen setzen seit
 * jeher nach so einer Liste, und die Reihenfolge ist die Rangfolge: Ein
 * Name gerade unter seinem Punkt ist am leichtesten zuzuordnen, einer
 * schräg darüber am schwersten – aber immer noch besser als keiner.
 *
 * Vier waren es zuerst. Als die Namen zusätzlich in den Horizont passen
 * mussten, fielen davon ein Drittel weg: dreissig gesetzte Namen wurden
 * zwanzig. Die vier schrägen holen den grössten Teil zurück, weil ein Stern
 * am Rand fast immer *irgendeine* Richtung nach innen hat.
 *
 * `hin` ist die Richtung vom Stern weg, `anker` die Ausrichtung der Schrift.
 */
const LAGEN: { hx: number; hy: number; anker: Anker }[] = [
  { hx: 0, hy: 1, anker: 'middle' }, // darunter
  { hx: 0, hy: -1, anker: 'middle' }, // darüber
  { hx: 1, hy: 0, anker: 'start' }, // rechts
  { hx: -1, hy: 0, anker: 'end' }, // links
  { hx: 0.72, hy: -0.72, anker: 'start' }, // rechts oben
  { hx: 0.72, hy: 0.72, anker: 'start' }, // rechts unten
  { hx: -0.72, hy: -0.72, anker: 'end' }, // links oben
  { hx: -0.72, hy: 0.72, anker: 'end' }, // links unten
];

function kastenFuer(
  stern: Stern,
  lage: number,
  breite: number,
  groesse: number,
  luft: number,
): { zug: Namenszug; kasten: Kasten } {
  /* Oberlänge und Unterlänge einer Serifenschrift, gemessen von der Grundlinie. */
  const ueber = groesse * 0.82;
  const unter = groesse * 0.26;
  const abstand = stern.r + groesse * 0.45;
  const { hx, hy, anker } = LAGEN[lage];

  const x = stern.x + hx * abstand;
  /*
   * Senkrecht muss die Grundlinie um die halbe Schrifthöhe versetzt werden,
   * damit die Zeile *neben* dem Stern sitzt und nicht mit der Grundlinie auf
   * seiner Höhe. Nach unten kommt die Oberlänge dazu, nach oben die
   * Unterlänge – der Kasten soll den Stern ja gerade freilassen.
   */
  const y =
    hy > 0
      ? stern.y + hy * abstand + ueber
      : hy < 0
        ? stern.y + hy * abstand - unter
        : stern.y + groesse * 0.3;

  const l = anker === 'middle' ? x - breite / 2 : anker === 'start' ? x : x - breite;
  return {
    zug: { x, y, anker },
    kasten: { l: l - luft, o: y - ueber - luft, r: l + breite + luft, u: y + unter + luft },
  };
}

/**
 * Der Kasten, den ein gesetzter Name einnimmt.
 *
 * Ausgeführt, damit die Prüfungen dieselbe Rechnung benutzen wie der Satz –
 * eine zweite, nachgebaute Rechnung im Test würde irgendwann abweichen und
 * dann das Falsche bestätigen.
 */
export function namenskasten(zug: Namenszug, text: string, groesse: number): Kasten {
  const breite = schriftbreite(text, groesse);
  const l =
    zug.anker === 'middle' ? zug.x - breite / 2 : zug.anker === 'start' ? zug.x : zug.x - breite;
  return { l, r: l + breite, o: zug.y - groesse * 0.82, u: zug.y + groesse * 0.26 };
}

function stossen(a: Kasten, b: Kasten): boolean {
  return !(a.r <= b.l || b.r <= a.l || a.u <= b.o || b.u <= a.o);
}

/** Liegt `innen` ganz in `aussen`? */
function enthalten(aussen: Kasten, innen: Kasten): boolean {
  return innen.l >= aussen.l && innen.r <= aussen.r && innen.o >= aussen.o && innen.u <= aussen.u;
}

/**
 * Der Ausschnitt, in dem ein Name stehen darf.
 *
 * Er ist der Grund, warum es die seitlichen und schrägen Lagen gibt: Ein
 * Stern am rechten Rand bekommt seinen Namen nach links, weil nach rechts
 * kein Blatt mehr ist. Genau so werden Karten gesetzt.
 */
export interface Feld {
  kasten: Kasten;
}

function darfDaStehen(feld: Feld | undefined, kasten: Kasten): boolean {
  return !feld || enthalten(feld.kasten, kasten);
}

export interface NamenMass {
  /** Schriftgrösse in denselben Einheiten wie die Sternlagen. */
  groesse: number;
  /** Wie viel Luft ein Name um sich braucht. */
  luft: number;
  /** Nach wie vielen Zeichen ein Name gekürzt wird. */
  laenge: number;
  /**
   * Der Ausschnitt, in dem ein Name liegen muss. Ohne ihn darf er überall
   * stehen.
   *
   * Er ist der Grund, warum es die seitlichen Lagen gibt: Ein Stern am
   * rechten Rand bekommt seinen Namen nach links, weil nach rechts kein
   * Blatt mehr ist. Genau so werden Karten gesetzt.
   */
  feld?: Feld;
}

/**
 * Wer einen Namen trägt, und wo er steht.
 *
 * Der Reihe nach, vom hellsten Stern abwärts: für jeden werden vier Lagen
 * probiert – darunter, darüber, rechts, links. Die erste, die frei ist,
 * bekommt den Namen. Passt keine, bleibt der Stern namenlos.
 *
 * Das ist genau die Regel, nach der Karten gesetzt werden, und sie hat drei
 * Eigenschaften, die keine Obergrenze hätte: Sie passt sich der Dichte an,
 * sie gibt den wichtigen Sternen den Vortritt, und sie ist bei gleicher
 * Welt immer dieselbe – dieselbe Karte sieht bei jedem Aufschlagen gleich
 * aus.
 *
 * Die Sternscheiben selbst sind besetzt: Ein Name darf über einer Linie
 * stehen, aber nicht auf einem anderen Stern.
 */
export function namenSetzen(sterne: Stern[], mass: NamenMass): Map<string, Namenszug> {
  const gesetzt = new Map<string, Namenszug>();
  if (sterne.length === 0) return gesetzt;

  /* Belegt sind von Anfang an alle Scheiben – auch die noch namenloser Sterne. */
  const belegt: Kasten[] = sterne.map((s) => ({
    l: s.x - s.r,
    o: s.y - s.r,
    r: s.x + s.r,
    u: s.y + s.r,
  }));

  /*
   * Nach Rang, bei Gleichstand nach Namen. Der zweite Teil ist nicht
   * Kosmetik: Ohne ihn entschiede die Reihenfolge der Liste, welcher von
   * zwei gleich hellen Sternen seinen Namen behält.
   */
  const reihe = [...sterne].sort((a, b) => b.rang - a.rang || a.label.localeCompare(b.label, 'de'));

  for (const stern of reihe) {
    const text =
      stern.label.length > mass.laenge
        ? `${stern.label.slice(0, mass.laenge - 1)}…`
        : stern.label;
    if (!text) continue;
    const breite = schriftbreite(text, mass.groesse);

    for (let lage = 0; lage < LAGEN.length; lage++) {
      const { zug, kasten } = kastenFuer(stern, lage, breite, mass.groesse, mass.luft);
      if (!darfDaStehen(mass.feld, kasten)) continue;
      if (belegt.some((k) => stossen(kasten, k))) continue;
      gesetzt.set(stern.id, zug);
      belegt.push(kasten);
      break;
    }
  }

  return gesetzt;
}
