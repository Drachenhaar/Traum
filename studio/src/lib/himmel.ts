/**
 * Die Himmelskugel.
 *
 * Nicht eine Fläche mit Punkten darauf, sondern eine Kugel, in deren Mitte
 * man steht. Die Sterne hängen ringsum, man sieht immer nur den Ausschnitt,
 * in den man gerade schaut, und man sieht sich um, indem man wischt.
 *
 * Ein vorheriger Anlauf legte die Anordnung flach auf eine Kuppel und
 * zeichnete den Horizont als Ellipse. Das war eine Kuppel *von aussen* – ein
 * Oval auf dem Blatt. Der Unterschied ist nicht die Wölbung, sondern der
 * Standort: Wer in der Kugel steht, hat keinen Rand vor sich, sondern
 * überall Himmel, und muss sich umsehen.
 *
 * Was hier trotzdem gilt wie vorher: **Die Anordnung wird einmal gerechnet
 * und dann eingefroren.** Den Kopf zu drehen ist nicht dasselbe, wie wenn
 * sich das Sternbild umordnet. Die Sterne stehen starr; nur der Blick geht.
 *
 * Zwei Dinge werden bewusst **nicht** getan:
 *
 * - **Die Sterne werden nicht kleiner mit dem Abstand.** Naheliegend wäre
 *   es. Aber die Grösse eines Sterns bedeutet hier, wie gut ein Eintrag
 *   verbunden ist. Sie für die Tiefenwirkung zu verbiegen hiesse, eine
 *   Aussage über die Welt zu überschreiben, damit es hübscher aussieht.
 *
 * - **Der Hintergrundhimmel bedeutet nichts.** Er ist gemalt, nicht
 *   gemessen: nicht antippbar, ohne Namen, ohne Reaktion auf das Jahr. Wer
 *   auf dieser Seite einen Punkt antippen kann, tippt einen Eintrag an.
 */

import { zahl } from './karte/zufall';

export interface Punkt {
  x: number;
  y: number;
}

/** Eine Richtung vom Betrachter aus – immer Länge 1. */
export interface Richtung {
  x: number;
  y: number;
  z: number;
}

/** Wohin geschaut wird. Beides im Bogenmass. */
export interface Blick {
  /** Nach rechts positiv. */
  gier: number;
  /** Nach oben positiv. */
  neigung: number;
}

/**
 * Wie weit der äusserste Stern vom Mittelpunkt des Himmels absteht.
 *
 * Das ist die Zahl, die entscheidet, ob man sich überhaupt umsehen muss.
 * Bei 60° spannt die Welt 120° – das Sichtfeld zeigt davon gut die Hälfte,
 * also ist auf einen Blick viel zu sehen und trotzdem etwas übrig, wofür
 * man den Kopf dreht. Deutlich mehr, und man verlöre den Zusammenhang;
 * deutlich weniger, und das Wischen hätte keinen Zweck.
 */
export const SPANNE = (60 * Math.PI) / 180;

/**
 * Das senkrechte Sichtfeld.
 *
 * Senkrecht und nicht waagerecht, weil das Bildfeld hochkant ist: Über die
 * lange Seite gemessen bleibt die Verzerrung am Rand in beiden Lagen
 * gleich. Bei 70° steht ein Stern am oberen Rand 35° neben der Achse, und
 * die Zentralprojektion dehnt ihn dort um `1/cos²35° = 1.49`. Das ist
 * sichtbar und richtig so – so sieht ein weiter Blick eben aus. Bei 100°
 * wären es 2.9, und der Rand liefe auseinander.
 */
export const SICHTFELD = (70 * Math.PI) / 180;

/* =======================================================================
 * 1 · DIE ANORDNUNG AN DEN HIMMEL
 * ==================================================================== */

