/**
 * Die Bände – ein Buch, mehrere Materialien.
 *
 * Ein Band ist **kein Farbschema und kein Nachtmodus**. Ein Farbschema dreht
 * Helligkeiten, ein Nachtmodus macht das Licht erträglicher. Hier wechselt der
 * *Stoff*, aus dem das Buch gebunden ist: helles Pergament mit Goldprägung,
 * ein fast schwarzer Band mit Gold, kühles Elfenbein mit Silber, Tinte mit
 * Weißmetall, Moos mit Messing, Rotholz mit Kupfer.
 *
 * Ablesbar an einer Zahl: Die Schrift im dunklen Band wird nicht weiß (255),
 * sondern Pergament (230 220 196). Weiß auf Schwarz ist ein Bildschirm;
 * Pergament auf Braunschwarz ist ein Buch.
 *
 * ---
 *
 * **Warum das hier Daten sind und keine CSS-Blöcke.**
 *
 * Zuerst standen zwei Bände als zwei handgeschriebene Regeln im Stilblatt.
 * Bei sechs Bänden wären das sechs Blöcke mit je zwei Dutzend Zeilen, und der
 * erste, der einen neuen Ton hinzufügt, vergisst ihn in dreien davon. Ein
 * fehlender Ton fällt nicht auf: Die Variable bleibt einfach auf dem Wert des
 * zuletzt gesetzten Bandes stehen, und die Seite sieht nur *etwas* falsch aus.
 *
 * Als Daten ist das nicht mehr möglich. `Bandtoene` ist ein geschlossener
 * Satz, den TypeScript einfordert, und `tests/baende.test.mjs` rechnet
 * zusätzlich nach, ob jeder Band lesbar ist. Einen Band hinzuzufügen heißt
 * jetzt: einen Eintrag schreiben. Nichts anderes.
 *
 * ---
 *
 * **Was ein Band nicht anfasst.**
 *
 * Die Marke `paper` bleibt in allen Bänden dieselbe. Sie bedeutet nicht „hell",
 * sondern *helle Schrift auf dunklem Grund* – auf dem Lichtkasten, im
 * Geschichtenmodus, auf den Messing-Chips. Wer sie mitdrehte, machte genau die
 * Stellen unlesbar, die in jedem Band schon richtig aussehen.
 */

/** Drei Kanäle, wie `rgb(var(--x) / <alpha-value>)` es verlangt. */
type Kanal = `${number} ${number} ${number}`;

export interface Bandtoene {
  /* Der Grund, auf dem die Seite liegt – vier Stufen. */
  grund50: Kanal;
  grund100: Kanal;
  grund200: Kanal;
  grund300: Kanal;

  /* Die Schrift: laut, leise, sehr leise. */
  schrift: Kanal;
  schriftLeise: Kanal;
  schriftFein: Kanal;

  /* Die Linien im Satz. */
  linie: Kanal;
  linieStark: Kanal;

  /*
   * Das Metall.
   *
   * Der eigentliche Unterschied zwischen den Bänden. Gold, Silber, Messing,
   * Kupfer – vier Stufen wie eine Palette, weil die Charakterseite daraus
   * ihre Linien, Zeichen und Rahmenecken zieht. Ein Band, der nur den Grund
   * tauscht und das Gold stehen lässt, ist kein anderes Material, sondern
   * dasselbe Buch bei anderem Licht.
   */
  metall300: Kanal;
  metall400: Kanal;
  metall500: Kanal;
  metall600: Kanal;

  /** Das Metall, mit dem *geschrieben* wird – Rubriken, Verweise, Initialen. */
  schriftgold: Kanal;
  schriftgoldHell: Kanal;

  /*
   * Das **Akzentmetall** – und warum es ein zweites gibt.
   *
   * `gild` ist die Prägung des Buches: Linien, Zeichen, Reiter, Zierrat.
   * `brass` ist das Metall der *Bedienung*: der Ring um eine getroffene Wahl,
   * der Schalter, der Punkt vor einer Verbindung. Beides ist Metall, aber das
   * eine schmückt und das andere zeigt an, und deshalb darf das zweite etwas
   * matter sein – ein Bedienelement, das so glänzt wie die Prägung, wird zur
   * Verzierung und hört auf zu sagen, dass hier etwas gewählt ist.
   *
   * Gefunden hat das ein Bildschirmfoto: Im Band Elfenbein war alles Silber –
   * und der Punkt vor „Das Nebeltal" stand weiter in Bernstein. 81 Stellen
   * hätten dasselbe getan.
   */
  akzent300: Kanal;
  akzent400: Kanal;
  akzent500: Kanal;
  akzent600: Kanal;

