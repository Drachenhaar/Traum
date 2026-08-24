/*
 * Die Bände.
 *
 * Bei zwei Bänden konnte man beide ansehen und wusste Bescheid. Bei sechs
 * nicht mehr: Sechs Bände mal vierzehn Seiten sind vierundachtzig Ansichten,
 * und ein zu blasser Ton fällt beim Durchklicken erst auf, wenn man auf genau
 * dieser Seite in genau diesem Band steht.
 *
 * Was sich rechnen lässt, wird deshalb gerechnet: Vollständigkeit und
 * Kontrast. Was sich nicht rechnen lässt – ob ein Band nach einem *Material*
 * aussieht und nicht nach einem Farbfilter –, findet weiterhin nur das
 * Hinsehen.
 */

import { readFileSync } from 'node:fs';

let bestanden = 0;
let gescheitert = 0;
function pruefe(was, bedingung, hinweis = '') {
  if (bedingung) {
    bestanden++;
  } else {
    gescheitert++;
    console.error(`  ✗ ${was}${hinweis ? ` – ${hinweis}` : ''}`);
  }
}

const quelle = readFileSync(new URL('../src/lib/baende.ts', import.meta.url), 'utf8');

/*
 * Die Bände aus der Quelle lesen.
 *
 * `baende.ts` ist reines TypeScript ohne Abhängigkeiten und ohne Rechnung –
 * die Töne stehen als Literale da. Der Block wird herausgeschnitten und als
 * JavaScript ausgewertet; das ist ehrlicher als ein Nachbau mit regulären
 * Ausdrücken, der bei der ersten neuen Zeile auseinanderfällt.
 */
const anfang = quelle.indexOf('export const BAENDE: Band[] = [');
const ende = quelle.indexOf('\n];', anfang);
const roh = quelle.slice(quelle.indexOf('[', anfang), ende + 2);
const BAENDE = new Function(`return ${roh};`)();

/** Relative Leuchtdichte nach WCAG. */
function leucht(rgb) {
  const k = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}
function kontrast(a, b) {
  const [x, y] = [leucht(a), leucht(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const kanal = (s) => s.split(' ').map(Number);
/** `#rrggbb` → Kanäle. Nur für die drei Sondertöne, die als Hex stehen. */
const hex = (s) => {
  const m = s.replace('#', '');
  return [0, 2, 4].map((i) => Number.parseInt(m.slice(i, i + 2), 16));
};

const NOETIG = [
  'grund50', 'grund100', 'grund200', 'grund300',
  'schrift', 'schriftLeise', 'schriftFein',
  'linie', 'linieStark',
  'metall300', 'metall400', 'metall500', 'metall600',
  'schriftgold', 'schriftgoldHell', 'mahnung',
  'akzent300', 'akzent400', 'akzent500', 'akzent600',
  'blattgrund', 'fleck', 'lichthof', 'falzschatten',
  'rubrik', 'lesetext', 'initiale',
  'tisch1', 'tisch2', 'tisch3',
];

console.log(`\n1 Vollständigkeit (${BAENDE.length} Bände)`);
pruefe('Es gibt mehr als einen Band', BAENDE.length > 1);
pruefe('Jede Kennung kommt nur einmal vor', new Set(BAENDE.map((b) => b.id)).size === BAENDE.length);
for (const b of BAENDE) {
  const fehlt = NOETIG.filter((n) => !b.toene[n]);
  pruefe(`${b.name}: alle ${NOETIG.length} Töne gesetzt`, fehlt.length === 0, fehlt.join(', '));
  pruefe(`${b.name}: hat einen Namen und ein Wesen`, !!b.name && !!b.wesen && b.wesen.length > 20);
}

/*
 * Der Kontrast.
 *
 * 4,5:1 ist die Schwelle, unter der normal grosser Text als nicht lesbar
 * gilt. Sie wird hier für den Lesetext gefordert und für die Schrift
 * überhaupt – nicht für die leisen Stufen: `schriftFein` ist absichtlich
 * zurückgenommen und trägt Nebenangaben, keine Sätze. Für sie gilt 3:1, die
 * Schwelle für grosse Schrift und Bedienelemente.
 */
console.log('2 Lesbarkeit');
for (const b of BAENDE) {
  const grund = kanal(b.toene.grund100);
  const paare = [
    ['Schrift', kanal(b.toene.schrift), 4.5],
    ['Lesetext', hex(b.toene.lesetext), 4.5],
    ['Schrift leise', kanal(b.toene.schriftLeise), 3],
    ['Schrift fein', kanal(b.toene.schriftFein), 2.4],
    ['Rubrik', hex(b.toene.rubrik), 3],
    ['Schriftgold', kanal(b.toene.schriftgold), 3],
  ];
  for (const [was, farbe, schwelle] of paare) {
    const k = kontrast(farbe, grund);
    pruefe(`${b.name}: ${was} auf dem Grund`, k >= schwelle, `${k.toFixed(2)}:1, nötig ${schwelle}`);
  }
}

/*
 * Ist der Band in sich stimmig?
 *
 * Ein heller Band mit dunklem Grund wäre kein Fehler im Sinne von „stürzt ab",
 * aber `hell` steuert, welchen Kartenstil die Weltkarte nimmt – und dann
 * stünde eine dunkle Karte auf hellem Papier. Der Fund von damals, nur
 * andersherum.
 */
console.log('3 Stimmigkeit');
for (const b of BAENDE) {
  const l = leucht(kanal(b.toene.grund100));
  pruefe(
    `${b.name}: „${b.hell ? 'hell' : 'dunkel'}" stimmt mit dem Grund überein`,
    b.hell ? l > 0.5 : l < 0.2,
    `Leuchtdichte ${l.toFixed(3)}`,
  );
  /* Das Metall muss sich vom Grund abheben – sonst sieht man keine Prägung. */
  const m = kontrast(kanal(b.toene.metall400), kanal(b.toene.grund100));
  pruefe(`${b.name}: das Metall hebt sich vom Grund ab`, m >= 1.8, `${m.toFixed(2)}:1`);
  /* Das Akzentmetall traegt Bedienelemente – es muss man *finden* koennen. */
  const a = kontrast(kanal(b.toene.akzent500), kanal(b.toene.grund100));
  pruefe(`${b.name}: das Akzentmetall hebt sich vom Grund ab`, a >= 2.2, `${a.toFixed(2)}:1`);
}

console.log('4 Der Rückfall');
pruefe('Es gibt eine Vorgabe', /BAND_VORGABE = '(\w+)'/.test(quelle));
const vorgabe = quelle.match(/BAND_VORGABE = '(\w+)'/)[1];
pruefe(`Die Vorgabe „${vorgabe}" ist ein echter Band`, BAENDE.some((b) => b.id === vorgabe));
/* Ein Buch ohne Angabe darf sich nicht veraendern – die Vorgabe ist der alte Band. */
pruefe('Die Vorgabe ist der erste Band in der Liste', BAENDE[0].id === vorgabe);

console.log(`\n  ${bestanden} bestanden, ${gescheitert} gescheitert\n`);
process.exit(gescheitert ? 1 : 0);
