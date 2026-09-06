/**
 * Aus einem Graphen eine Sternkarte machen.
 *
 * Zwei Dinge, die eine Kräftesimulation von sich aus nicht kann, die aber
 * jede gedruckte Sternkarte kann:
 *
 * 1. **Den Rahmen füllen.** Eine Simulation mit Zug zur Mitte wird rund.
 *    Ein Blatt ist es nie. Rund in hochkant heisst: oben und unten bleibt
 *    Schwarz, und die Sterne drängen sich in der Mitte.
 * 2. **Nicht alles benennen.** Auf einer Sternkarte tragen die hellen Sterne
 *    Namen und die schwachen nicht. Das ist keine Notlösung – es ist der
 *    Grund, warum man eine Sternkarte lesen kann.
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

function stossen(a: Kasten, b: Kasten): boolean {
  return !(a.r <= b.l || b.r <= a.l || a.u <= b.o || b.u <= a.o);
}

/** Liegt `innen` ganz in `aussen`? */
function enthalten(aussen: Kasten, innen: Kasten): boolean {
  return innen.l >= aussen.l && innen.r <= aussen.r && innen.o >= aussen.o && innen.u <= aussen.u;
}

/**
 * Der Ausschnitt, in dem ein Name stehen darf – wahlweise mit einem Rund.
 *
 * Ein Rechteck allein reicht für die Kuppel nicht: Deren Ecken liegen
 * ausserhalb des Horizonts, und ein Name, der dort steht, schwebt neben dem
 * Himmel statt darin.
 */
export interface Feld {
  kasten: Kasten;
  /** Wenn gesetzt: der Name muss zusätzlich ganz hierin liegen. */
  rund?: { mx: number; my: number; ax: number; ay: number };
}

/**
 * Liegt der Kasten ganz in der Ellipse?
 *
 * Es genügt, die vier Ecken zu prüfen: Beide Formen sind konvex, und ein
 * Rechteck ist die konvexe Hülle seiner Ecken – liegen alle vier drin, liegt
 * jeder Punkt dazwischen auch drin.
 */
function imRund(rund: NonNullable<Feld['rund']>, k: Kasten): boolean {
  for (const [x, y] of [
    [k.l, k.o],
    [k.r, k.o],
    [k.l, k.u],
    [k.r, k.u],
  ]) {
    const u = (x - rund.mx) / rund.ax;
    const v = (y - rund.my) / rund.ay;
    if (u * u + v * v > 1) return false;
  }
  return true;
}

