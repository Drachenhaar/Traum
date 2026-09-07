/**
 * Das Relief – dieselbe Karte, erhoben.
 *
 * ---
 *
 * **Warum das keine Umwandlung ist.**
 *
 * Gefragt war: „Wie können wir die 2D-Karte automatisch in eine 3D-Grafik
 * umwandeln?" Die naheliegende Antwort wäre ein Tiefenmodell gewesen, das aus
 * den Bildpunkten eine Höhe *rät*. Sie wäre hier falsch.
 *
 * Denn diese Karte ist kein Bild. `modell.ts` sagt es im ersten Satz: eine
 * Liste von Flächen, die eine Bedeutung tragen, und die Darstellung wird
 * daraus erzeugt. **Die Karte weiß, was Wasser ist.** Ein Tiefenmodell müsste
 * es erraten – und würde dabei genau die Bedeutung wegwerfen, die schon
 * dasteht.
 *
 * Also wird nichts umgewandelt. Es wird ein **zweiter Anstrich** über
 * dieselben Daten gelegt. Dieselbe Trennung wie beim Buchzeichen (Form gegen
 * Material) und bei der Anmutung (Inhalt gegen Satz) – in diesem Projekt
 * inzwischen das vierte Mal, und jedes Mal aus demselben Grund.
 *
 * ---
 *
 * **Warum Isometrie und kein echtes 3D.**
 *
 * Ein sich drehendes Gelände wäre ein Spiel. Die erste Regel dieser Welt
 * heißt „Ruhe vor Spektakel", und ein Artbook, das plötzlich eine Kamera
 * bekommt, ist ein anderes Buch.
 *
 * Was hier entsteht, ist ein **gezeichnetes Relief**: der Blick eines alten
 * Atlas auf ein Papiermodell, mit denselben dünnen Linien wie die Karte
 * daneben. Es kostet keine einzige neue Abhängigkeit, es druckt, und es läuft
 * auf jedem Gerät – SVG, mehr nicht.
 *
 * ---
 *
 * **Die Rechnung, in drei Sätzen.**
 *
 * 1. Jede Fläche bekommt eine Höhe aus ihrer eigenen Gestalt: wie *dick* sie
 *    ist. Eine breite Landmasse steigt, eine schmale Landzunge bleibt flach.
 * 2. Alles wird isometrisch projiziert – `x' = (x−y)·cos30`,
 *    `y' = (x+y)·sin30 − h`.
 * 3. Gezeichnet wird von hinten nach vorn. Ohne diese Reihenfolge steht der
 *    Berg vor dem Tal, das ihn verdeckt.
 */

import { FELD, type Kartenfeature, type Punkt } from './modell';

/* ========================================================================
 * DIE MASSE
 *
 * Alle Höhen im Kartenmaß 0…1000, damit sie mit den Flächen mitwachsen.
 * ===================================================================== */

export const RELIEF = {
  /**
   * Wie hoch die dickste Landmasse steigt.
   *
   * Sieben Prozent des Feldes. Mehr sah aus wie ein Tortenstück: Bei zwölf
   * Prozent stand die Wand höher als die Fläche breit war, und aus einer
   * Landschaft wurde ein Klotz.
   */
  land: 70,
  /** Wald liegt auf dem Land – eine Handbreit darüber, nicht mehr. */
  wald: 14,
  /**
   * Wasser sinkt, statt bei null zu bleiben.
   *
   * Bliebe es auf der Grundfläche, sähe man vom Wasser nur eine Linie – und
   * eine Karte, in der man das Meer nicht sieht, ist keine.
   */
  wasser: -26,
  /**
   * Ab welcher Dicke eine Fläche ihre volle Höhe erreicht.
   *
   * Gemessen als Abstand vom Rand nach innen. Eine Fläche, deren innerster
   * Punkt hundert Einheiten von der Küste entfernt liegt, ist ein Land; alles
   * Dünnere ist eine Zunge und bleibt anteilig flacher.
   */
  volleDicke: 120,
  /** Der Neigungswinkel. Dreissig Grad ist die Isometrie, die jeder kennt. */
  cos30: Math.cos(Math.PI / 6),
  sin30: Math.sin(Math.PI / 6),
} as const;

