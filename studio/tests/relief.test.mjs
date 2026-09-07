/*
 * Das Relief.
 *
 * Hier wird gerechnet und nicht gelesen: `relief.ts` ist reine Geometrie ohne
 * React, ohne Zustand, ohne Uhr – also wird sie übersetzt und ausgeführt.
 * Dieselbe Bauart wie `karte.test.mjs`, aus demselben Grund: Bei einer
 * Projektion ist „steht im Quelltext" keine Zusicherung. Ein Vorzeichenfehler
 * steht auch da.
 *
 * Was hier **nicht** geprüft wird, ist, ob es schön aussieht. Das findet nur
 * das Hinsehen – und es hat in diesem Durchgang zwei Fehler gefunden, die
 * keine Rechnung gefunden hätte.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';

const S = ARBEIT;
execSync(`npx esbuild src/lib/karte/relief.ts --bundle --format=esm --outfile=${S}/t/relief.mjs`, {
  stdio: 'pipe',
});
const R = await import(S + '/t/relief.mjs');

let ok = 0;
let bad = 0;
function wahr(was, bedingung, hinweis = '') {
  if (bedingung) {
    ok++;
  } else {
    bad++;
    console.error(`  ✗ ${was}${hinweis ? ` – ${hinweis}` : ''}`);
  }
}

/** Ein grober Kreis – wie eine gemalte Küste, nicht wie ein Zirkelschlag. */
function kreis(cx, cy, r, n = 20, unruhe = 0, seed = 1) {
  let z = seed;
  const zuf = () => ((z = (z * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const p = [];
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2;
    const rr = r * (1 - unruhe / 2 + zuf() * unruhe);
    p.push([cx + Math.cos(w) * rr, cy + Math.sin(w) * rr]);
  }
  return p;
}

const feature = (art, punkte, id = 'f') => ({ id, art, punkte, seed: 7 });

/* ==========================================================================
 * 1  DIE PROJEKTION
 * ======================================================================= */

console.log('\n1 Die Projektion');

/*
 * Die Höhe zieht nach oben.
 *
 * In SVG wächst y nach unten – wer das übersieht, bekommt ein Loch statt eines
 * Berges, und zwar ein völlig plausibel aussehendes.
 */
{
  const unten = R.iso(500, 500, 0);
  const oben = R.iso(500, 500, 60);
  wahr('  Höhe zieht nach oben', oben[1] < unten[1], `${oben[1]} vs ${unten[1]}`);
  /*
   * Und eine Senkrechte bleibt senkrecht. Das ist der ganze Grund, warum
   * diese Projektion sich für gezeichnete Reliefs eignet: Ein Baum steht,
   * statt mit der Fläche zu kippen.
   */
  wahr('  eine Senkrechte bleibt senkrecht', Math.abs(oben[0] - unten[0]) < 1e-9);
}

/* Der Ursprung bleibt der Ursprung, und x/y laufen auseinander. */
{
  const o = R.iso(0, 0, 0);
  wahr('  der Ursprung liegt bei null', Math.abs(o[0]) < 1e-9 && Math.abs(o[1]) < 1e-9);
  const rechts = R.iso(100, 0, 0);
  const runter = R.iso(0, 100, 0);
  wahr('  x geht nach rechts unten', rechts[0] > 0 && rechts[1] > 0);
  wahr('  y geht nach links unten', runter[0] < 0 && runter[1] > 0);
}

/* ==========================================================================
 * 2  DIE HÖHE KOMMT AUS DER GESTALT
 * ======================================================================= */

console.log('\n2 Die Höhe');

const breit = feature('land', kreis(500, 500, 300, 24, 0.2, 3));
const zunge = feature('land', [
  [700, 600],
  [860, 660],
  [900, 700],
  [850, 730],
  [720, 690],
  [660, 650],
]);

{
  const dickBreit = R.dicke(breit.punkte);
  const dickZunge = R.dicke(zunge.punkte);
  wahr(`  eine breite Landmasse ist dick (${Math.round(dickBreit)})`, dickBreit > 200);
  wahr(`  eine Landzunge ist dünn (${Math.round(dickZunge)})`, dickZunge < 60);
  /*
   * Das ist der Kern der Wahl „Dicke statt Flächeninhalt": Eine Zunge kann
   * denselben Inhalt haben wie eine Insel und ist trotzdem kein Gebirge.
   */
  wahr('  und steigt deshalb weniger hoch', R.hoeheVon(zunge) < R.hoeheVon(breit) / 2);
}

wahr('  Wasser sinkt', R.hoeheVon(feature('wasser', kreis(500, 500, 100))) < 0);
{
  const p = kreis(500, 500, 200, 20, 0, 5);
  wahr(
    '  Wald liegt über dem Land derselben Gestalt',
    R.hoeheVon(feature('wald', p)) > R.hoeheVon(feature('land', p)),
  );
}

/*
 * Zweimal dasselbe.
 *
 * Dieselbe Zusage wie bei `baeume()`: Wer die Karte neu lädt, sieht dasselbe
 * Gebirge. Eine Höhe, die bei jedem Anstrich würfelt, macht eine Karte
 * unbenutzbar, ohne je einen Fehler zu werfen.
 */
wahr('  dieselbe Fläche ergibt dieselbe Höhe', R.hoeheVon(breit) === R.hoeheVon(breit));

/* Entartetes bringt nichts zum Absturz. */
wahr('  zwei Punkte sind keine Fläche', R.dicke([[0, 0], [10, 10]]) === 0);
wahr('  ein Strich ohne Ausdehnung auch nicht', R.dicke([[5, 5], [5, 5], [5, 5]]) === 0);

/* ==========================================================================
 * 3  DIE REIHENFOLGE
 *
 * Der Abschnitt, der einen echten Fehler festhält: Hier stand einmal eine
 * Rangfolge nach Bedeutung („Wasser zuerst"), und der See mitten im Land
 * verschwand unter der Deckfläche des Landes.
 * ======================================================================= */

console.log('\n3 Die Reihenfolge');

{
  const land = feature('land', kreis(500, 500, 300, 24, 0.2, 3), 'land');
  const see = feature('wasser', kreis(470, 430, 90, 16, 0.2, 9), 'see');
  const wald = feature('wald', kreis(560, 600, 110, 16, 0.2, 11), 'wald');
  const folge = R.reliefFolge([see, wald, land]).map((f) => f.id);

  wahr('  alle drei kommen durch', folge.length === 3);
  /*
   * Das Land reicht am weitesten nach hinten und wird zuerst gezeichnet; der
   * See liegt darin, also weiter vorn, und deckt es an seiner Stelle ab.
   */
  wahr(`  das Land zuerst (${folge.join(' → ')})`, folge[0] === 'land');
  wahr('  der See danach – sonst wäre er zugemalt', folge.indexOf('see') > folge.indexOf('land'));
}

/* Von hinten nach vorn, gemessen am hintersten Punkt und nicht an der Mitte. */
{
  const hinten = feature('land', [[0, 0], [200, 0], [200, 200], [0, 200]], 'hinten');
  /* Eine grosse Fläche, deren *Mitte* weiter vorn liegt, aber die weit zurückreicht. */
  const gross = feature('land', [[100, 100], [900, 100], [900, 900], [100, 900]], 'gross');
  const folge = R.reliefFolge([gross, hinten]).map((f) => f.id);
  wahr('  der hinterste Punkt entscheidet', folge[0] === 'hinten');
}

wahr('  Flächen mit zwei Punkten fallen weg', R.reliefFolge([feature('land', [[0, 0], [1, 1]])]).length === 0);

/* ==========================================================================
 * 4  DIE WÄNDE
 * ======================================================================= */

console.log('\n4 Die Wände');

{
  /*
   * Eine **unregelmässige** Form, und das ist keine Kosmetik.
   *
   * Der erste Anlauf nahm einen regelmässigen Kreis. Damit war die Prüfung
   * grün, während der Fehler dastand: Bei einer symmetrischen Fläche haben
   * die vordere und die hintere Hälfte dieselben Kantenmitten – gemessen
   * wurde also, dass ein Kreis symmetrisch ist.
   *
   * Zum zweiten Mal in dieser Datei derselbe Fehler: eine Prüfung, deren
   * Messgrösse zwischen richtig und falsch nicht unterscheidet.
   */
  const p = kreis(430, 520, 210, 17, 0.55, 4);
  const gegen = [...p].reverse();
  const a = R.waende(p, 60);
  const b = R.waende(gegen, 60);

  wahr(`  eine erhobene Fläche hat Wände (${a.length})`, a.length > 0);
  /*
   * Nur die vorderen. Alle zu zeichnen kostet nicht nur Zeit: Bei
   * halbdurchsichtigen Farben schimmern die hinteren durch, und die Fläche
   * sieht aus wie aus Glas.
   */
  wahr('  aber nicht alle – die hinteren sind verdeckt', a.length < p.length);

  /*
   * **Der Umlaufsinn darf nichts ändern.**
   *
   * Ein Finger malt mal im, mal gegen den Uhrzeigersinn. Ohne die Prüfung des
   * Umlaufsinns wäre „vorne" bei jeder zweiten gemalten Fläche „hinten" – und
   * genau das sieht man erst, wenn man zufällig andersherum malt.
   */
  /*
   * Verglichen werden die **Stellen**, nicht die Anzahl.
   *
   * Der erste Anlauf zählte nur: `Math.abs(a.length - b.length) <= 1`. Damit
   * war die Prüfung grün, während der Fehler dastand – ohne Umlaufsinn liefert
   * die eine Richtung die vorderen Wände und die andere die hinteren, und
   * beide sind ungefähr gleich viele. Gemessen wurde also, dass ein Kreis
   * gleich viele Kanten hat wie er selbst.
   *
   * `tiefe` ist die Mitte einer Kante und in a/b symmetrisch: dieselbe Kante
   * ergibt denselben Wert, egal in welcher Richtung sie durchlaufen wird.
   */
  const stellen = (w) => w.map((x) => Math.round(x.tiefe * 100)).sort((p, q) => p - q).join(',');
  wahr(
    `  andersherum gemalt ergibt dieselben Wände (${a.length} / ${b.length})`,
    stellen(a) === stellen(b),
  );

  wahr('  eine flache Fläche hat keine', R.waende(p, 0).length === 0);
  wahr('  jede Wand ist ein geschlossenes Viereck', a.every((w) => /^M.*L.*L.*L.*Z$/.test(w.d)));
  wahr('  und trägt einen Lichtanteil zwischen null und eins', a.every((w) => w.licht >= 0 && w.licht <= 1));
  /* Nicht alle gleich – sonst wäre die Schattierung eine Behauptung. */
  wahr('  die Wände sind verschieden beleuchtet', new Set(a.map((w) => Math.round(w.licht * 20))).size > 1);
}

/* Auch nach unten: Wasser bekommt Wände, sonst sähe man nur eine Linie. */
wahr('  auch eine Senke hat Wände', R.waende(kreis(500, 500, 100, 12, 0, 2), -26).length > 0);

/* ==========================================================================
 * 5  DER AUSSCHNITT
 * ======================================================================= */

console.log('\n5 Der Ausschnitt');

{
  const p = kreis(500, 500, 200, 16, 0, 1);
  const k = R.reliefKasten(p, 60);
  /*
   * Der Kasten muss den **Fuss** mitnehmen. Wer nur die Deckfläche misst,
   * schneidet die Wand ab, die er gerade gezeichnet hat.
   */
  const nurOben = R.reliefKasten(p, 0);
  wahr('  der Kasten reicht bis zum Fuss', k.y1 >= nurOben.y1 - 1e-9 && k.y0 < nurOben.y0);

  const sicht = R.reliefSicht([k]);
  wahr(
    '  das Sichtfeld umschliesst den Inhalt',
    sicht.x <= k.x0 && sicht.y <= k.y0 && sicht.x + sicht.w >= k.x1 && sicht.y + sicht.h >= k.y1,
  );
  /*
   * Und es rahmt eng. Der erste Anlauf nahm das ganze Kartenfeld: richtig
   * gerechnet, und im Bild nahm die Insel ein Drittel der Höhe ein.
   */
  wahr('  und rahmt eng um ihn', sicht.w < 1000, `${Math.round(sicht.w)}`);
}

{
  /* Ohne Inhalt rahmt das Feld – sonst stünde eine leere Karte ohne Anhalt da. */
  const leer = R.reliefSicht([]);
  wahr('  eine leere Karte zeigt das ganze Feld', leer.w > 1500, `${Math.round(leer.w)}`);
}

console.log(`\n  ${ok} bestanden, ${bad} gescheitert\n`);
process.exit(bad ? 1 : 0);
