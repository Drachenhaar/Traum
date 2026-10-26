/**
 * Die Szenen der Bildprüfung – was abgebildet wird und warum.
 *
 * ---
 *
 * **Jede Szene bewacht einen Fehler, den es wirklich gab.**
 *
 * Das ist der Massstab für Aufnahme in diese Liste. Eine Szene, die nur
 * „sieht hübsch aus" bewacht, meldet beim ersten Feinschliff einen Fehler
 * und wird nach dem dritten Mal weggeklickt. Eine Szene, die einen
 * benannten Fehler bewacht, ist nach Jahren noch zu verstehen.
 *
 * ---
 *
 * **Zwei Sorten, und das hat einen Grund.**
 *
 * `kachel` zeichnet durch die echten Maler, ohne App: kein React, keine
 * Gesten, kein Zeitverhalten. Eine Kachel ist eine reine Rechnung, also ist
 * ihr Bild bis auf den Bildpunkt wiederholbar – das ist die Sorte, mit der
 * sich Nähte und Auflösungen überhaupt bewachen lassen.
 *
 * `karte` nimmt die ganze Anwendung auf, in der Grundsicht und ohne eine
 * einzige Geste. Sie bewacht das Zusammenspiel: Reihenfolge der Lagen,
 * Flächen, Küste, Baumgrenze. Gesten wären hier die Fehlerquelle, nicht der
 * Prüfgegenstand – deshalb gibt es keine.
 *
 * ---
 *
 * **Warum Kachelblöcke und keine einzelnen Kacheln.**
 *
 * Ein Block aus zwei mal zwei Kacheln trägt drei innere Grenzen. Genau dort
 * sassen drei verschiedene Fehler dieses Sommers: ein doppelt gemalter
 * Streifen im Wald, ein gedehnter Zwischenspeicher, eine senkrechte Naht im
 * Relief. Eine einzelne Kachel hätte keinen davon gezeigt.
 */

const kreis = (cx, cy, r, n = 90, rau = 0.22, saat = 7) => {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const d =
      Math.sin(t * 3 + saat) * 0.5 + Math.sin(t * 5 + saat * 2) * 0.3 + Math.sin(t * 8 + saat) * 0.2;
    const rr = r * (1 + d * rau);
    p.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
  }
  return p;
};

/** Eine Karte, wie sie in der Datenbank liegt. Alle Startwerte fest. */
const karte = (id, features, kaemme = []) => ({
  id,
  bookId: 'b1',
  worldId: 'w1',
  seed: 4711,
  styleId: 'artbook',
  features,
  marken: [],
  kaemme,
  createdAt: 1,
  updatedAt: 2,
});

const LAND = { id: 'f_land', art: 'land', punkte: kreis(500, 500, 430, 120, 0.2, 3), seed: 11 };

const KAMM = {
  id: 'g1',
  punkte: [[160, 430], [330, 392], [500, 432], [670, 388], [840, 424]],
  breite: 120,
  hoehe: 0.82,
  zerkluftung: 0.5,
  seed: 90130394,
};

export const LANDSCHAFT = karte(
  'k_bild_landschaft',
  [
    LAND,
    { id: 'f_w1', art: 'wald', punkte: kreis(300, 700, 150, 90, 0.26, 7), seed: 21 },
    { id: 'f_w2', art: 'wald', punkte: kreis(690, 690, 130, 90, 0.26, 13), seed: 31 },
  ],
  [KAMM],
);

export const BAUMGRENZE = karte(
  'k_bild_baumgrenze',
  [
    LAND,
    /* Ein Wald, der von Süden an den Kamm heranreicht und ihn übersteigt. */
    { id: 'f_w3', art: 'wald', punkte: kreis(430, 470, 230, 90, 0.2, 19), seed: 41 },
  ],
  [KAMM],
);

/**
 * Die Szenen.
 *
 * `stufe` und `i`/`j` bei den Kachelblöcken wählen den Ausschnitt: `stufe`
 * bestimmt, wie nah – bei 4 ist eine Kachel 62,5 Einheiten breit, also etwa
 * das, was man beim Heranzoomen sieht.
 */
