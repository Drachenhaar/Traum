/**
 * Die Kuppel.
 *
 * Bisher war die Sternkarte eine Fläche: Punkte auf einem Blatt. Ein Himmel
 * ist aber keine Fläche, sondern eine Halbkugel, in die man von innen sieht –
 * und jede gedruckte Sternkarte, die das zeigen will, tut dasselbe: Sie
 * bildet die Halbkugel auf einen Kreis ab.
 *
 * Was dabei geschieht, ist kein Bildeffekt, sondern Geometrie. Zum Scheitel
 * hin geht es auseinander, zum Rand hin drängt es sich – weil dort ein
 * gleich grosser Winkelabstand auf immer weniger Blatt fällt. Genau das
 * macht aus einer Punktwolke einen Himmel: Man sieht dem Bild an, dass es
 * gewölbt ist, ohne dass irgendwo eine Wölbung gemalt wäre.
 *
 * Zwei Dinge werden hier bewusst **nicht** getan:
 *
 * - **Die Sterne werden nicht kleiner zum Rand hin.** Naheliegend wäre es –
 *   fern ist klein. Aber die Grösse eines Sterns bedeutet auf dieser Karte
 *   etwas: wie gut ein Eintrag verbunden ist. Sie für die Tiefenwirkung zu
 *   verbiegen hiesse, eine Aussage über die Welt zu überschreiben, damit es
 *   hübscher aussieht. Die Wölbung kommt aus der Lage und aus dem Grund
 *   dahinter, nicht aus der Bedeutung.
 *
 * - **Der Hintergrundhimmel bedeutet nichts.** Er ist gemalt, nicht
 *   gemessen. Deshalb ist er auch klar geschieden: eigene Farbe, eigene
 *   Grösse, nicht antippbar. Wer einen Punkt antippen kann, tippt einen
 *   Eintrag an – ohne Ausnahme.
 */

import { zahl } from './karte/zufall';

export interface Punkt {
  x: number;
  y: number;
}

/** Der Rand der Kuppel – der Horizont. */
export interface Ellipse {
  mx: number;
  my: number;
  /** Halbachse in x. */
  ax: number;
  /** Halbachse in y. */
  ay: number;
}

/**
 * Wie weit die Kuppel geöffnet ist, im Bogenmass.
 *
 * Der Winkel vom Scheitel bis zum Rand. Bei 90° wäre es eine volle
 * Halbkugel – und der Rand unendlich stark gestaucht, weil dort
 * `cos 90° = 0` steht: Die äussersten Sterne fielen alle auf denselben
 * Kreis und wären nicht mehr auseinanderzuhalten.
 *
 * 70° staucht den Rand auf etwas weniger als die Hälfte (`Θ·cot Θ = 0.44`).
 * Das ist deutlich genug, um die Wölbung zu sehen, und lässt am Rand noch
 * Platz zwischen den Sternen. Nachgemessen in `tests/himmel.test.mjs`.
 */
export const OEFFNUNG = (70 * Math.PI) / 180;

/* =======================================================================
 * 1 · DIE WÖLBUNG
 * ==================================================================== */

/**
 * Die radiale Abbildung der Kuppel.
 *
 * `r` läuft von 0 (Scheitel) bis 1 (Rand) und kommt genauso zurück – nur
 * unterwegs anders verteilt. Der Bruch durch `sin(oeffnung)` ist genau das,
 * was den Rand auf dem Rand festhält: Ohne ihn schrumpfte das ganze Bild.
 */
export function woelbung(r: number, oeffnung: number): number {
  if (r <= 0) return 0;
  return Math.sin(r * oeffnung) / Math.sin(oeffnung);
}

