/**
 * Das Gebirge – aus einem Strich wird ein Höhenzug.
 *
 * ---
 *
 * **Was hier entsteht, ist eine Funktion und kein Bild.**
 *
 * `hoeheBei(x, y, kamm)` beantwortet für jeden Ort der Karte: Wie hoch ist
 * es hier? Mehr nicht. Was daraus gezeichnet wird – Schattierung heute,
 * gemalte Bergbilder später –, steht woanders.
 *
 * Diese Trennung ist nicht Ordnungsliebe. Sie ist die Antwort auf zwei
 * Forderungen, die sich sonst widersprechen:
 *
 *   · **Dieselbe Geometrie ergibt dieselbe Landschaft.** Eine Funktion vom
 *     Ort tut das von selbst; eine Folge von Zufallszahlen müsste man
 *     speichern, und gespeicherte Gipfel wären eine zweite Wahrheit.
 *   · **Kleine Änderungen wirken nur lokal.** Wer einen Punkt des Kamms
 *     verschiebt, ändert die Antwort nur dort, wo dieser Punkt der nächste
 *     ist. Der Rest des Gebirges antwortet weiter wie vorher.
 *
 * ---
 *
 * **Warum nichts an der Bogenlänge hängt.**
 *
 * Der naheliegende Weg wäre, die Gipfel entlang des Kamms zu verteilen:
 * alle siebzig Einheiten einer, mit `rauschen(seed, t)`. Das wäre genau der
 * Fehler, vor dem `zufall.ts` in seinem Kopf warnt. Wer vorn einen Punkt
 * einfügt, verschiebt jede Bogenlänge dahinter – und damit jeden Gipfel.
 * Eine Handbreit am Westende, und das Ostende sähe anders aus.
 *
 * Gefragt wird deshalb am **Fusspunkt**: an der Stelle des Kamms, die diesem
 * Ort am nächsten liegt, in Weltkoordinaten. Die bleibt, wo sie ist, wenn
 * anderswo gezogen wird.
 *
 * ---
 *
 * **Woraus ein Gebirge besteht.**
 *
 * ```
 * Profil        quer zum Kamm – hoch am Grat, aus am Fuss
 * Kammhöhe      entlang des Kamms – Gipfel und Sättel
 * Rücken        Nebenrücken und die Täler dazwischen, zum Hang hin stärker
 * Zerklüftung   feine Grate und Kerben, überall
 * ```
 *
 * Die dritte Lage wird **zum Grat hin ausgeblendet**. Ohne das zerfiele der
 * Höhenzug genau dort, wo er zusammenhängen muss, und am Ende stünde eine
 * Reihe nebeneinandergestellter Berge statt eines Gebirges.
 */

import type { Punkt } from './modell';
import { grat, rauschen2 } from './zufall';

export type { Gebirgskamm } from './modell';
import type { Gebirgskamm } from './modell';

/**
 * Die Maschenweiten, im Kartenmaß.
 *
 * Sie sind die eigentliche Gestaltung dieser Datei, und sie stehen deshalb
 * oben und nicht verstreut in den Formeln.
 */
export const GEBIRGE = {
  /** Abstand der Gipfel entlang des Kamms. */
  gipfel: 118,
  /** Breite der Nebenrücken und Täler. */
  ruecken: 33,
  /** Feinheit der Grate und Kerben. */
  kerbe: 17,
  /** Wie stark die Breite des Zuges entlang des Kamms schwankt. */
  schwankung: 0.34,
  /**
   * Wie weit der Fusspunkt an einem Knick gemittelt wird, als Anteil der
   * Breite. Siehe `fusspunktAus`: Hieran hängt, wie weit ein Abschnitt
   * überhaupt wirken kann – und damit, was `gebirgsfeld` weglassen darf.
   */
  weichheit: 0.3,
  /**
   * Wie hoch ein Gebirge im Kartenmaß steigt, bei `hoehe = 1`.
   *
   * Gebraucht für die Schattierung: Eine Neigung ergibt sich erst, wenn
   * Höhe und Breite dasselbe Mass haben.
   */
  vollhoehe: 118,
};

/**
 * Der nächste Punkt auf dem Kamm – und wie weit er weg ist.
 *
 * Nicht die Bogenlänge, sondern der **Ort**. Siehe oben: Daran hängt die
 * ganze Lokalität.
 */