/* ========================================================================
 * DIE HÖHE
 * ===================================================================== */

/** Der kürzeste Abstand eines Punktes zu einer Strecke. */
function abstandZurStrecke(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const laenge = dx * dx + dy * dy;
  if (laenge === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / laenge;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Liegt der Punkt in der Fläche? Strahlensatz, ungerade Zahl von Kreuzungen. */
export function imPolygon(x: number, y: number, poly: Punkt[]): boolean {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}

/** Abstand zum nächsten Rand – ausserhalb der Fläche null. */
function abstandZumRand(x: number, y: number, poly: Punkt[]): number {
  if (!imPolygon(x, y, poly)) return 0;
  let kleinster = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const d = abstandZurStrecke(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]);
    if (d < kleinster) kleinster = d;
  }
  return kleinster;
}

export function kasten(poly: Punkt[]) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

/**
 * Wie dick eine Fläche ist – der grösste Abstand vom Rand nach innen.
 *
 * ---
 *
 * **Warum die Dicke und nicht die Fläche.**
 *
 * Der Flächeninhalt wäre die bequemere Zahl und die falsche: Eine lange,
 * schmale Halbinsel kann denselben Inhalt haben wie eine runde Insel, ist aber
 * offensichtlich kein Gebirge. Die Dicke misst, was das Auge sieht – wie weit
 * man vom Wasser weg ins Land hineinkommt.
 *
 * Gerechnet wird auf einem Raster statt exakt. Das ist Absicht: Die exakte
 * Antwort ist die Mittelachse eines Polygons, und die ist ein eigenes
 * Forschungsgebiet. Ein Raster von 24 Schritten über den Kasten trifft bei
 * einer gemalten Küste auf zwei Prozent genau – und dieser Wert steuert eine
 * Höhe, keine Grundbuchgrenze.
 */
export function dicke(poly: Punkt[], schritte = 24): number {
  if (poly.length < 3) return 0;
  const { x0, y0, x1, y1 } = kasten(poly);
  const sx = (x1 - x0) / schritte;
  const sy = (y1 - y0) / schritte;
  if (sx <= 0 || sy <= 0) return 0;

  let groesster = 0;
  for (let i = 0; i <= schritte; i++) {
    for (let j = 0; j <= schritte; j++) {
      const d = abstandZumRand(x0 + i * sx, y0 + j * sy, poly);
      if (d > groesster) groesster = d;
    }
  }
  return groesster;
}

/**
 * Die Höhe einer Fläche.
 *
 * Rein und unveränderlich: dieselbe Fläche ergibt immer dieselbe Höhe. Das ist
 * dieselbe Zusage wie bei `baeume()` – wer die Karte neu lädt, sieht dasselbe
 * Gebirge und nicht ein neues.
 */
export function hoeheVon(feature: Kartenfeature): number {
  if (feature.art === 'wasser') return RELIEF.wasser;
  const anteil = Math.min(1, dicke(feature.punkte) / RELIEF.volleDicke);
  /*
   * Weich einsteigen, nicht linear.
   *
   * Linear standen die flachen Flächen alle auf fast derselben Höhe und die
   * Küsten wirkten wie abgeschnitten. `t²(3−2t)` lässt sie am Rand sanft
   * ansetzen – dieselbe Kurve, mit der auch die Übergänge im Buch weich sind.
   */
  const weich = anteil * anteil * (3 - 2 * anteil);
  const grund = RELIEF.land * weich;
  return feature.art === 'wald' ? grund + RELIEF.wald : grund;
}

/* ========================================================================
 * DIE PROJEKTION
 * ===================================================================== */

/**
 * Ein Punkt der Karte, isometrisch gesehen.
 *
 * Die Höhe zieht **nach oben**, also von `y` ab – in SVG wächst y nach unten.
 * Das ist der eine Vorzeichenfehler, den man bei dieser Rechnung macht, und
 * er sieht aus wie ein Loch statt eines Berges.
 */
export function iso(x: number, y: number, h = 0): Punkt {
  return [(x - y) * RELIEF.cos30, (x + y) * RELIEF.sin30 - h];
}