/**
 * Eine flache Anordnung auf die Kuppel legen.
 *
 * Die Punkte behalten ihre Richtung vom Mittelpunkt aus und ändern nur ihren
 * Abstand. Das ist wichtiger, als es klingt: Wer neben wem steht, bleibt
 * erhalten – die Abbildung ist auf jedem Strahl streng steigend, also kann
 * kein Stern einen anderen überholen. Der Graph bleibt derselbe Graph.
 *
 * Gerechnet wird in **elliptischen** Koordinaten, nicht in kreisrunden: Das
 * Bildfeld ist ein Rechteck, die Anordnung liegt schon in dessen Form, und
 * eine kreisrunde Kuppel darin liesse oben und unten wieder Schwarz. Die
 * Kuppel ist also so hoch wie breit wie das Blatt – das ist dieselbe
 * Freiheit, die ein Kartograf hat, wenn er eine Projektion wählt, und keine
 * heimliche Verzerrung: Die Anordnung selbst wird nicht angefasst.
 *
 * Gibt die neuen Lagen in derselben Reihenfolge zurück, dazu den Horizont.
 */
export function aufKuppel(
  punkte: readonly Punkt[],
  oeffnung: number = OEFFNUNG,
): { lagen: Punkt[]; horizont: Ellipse } {
  if (punkte.length === 0) {
    return { lagen: [], horizont: { mx: 0, my: 0, ax: 1, ay: 1 } };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of punkte) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const mx = (minX + maxX) / 2;
  const my = (minY + maxY) / 2;
  /* Ein einzelner Stern hat keine Ausdehnung – dann darf nicht geteilt werden. */
  const ax = Math.max((maxX - minX) / 2, 1e-9);
  const ay = Math.max((maxY - minY) / 2, 1e-9);

  /*
   * Der äusserste Punkt bestimmt den Horizont.
   *
   * Nicht der Rand des umschliessenden Rechtecks: Dessen Ecken sind weiter
   * draussen als jeder Stern, und die Kuppel wäre dann zu gross für ihren
   * Inhalt. So liegt mindestens ein Stern genau auf dem Horizont und keiner
   * dahinter.
   */
  let weiteste = 0;
  for (const p of punkte) {
    weiteste = Math.max(weiteste, Math.hypot((p.x - mx) / ax, (p.y - my) / ay));
  }
  if (weiteste <= 0) {
    return { lagen: punkte.map((p) => ({ x: p.x, y: p.y })), horizont: { mx, my, ax, ay } };
  }

  const lagen = punkte.map((p) => {
    const u = (p.x - mx) / ax;
    const v = (p.y - my) / ay;
    const abstand = Math.hypot(u, v);
    if (abstand <= 0) return { x: p.x, y: p.y };
    const gedehnt = woelbung(abstand / weiteste, oeffnung) / (abstand / weiteste);
    return { x: mx + u * gedehnt * ax, y: my + v * gedehnt * ay };
  });

  return {
    lagen,
    horizont: { mx, my, ax: ax * weiteste, ay: ay * weiteste },
  };
}

/* =======================================================================
 * 2 · DER HIMMEL DAHINTER
 * ==================================================================== */

export interface Himmelspunkt {
  x: number;
  y: number;
  /** Radius in Karteneinheiten – wird von aussen skaliert. */
  r: number;
  /** 0 bis 1. */
  helle: number;
}

/**
 * Ein Punkt auf der Halbkugel, gleichmässig über den Raumwinkel gestreut.
 *
 * Nicht gleichmässig über die *Scheibe*: Auf einer Kugelkappe liegt zwischen
 * 60° und 70° mehr Fläche als zwischen 0° und 10°, und wer gleichmässig in
 * die Scheibe streut, bekommt einen Himmel, der zur Mitte hin zu dicht ist.
 * `cos θ` gleichverteilt zu ziehen ist die übliche und richtige Art; dann
 * drängt sich der Hintergrund zum Rand hin genauso wie die Sterne davor,
 * und beide erzählen dieselbe Wölbung.
 */