function darfDaStehen(feld: Feld | undefined, kasten: Kasten): boolean {
  if (!feld) return true;
  if (!enthalten(feld.kasten, kasten)) return false;
  return !feld.rund || imRund(feld.rund, kasten);
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

/* =======================================================================
 * 3 · DAS BILD
 * ==================================================================== */

export interface Rahmen {
  /** Breite des Bildfeldes in Bildschirmpunkten. */
  breite: number;
  /** Höhe des Bildfeldes in Bildschirmpunkten. */
  hoehe: number;
}

export interface Bildmass {
  /** Wie gross die Namen auf dem Schirm stehen sollen, in Punkten. */
  schriftPunkte: number;
  /** Nach wie vielen Zeichen ein Name gekürzt wird. */
  laenge: number;
  /** Luft um einen Namen, als Vielfaches der Schriftgrösse. */
  luft: number;
  /**
   * Ein Bereich, den der Ausschnitt mit umfassen muss.
   *
   * Für die Kuppel: Der Horizont reicht weiter als die Sterne, die auf ihm
   * liegen – er ist ja die Ellipse *durch* den äussersten. Ohne diesen
   * Hinweis schnitte der Ausschnitt ihn an drei Seiten ab.
   */
  umschliesst?: Kasten;
  /**
   * Wenn gesetzt: Namen dürfen nur innerhalb dieses Rundes stehen.
   *
   * Für die Kuppel der Horizont. Ohne ihn standen die Namen der äussersten
   * Sterne in den Ecken des Bildfeldes – also neben dem Himmel statt darin.
   * Ein Stern am Rand legt seinen Namen dann nach innen; geht auch das
   * nicht, trägt er eben keinen. Genau so ist eine Sternkarte gesetzt.
   */
  rund?: { mx: number; my: number; ax: number; ay: number };
}

export interface Kartenbild {
  /** Für `viewBox`. */
  view: string;
  /** Schriftgrösse in Karteneinheiten – so gewählt, dass sie auf dem Schirm passt. */
  groesse: number;
  namen: Map<string, Namenszug>;
  /** Wie gross die Namen tatsächlich auf dem Schirm stehen. Zum Nachmessen. */
  schriftPunkte: number;
}

const kleinerKasten = (s: Stern): Kasten => ({
  l: s.x - s.r,
  o: s.y - s.r,
  r: s.x + s.r,
  u: s.y + s.r,
});

function umfassen(kaesten: Kasten[]): Kasten {
  const alles = { l: Infinity, o: Infinity, r: -Infinity, u: -Infinity };
  for (const k of kaesten) {
    alles.l = Math.min(alles.l, k.l);
    alles.o = Math.min(alles.o, k.o);
    alles.r = Math.max(alles.r, k.r);
    alles.u = Math.max(alles.u, k.u);
  }
  return alles;
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

/**
 * Ausschnitt, Schriftgrösse und Namen in einem Zug.
 *
 * Die drei hängen zusammen, und zwar im Kreis: Wie gross die Schrift in
 * Karteneinheiten sein muss, hängt vom Ausschnitt ab (der Maßstab macht sie
 * ja kleiner); welche Namen gesetzt werden können, hängt von der Schrift ab;
 * und wie gross der Ausschnitt sein muss, hängt davon ab, wie weit die
 * gesetzten Namen über die Sterne hinausragen.
 *
 * Deshalb wird zweimal geschätzt und einmal endgültig gesetzt. Das
 * Verfahren läuft zusammen – `tests/sternkarte.test.mjs` misst nach, dass
 * die Schrift am Ende wirklich in der verlangten Grösse auf dem Schirm
 * steht und dass kein Name über den Rand hinausragt.
 *
 * Warum das überhaupt sein muss: Vorher hing die Schriftgrösse an der
 * Breite des Ausschnitts und war nach oben und unten begrenzt. Auf einem
 * Telefon kam dabei jedes Mal dasselbe heraus – rund vier Punkte. Der Text
 * war da, er war richtig gesetzt, und man konnte ihn nicht lesen.
 */
export function kartenbild(sterne: Stern[], rahmen: Rahmen, mass: Bildmass): Kartenbild {
  const scheiben = sterne.map(kleinerKasten);
  const leer: Kartenbild = {
    view: '-100 -100 200 200',
    groesse: mass.schriftPunkte,
    namen: new Map(),
    schriftPunkte: mass.schriftPunkte,
  };
  if (sterne.length === 0 || rahmen.breite <= 0 || rahmen.hoehe <= 0) return leer;

  /** Wieviel eine Karteneinheit auf dem Schirm misst, wenn `k` der Ausschnitt ist. */
  const massstab = (k: Kasten) =>
    Math.min(rahmen.breite / Math.max(k.r - k.l, 1e-6), rahmen.hoehe / Math.max(k.u - k.o, 1e-6));

  const kern = umfassen(mass.umschliesst ? [...scheiben, mass.umschliesst] : scheiben);

  /**
   * Der Ausschnitt: die Sterne, ein Saum für die Namen, und dann auf die
   * Form des Rahmens gebracht.
   *
   * Der letzte Schritt ist der, auf den es ankommt. `preserveAspectRatio`
   * legt sonst schwarze Streifen an die Seiten, an denen der Ausschnitt
   * nicht zum Rahmen passt – und genau die sollten ja verschwinden. Weil
   * die Anordnung schon in der Form des Rahmens liegt, ist die Dehnung
   * hier nur noch klein.
   */
  const ausschnitt = (saum: number): Kasten => {
    let k = { l: kern.l - saum, o: kern.o - saum, r: kern.r + saum, u: kern.u + saum };
    const breite = k.r - k.l;
    const hoehe = k.u - k.o;
    const soll = rahmen.hoehe / rahmen.breite;
    if (hoehe / breite < soll) {
      const fehlt = (breite * soll - hoehe) / 2;
      k = { ...k, o: k.o - fehlt, u: k.u + fehlt };
    } else {
      const fehlt = (hoehe / soll - breite) / 2;
      k = { ...k, l: k.l - fehlt, r: k.r + fehlt };
    }
    return k;
  };

  /*
   * Erste Schätzung, ohne dass die Schriftgrösse schon bekannt wäre: ein
   * Zwanzigstel der Ausdehnung als Saum.
   */
  let bild = ausschnitt(0.05 * Math.max(kern.r - kern.l, kern.u - kern.o));
  let groesse = mass.schriftPunkte / massstab(bild);
  let namen = new Map<string, Namenszug>();

  /*
   * `versuch` und nicht `groesse`: Am Ende müssen Ausschnitt, Namen und
   * Schriftgrösse *zueinander* passen. Würde die Grösse nach der letzten
   * Setzung noch einmal nachgezogen, gälten die Kästen nicht mehr, mit
   * denen die Namen gegeneinander abgewogen wurden.
   */
  /*
   * Zwölf Runden und ein Tausendstel Genauigkeit – das kostet nichts.
   *
   * Früher standen hier drei, und in der Schleife wurden auch noch die
   * Namen gesetzt. Am Gerät kam die Schrift dann fünf Prozent zu gross
   * heraus: Die Runden gingen aus, bevor es zusammengelaufen war. Seit die
   * Namen erst danach gesetzt werden, ist eine Runde nur noch etwas
   * Rechnen mit vier Zahlen, und man kann so lange laufen lassen, bis es
   * wirklich stimmt.
   */
  const RUNDEN = 12;
  for (let runde = 0; runde < RUNDEN; runde++) {
    const versuch = groesse;
    /* Saum: eine Zeile Schrift über oder unter dem äussersten Stern. */
    bild = ausschnitt(versuch * 1.6);
    const naechste = mass.schriftPunkte / massstab(bild);
    if (runde === RUNDEN - 1 || Math.abs(naechste / versuch - 1) < 0.001) {
      groesse = versuch;
      break;
    }
    groesse = naechste;
  }

  /*
   * Die Namen zuletzt, und im Ausschnitt eingeschlossen.
   *
   * Der erste Versuch machte es umgekehrt: erst setzen, dann den Ausschnitt
   * so weit aufziehen, dass alle Namen hineinpassen. Am Gerät gemessen war
   * das Bild dann doppelt so breit wie das Sternfeld – ein einziger Name
   * von zweiundzwanzig Zeichen am linken Rand zog es auf –, und die Sterne
   * füllten wieder nur die Hälfte. Herum ist es richtig: Das Blatt steht
   * fest, und wer seinen Namen nicht mehr daraufbekommt, trägt eben keinen.
   * Die seitlichen Lagen sorgen dafür, dass die Sterne am Rand ihren Namen
   * nach innen legen statt ihn zu verlieren.
   */
  namen = namenSetzen(sterne, {
    groesse,
    luft: groesse * mass.luft,
    laenge: mass.laenge,
    feld: { kasten: bild, rund: mass.rund },
  });

  return {
    view: `${bild.l} ${bild.o} ${bild.r - bild.l} ${bild.u - bild.o}`,
    groesse,
    namen,
    schriftPunkte: groesse * massstab(bild),
  };
}