  /** Der Widerspruch im Weltwissen. Rot bleibt rot, aber es muss atmen. */
  mahnung: Kanal;

  /* Das Papier als Material – Grundton, Stockflecken, Lichthof. */
  blattgrund: string;
  fleck: string;
  lichthof: string;

  /** Der Schatten zur Buchmitte hin. */
  falzschatten: string;

  /* Drei Stellen, die eigene Töne brauchen – siehe die Anmerkungen unten. */
  rubrik: string;
  lesetext: string;
  initiale: string;

  /** Der Tisch, auf dem das Buch liegt: drei Stufen eines Verlaufs. */
  tisch1: string;
  tisch2: string;
  tisch3: string;
}

export interface Band {
  id: string;
  /** Wie er im Buch heißt. */
  name: string;
  /** Ein Satz, der sagt, wonach er aussieht – nicht, welche Farben er hat. */
  wesen: string;
  /** Für die Vorschau: zwei Tupfer, Grund und Metall. */
  hell: boolean;
  toene: Bandtoene;
}

/*
 * Ein Hinweis zu den drei Sondertönen.
 *
 * `lesetext` ist **nicht** dieselbe Farbe wie `schrift`, und das ist Absicht:
 * Ein Absatz, den man minutenlang liest, braucht mehr Ruhe als eine
 * Überschrift, die man überfliegt. Auf hellem Papier heißt das dunkler, auf
 * dunklem Grund heller.
 *
 * `rubrik` und `initiale` sind Metall, aber nicht dasselbe Metall: Die Rubrik
 * steht in Versalien und darf kräftiger sein, die Initiale ist eine Fläche und
 * muss zurücktreten, sonst erschlägt sie den Absatz, den sie eröffnet.
 */