/**
 * Das Sichtfeld – so eng wie möglich um das, was dasteht.
 *
 * ---
 *
 * **Warum nicht einfach das ganze Feld.**
 *
 * Der erste Anlauf nahm die vier Ecken des Kartenfeldes. Das war richtig
 * gerechnet und im Bild eine Enttäuschung: Eine Raute über einem Quadrat ist
 * doppelt so breit wie hoch, und eine gemalte Insel in der Mitte davon nahm
 * auf dem Telefon ein Drittel der Höhe ein. Man sah vor allem Papier.
 *
 * Also wird um den **Inhalt** gerahmt, nicht um das Feld. Die Grundplatte darf
 * dabei angeschnitten werden – sie sagt „hier hört die Welt auf", und dafür
 * genügt, dass man ihre Kanten ahnt.
 *
 * Solange nichts gemalt ist, gibt es keinen Inhalt: Dann rahmt das Feld, sonst
 * stünde eine leere Karte ohne jeden Anhaltspunkt da.
 */
export function reliefSicht(
  kaesten: { x0: number; y0: number; x1: number; y1: number }[],
): { x: number; y: number; w: number; h: number } {
  const platte: Punkt[] = [iso(0, 0), iso(FELD, 0), iso(FELD, FELD), iso(0, FELD)];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;

  const nimm = (x: number, y: number) => {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  };

  if (kaesten.length) {
    for (const k of kaesten) {
      nimm(k.x0, k.y0);
      nimm(k.x1, k.y1);
    }
  } else {
    for (const [x, y] of platte) nimm(x, y);
  }

  const luft = Math.max(x1 - x0, y1 - y0) * 0.06;
  return { x: x0 - luft, y: y0 - luft, w: x1 - x0 + luft * 2, h: y1 - y0 + luft * 2 };
}

/**
 * Der Kasten einer erhobenen Fläche im Reliefraum.
 *
 * Gerechnet über die projizierten Punkte auf **beiden** Höhen: Der Fuss steht
 * weiter unten als die Deckfläche, und wer nur die Deckfläche misst, schneidet
 * die Wand ab, die er gerade gezeichnet hat.
 */
export function reliefKasten(poly: Punkt[], hoehe: number) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of poly) {
    for (const h of [0, hoehe]) {
      const [px, py] = iso(x, y, h);
      if (px < x0) x0 = px;
      if (py < y0) y0 = py;
      if (px > x1) x1 = px;
      if (py > y1) y1 = py;
    }
  }
  return { x0, y0, x1, y1 };
}

/* ========================================================================
 * DIE REIHENFOLGE
 * ===================================================================== */

/**
 * Wie weit hinten eine Fläche liegt.
 *
 * In der Isometrie liegt weiter hinten, was kleineres `x + y` hat. Genommen
 * wird der **hinterste** Punkt der Fläche und nicht ihre Mitte: Eine grosse
 * Fläche, deren Mitte weit vorn liegt, reicht trotzdem weit nach hinten – nach
 * der Mitte sortiert überdeckte sie dort alles, was hinter ihr steht.
 */
export function tiefe(poly: Punkt[]): number {
  let kleinstes = Infinity;
  for (const [x, y] of poly) {
    const s = x + y;
    if (s < kleinstes) kleinstes = s;
  }
  return kleinstes;
}

/**
 * Von hinten nach vorn – und **nur** danach.
 *
 * ---
 *
 * **Hier stand einmal „und Wasser zuerst".**
 *
 * Die Begründung klang zwingend: Wasser liegt unter allem, also gehört es in
 * die erste Runde. Im Bild fehlte es daraufhin vollständig. Der See lag
 * mitten im Land, wurde zuerst gezeichnet – und die Deckfläche des Landes
 * malte ihn zu.
 *
 * Der Fehler war, eine Bedeutung über die Geometrie zu stellen. In einer
 * Aufsicht von schräg oben entscheidet allein, was weiter hinten liegt: Eine
 * Senke *in* einer Fläche liegt weiter vorn als deren hinterster Punkt und
 * wird deshalb von selbst später gezeichnet. Die Regel, die man dafür braucht,
 * ist die einfachere – und sie war schon da.
 *
 * Gemerkt: Eine Sortierung, die eine fachliche Rangfolge und eine räumliche
 * mischt, ist fast immer die räumliche mit einem Fehler darin.
 */