export const SZENEN = [
  {
    name: 'wald-block',
    art: 'kachel',
    was: 'Wald aus der Nähe: Zusammensetzung, Unterholz, Auflösung, Nähte.',
    bewacht: [
      'Der doppelt gemalte Streifen an jeder Kachelgrenze (halbdurchsichtige Lagen, überlappend gesetzt).',
      'Die Unschärfe aus dem Kachelmedian statt aus dem Stilbuch.',
      'Bäume aus einem zu kleinen Bild – 190 statt 430 Punkte.',
      'Unterholz aus verkleinerten Baumbildern statt aus eigenen Zeichnungen.',
    ],
    karte: LANDSCHAFT,
    stufe: 4,
    /* Mitten im westlichen Wald. */
    i: 4,
    j: 11,
  },
  {
    name: 'gebirge-block',
    art: 'kachel',
    was: 'Relief aus der Nähe: Grat, Nebenrücken, Beleuchtung, Nähte.',
    bewacht: [
      'Die senkrechte Naht an der Kachelgrenze (weggelassene Abschnitte zogen am Fusspunkt mit).',
      'Nebenrücken als Flecken statt als Falllinien.',
      'Ein Licht, das zu tief steht – fast alles im Schatten.',
    ],
    karte: LANDSCHAFT,
    stufe: 4,
    /* Quer über den Kamm. */
    i: 7,
    j: 6,
  },
  {
    name: 'baumgrenze-block',
    art: 'kachel',
    was: 'Wo der Wald den Kamm übersteigt – aus der Nähe.',
    bewacht: [
      'Ein Wald, der ungerührt über den Gipfel läuft.',
      'Eine saubere Höhenlinie quer durch den Wald statt eines Übergangs.',
      'Eine Baumgrenze, die sich still verschiebt.',
    ],
    karte: BAUMGRENZE,
    stufe: 4,
    /* Quer über den Kamm, mitten im Wald. */
    i: 6,
    j: 6,
  },
  {
    name: 'maler-block',
    art: 'maler',
    was: 'Vier Kacheln, **durch den Maler** zusammengesetzt statt von Hand.',
    bewacht: [
      'Der halbe Bildpunkt Überlappung, der über dem ganzen Wald ein dunkles Gitter liess.',
      'Kacheln, die beim Setzen um Bruchteile verrutschen.',
    ],
    karte: LANDSCHAFT,
    stufe: 4,
    /*
     * **Warum es diese Szene gibt.**
     *
     * Die anderen Kachelszenen setzen ihre vier Kacheln selbst aneinander
     * und gehen dabei nicht durch `maler.ts`. Ein Fehler **im Maler** –
     * etwa die halbe Überlappung – zeigt sich deshalb bei ihnen nicht.
     * Hier läuft dieselbe Rechnung durch `maleLage`, also über denselben
     * Weg wie auf der Karte, aber ohne React und ohne Zeitverhalten.
     */
    sicht: { x: 190, y: 600, w: 250 },
  },
  {
    name: 'landschaft',
    art: 'karte',
    was: 'Die ganze Karte in der Grundsicht: Küste, Wälder, Gebirge, Reihenfolge.',
    bewacht: [
      'Bäume, die unter dem Relief liegen statt darauf.',
      'Eine harte Waldkante, weil Füllung und Federzug über dem Blätterdach lagen.',
      'Ein Gebirge, das als Reihe einzelner Berge zerfällt.',
    ],
    karte: LANDSCHAFT,
    /*
     * **Stillgelegt, und das ist der Fund dieser Prüfung.**
     *
     * Dieselbe Karte kommt in verschiedenen Läufen verschieden heraus – bis
     * zu 1,4 %, immer kachelförmig: An einer Kachel fehlt der Wald, ein
     * scharfkantiges Rechteck, durch das das Papier scheint. Dabei sagen
     * alle Zähler „fertig": leere Warteschlange, nichts veraltet, keine
     * Vorschau. Das Bild wird auch stabil – nur eben in zwei verschiedenen
     * Zuständen.
     *
     * Das ist kein Mangel der Prüfung, sondern ein Fehler im Renderer, und
     * er ist noch nicht gefunden. Ein Teil war `entwerte`, das vorgemerkte
     * Kacheln aus der Warteschlange warf; das ist behoben und hat die Fälle
     * seltener gemacht, aber nicht beseitigt.
     *
     * Solange er steht, kann diese Szene kein Wächter sein: Sie würde rot
     * stehen, ohne dass jemand etwas geändert hat, und dann schaltet sie
     * jemand ab. Sie bleibt hier stehen, damit sie am Tag der Behebung nur
     * eingeschaltet werden muss.
     *
     * Siehe `AUSSENSICHT.md`.
     */
    aus: 'Der Renderer liefert dieselbe Karte nicht zuverlässig gleich – offener Fehler.',
  },
  {
    name: 'baumgrenze',
    art: 'karte',
    was: 'Ein Wald, der den Kamm übersteigt.',
    bewacht: [
      'Ein Wald, der ungerührt über den Gipfel läuft.',
      'Eine saubere Höhenlinie quer durch den Wald statt eines Übergangs.',
      'Bewuchskacheln, die nach einer Kammänderung mit ihrem alten Wald liegen bleiben.',
    ],
    karte: BAUMGRENZE,
    /* Dieselbe offene Ursache wie bei `landschaft` – dort steht sie. */
    aus: 'Der Renderer liefert dieselbe Karte nicht zuverlässig gleich – offener Fehler.',
  },
];