/*
 * Zwei Zwischenlager, einmal angelegt.
 *
 * `fusspunkt` läuft pro Kachel zehntausende Male; eine Liste je Aufruf wäre
 * die teuerste Zeile des ganzen Gebirges. Die Länge wächst mit, wenn ein
 * Kamm mehr Abschnitte hat, und schrumpft nie wieder – das ist gewollt.
 */
let lagerQ = new Float64Array(256);
let lagerD = new Float64Array(128);

export function fusspunkt(
  x: number,
  y: number,
  punkte: Punkt[],
): { d: number; fx: number; fy: number } {
  return fusspunktAus(x, y, abschnitteAus(punkte));
}

/**
 * Dieselbe Rechnung über eine **vorbereitete Abschnittsliste**.
 *
 * Je vier Zahlen ein Abschnitt: ax, ay, bx, by. Das ist nicht hübscher,
 * sondern schneller und vor allem **filterbar**: Eine Kachel am Ostende der
 * Karte muss die Abschnitte am Westende nicht durchrechnen, und bei einem
 * Kamm aus fünfundvierzig Abschnitten ist das der Unterschied zwischen
 * einundfünfzig und wenigen Millisekunden je Kachel.
 *
 * Eine Punktliste liesse sich nicht filtern: Wer mittendrin Abschnitte
 * weglässt, verbindet die Reste zu einer Linie, die es nie gab.
 */
export function abschnitteAus(punkte: Punkt[]): Float64Array {
  const n = Math.max(0, punkte.length - 1);
  const a = new Float64Array(n * 4);
  for (let i = 0; i < n; i++) {
    a[i * 4] = punkte[i][0];
    a[i * 4 + 1] = punkte[i][1];
    a[i * 4 + 2] = punkte[i + 1][0];
    a[i * 4 + 3] = punkte[i + 1][1];
  }
  return a;
}

export function fusspunktAus(
  x: number,
  y: number,
  abschnitte: Float64Array,
  weichMax = Infinity,
): { d: number; fx: number; fy: number } {
  const n = abschnitte.length / 4;
  if (n >= lagerD.length) {
    lagerD = new Float64Array(n * 2);
    lagerQ = new Float64Array(n * 4);
  }

  let beste = Infinity;
  let fx = abschnitte[0] ?? 0;
  let fy = abschnitte[1] ?? 0;
  for (let i = 0; i < n; i++) {
    const ax = abschnitte[i * 4];
    const ay = abschnitte[i * 4 + 1];
    const dx = abschnitte[i * 4 + 2] - ax;
    const dy = abschnitte[i * 4 + 3] - ay;
    const laenge = dx * dx + dy * dy;
    const t = laenge ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / laenge)) : 0;
    const qx = ax + t * dx;
    const qy = ay + t * dy;
    const d = Math.hypot(qx - x, qy - y);
    lagerQ[i * 2] = qx;
    lagerQ[i * 2 + 1] = qy;
    lagerD[i] = d;
    if (d < beste) {
      beste = d;
      fx = qx;
      fy = qy;
    }
  }

  /*
   * **Der Fusspunkt wird gemittelt, der Abstand nicht.**
   *
   * Der nächste Punkt springt: Auf der Innenseite eines Knicks sind zwei
   * Abschnitte gleich weit weg, und einen Schritt weiter gewinnt der andere.
   * Der *Abstand* ändert sich dabei stetig – die *Stelle* nicht. Und weil
   * an ihr das Rauschen für Gipfel und Rücken hängt, sprang mit ihr das
   * halbe Gebirge: Im Bild lief von jedem Knick ein harter Strahl quer
   * durch den Zug, hell auf der einen und dunkel auf der anderen Seite.
   *
   * Gemittelt wird deshalb über alle Abschnitte, gewichtet danach, wie nah
   * sie dran sind. Wo einer klar der nächste ist, kommt praktisch er allein
   * heraus; an einem Knick gehen zwei weich ineinander über.
   *
   * Der Abstand bleibt das echte Minimum – er bestimmt das Profil, und ein
   * gemittelter Abstand machte das Gebirge an jedem Knick flacher.
   */
  if (n > 1) {
    /*
     * **Die Weichheit ist nach oben begrenzt, und die Reichweite damit auch.**
     *
     * Ohne Deckel wächst sie mit dem Abstand: Weit draussen mittelte ein Ort
     * über den halben Kamm. Das ist für sich harmlos – aber es macht den
     * Einfluss eines Abschnitts **unbegrenzt**, und dann darf ihn keine
     * Kachel weglassen. `gebirgsfeld` lässt aber weg, was weit weg ist, und
     * so bekam dieselbe Stelle in zwei Nachbarkacheln zwei verschiedene
     * Antworten: eine senkrechte Naht quer durch das Relief, genau auf der
     * Kachelgrenze.
     *
     * Mit Deckel ist der Einfluss nach `3 × weich` praktisch null (e⁻⁹),
     * und der Filter dort drüben rechnet mit genau diesem Mass.
     */
    const weich = Math.max(1e-6, Math.min(beste * 0.5 + 1.5, weichMax));
    const reichweite = beste + 3 * weich;
    let summe = 0;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < n; i++) {
      if (lagerD[i] > reichweite) continue;
      const u = (lagerD[i] - beste) / weich;
      const g = Math.exp(-u * u);
      summe += g;
      mx += lagerQ[i * 2] * g;
      my += lagerQ[i * 2 + 1] * g;
    }
    if (summe > 0) {
      fx = mx / summe;
      fy = my / summe;
    }
  }

  /* Keine Abschnitte heisst: unendlich weit weg, also kein Gebirge. */
  if (!n) return { d: Infinity, fx, fy };
  return { d: beste, fx, fy };
}