function aufDerKappe(
  saat: number,
  i: number,
  oeffnung: number,
  salz: number,
): { x: number; y: number; z: number } {
  const cosMin = Math.cos(oeffnung);
  const cosTheta = cosMin + zahl(saat, i, 0, salz) * (1 - cosMin);
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  const phi = zahl(saat, i, 1, salz) * Math.PI * 2;
  return { x: sinTheta * Math.cos(phi), y: sinTheta * Math.sin(phi), z: cosTheta };
}

/** Vom Punkt auf der Kappe in die Zeichenebene. */
function inDieEbene(p: { x: number; y: number }, horizont: Ellipse, oeffnung: number): Punkt {
  const rand = Math.sin(oeffnung);
  return {
    x: horizont.mx + (p.x / rand) * horizont.ax,
    y: horizont.my + (p.y / rand) * horizont.ay,
  };
}

/**
 * Der Sternenhintergrund.
 *
 * Er bedeutet nichts, und das ist Absicht. Ein Nachthimmel ohne die
 * namenlosen Sterne ist kein Nachthimmel, sondern ein Schaubild – und ein
 * Schaubild ist genau das, wovon diese Seite wegwollte. Weil er nichts
 * bedeutet, darf er auch nichts können: kein Antippen, keine Namen, keine
 * Reaktion auf das Jahr.
 *
 * Aus `saat` gezogen, also für dieselbe Welt jedes Mal derselbe Himmel.
 */
export function sternenhimmel(
  saat: number,
  anzahl: number,
  horizont: Ellipse,
  oeffnung: number = OEFFNUNG,
  einheit = 1,
): Himmelspunkt[] {
  const sterne: Himmelspunkt[] = [];
  for (let i = 0; i < anzahl; i++) {
    const p = aufDerKappe(saat, i, oeffnung, 1);
    const lage = inDieEbene(p, horizont, oeffnung);
    /*
     * Die Helligkeit hoch drei: Es soll wenige helle und viele schwache
     * geben. Gleichverteilt sähe der Himmel aus wie gestreuter Sand.
     */
    const roh = zahl(saat, i, 2, 1);
    sterne.push({
      ...lage,
      r: (0.45 + roh * roh * 0.85) * einheit,
      helle: 0.2 + roh * roh * roh * 0.8,
    });
  }
  return sterne;
}

/**
 * Das Band.
 *
 * Kein gemalter Streifen, sondern das, was ein solches Band wirklich ist:
 * sehr viele schwache Sterne nahe einer Ebene. Deshalb wird auf der Kugel
 * gestreut und danach nach dem Abstand zu dieser Ebene ausgesiebt – dann
 * krümmt sich das Band von selbst richtig, wenn die Kuppel es krümmt, und
 * niemand muss eine Kurve zeichnen, die bei einem anderen Bildfeld wieder
 * falsch läge.
 *
 * Die Lage der Ebene hängt an der Saat: Jede Welt bekommt ihr eigenes Band.
 */
export function milchstrasse(
  saat: number,
  anzahl: number,
  horizont: Ellipse,
  oeffnung: number = OEFFNUNG,
  einheit = 1,
  breite = 0.17,
): Himmelspunkt[] {
  /* Die Senkrechte auf der Bandebene – einmal je Welt gezogen. */
  const a = zahl(saat, 0, 0, 7) * Math.PI * 2;
  const b = 0.35 + zahl(saat, 0, 1, 7) * 0.5;
  const n = { x: Math.cos(a) * Math.sin(b), y: Math.sin(a) * Math.sin(b), z: Math.cos(b) };

  const band: Himmelspunkt[] = [];
  /*
   * Es wird mehr gezogen als gebraucht und ausgesiebt – der einfachste Weg,
   * eine ungleichmässige Verteilung aus einer gleichmässigen zu bekommen.
   * Die Schranke begrenzt die Arbeit, falls die Ebene ungünstig liegt.
   */
  const schranke = anzahl * 12;
  for (let i = 0; i < schranke && band.length < anzahl; i++) {
    const p = aufDerKappe(saat, i, oeffnung, 3);
    const weg = Math.abs(p.x * n.x + p.y * n.y + p.z * n.z);
    if (weg > breite) continue;
    /* Zur Mitte des Bandes hin dichter und heller. */
    const naehe = 1 - weg / breite;
    if (zahl(saat, i, 3, 3) > naehe * 0.85 + 0.15) continue;
    const lage = inDieEbene(p, horizont, oeffnung);
    band.push({
      ...lage,
      r: (0.4 + zahl(saat, i, 4, 3) * 0.45) * einheit,
      helle: 0.06 + naehe * 0.3,
    });
  }
  return band;
}

