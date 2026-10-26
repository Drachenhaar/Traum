/**
 * Der Schauplatz und die Kamerafahrt – was gefilmt wird und wie sich die
 * Kamera dabei bewegt.
 *
 * ---
 *
 * **Warum eine eigene Landschaft und nicht die der Bildprüfung.**
 *
 * Die Karten in `scripts/bilder/szenen.mjs` sind Vorlagen für einen
 * Vergleich. Sie sind so geschnitten, dass ein bestimmter Fehler sichtbar
 * wird – nicht so, dass es schön aussieht. Würde der Film sie benutzen,
 * liesse sich keine von beiden Seiten mehr ändern, ohne die andere zu
 * beschädigen.
 *
 * Hier darf es stattdessen hübsch sein. Nichts davon wird verglichen.
 *
 * ---
 *
 * **Alles daran ist Geometrie.**
 *
 * Diese Datei enthält kein einziges Bild und keine einzige Gipfelposition.
 * Sie enthält einen Küstenumriss, einen Kammverlauf, vier Waldgrenzen, einen
 * See – und einen Startwert. Alles Übrige rechnet das Kartenwerk daraus,
 * genau wie im Buch. Derselbe Startwert ergibt denselben Film.
 */

/**
 * Ein unruhiger Kreis.
 *
 * Drei übereinandergelegte Schwingungen statt Zufall: Das ergibt eine Kante,
 * die gewachsen aussieht und bei gleichem `saat` immer dieselbe ist.
 */
const kreis = (cx, cy, r, n = 110, rau = 0.22, saat = 7) => {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const d =
      Math.sin(t * 3 + saat) * 0.5
      + Math.sin(t * 5 + saat * 2) * 0.3
      + Math.sin(t * 8 + saat) * 0.2;
    const rr = r * (1 + d * rau);
    p.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
  }
  return p;
};

/**
 * Die Landschaft.
 *
 * Ein Gebirgszug, der von Südwesten nach Nordosten schwingt, vier Wälder in
 * verschiedenen Höhen und ein See in der Senke. Der mittlere Wald liegt
 * **auf** dem Kamm – dort zeigt sich die Baumgrenze, und das ist die Stelle,
 * an der Wald und Gebirge zu einer Landschaft werden statt zu zwei Lagen
 * übereinander.
 */
export const SCHAUPLATZ = {
  id: 'k_film',
  bookId: 'b_film',
  worldId: 'w_film',
  seed: 20261026,
  styleId: 'artbook',
  features: [
    { id: 'f_land', art: 'land', punkte: kreis(500, 500, 440, 150, 0.18, 3), seed: 11 },
    /*
     * **Hier stand ein See, und er musste wieder weg.**
     *
     * Im Buch liegt Wasser im SVG unter den Kacheln, mit Federzug und Saum.
     * Der Film geht diesen Weg nicht – er geht durch die Kachelmaler. Eine
     * Wasserfläche musste er sich also selbst dazumalen, und sie sah aus wie
     * ein aufgeklebter blauer Fleck: harte Kante, falscher Ton, kein Saum.
     *
     * Das ist nicht bloss hässlich, das ist Gesetz 5. Wenn der Film einen See
     * anders zeigt als das Buch, gibt es zwei Wahrheiten über dasselbe
     * Wasser, und die unwichtigere gewinnt, weil sie bewegt ist.
     *
     * Der Film zeigt deshalb genau das, was die Kachelmaler malen: Relief und
     * Bewuchs. Wasser kommt dazu, wenn es durch denselben Weg kommt wie im
     * Buch – nicht vorher.
     */
    /* Der grosse Wald im Westen, unterhalb der Baumgrenze. */
    { id: 'f_w1', art: 'wald', punkte: kreis(250, 640, 155, 100, 0.24, 7), seed: 21 },
    /* Der mittlere Wald steigt über den Kamm – hier greift die Baumgrenze. */
    { id: 'f_w2', art: 'wald', punkte: kreis(455, 475, 165, 100, 0.2, 19), seed: 31 },
    /* Zwei kleinere im Osten und Norden, damit der Blick etwas zu tun hat. */
    { id: 'f_w3', art: 'wald', punkte: kreis(775, 545, 112, 90, 0.26, 13), seed: 41 },
    { id: 'f_w4', art: 'wald', punkte: kreis(545, 255, 128, 90, 0.26, 29), seed: 61 },
  ],
  marken: [],
  kaemme: [
    {
      id: 'g_haupt',
      punkte: [[150, 575], [320, 470], [470, 455], [620, 395], [790, 345], [900, 380]],
      breite: 132,
      hoehe: 0.86,
      zerkluftung: 0.55,
      seed: 90130394,
    },
    {
      /* Ein niedriger Ausläufer, der nach Süden abzweigt. */
      id: 'g_neben',
      punkte: [[560, 700], [700, 690], [830, 640]],
      breite: 78,
      hoehe: 0.46,
      zerkluftung: 0.4,
      seed: 55120077,
    },
  ],
  createdAt: 1,
  updatedAt: 2,
};