/** Der Kasten, den ein Gebirgszug samt Hängen einnimmt. */
export function gebirgskasten(k: Gebirgskamm): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of k.punkte) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  /* Die Breite schwankt nach oben – sonst wäre der Kasten manchmal zu klein. */
  const rand = k.breite * (1 + GEBIRGE.schwankung) + 2;
  return { x0: x0 - rand, y0: y0 - rand, x1: x1 + rand, y1: y1 + rand };
}

/**
 * Wie hoch ist es an diesem Ort? 0 bis 1, mal `kamm.hoehe`.
 *
 * Reine Rechnung: keine Zustände, keine Reihenfolge, kein Speicher. Zweimal
 * dasselbe gefragt, zweimal dieselbe Antwort – auf jedem Gerät.
 */
export function hoeheBei(x: number, y: number, k: Gebirgskamm): number {
  if (k.punkte.length < 2) return 0;
  return hoeheAus(x, y, k, abschnitteAus(k.punkte));
}

/**
 * Die Rechnung selbst, über eine vorbereitete Abschnittsliste.
 *
 * `hoeheBei` ist der schlichte Weg dorthin und bleibt die Fassung, an der
 * sich alles messen lässt; `gebirgsfeld` ist der schnelle. Dass beide
 * dasselbe ergeben, ist geprüft – sonst wäre der schnelle Weg eine zweite
 * Wahrheit.
 */