/* =======================================================================
 * 3 · ZEICHNEN
 * ==================================================================== */

/**
 * Viele Punkte in **einem** Pfad.
 *
 * Tausend `<circle>` sind tausend Knoten im Dokument, und der Browser muss
 * jeden einzeln anlegen, ausmessen und verwalten. Als ein Pfad ist es ein
 * Knoten. Auf einem Telefon ist das der Unterschied zwischen einer Seite,
 * die aufgeht, und einer, die stockt.
 *
 * Zwei Bögen je Punkt, weil ein voller Kreis als Bogen nicht in einem Stück
 * geht: Anfangs- und Endpunkt wären derselbe, und dann ist nicht bestimmt,
 * welchen Weg der Bogen nimmt.
 */
export function punktePfad(punkte: readonly Himmelspunkt[]): string {
  let d = '';
  for (const p of punkte) {
    const r = p.r;
    d += `M${(p.x - r).toFixed(1)} ${p.y.toFixed(1)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(r * 2).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-r * 2).toFixed(2)} 0`;
  }
  return d;
}

/**
 * Nach Helligkeit in wenige Lagen sortieren.
 *
 * Jede Lage wird ein Pfad mit einer Deckkraft. Drei bis vier Stufen genügen –
 * das Auge unterscheidet auf einem dunklen Grund ohnehin nicht mehr, und
 * jede weitere Stufe ist ein weiterer Knoten.
 *
 * Zwei Dinge, die beim ersten Versuch falsch waren:
 *
 * Die Stufen liegen über der **vorgefundenen** Spanne, nicht über 0 bis 1.
 * Das Band ist insgesamt schwach – seine Helligkeiten liegen zwischen 0.06
 * und 0.36. Über 0 bis 1 eingeteilt landete alles in den untersten zwei
 * Stufen und die oberen blieben leer.
 *
 * Und die Deckkraft einer Lage ist der **Mittelwert ihrer Punkte**, keine
 * Leiter. Vorher stand dort `(s+1)/stufen * 0.9` – eine Zahl, die mit den
 * Daten nichts zu tun hat: Das Band wurde damit dreimal so hell gezeichnet,
 * wie es gerechnet war.
 */
export function nachHelligkeit(
  punkte: readonly Himmelspunkt[],
  stufen: number,
): { helle: number; punkte: Himmelspunkt[] }[] {
  if (punkte.length === 0 || stufen < 1) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const p of punkte) {
    min = Math.min(min, p.helle);
    max = Math.max(max, p.helle);
  }
  const spanne = max - min;

  const eimer: Himmelspunkt[][] = [];
  for (let s = 0; s < stufen; s++) eimer.push([]);
  for (const p of punkte) {
    const anteil = spanne > 0 ? (p.helle - min) / spanne : 0;
    const s = Math.min(stufen - 1, Math.max(0, Math.floor(anteil * stufen)));
    eimer[s].push(p);
  }

  return eimer
    .filter((e) => e.length > 0)
    .map((e) => ({
      helle: e.reduce((summe, p) => summe + p.helle, 0) / e.length,
      punkte: e,
    }));
}

/** Eine Zahl aus einer Zeichenkette – damit jede Welt ihren eigenen Himmel hat. */
export function saatAus(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}