/**
 * Sanft anfahren, sanft anhalten.
 *
 * Eine Fahrt mit gleichmässiger Geschwindigkeit beginnt mit einem Ruck – der
 * erste Bildwechsel ist von null auf volle Geschwindigkeit. Das liest sich
 * wie ein Schnittfehler. Diese Kurve ist an beiden Enden waagerecht, also
 * setzt sich die Kamera in Bewegung, statt zu springen.
 */
const sanft = (t) => t * t * (3 - 2 * t);

/**
 * Die Fahrten.
 *
 * Jede ist eine Funktion von `t` zwischen 0 und 1 auf ein Sichtfeld. Mehr
 * braucht es nicht: Das Kartenwerk bekommt für jedes Bild ein Sichtfeld und
 * liefert die Landschaft dazu. Die Kamera weiss nichts von Kacheln, und die
 * Kacheln wissen nichts von der Kamera.
 *
 * `w` ist die Breite des Ausschnitts im Kartenmass – kleiner heisst näher.
 */
export const FAHRTEN = {
  /**
   * Den Kamm entlang, von Westen nach Osten.
   *
   * Die Kamera folgt dem Gebirge und nimmt dabei die Baumgrenze des
   * mittleren Waldes mit. Sie steigt leicht nach Norden, weil der Kamm das
   * auch tut – eine waagerechte Fahrt hätte ihn nach der Hälfte verloren.
   */
  kamm: {
    name: 'Den Kamm entlang',
    bilder: 150,
    sicht: (t) => {
      const s = sanft(t);
      /*
       * **Die Ausschnittsbreite ist die wichtigste Zahl der ganzen Fahrt.**
       *
       * Der erste Versuch stand bei 180 Einheiten. Das Bild war gestochen
       * scharf und vollkommen unlesbar: lauter einzelne Bäume von oben, das
       * Gebirge nur als blasser Schatten dahinter. Eine Waldtextur, keine
       * Landschaft.
       *
       * Bei 460 Einheiten deckt der Ausschnitt knapp die halbe Karte. Der
       * Gebirgszug wird als Zug erkennbar, die Wälder als Wälder, und ein
       * einzelner Baum ist noch gross genug, dass man sieht, dass er gemalt
       * und nicht gestempelt ist.
       */
      const w = 460;
      const mx = 310 + s * 420;
      const my = 545 - s * 120;
      return { x: mx - w / 2, y: my - w / 2, w };
    },
  },

  /**
   * Heranfahren an die Baumgrenze.
   *
   * Vom Überblick bis dicht an die Stelle, an der der Wald den Kamm
   * übersteigt. Das ist die Fahrt, die das Kachelwerk am meisten fordert:
   * Beim Näherkommen wechselt die Stufe, und jede Stufe backt neu.
   */
  baumgrenze: {
    name: 'Heran an die Baumgrenze',
    bilder: 150,
    sicht: (t) => {
      const s = sanft(t);
      /* Das Ziel ist die Nordflanke des mittleren Waldes, auf dem Kamm. */
      const zielX = 455;
      const zielY = 430;
      /*
       * Von fast der ganzen Karte bis auf 210 Einheiten heran. Unterwegs
       * wechselt `stufeFuer` dreimal die Stufe – das ist der Teil, der im
       * Buch bei jeder Zoomgeste passiert, nur langsam genug, um ihn zu
       * sehen.
       *
       * Die Breite schrumpft **geometrisch**, nicht linear: Gleich grosse
       * Schritte im Massstab sehen gleichmässig aus, gleich grosse Schritte
       * in der Breite bremsen am Ende scheinbar ab.
       */
      const w = 940 * Math.pow(210 / 940, s);
      /* Der Zielpunkt bleibt in der Mitte, während der Ausschnitt schrumpft. */
      return { x: zielX - w / 2 + (1 - s) * 45, y: zielY - w / 2 + (1 - s) * 70, w };
    },
  },
};