/**
 * Die flache Anordnung an den Himmel hängen.
 *
 * Der Weg ist die **mittabstandstreue Azimutalabbildung**, von hinten
 * gelesen: Der Abstand eines Punktes von der Mitte des Blattes wird
 * unmittelbar zum Winkel, den er am Himmel von der Mitte absteht. Die
 * Richtung bleibt, wie sie war.
 *
 * Das ist die eine Abbildung, bei der kein Abstand vom Mittelpunkt aus
 * gelogen wird – und Abstände sind hier das Einzige, was die
 * Kräftesimulation überhaupt behauptet. Was sie über zwei Sterne
 * *zueinander* sagt, wird zum Rand hin ein wenig gedehnt; darauf gibt es
 * keine Abbildung, die alles zugleich erhält, und dass es keine gibt, ist
 * kein Mangel dieser hier, sondern ein Satz über Kugeln.
 *
 * `spanne` ist der Winkel, unter dem der äusserste Stern steht.
 */
export function anDenHimmel(
  punkte: readonly Punkt[],
  spanne: number = SPANNE,
): { richtungen: Richtung[]; weite: { waagerecht: number; senkrecht: number } } {
  if (punkte.length === 0) {
    return { richtungen: [], weite: { waagerecht: 0, senkrecht: 0 } };
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

  /* Ein gemeinsamer Massstab für beide Achsen – sonst verzerrte er die Welt. */
  let weiteste = 0;
  for (const p of punkte) weiteste = Math.max(weiteste, Math.hypot(p.x - mx, p.y - my));
  const je = weiteste > 0 ? spanne / weiteste : 0;

  const richtungen = punkte.map((p) => {
    /*
     * Das Vorzeichen von `y` dreht sich: Auf dem Blatt wächst y nach unten,
     * am Himmel nach oben.
     */
    const bx = (p.x - mx) * je;
    const by = -(p.y - my) * je;
    const theta = Math.hypot(bx, by);
    if (theta < 1e-12) return { x: 0, y: 0, z: 1 };
    const s = Math.sin(theta) / theta;
    return { x: bx * s, y: by * s, z: Math.cos(theta) };
  });

  return {
    richtungen,
    weite: {
      waagerecht: ((maxX - minX) / 2) * je,
      senkrecht: ((maxY - minY) / 2) * je,
    },
  };
}

/* =======================================================================
 * 2 · DER BLICK
 * ==================================================================== */

/** Die drei Achsen des Blicks: rechts, oben, vorwärts. */
export function achsen(blick: Blick): { rechts: Richtung; oben: Richtung; vorn: Richtung } {
  const sg = Math.sin(blick.gier);
  const cg = Math.cos(blick.gier);
  const sn = Math.sin(blick.neigung);
  const cn = Math.cos(blick.neigung);
  return {
    vorn: { x: sg * cn, y: sn, z: cg * cn },
    rechts: { x: cg, y: 0, z: -sg },
    oben: { x: -sn * sg, y: cn, z: -sn * cg },
  };
}

const punktprodukt = (a: Richtung, b: Richtung) => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Wie weit ein Punkt vor der Achse liegen muss, um gezeichnet zu werden.
 *
 * Die Zentralprojektion schickt alles bei genau 90° ins Unendliche. Bei 80°
 * ist der Faktor schon 33 – Zahlen, mit denen ein Zeichenprogramm nichts
 * Vernünftiges mehr anfängt, und sichtbar ist dort ohnehin nichts mehr.
 */
const VORN = Math.cos((80 * Math.PI) / 180);

export interface Schirmlage {
  x: number;
  y: number;
}

/**
 * Eine Richtung auf den Schirm werfen – Zentralprojektion (gnomonisch).
 *
 * `brennweite` ist der Abstand der Bildebene, in Zeicheneinheiten.
 *
 * Diese Projektion hat eine Eigenschaft, die hier viel wert ist: **Ein
 * Grosskreis wird zu einer Geraden.** Die Verbindung zweier Sterne ist am
 * Himmel ein Grosskreisbogen – und darf deshalb als gerade Strecke
 * gezeichnet werden, ohne dass irgendwo ein Bogen gerechnet werden müsste.
 * Bei jeder anderen Projektion wäre eine gerade Linie zwischen zwei
 * Sternen eine kleine Lüge.
 *
 * `null` heisst: liegt hinter oder zu weit neben der Blickrichtung.
 */
export function aufDenSchirm(
  d: Richtung,
  blick: { rechts: Richtung; oben: Richtung; vorn: Richtung },
  brennweite: number,
): Schirmlage | null {
  const z = punktprodukt(d, blick.vorn);
  if (z <= VORN) return null;
  return {
    x: (punktprodukt(d, blick.rechts) / z) * brennweite,
    /* Auf dem Schirm wächst y nach unten. */
    y: (-punktprodukt(d, blick.oben) / z) * brennweite,
  };
}

/** Die Brennweite, mit der `sichtfeld` genau die halbe Höhe füllt. */
export function brennweite(halbeHoehe: number, sichtfeld: number = SICHTFELD): number {
  return halbeHoehe / Math.tan(sichtfeld / 2);
}

/**
 * Den Blick in den Grenzen halten.
 *
 * Man darf sich umsehen, aber nicht verlieren: Am Anschlag steht der äusserste
 * Stern der Welt genau in der Mitte des Schirms. Weiter zu dürfen hiesse, in
 * eine Richtung schauen zu können, in der nichts mehr ist – und dann steht
 * man vor Schwarz und weiss nicht, wohin zurück.
 */
export function begrenzen(blick: Blick, weite: { waagerecht: number; senkrecht: number }): Blick {
  const klemme = (wert: number, grenze: number) => Math.max(-grenze, Math.min(grenze, wert));
  return {
    gier: klemme(blick.gier, weite.waagerecht),
    neigung: klemme(blick.neigung, weite.senkrecht),
  };
}

/* =======================================================================
 * 3 · DER HIMMEL DAHINTER
 * ==================================================================== */

export interface Himmelsstern {
  d: Richtung;
  /** Radius in Zeicheneinheiten. */
  r: number;
  /** 0 bis 1. */
  helle: number;
}

/**
 * Ein Punkt auf einer Kugelkappe, gleichmässig über den Raumwinkel gestreut.
 *
 * Nicht gleichmässig über den Winkel: Zwischen 60° und 70° liegt mehr
 * Kugelfläche als zwischen 0° und 10°. `cos θ` gleichverteilt zu ziehen ist
 * die übliche und richtige Art; anders bekäme man einen Himmel, der zur
 * Blickmitte hin zu dicht ist.
 */
function aufDerKappe(saat: number, i: number, kappe: number, salz: number): Richtung {
  const cosMin = Math.cos(kappe);
  const cosTheta = cosMin + zahl(saat, i, 0, salz) * (1 - cosMin);
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  const phi = zahl(saat, i, 1, salz) * Math.PI * 2;
  return { x: sinTheta * Math.cos(phi), y: sinTheta * Math.sin(phi), z: cosTheta };
}

/**
 * Wie weit der gemalte Himmel reicht.
 *
 * Weiter als die Welt: Wer bis an den Anschlag schaut, soll dort nicht auf
 * eine Kante aus Schwarz stossen. Der Überschuss ist gerade das halbe
 * Sichtfeld plus etwas.
 */
export const KAPPE = SPANNE + SICHTFELD * 0.8;

/**
 * Der Sternenhintergrund.
 *
 * Er bedeutet nichts, und das ist Absicht. Ein Nachthimmel ohne die
 * namenlosen Sterne ist kein Nachthimmel, sondern ein Schaubild – und ein
 * Schaubild ist genau das, wovon diese Seite wegwollte.
 *
 * Aus `saat` gezogen: für dieselbe Welt jedes Mal derselbe Himmel.
 */
export function sternenhimmel(
  saat: number,
  anzahl: number,
  einheit = 1,
  kappe: number = KAPPE,
): Himmelsstern[] {
  const sterne: Himmelsstern[] = [];
  for (let i = 0; i < anzahl; i++) {
    /*
     * Die Helligkeit hoch drei: wenige helle, viele schwache. Gleichverteilt
     * sähe der Himmel aus wie gestreuter Sand.
     */
    const roh = zahl(saat, i, 2, 1);
    sterne.push({
      d: aufDerKappe(saat, i, kappe, 1),
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
 * gestreut und nach dem Abstand zu dieser Ebene ausgesiebt – dann krümmt
 * sich das Band von selbst richtig, sobald man den Kopf dreht, und niemand
 * muss eine Kurve zeichnen, die aus jedem anderen Blickwinkel falsch läge.
 *
 * Die Lage der Ebene hängt an der Saat: Jede Welt bekommt ihr eigenes Band.
 */
export function milchstrasse(
  saat: number,
  anzahl: number,
  einheit = 1,
  kappe: number = KAPPE,
  breite = 0.17,
): Himmelsstern[] {
  /* Die Senkrechte auf der Bandebene – einmal je Welt gezogen. */
  const a = zahl(saat, 0, 0, 7) * Math.PI * 2;
  const b = 0.35 + zahl(saat, 0, 1, 7) * 0.5;
  const n = { x: Math.cos(a) * Math.sin(b), y: Math.sin(a) * Math.sin(b), z: Math.cos(b) };

  const band: Himmelsstern[] = [];
  /*
   * Es wird mehr gezogen als gebraucht und ausgesiebt – der einfachste Weg,
   * eine ungleichmässige Verteilung aus einer gleichmässigen zu bekommen.
   * Die Schranke begrenzt die Arbeit, falls die Ebene ungünstig liegt.
   */
  const schranke = anzahl * 14;
  for (let i = 0; i < schranke && band.length < anzahl; i++) {
    const d = aufDerKappe(saat, i, kappe, 3);
    const weg = Math.abs(punktprodukt(d, n));
    if (weg > breite) continue;
    /* Zur Mitte des Bandes hin dichter und heller. */
    const naehe = 1 - weg / breite;
    if (zahl(saat, i, 3, 3) > naehe * 0.85 + 0.15) continue;
    band.push({
      d,
      r: (0.4 + zahl(saat, i, 4, 3) * 0.45) * einheit,
      helle: 0.06 + naehe * 0.3,
    });
  }
  return band;
}

/* =======================================================================
 * 4 · ZEICHNEN
 * ==================================================================== */

export interface Fleck extends Schirmlage {
  r: number;
  helle: number;
}

/**
 * Den Hintergrund für einen Blickwinkel auf den Schirm werfen.
 *
 * Was hinter einem liegt, fällt hier weg – und das ist der Grund, warum der
 * Hintergrund überhaupt bezahlbar ist: Gerechnet wird über alle paartausend
 * Sterne (ein paar Rechenschritte je Stern), gezeichnet nur über die
 * wenigen hundert, die gerade im Bild sind.
 */
export function imBild(
  sterne: readonly Himmelsstern[],
  blick: { rechts: Richtung; oben: Richtung; vorn: Richtung },
  f: number,
  rand: { breite: number; hoehe: number },
): Fleck[] {
  const drin: Fleck[] = [];
  const bx = rand.breite / 2;
  const by = rand.hoehe / 2;
  for (const s of sterne) {
    const lage = aufDenSchirm(s.d, blick, f);
    if (!lage) continue;
    if (lage.x < -bx || lage.x > bx || lage.y < -by || lage.y > by) continue;
    drin.push({ x: lage.x, y: lage.y, r: s.r, helle: s.helle });
  }
  return drin;
}

/**
 * Viele Punkte in **einem** Pfad.
 *
 * Tausend `<circle>` sind tausend Knoten im Dokument, und der Browser muss
 * jeden einzeln anlegen, ausmessen und verwalten. Als ein Pfad ist es ein
 * Knoten. Beim Wischen wird jeder Bildwechsel neu gebaut – da ist der
 * Unterschied nicht Bequemlichkeit, sondern der zwischen einer Bewegung,
 * die läuft, und einer, die hakt.
 *
 * Zwei Bögen je Punkt, weil ein voller Kreis als ein Bogen nicht geht:
 * Anfangs- und Endpunkt wären derselbe, und dann ist nicht bestimmt,
 * welchen Weg der Bogen nimmt.
 */
export function punktePfad(punkte: readonly Fleck[]): string {
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
  punkte: readonly Fleck[],
  stufen: number,
): { helle: number; punkte: Fleck[] }[] {
  if (punkte.length === 0 || stufen < 1) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const p of punkte) {
    min = Math.min(min, p.helle);
    max = Math.max(max, p.helle);
  }
  const spanne = max - min;

  const eimer: Fleck[][] = [];
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