export function reliefFolge(features: Kartenfeature[]): Kartenfeature[] {
  return [...features]
    .filter((f) => f.punkte.length >= 3)
    .sort((a, b) => tiefe(a.punkte) - tiefe(b.punkte));
}

/* ========================================================================
 * DIE WÄNDE
 * ===================================================================== */

/** Eine Wand: das Viereck zwischen Grundkante und erhobener Kante. */
export interface Wand {
  /** Der fertige SVG-Pfad im Reliefraum. */
  d: string;
  /** Wie stark diese Wand dem Licht zugewandt ist – 0…1, für die Schattierung. */
  licht: number;
  /** Zum Sortieren innerhalb einer Fläche. */
  tiefe: number;
}

/**
 * Die sichtbaren Wände einer erhobenen Fläche.
 *
 * ---
 *
 * **Nur die vorderen.**
 *
 * Eine geschlossene Fläche hat so viele Wände wie Kanten, und die Hälfte davon
 * liegt hinten und ist verdeckt. Sie alle zu zeichnen kostet nicht nur Zeit –
 * bei halbdurchsichtigen Farben schimmern die hinteren durch und die Fläche
 * sieht aus wie aus Glas.
 *
 * Sichtbar ist eine Kante, wenn ihre Aussennormale zum Betrachter zeigt. In
 * der Isometrie heisst das schlicht: Die Kante läuft so, dass `x + y` auf ihr
 * zunimmt, wenn man dem Umlaufsinn folgt.
 *
 * **Und die Lichtregel gilt auch hier.** „Warmes Licht, kühler Schatten" ist
 * die zweite DNA-Regel; die Wände bekommen deshalb keine graue Abstufung,
 * sondern einen Anteil, aus dem der Stil die Farbe mischt.
 */
export function waende(poly: Punkt[], hoehe: number): Wand[] {
  const aus: Wand[] = [];
  if (poly.length < 3 || hoehe === 0) return aus;

  /*
   * Der Umlaufsinn muss bekannt sein, sonst ist „vorne" bei jeder zweiten
   * gemalten Fläche „hinten" – und der Finger malt mal so, mal so herum.
   */
  let flaeche2 = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    flaeche2 += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  const rechtsherum = flaeche2 < 0;

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const nachVorn = bx + by - (ax + ay);
    const sichtbar = rechtsherum ? nachVorn < 0 : nachVorn > 0;
    if (!sichtbar) continue;

    const o = hoehe > 0 ? hoehe : 0;
    const u = hoehe > 0 ? 0 : hoehe;
    const p1 = iso(ax, ay, o);
    const p2 = iso(bx, by, o);
    const p3 = iso(bx, by, u);
    const p4 = iso(ax, ay, u);

    /*
     * Das Licht kommt von links oben, wie in jeder Zeichnung dieses Buches.
     * Wie stark eine Wand ihm zugewandt ist, hängt an ihrer Richtung: eine
     * Kante, die nach Osten weist, steht im Licht; eine nach Süden im
     * Schatten.
     */
    const laenge = Math.hypot(bx - ax, by - ay) || 1;
    const nx = (by - ay) / laenge;
    const ny = -(bx - ax) / laenge;
    const zeichen = rechtsherum ? -1 : 1;
    const licht = Math.max(0, Math.min(1, (zeichen * (nx * 0.7 - ny * 0.7) + 1) / 2));

    aus.push({
      d: `M${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}L${p3[0]} ${p3[1]}L${p4[0]} ${p4[1]}Z`,
      licht,
      tiefe: (ax + ay + bx + by) / 2,
    });
  }

  /* Innerhalb einer Fläche ebenfalls von hinten nach vorn. */
  return aus.sort((a, b) => a.tiefe - b.tiefe);
}

/** Eine Fläche als Pfad, auf ihrer Höhe. */
export function deckflaeche(poly: Punkt[], hoehe: number): string {
  return (
    poly
      .map(([x, y], i) => {
        const [px, py] = iso(x, y, hoehe);
        return `${i ? 'L' : 'M'}${px} ${py}`;
      })
      .join('') + 'Z'
  );
}