export function hoeheAus(
  x: number,
  y: number,
  k: Gebirgskamm,
  abschnitte: Float64Array,
): number {
  const { d, fx, fy } = fusspunktAus(x, y, abschnitte, k.breite * GEBIRGE.weichheit);
  /* Früh draussen: Das ist die Abkürzung, die das Ganze bezahlbar macht. */
  const hoechstens = k.breite * (1 + GEBIRGE.schwankung);
  if (d >= hoechstens) return 0;

  /*
   * **Die Breite schwankt entlang des Kamms.**
   *
   * Ein Höhenzug von überall gleicher Breite sieht aus wie ein Wulst. Die
   * Schwankung hängt am Fusspunkt und nicht am Ort, damit beide Hänge
   * derselben Stelle gleich weit reichen – sonst stünde der Kamm nicht in
   * der Mitte seines eigenen Gebirges.
   */
  const breite = k.breite * (1 + GEBIRGE.schwankung * (rauschen2(k.seed, fx, fy, GEBIRGE.ruecken * 2, 11) * 2 - 1));
  if (d >= breite) return 0;
  const u = d / breite;

  /*
   * Das Profil quer zum Kamm: scharf oben, weich auslaufend. Der zweite
   * Faktor sorgt dafür, dass die Neigung am Fuss auf null geht – ohne ihn
   * hätte jedes Gebirge eine Stufe am Rand, und die Schattierung zöge dort
   * eine Linie, die es nicht gibt.
   */
  const profil = Math.pow(1 - u, 1.6) * (1 - u * u);

  /*
   * Gipfel und Sättel: am Fusspunkt gefragt, also entlang des Kamms, aber
   * in Weltkoordinaten. `grat` statt `rauschen2`, damit Gipfel spitz sind
   * und nicht rund.
   */
  const kammhoehe = 0.3 + 0.7 * grat(k.seed, fx, fy, GEBIRGE.gipfel, 3, 1);

  /*
   * Nebenrücken und Täler – **am Fusspunkt gefragt, nicht am Ort.**
   *
   * Hier stand `grat(seed, x, y, …)`, also ein Rauschen in der Fläche. Das
   * ergibt Flecken in beliebiger Richtung, und gerendert sah der ganze Zug
   * aus wie eine bröckelnde Stufe – gemessen war das Höhenfeld richtig
   * (Grat 0,26 bis 0,73, Hang 0,00 bis 0,54), es lief nur in die falsche
   * Richtung.
   *
   * Ein Nebenrücken läuft **bergab**, also quer zum Kamm. Am Fusspunkt
   * gefragt, ist der Wert entlang einer solchen Falllinie konstant und
   * ändert sich nur, wenn man am Kamm entlanggeht: Genau daraus entstehen
   * Rippen und die Rinnen dazwischen.
   *
   * Ein kleiner Teil kommt trotzdem aus der Fläche. Ohne ihn wären beide
   * Hänge exakt gespiegelt, und eine gespiegelte Landschaft sieht man
   * sofort, ohne zu wissen, woran.
   */
  const laengs = grat(k.seed, fx, fy, GEBIRGE.ruecken, 7, 1);
  const streu = grat(k.seed, x, y, GEBIRGE.ruecken * 1.7, 23, 1);
  const quer = laengs * 0.72 + streu * 0.28;

  /*
   * **Am Hang voll, am Grat gar nicht.**
   *
   * Das ist die eine Zeile, die darüber entscheidet, ob ein Gebirge
   * zusammenhängt. Griffe diese Lage auch am Grat durch, risse sie den
   * Höhenzug an jedem Tal durch, und übrig bliebe eine Reihe einzelner
   * Berge.
   */
  const amHang = Math.min(1, u * 1.7);
  const ruecken = 1 + (quer - 0.5) * 1.2 * amHang;

  /*
   * Zerklüftung: feine Kerben, überall – auch auf dem Grat, denn ein
   * zerrissener Grat ist der Sinn der Sache. Nach unten begrenzt, damit sie
   * den Zug nie ganz durchschneidet.
   */
  const kerben = 1 - k.zerkluftung * 0.42 * (1 - grat(k.seed, x, y, GEBIRGE.kerbe, 13));

  const h = profil * kammhoehe * ruecken * kerben * k.hoehe;
  return h > 0 ? (h < 1 ? h : 1) : 0;
}

/**
 * Ein Höhenfeld für einen **Ausschnitt** – der schnelle Weg.
 *
 * ---
 *
 * **Warum es ihn gibt.** Gemessen, bevor es ihn gab: **51 ms je
 * Reliefkachel**, bei einem Bildbudget von acht. Jede der sechzehntausend
 * Proben einer Kachel ging alle fünfundvierzig Abschnitte des Kamms durch –
 * auch die am anderen Ende der Karte, die auf diese Kachel keinen Einfluss
 * haben können.
 *
 * Hier wird einmal je Kachel vorsortiert: Welcher Zug reicht überhaupt
 * herein, und von ihm welche Abschnitte. Was weiter weg liegt als die
 * Breite des Zuges, kann nichts beitragen – dort ist die Höhe null.
 *
 * Das Ergebnis ist **dasselbe** wie bei `hoeheUeberall`. Das ist keine
 * Hoffnung, sondern geprüft; ein schnellerer Weg, der leise etwas anderes
 * rechnet, wäre eine zweite Wahrheit.
 */
