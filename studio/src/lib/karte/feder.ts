/**
 * Die Feder – warum eine Küstenlinie nicht überall gleich dick ist.
 *
 * ---
 *
 * **Was hier geändert wird und was ausdrücklich nicht.**
 *
 * `stil.ts` sagt es deutlich: *„Dragoncore ist ein Artbook, kein
 * Mittelaltermarkt. Die Karte darf ruhig sein, hell, mit dünnen Linien."*
 * Dieser Satz bleibt. Hier kommen keine Seeungeheuer, keine Windrose, kein
 * Pergament.
 *
 * Geändert wird genau eine Sache: Der Umriss einer Fläche wird nicht mehr
 * *gestrichen*, sondern *gezeichnet*. Eine gestrichene Linie hat überall
 * dieselbe Breite – das ist die Handschrift einer Maschine. Eine Feder wird
 * in der Kurve dicker und im Schwung dünner, weil die Hand dort länger
 * verweilt. Mehr ist es nicht, und mehr soll es nicht sein.
 *
 * ---
 *
 * **Warum eine Fläche und kein Strich.**
 *
 * SVG kann die Breite entlang eines Pfades nicht ändern; `stroke-width` gilt
 * für den ganzen Pfad. Die einzige Art, eine wechselnde Breite zu bekommen,
 * ist, die Linie als **Umriss** zu zeichnen: einmal an der einen Seite
 * entlang, zurück an der anderen, mit wechselndem Abstand zur Mitte.
 *
 * Das kostet mehr Punkte als ein Strich, und es ist der Grund, warum sonst
 * fast niemand es tut.
 *
 * ---
 *
 * **Warum der Seed.**
 *
 * Die Schwankung kommt aus Zufall – aber aus *demselben* Zufall, jedes Mal.
 * Jede Fläche trägt ihren `seed` ohnehin mit sich (siehe `Kartenfeature`),
 * und genau der wird hier benutzt. Ohne ihn bekäme die Küste bei jedem
 * Neuzeichnen eine neue Feder, und die Karte flimmerte unter dem Finger,
 * sobald man sie verschiebt. Ein Fehler, den man nicht sieht, sondern spürt –
 * dieselbe Sorte wie das Driften beim Zoomen weiter oben in `Weltkarte.tsx`.
 *
 * ---
 *
 * **Warum das Mass an der Strichbreite hängt.**
 *
 * Die Ausschläge sind Vielfache von `dick`, keine festen Zahlen. Wer morgen
 * `stil.strich` halbiert, bekommt eine halb so kräftige Feder und nicht eine
 * dünne Linie, die wild schlägt.
 */

import type { Punkt } from './modell';

/**
 * Die höchste Zahl Abtastpunkte für einen Zug.
 *
 * Nicht Geschmack, sondern Obergrenze: Eine Küste mit mehr Punkten als
 * diese kann niemand sehen, aber jeder Browser daran ersticken. Vier Ecken
 * je Punkt, also hier zweitausend Vierecke – mehr als genug für eine
 * Bildschirmbreite.
 */
const HOECHSTENS = 2000;

/** Der Umfang eines geschlossenen Umrisses. */
function laenge(pts: Punkt[]): number {
  let l = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    l += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return l;
}

/**
 * Derselbe Zufall, immer wieder.
 *
 * Ein eigener Generator und nicht `Math.random`: Letzterer lässt sich nicht
 * säen, und ohne Saat gibt es keine Wiederholbarkeit – siehe oben.
 */