export const BAENDE: Band[] = [
  {
    id: 'pergament',
    name: 'Pergament',
    wesen: 'Helles Papier, brauner Text, Goldprägung. Der Band, wie er immer war.',
    hell: true,
    toene: {
      grund50: '252 250 245',
      grund100: '247 242 232',
      grund200: '241 234 220',
      grund300: '232 222 203',
      schrift: '59 46 35',
      schriftLeise: '124 106 87',
      schriftFein: '164 144 122',
      linie: '229 220 202',
      linieStark: '216 204 180',
      metall300: '227 200 120',
      metall400: '212 175 55',
      metall500: '184 134 11',
      metall600: '140 101 16',
      schriftgold: '140 101 16',
      schriftgoldHell: '184 134 11',
      akzent300: '211 188 140',
      akzent400: '192 164 104',
      akzent500: '168 133 63',
      akzent600: '140 109 49',
      mahnung: '140 58 50',
      blattgrund: '#ebe1c9',
      fleck: 'rgba(150, 118, 72, 0.07)',
      lichthof: 'rgba(255, 252, 242, 0.42)',
      falzschatten: 'rgba(60, 44, 26, 0.55)',
      rubrik: '#8c6510',
      lesetext: '#3a2e20',
      initiale: '#6b5220',
      tisch1: '#1a1512',
      tisch2: '#100d0b',
      tisch3: '#0b0908',
    },
  },
  {
    id: 'dunkel',
    name: 'Dunkler Band',
    wesen: 'Fast schwarz und warm, Schrift aus Pergament, Linien aus mattem Gold.',
    hell: false,
    toene: {
      grund50: '22 18 15',
      grund100: '27 22 19',
      grund200: '32 26 22',
      grund300: '42 34 28',
      schrift: '230 220 196',
      schriftLeise: '176 162 133',
      schriftFein: '130 118 97',
      linie: '58 47 34',
      linieStark: '87 70 47',
      metall300: '227 200 120',
      metall400: '212 175 55',
      metall500: '184 134 11',
      metall600: '140 101 16',
      schriftgold: '201 161 95',
      schriftgoldHell: '227 200 120',
      akzent300: '211 188 140',
      akzent400: '192 164 104',
      akzent500: '168 133 63',
      akzent600: '140 109 49',
      mahnung: '214 134 118',
      blattgrund: '#17130f',
      fleck: 'rgba(184, 134, 11, 0.045)',
      lichthof: 'rgba(120, 96, 58, 0.16)',
      falzschatten: 'rgba(0, 0, 0, 0.72)',
      rubrik: '#c9a15f',
      lesetext: '#ded2b4',
      initiale: '#c9a15f',
      tisch1: '#1a1512',
      tisch2: '#100d0b',
      tisch3: '#0b0908',
    },
  },
  {
    id: 'elfenbein',
    name: 'Elfenbein',
    wesen: 'Kühles helles Papier, Graphit, Silber statt Gold. Ein moderner Tafelband.',
    hell: true,
    toene: {
      grund50: '253 253 252',
      grund100: '248 249 250',
      grund200: '242 244 246',
      grund300: '232 236 239',
      schrift: '38 42 48',
      schriftLeise: '96 104 114',
      schriftFein: '142 150 160',
      linie: '226 231 236',
      linieStark: '208 215 222',
      metall300: '214 222 230',
      metall400: '174 186 198',
      metall500: '133 147 162',
      metall600: '100 112 126',
      schriftgold: '90 102 116',
      schriftgoldHell: '124 138 154',
      akzent300: '198 208 218',
      akzent400: '162 176 190',
      akzent500: '124 138 154',
      akzent600: '96 108 122',
      mahnung: '150 52 52',
      blattgrund: '#f4f6f7',
      fleck: 'rgba(110, 126, 142, 0.05)',
      lichthof: 'rgba(255, 255, 255, 0.55)',
      falzschatten: 'rgba(38, 48, 60, 0.42)',
      rubrik: '#64707e',
      lesetext: '#2b3037',
      initiale: '#8593a2',
      tisch1: '#232a31',
      tisch2: '#171c21',
      tisch3: '#0f1317',
    },
  },
  {
    id: 'tinte',
    name: 'Tinte',
    wesen: 'Tiefes Blauschwarz, Schrift wie Mondlicht, Weißmetall an den Kanten.',
    hell: false,
    toene: {
      grund50: '14 18 26',
      grund100: '18 23 33',
      grund200: '23 29 41',
      grund300: '32 40 55',
      schrift: '214 222 234',
      schriftLeise: '158 172 191',
      schriftFein: '116 130 150',
      linie: '38 48 66',
      linieStark: '60 76 100',
      metall300: '220 230 240',
      metall400: '182 198 216',
      metall500: '143 163 184',
      metall600: '107 126 147',
      schriftgold: '159 180 204',
      schriftgoldHell: '206 222 240',
      akzent300: '198 214 232',
      akzent400: '166 186 208',
      akzent500: '132 152 176',
      akzent600: '100 118 140',
      mahnung: '226 138 138',
      blattgrund: '#0f131b',
      fleck: 'rgba(143, 163, 184, 0.05)',
      lichthof: 'rgba(120, 150, 190, 0.14)',
      falzschatten: 'rgba(0, 0, 0, 0.75)',
      rubrik: '#9fb4cc',
      lesetext: '#cdd8e6',
      initiale: '#8fa3b8',
      tisch1: '#141a24',
      tisch2: '#0d1119',
      tisch3: '#080b10',
    },
  },
  {
    id: 'moos',
    name: 'Moos',
    wesen: 'Waldschwarz mit Messing – ein Band, der lange im Regal am Fenster stand.',
    hell: false,
    toene: {
      grund50: '16 20 15',
      grund100: '20 25 19',
      grund200: '25 31 23',
      grund300: '34 42 31',
      schrift: '224 226 200',
      schriftLeise: '168 176 140',
      schriftFein: '124 134 100',
      linie: '44 54 38',
      linieStark: '68 82 56',
      metall300: '211 188 140',
      metall400: '192 164 104',
      metall500: '168 133 63',
      metall600: '140 109 49',
      schriftgold: '176 148 96',
      schriftgoldHell: '208 182 132',
      akzent300: '196 200 160',
      akzent400: '168 176 128',
      akzent500: '138 148 96',
      akzent600: '112 122 74',
      mahnung: '214 140 110',
      blattgrund: '#12160f',
      fleck: 'rgba(168, 133, 63, 0.05)',
      lichthof: 'rgba(120, 132, 88, 0.15)',
      falzschatten: 'rgba(0, 0, 0, 0.72)',
      rubrik: '#c0a468',
      lesetext: '#d6dab4',
      initiale: '#a8853f',
      tisch1: '#161a13',
      tisch2: '#0e120c',
      tisch3: '#090c08',
    },
  },
  {
    id: 'rotholz',
    name: 'Rotholz',
    wesen: 'Warmes dunkles Rotbraun mit Kupfer. Der Band, der nach Werkstatt riecht.',
    hell: false,
    toene: {
      grund50: '26 15 13',
      grund100: '32 19 16',
      grund200: '38 23 19',
      grund300: '50 31 25',
      schrift: '236 214 198',
      schriftLeise: '186 156 138',
      schriftFein: '138 112 98',
      linie: '62 38 30',
      linieStark: '92 56 44',
      metall300: '232 180 140',
      metall400: '208 138 94',
      metall500: '176 106 64',
      metall600: '140 80 48',
      schriftgold: '196 130 88',
      schriftgoldHell: '224 164 120',
      akzent300: '222 172 142',
      akzent400: '198 140 108',
      akzent500: '162 106 78',
      akzent600: '130 82 58',
      mahnung: '240 150 130',
      blattgrund: '#1b100d',
      fleck: 'rgba(176, 106, 64, 0.055)',
      lichthof: 'rgba(150, 96, 64, 0.16)',
      falzschatten: 'rgba(0, 0, 0, 0.74)',
      rubrik: '#d08a5e',
      lesetext: '#e2c8b4',
      initiale: '#b06a40',
      tisch1: '#1d1310',
      tisch2: '#130c0a',
      tisch3: '#0c0706',
    },
  },
];