export function gebirgsfeld(
  kaemme: Gebirgskamm[],
  kasten: { x0: number; y0: number; x1: number; y1: number },
): (x: number, y: number) => number {
  const nah: { k: Gebirgskamm; a: Float64Array }[] = [];
  for (const k of kaemme) {
    if (k.punkte.length < 2) continue;
    /*
     * Die Reichweite eines Abschnitts: so weit, wie er überhaupt Höhe
     * erzeugt, **plus** so weit, wie er den Fusspunkt noch mitzieht. Die
     * zweite Hälfte ist der Grund, warum hier nicht die blosse Breite
     * steht – ohne sie lag an jeder Kachelgrenze eine senkrechte Naht.
     */
    const reichweite =
      k.breite * (1 + GEBIRGE.schwankung) + 3 * k.breite * GEBIRGE.weichheit;
    const kk = gebirgskasten(k);
    if (kk.x1 < kasten.x0 || kk.x0 > kasten.x1) continue;
    if (kk.y1 < kasten.y0 || kk.y0 > kasten.y1) continue;

    const roh: number[] = [];
    for (let i = 1; i < k.punkte.length; i++) {
      const [ax, ay] = k.punkte[i - 1];
      const [bx, by] = k.punkte[i];
      /*
       * Der Kasten dieses einen Abschnitts, um die Reichweite geweitet.
       * Berührt er die Kachel nicht, trägt der Abschnitt nichts bei – auch
       * nicht zur weichen Mittelung, denn die gewichtet mit dem Abstand zum
       * nächsten und fällt lange vorher auf null.
       */
      const sx0 = Math.min(ax, bx) - reichweite;
      const sx1 = Math.max(ax, bx) + reichweite;
      const sy0 = Math.min(ay, by) - reichweite;
      const sy1 = Math.max(ay, by) + reichweite;
      if (sx1 < kasten.x0 || sx0 > kasten.x1) continue;
      if (sy1 < kasten.y0 || sy0 > kasten.y1) continue;
      roh.push(ax, ay, bx, by);
    }
    if (roh.length) nah.push({ k, a: Float64Array.from(roh) });
  }

  if (!nah.length) return () => 0;
  return (x, y) => {
    let h = 0;
    for (const { k, a } of nah) {
      const n = hoeheAus(x, y, k, a);
      if (n > h) h = n;
    }
    return h;
  };
}

/**
 * Die Höhe über alle Züge.
 *
 * **Das Maximum und keine Summe.** Zwei sich kreuzende Gebirge ergeben kein
 * doppelt so hohes Gebirge; sie ergeben dort, wo sie sich treffen, das
 * höhere von beiden. Eine Summe hätte an jeder Kreuzung einen Turm.
 */
export function hoeheUeberall(x: number, y: number, kaemme: Gebirgskamm[]): number {
  let h = 0;
  for (const k of kaemme) {
    const n = hoeheBei(x, y, k);
    if (n > h) h = n;
  }
  return h;
}

/**
 * Aus einem Fingerzug einen Kamm machen.
 *
 * ---
 *
 * **Warum ausgedünnt wird.** Ein Finger hinterlässt Hunderte Punkte, oft
 * zwei auf demselben Fleck. `hoeheBei` geht für **jeden** gefragten Ort
 * jedes Segment durch; ein Kamm aus dreihundert Segmenten kostet also
 * dreissigmal so viel wie einer aus zehn – und sieht genauso aus, denn ein
 * Gebirge von sechzig Einheiten Breite merkt sich keine Zacke von zwei.
 *
 * Ausgedünnt wird nach **Abstand** und nicht nach Krümmung: Ein
 * Krümmungsverfahren behält die Ecken und wirft die Geraden weg, was für
 * eine Küste richtig ist. Hier ist das Gegenteil richtig – die Zacken einer
 * zitternden Hand sind keine Gestaltung, sondern Zittern.
 *
 * Der letzte Punkt bleibt immer erhalten: Ein Kamm, der kurz vor dem Ende
 * des Striches aufhört, fühlt sich an, als hätte das Werkzeug nicht
 * zugehört.
 */
export function kammAus(spur: Punkt[], mindestens = 9): Punkt[] | undefined {
  if (spur.length < 2) return undefined;
  const aus: Punkt[] = [spur[0]];
  for (const p of spur.slice(1)) {
    const letzter = aus[aus.length - 1];
    if (Math.hypot(p[0] - letzter[0], p[1] - letzter[1]) >= mindestens) aus.push(p);
  }
  const ende = spur[spur.length - 1];
  const letzter = aus[aus.length - 1];
  if (letzter[0] !== ende[0] || letzter[1] !== ende[1]) {
    /* Ein Endpunkt dicht am vorletzten ersetzt ihn, statt ihn zu verdoppeln. */
    if (aus.length > 1 && Math.hypot(ende[0] - letzter[0], ende[1] - letzter[1]) < mindestens * 0.5) {
      aus[aus.length - 1] = ende;
    } else {
      aus.push(ende);
    }
  }
  /* Ein Tippen ist kein Gebirge. */
  if (aus.length < 2) return undefined;
  const laenge = aus.reduce(
    (summe, p, i) => (i ? summe + Math.hypot(p[0] - aus[i - 1][0], p[1] - aus[i - 1][1]) : 0),
    0,
  );
  return laenge >= mindestens * 1.5 ? aus : undefined;
}

/** Der Kamm als offener SVG-Pfad – für Fangbereich und Auswahl. */
export function kammPfad(punkte: Punkt[]): string {
  if (punkte.length < 2) return '';
  return `M${punkte.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}`;
}