function zufall(saat: number): () => number {
  let s = (saat >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Ein weiches Band über die Länge der Linie.
 *
 * Mehrere Schwingungen übereinander, die langsamste am stärksten. Das ist
 * der Unterschied zwischen einer Feder und einem Zittern: Eine Hand schwankt
 * in weiten Bögen, nicht von Punkt zu Punkt.
 */
function band(saat: number, wellen = 4): (t: number) => number {
  const r = zufall(saat);
  const st: { a: number; f: number; g: number }[] = [];
  for (let i = 0; i < wellen; i++) {
    st.push({ a: r() * Math.PI * 2, f: 1 + i * 1.7, g: 1 / (i + 1) });
  }
  const summe = st.reduce((s, w) => s + w.g, 0);
  return (t) => st.reduce((s, w) => s + w.g * Math.sin(t * w.f * Math.PI * 2 + w.a), 0) / summe;
}

/**
 * Punkte in gleichen Abständen.
 *
 * Ohne diesen Schritt schwankt die Feder dort am schnellsten, wo die Kontur
 * die meisten Punkte hat – und das ist nach `vereinfache` genau dort, wo sie
 * am krummsten ist. Die Schwankung gehört an die Länge, nicht an die
 * Punktzahl.
 */
export function gleichmaessig(pts: Punkt[], schritt: number): Punkt[] {
  if (pts.length < 2 || schritt <= 0) return pts;
  const aus: Punkt[] = [pts[0]];
  let rest = schritt;
  for (let i = 1; i <= pts.length; i++) {
    const ziel = pts[i % pts.length];
    let [ax, ay] = aus[aus.length - 1];
    let d = Math.hypot(ziel[0] - ax, ziel[1] - ay);
    let schutz = 0;
    while (d >= rest && schutz++ < 10000) {
      const t = rest / d;
      const p: Punkt = [ax + (ziel[0] - ax) * t, ay + (ziel[1] - ay) * t];
      aus.push(p);
      [ax, ay] = p;
      d = Math.hypot(ziel[0] - ax, ziel[1] - ay);
      rest = schritt;
    }
    rest -= d;
  }
  return aus;
}

/**
 * Der Federzug: ein geschlossener Umriss mit wechselnder Breite.
 *
 * Gibt die `d`-Angabe einer **Fläche** zurück, nicht eines Striches – sie
 * wird gefüllt, nicht gestrichen. Bei zu wenigen Punkten kommt eine leere
 * Zeichenkette: Ein Umriss aus zwei Punkten ist keiner, und ein leeres `d`
 * zeichnet nichts, statt etwas Falsches zu zeichnen.
 *
 * `schwankung` ist der Anteil, um den die Breite nach oben und unten geht;
 * 0 ergibt eine gleichmässige Linie, also genau das Verhalten von vorher.
 */
export function federzug(
  pts: Punkt[],
  dick: number,
  seed: number,
  schwankung = 0.55,
): string {
  if (pts.length < 3 || dick <= 0) return '';

  /*
   * **Der Abtastschritt hat zwei Schranken, nicht eine.**
   *
   * Die eine ist die Strichbreite: feiner als `dick * 2.5` lohnt nicht,
   * gröber zackt. Mit ihr allein ist der Schritt aber nach unten offen – bei
   * einer sehr feinen Strichbreite fällt er ins Bodenlose, und die Zahl der
   * Punkte steigt mit ihr.
   *
   * Gemessen, mit `dick = 1e-9` auf einem Umriss von 750 Einheiten Umfang:
   * **41 320 061 Zeichen** Pfadangabe. Ein Zähler je Abschnitt half nicht –
   * er begrenzt jedes Stück für sich, und vierzig begrenzte Stücke sind
   * immer noch vierhunderttausend Punkte.
   *
   * Die zweite Schranke hängt deshalb am Umfang: Mehr als `HOECHSTENS`
   * Punkte braucht keine Linie, die jemand ansieht. Wer feiner malt, zoomt –
   * und dann ist der Umfang im Kartenmass derselbe, aber der Strich auch.
   */
  const umfang = laenge(pts);
  const schritt = Math.max(dick * 2.5, umfang / HOECHSTENS, 1e-6);
  const p = gleichmaessig(pts, schritt);
  if (p.length < 3) return '';

  const breite = band(seed, 4);
  const schlag = band(seed + 7919, 3);
  const n = p.length;

  const links: Punkt[] = [];
  const rechts: Punkt[] = [];
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n];
    const c = p[(i + 1) % n];
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    /* Die Normale – quer zur Laufrichtung. */
    const nx = -dy / l;
    const ny = dx / l;

    const t = i / n;
    /*
     * Die Mitte wandert leicht quer zur Linie. Das ist der Teil, den man
     * für „von Hand" hält – nicht die Breite.
     */
    const mx = p[i][0] + nx * schlag(t) * dick * 0.6;
    const my = p[i][1] + ny * schlag(t) * dick * 0.6;

    const h = Math.max(dick * 0.2, dick * (1 + schwankung * breite(t))) / 2;
    links.push([mx + nx * h, my + ny * h]);
    rechts.push([mx - nx * h, my - ny * h]);
  }

  const zu = (q: Punkt) => q[0].toFixed(2) + ' ' + q[1].toFixed(2);
  /*
   * **Ein Viereck je Abschnitt, nicht zwei lange Ringe.**
   *
   * Der naheliegende Bau wäre: einmal an der einen Seite entlang, zurück an
   * der anderen – ein Pfad aus zwei Ringen. Er hat eine bekannte Schwäche.
   * An jeder Ecke, die schärfer ist als der Versatz breit, überschlägt sich
   * die innere Seite; die Schleife läuft dann gegen den Ring, und die
   * Füllregel `nonzero` zählt sie als Loch. Aus einer Linie werden Lücken.
   *
   * **Ehrlichkeitshalber:** Ich habe das hier nicht beobachtet. Beim ersten
   * Blick im Browser sah die Kante gestrichelt aus, und ich hielt das für
   * diesen Fehler – es war die Auswahlmarkierung (`stil.wahl`, gestrichelt
   * und doppelt so dick), die über derselben Kante liegt. Der Überschlag ist
   * trotzdem echte Geometrie und keine Vermutung; er hängt nur davon ab, wie
   * scharf eine gemalte Küste wird.
   *
   * Hier liegt deshalb ein eigenes Viereck zwischen je zwei Punkten, alle im
   * selben Umlaufsinn. Überlappende Flächen gleicher Richtung vereinigen
   * sich unter `nonzero`; ein Überschlag kann nichts mehr wegnehmen, weil es
   * nichts gibt, wogegen er zählt. Die Frage stellt sich gar nicht erst.
   *
   * Es kostet viermal so viele Punkte wie zwei Ringe. Das ist der Preis
   * dafür, eine ganze Fehlerklasse nicht haben zu müssen.
   */
  const stuecke: string[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    stuecke.push(
      `M${zu(links[i])} L${zu(links[j])} L${zu(rechts[j])} L${zu(rechts[i])} Z`,
    );
  }
  return stuecke.join(' ');
}