/** Der Band, mit dem ein Buch aufschlägt, wenn niemand gewählt hat. */
export const BAND_VORGABE = 'pergament';

export function bandVon(id: string | undefined): Band {
  return BAENDE.find((b) => b.id === id) ?? BAENDE[0];
}

/**
 * Die Töne eines Bandes als CSS-Variablen.
 *
 * Dieselben Namen, die `tailwind.config.js` und `index.css` lesen. Wer hier
 * einen Namen ändert, muss ihn dort ändern – deshalb steht die Zuordnung an
 * genau einer Stelle und nicht verstreut.
 */
export function bandAlsCss(band: Band): Record<string, string> {
  const t = band.toene;
  return {
    '--dc-grund-50': t.grund50,
    '--dc-grund-100': t.grund100,
    '--dc-grund-200': t.grund200,
    '--dc-grund-300': t.grund300,
    '--dc-schrift': t.schrift,
    '--dc-schrift-leise': t.schriftLeise,
    '--dc-schrift-fein': t.schriftFein,
    '--dc-linie': t.linie,
    '--dc-linie-stark': t.linieStark,
    '--dc-metall-300': t.metall300,
    '--dc-metall-400': t.metall400,
    '--dc-metall-500': t.metall500,
    '--dc-metall-600': t.metall600,
    '--dc-schriftgold': t.schriftgold,
    '--dc-schriftgold-hell': t.schriftgoldHell,
    '--dc-akzent-300': t.akzent300,
    '--dc-akzent-400': t.akzent400,
    '--dc-akzent-500': t.akzent500,
    '--dc-akzent-600': t.akzent600,
    '--dc-mahnung': t.mahnung,
    '--dc-blattgrund': t.blattgrund,
    '--dc-fleck': t.fleck,
    '--dc-lichthof': t.lichthof,
    '--dc-falzschatten': t.falzschatten,
    '--dc-rubrik': t.rubrik,
    '--dc-lesetext': t.lesetext,
    '--dc-initiale': t.initiale,
    '--dc-tisch-1': t.tisch1,
    '--dc-tisch-2': t.tisch2,
    '--dc-tisch-3': t.tisch3,
  };
}

/**
 * Den Band aufschlagen.
 *
 * Setzt die Variablen an der Wurzel und hinterlässt zusätzlich `data-band`
 * mit der Kennung – nicht, weil CSS sie bräuchte, sondern damit man beim
 * Nachsehen im Browser sofort weiß, welcher Band offen ist. Ein Zustand, den
 * man nicht ablesen kann, kostet später eine Stunde.
 */
export function schlageBandAuf(id: string | undefined): Band {
  const band = bandVon(id);
  const w = document.documentElement;
  for (const [name, wert] of Object.entries(bandAlsCss(band))) {
    w.style.setProperty(name, wert);
  }
  w.dataset.band = band.id;
  w.dataset.bandArt = band.hell ? 'hell' : 'dunkel';
  return band;
}
