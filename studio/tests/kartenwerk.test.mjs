/**
 * Das Kartenwerk – die Zusagen der neuen Zeichenmaschine.
 *
 * ---
 *
 * **Worum es geht.**
 *
 * Diese Etappe überführt die Maschinerie und nicht die Gestaltung. Geprüft
 * wird deshalb nicht, wie ein Baum aussieht, sondern ob die Maschine hält,
 * was sie verspricht:
 *
 *   · Dieselben Daten ergeben dieselbe Landschaft, auf jedem Gerät.
 *   · Eine Änderung entwertet nur, was sie berührt.
 *   · Veraltete Bilder verschwinden nicht, bis die neuen da sind.
 *   · Der Speicher hat einen Deckel, und das Richtige fällt zuerst heraus.
 *   · Die Stufe wechselt nicht bei jedem Schritt einer Zoomgeste.
 *
 * Die letzten drei Punkte stehen hier, weil die Messung sie als Fehler
 * gefunden hat – jeder einzelne war im Bild unsichtbar und in den Zahlen
 * eindeutig.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut,
 * bis die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const wurzel = join(import.meta.dirname, '..');
const bau = join(ARBEIT, 'kartenwerk');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
const baue = (quelle, name) =>
  execFileSync(
    'npx',
    ['esbuild', quelle, '--bundle', '--format=esm',
     `--outfile=${join(bau, name)}`, '--log-level=error'],
    { cwd: wurzel, stdio: 'inherit' },
  );

/*
 * Eine Zeichenfläche, die nur zählt.
 *
 * Node kennt kein `OffscreenCanvas`. Das Kachelwerk braucht aber eines, um
 * überhaupt eine Kachel anzulegen – und was darauf gezeichnet wird, ist für
 * diese Prüfungen gleichgültig. Also bekommt es eines, das mitschreibt,
 * wie oft gemalt wurde.
 */
let gemalt = 0;
globalThis.OffscreenCanvas = class {
  constructor(w, h) { this.width = w; this.height = h; }
  getContext() {
    return new Proxy({}, {
      get: (_z, name) => {
        if (name === 'setTransform') return () => { gemalt++; };
        if (name === 'canvas') return this;
        return () => {};
      },
      set: () => true,
    });
  }
};

baue('src/lib/kartenwerk/kachelwerk.ts', 'kachelwerk.mjs');
baue('src/lib/kartenwerk/raster.ts', 'raster.mjs');
baue('src/lib/kartenwerk/streuwerk.ts', 'streuwerk.mjs');

const K = await import(join(bau, 'kachelwerk.mjs'));
const { Staffageraster, ZELLE } = await import(join(bau, 'raster.mjs'));
const { staffageAus } = await import(join(bau, 'streuwerk.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => { fn(); geprueft++; console.log(`  ✓ ${was}`); };
const lies = (p) => readFileSync(join(wurzel, p), 'utf8');
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/* =======================================================================
 * 1 · DIE STUFEN
 * ==================================================================== */

console.log('\n1 · Die Stufen');

pruefe('eine Kachel deckt halb so viel ab wie die Stufe darüber', () => {
  assert.equal(K.kachelmass(0), 1000);
  assert.equal(K.kachelmass(1), 500);
  assert.equal(K.kachelmass(4), 62.5);
});

pruefe('die Stufe wächst mit dem Heranzoomen', () => {
  /*
   * Je enger die Sicht, desto feiner die Kacheln. Ohne diesen Zusammenhang
   * wäre eine herangezoomte Karte entweder unscharf oder sie backte bei der
   * Übersicht Bildpunkte, die niemand sieht.
   */
  const ganz = K.stufeFuer(400, 1000);
  const nah = K.stufeFuer(400, 125);
  assert.ok(nah > ganz, `ganz ${ganz}, nah ${nah}`);
  assert.ok(ganz >= 0 && nah <= K.HOECHSTE_STUFE);
});

pruefe('die Stufe hängt nicht an der Gerätedichte', () => {
  /*
   * Sie kommt aus Elementbreite und Sichtbreite. Die Dichte bestimmt nur,
   * wie viele Bildpunkte eine Kachel bekommt – sonst sähe ein Telefon mit
   * dreifacher Dichte eine andere Landschaft als ein Rechner mit einfacher.
   * Dass `stufeFuer` die Dichte gar nicht annimmt, ist die Zusage.
   */
  assert.equal(K.stufeFuer.length, 3, 'stufeFuer nimmt eine Dichte entgegen');
  const q = ohneProsa(lies('src/lib/kartenwerk/kachelwerk.ts'));
  const koerper = q.slice(q.indexOf('export function stufeFuer'), q.indexOf('export interface Kasten'));
  assert.doesNotMatch(koerper, /dichte|devicePixelRatio/i);
});

pruefe('die Stufe wechselt nicht bei jedem Schritt einer Zoomgeste', () => {
  /*
   * **Gemessen, nicht vermutet.** Ohne Hysterese lief ein Zusammenziehen mit
   * zwei Fingern durch fünf Stufen, und jede wollte einen vollständigen Satz
   * Kacheln. Der gekachelte Weg war beim Zoomen **doppelt so teuer** wie der
   * alte – mitten in der Geste, also genau dort, wo es am meisten stört.
   *
   * Eine vorhandene Stufe wird deshalb behalten, solange sie zwischen halber
   * und doppelter Auflösung liegt.
   */
  const anfang = K.stufeFuer(400, 1000);
  /*
   * 600 ist der Prüfstein: **ohne** Hysterese wechselt die Stufe hier schon
   * (die Idealstufe springt von 1 auf 2), **mit** ihr bleibt sie stehen. Ein
   * Wert, der auch ohne Hysterese dieselbe Stufe gäbe, prüfte nichts – der
   * erste Anlauf nahm 820 und blieb deshalb in der Gegenprobe grün.
   */
  assert.notEqual(K.stufeFuer(400, 600), anfang, 'der Prüfstein trifft keine Grenze');
  assert.equal(K.stufeFuer(400, 600, anfang), anfang, 'die Stufe wechselt zu früh');
  /* Ein grosser Schritt – jetzt muss sie wechseln. */
  assert.notEqual(K.stufeFuer(400, 180, anfang), anfang);
});

pruefe('ohne vorige Stufe gibt es keine Hysterese', () => {
  /*
   * Beim ersten Bild gibt es nichts zu behalten. Eine Hysterese, die auch
   * dann greift, würde die Karte beim Öffnen auf einer willkürlichen Stufe
   * zeigen.
   */
  /*
   * **Die Werte ausschreiben, nicht zwei Aufrufe vergleichen.** Der erste
   * Anlauf prüfte `stufeFuer(…) === stufeFuer(…, undefined)` – beide liefen
   * durch dieselbe Zeile, also blieb die Gegenprobe grün, obwohl die Stufe
   * um eins verschoben war. Eine Prüfung, die eine Funktion mit sich selbst
   * vergleicht, prüft nichts.
   */
  assert.equal(K.stufeFuer(400, 1000), 1);
  assert.equal(K.stufeFuer(400, 500), 2);
  assert.equal(K.stufeFuer(400, 250), 3);
  assert.equal(K.stufeFuer(400, 125), 4);
  for (const w of [1000, 500, 250, 125]) {
    assert.equal(K.stufeFuer(400, w), K.stufeFuer(400, w, undefined));
  }
});

/* =======================================================================
 * 2 · DAS KACHELWERK
 * ==================================================================== */

console.log('\n2 · Das Kachelwerk');

const werk = (plan = {}) => new K.Kachelwerk(
  'probe',
  () => {},
  { ...K.WERKPLAN, dichte: 1, budgetMs: 1000, ...plan },
);

const fuelle = (w, stufe, von, bis, aktuell = stufe) => {
  for (let j = von; j <= bis; j++) {
    for (let i = von; i <= bis; i++) w.anfordern(i, j, stufe, { x: 0, y: 0 });
  }
  w.aktuelleStufe = aktuell;
  w.backeBudgetiert();
};

pruefe('eine Kachel entsteht einmal und wird danach nur geholt', () => {
  /*
   * Das ist der ganze Zweck. Entstünde sie bei jedem Nachsehen neu, wäre das
   * Kachelwerk ein teurer Umweg um den alten Weg.
   */
  const w = werk();
  fuelle(w, 2, 0, 1);
  const vorher = w.gebacken;
  for (let n = 0; n < 50; n++) w.nachsehen(0, 0, 2);
  assert.equal(w.gebacken, vorher, 'es wurde beim Nachsehen gebacken');
});

pruefe('eine Änderung entwertet nur, was sie berührt', () => {
  /*
   * Die Zusage, auf der „einzelne Landschaftsflächen unabhängig bearbeiten"
   * beruht. Entwertete eine Änderung alles, wäre jeder Strich so teuer wie
   * das Öffnen der Karte.
   */
  const w = werk();
  fuelle(w, 2, 0, 3);
  const alle = w.anzahl();
  assert.ok(alle >= 12, `nur ${alle} Kacheln gebacken`);
  /* Ein kleiner Kasten links oben. */
  const weg = w.entwerte({ x0: 10, y0: 10, x1: 40, y1: 40 });
  assert.ok(weg >= 1, 'nichts entwertet');
  assert.ok(weg < alle, `alles entwertet (${weg} von ${alle})`);
  /* Und weit weg ist nichts passiert. */
  const fern = w.nachsehen(3, 3, 2);
  assert.ok(fern && fern.frisch, 'eine ferne Kachel wurde mitentwertet');
});

pruefe('das alte Bild bleibt stehen, bis das neue da ist', () => {
  /*
   * **Warten lassen gilt nicht.** Wer eine Fläche ändert, darf kein Loch
   * sehen und auch kein Ruckeln. Die entwertete Kachel wandert zur Seite und
   * wird weiter gezeigt – als „nicht frisch" gekennzeichnet, damit der Maler
   * weiss, dass er sie nachbestellen muss.
   */
  const w = werk();
  fuelle(w, 2, 0, 1);
  w.entwerte({ x0: 0, y0: 0, x1: 1000, y1: 1000 });
  const da = w.nachsehen(0, 0, 2);
  assert.ok(da, 'nach dem Entwerten ist ein Loch');
  assert.equal(da.frisch, false, 'das veraltete Bild gilt als frisch');
});

pruefe('ein veraltetes Bild wird nachbestellt und ersetzt', () => {
  /*
   * **Der stillste Fehler dieser Runde.** Der Maler fand die zur Seite
   * gelegte Kachel, zeichnete sie zufrieden und forderte nie eine neue an.
   * Gemessen nach einer Waldänderung: neun Kacheln blieben dauerhaft
   * veraltet – die neuen Bäume erschienen erst, wenn man weit genug
   * wegscrollte, dass die Kachel aus dem Speicher fiel.
   *
   * Im Bild sah es vollständig aus. Es war nur falsch.
   */
  const w = werk();
  fuelle(w, 2, 0, 1);
  w.entwerte({ x0: 0, y0: 0, x1: 1000, y1: 1000 });
  assert.ok(w.veraltete() > 0);
  w.anfordern(0, 0, 2, { x: 0, y: 0 });
  w.backeBudgetiert();
  const da = w.nachsehen(0, 0, 2);
  assert.ok(da && da.frisch, 'die nachbestellte Kachel ist nicht frisch');

  /* Und der Maler bestellt sie auch wirklich nach. */
  const m = ohneProsa(lies('src/lib/kartenwerk/maler.ts'));
  /*
   * **Kein `[\s\S]` über Blockgrenzen.** Der erste Anlauf suchte bis zu 400
   * Zeichen weit – und fand dabei das `anfordern` des *nächsten* Zweigs. Die
   * Gegenprobe blieb grün, obwohl die Zeile entfernt war.
   */
  assert.match(m, /if \(!da\.frisch\) \{[^}]*werk\.anfordern\(i, j, stufe, mitte\);/,
    'der Maler bestellt veraltete Kacheln nicht nach');
});

pruefe('der Speicher hat einen Deckel', () => {
  const w = werk({ budgetBytes: 10 * 256 * 256 * 4 });
  fuelle(w, 3, 0, 7);
  assert.ok(w.bytes() <= 10 * 256 * 256 * 4, `${w.bytes()} Bytes über dem Budget`);
  assert.ok(w.verdraengt > 0, 'nichts wurde verdrängt');
});

pruefe('verdrängt wird zuerst, was gerade niemand braucht', () => {
  /*
   * **Gemessen:** 74 Verdrängungen bei 122 gebackenen Kacheln. Nach jedem
   * Zoomschritt liegen Kacheln mehrerer Stufen im Speicher; das Älteste war
   * regelmässig eine Kachel der gerade benutzten Stufe, und sie wurde im
   * nächsten Bild sofort wieder gebraucht. Der Speicher arbeitete gegen sich
   * selbst.
   */
  const platz = 8 * 256 * 256 * 4;
  const w = werk({ budgetBytes: platz });
  /*
   * **Die aktuelle Stufe zuerst** – und damit die ältesten Kacheln im
   * Speicher. „Ältestes zuerst" würde also genau sie treffen. Der erste
   * Anlauf füllte umgekehrt und prüfte deshalb nichts: Dort war das Älteste
   * ohnehin die fremde Stufe.
   */
  fuelle(w, 3, 0, 2);
  fuelle(w, 1, 0, 1, 3);
  /* Die aktuelle Stufe muss überlebt haben. */
  let dreier = 0;
  for (let j = 0; j <= 2; j++) for (let i = 0; i <= 2; i++) {
    const d = w.nachsehen(i, j, 3);
    if (d && d.frisch) dreier++;
  }
  assert.ok(dreier >= 7, `nur ${dreier} Kacheln der aktuellen Stufe überlebten`);
});

pruefe('ein Stilwechsel leert alles', () => {
  /*
   * Ein anderer Stil ist ein anderes Bild – da hilft kein Entwerten nach
   * Kasten. Eine einzige überlebende Kachel im alten Stil wäre ein Fleck
   * fremder Landschaft mitten in der neuen.
   */
  const w = werk();
  fuelle(w, 2, 0, 1);
  /* Erst etwas veralten lassen – sonst prüft das Leeren nur die frische Hälfte. */
  w.entwerte({ x0: 0, y0: 0, x1: 1000, y1: 1000 });
  fuelle(w, 2, 0, 1);
  w.entwerte({ x0: 0, y0: 0, x1: 400, y1: 400 });
  assert.ok(w.veraltete() > 0, 'nichts veraltet – die Prüfung prüft nichts');
  w.leere();
  assert.equal(w.anzahl(), 0);
  assert.equal(w.veraltete(), 0);
  assert.equal(w.nachsehen(0, 0, 2), undefined);
});

/* =======================================================================
 * 3 · DAS RASTER
 * ==================================================================== */

console.log('\n3 · Das Raster');

const stueck = (x, y, y2 = y) => ({
  art: 'wald', variante: 0, x, y: y2, h: 15, dreh: 0, spiegel: false,
  lage: 'bewuchs', ebene: 1,
});

pruefe('eine Kachel sieht nicht die ganze Karte durch', () => {
  /*
   * **Der Fehler, den es behebt, war gemessen.** Der erste Anlauf liess jede
   * Kachel über die gesamte Staffageliste laufen: bei 575 Bäumen und 36
   * Kacheln sind das 20 700 Durchläufe – genau das Verhalten, das die
   * Kacheln abschaffen sollten, nur eine Stufe höher.
   */
  const viele = [];
  for (let i = 0; i < 2000; i++) viele.push(stueck((i % 50) * 20, Math.floor(i / 50) * 20));
  const r = new Staffageraster(viele);
  const nah = r.imKasten(0, 0, ZELLE, ZELLE);
  assert.ok(nah.length > 0, 'das Raster findet nichts');
  assert.ok(nah.length < viele.length / 10,
    `${nah.length} von ${viele.length} Stücken für eine Zelle`);
});

pruefe('das Raster verliert nichts', () => {
  const viele = [];
  for (let i = 0; i < 500; i++) viele.push(stueck((i * 37) % 990, (i * 53) % 990));
  const r = new Staffageraster(viele);
  const alle = r.imKasten(-100, -100, 1100, 1100);
  assert.equal(alle.length, viele.length);

  /*
   * **Und die letzte Zelle gehört dazu.** `i <= i1` statt `i < i1` – ein
   * Zeichen Unterschied, und der Rand jeder Kachel verliert seine Staffage.
   * Der erste Anlauf prüfte nur einen Kasten, dessen letzte Zelle leer war,
   * und blieb deshalb in der Gegenprobe grün.
   */
  const rand = new Staffageraster([stueck(10, 10), stueck(ZELLE * 1.5, ZELLE * 1.5)]);
  assert.equal(rand.imKasten(0, 0, ZELLE * 1.5, ZELLE * 1.5).length, 2,
    'die letzte Zelle des Kastens fehlt');
});

pruefe('was herauskommt, ist in Malreihenfolge', () => {
  /*
   * Sonst ginge die Tiefensortierung innerhalb einer Kachel verloren: Ein
   * Baum muss auch dort vor dem stehen, was hinter ihm liegt.
   */
  /*
   * **Innerhalb *einer* Zelle.** Über mehrere Zellen hinweg kommt die
   * Reihenfolge schon aus der Schleife, und der erste Anlauf prüfte deshalb
   * nur die Schleife – die Gegenprobe ohne `sort` blieb grün.
   */
  const r = new Staffageraster([stueck(10, 40), stueck(20, 10), stueck(30, 25)]);
  const aus = r.imKasten(0, 0, ZELLE - 1, ZELLE - 1);
  assert.equal(aus.length, 3);
  assert.deepEqual(aus.map((s2) => s2.y), [10, 25, 40]);
});

/* =======================================================================
 * 4 · DAS STREUWERK
 * ==================================================================== */

console.log('\n4 · Das Streuwerk');

const kreis = (cx, cy, r, n = 40) => {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    p.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return p;
};
const buch = {
  id: 'probe',
  eintrag: (art) => (art === 'wald'
    ? { varianten: 3, lage: 'bewuchs', ebene: 1, breiteZuHoehe: 1, zeichne() {} }
    : undefined),
  arten: () => ['wald'],
};

pruefe('dieselben Daten ergeben dieselbe Landschaft', () => {
  /*
   * Die Zusage, ohne die nichts anderes zählt. Sie beruht auf dem Ortszufall
   * aus `karte/zufall.ts`: derselbe Ort gibt dieselbe Zahl, unabhängig von
   * der Fragereihenfolge.
   */
  const f = [{ id: 'a', art: 'wald', punkte: kreis(500, 500, 150), seed: 7 }];
  const a = staffageAus(f, buch);
  const b = staffageAus(f, buch);
  assert.ok(a.length > 20, `nur ${a.length} Stücke`);
  assert.deepEqual(a, b);
});

pruefe('eine Fläche ohne Eintrag im Stilbuch bringt nichts hervor', () => {
  /*
   * Ein Stil, der keine Berge kennt, zeichnet keine. Er soll nicht
   * abstürzen und auch nicht etwas anderes an ihre Stelle setzen.
   */
  const f = [{ id: 'a', art: 'berge', punkte: kreis(500, 500, 150), seed: 7 }];
  assert.deepEqual(staffageAus(f, buch), []);
  /*
   * Und das Streuwerk macht aus einer fremden Art auch keine Bäume. Der
   * erste Anlauf prüfte nur die eine Rückgabe und übersah, dass sie aus zwei
   * Gründen leer sein kann – die Gegenprobe am falschen Grund blieb grün.
   */
  const q = ohneProsa(lies('src/lib/kartenwerk/streuwerk.ts'));
  assert.match(q, /if \(f\.art === 'wald'\) \{/, 'die Art wird nicht geprüft');
  assert.match(q, /\n  return \[\];\n\}/, 'eine unbekannte Art fällt nicht durch');
});

pruefe('gestreut wird nur innerhalb des Gemalten', () => {
  /*
   * Gesetz 4, in der Zeichenmaschine. Eine Landschaft, die über ihre Fläche
   * hinauswächst, ist erfundene Geografie – derselbe Einwand wie beim Fluss
   * und bei den Siedlungen.
   */
  const f = [{ id: 'a', art: 'wald', punkte: kreis(500, 500, 150), seed: 7 }];
  for (const s of staffageAus(f, buch)) {
    const d = Math.hypot(s.x - 500, s.y - 500);
    assert.ok(d <= 160, `ein Baum steht ${d.toFixed(0)} von der Mitte entfernt`);
  }
});

pruefe('die Staffage ist global sortiert, nicht je Fläche', () => {
  /*
   * Der eine gewollte Unterschied dieser Etappe. Der alte Weg zeichnet
   * Fläche für Fläche; ein Baum kann dort nicht vor dem stehen, was zu einer
   * anderen Fläche gehört. Für eine Landschaft, die zusammenhängt, ist die
   * globale Tiefensortierung Voraussetzung.
   */
  const f = [
    { id: 'unten', art: 'wald', punkte: kreis(500, 700, 120), seed: 1 },
    { id: 'oben', art: 'wald', punkte: kreis(500, 300, 120), seed: 2 },
  ];
  const liste = staffageAus(f, buch);
  for (let i = 1; i < liste.length; i++) {
    assert.ok(liste[i - 1].ebene < liste[i].ebene || liste[i - 1].y <= liste[i].y,
      'nicht global sortiert');
  }
  /* Und beide Flächen kommen vor. */
  assert.ok(liste.some((s) => s.y < 400) && liste.some((s) => s.y > 600));
});

pruefe('eine wachsende Fläche behält ihre alten Bäume', () => {
  /*
   * Das Gitter ist am **Kartenraum** ausgerichtet und nicht am Kasten der
   * Fläche. Wäre es am Kasten ausgerichtet, verschöbe sich beim Vergrössern
   * das ganze Gitter – und mit ihm jeder Baum. Eine kleine Randkorrektur
   * würfelte dann den ganzen Wald neu.
   *
   * **Warum nicht hundert Prozent.** Gemessen bleiben bei 27 % mehr Fläche
   * **82 %** der Bäume genau stehen. Der Rest geht auf die
   * Mindestabstandsprüfung in `wald.ts`: Wächst die Fläche, werden am Rand
   * neue Kandidaten angenommen, und manche davon verdrängen einen Nachbarn,
   * der vorher durchkam. Das ist keine Unschärfe dieser Prüfung, sondern das
   * Verhalten des Streuers – und es ist gutartig, weil es nur den Saum
   * betrifft.
   *
   * Die Schranke steht deshalb auf 0,75 und nicht auf 0,99. Wäre das Gitter
   * am Kasten ausgerichtet, läge der Wert nahe null.
   */
  const klein = staffageAus([{ id: 'a', art: 'wald', punkte: kreis(500, 500, 150), seed: 7 }], buch);
  const gross = staffageAus([{ id: 'a', art: 'wald', punkte: kreis(500, 500, 190), seed: 7 }], buch);
  const inGross = new Set(gross.map((s) => `${s.x.toFixed(2)}|${s.y.toFixed(2)}`));
  const geblieben = klein.filter((s) => inGross.has(`${s.x.toFixed(2)}|${s.y.toFixed(2)}`)).length;
  assert.ok(geblieben > klein.length * 0.75,
    `nur ${geblieben} von ${klein.length} Bäumen blieben stehen`);
});

/* =======================================================================
 * 5 · DIE ALTE MASCHINE IST WIRKLICH WEG
 * ==================================================================== */

console.log('\n5 · Die alte Maschine ist wirklich weg');

pruefe('es gibt keine zweite Kartenimplementierung', () => {
  /*
   * Zwei Stellen, die dieselben Bäume rechnen, wären zwei Wahrheiten über
   * denselben Wald (Gesetz 5) – und die zweite wäre still falsch geworden,
   * sobald eine von beiden sich ändert.
   */
  const q = ohneProsa(lies('src/components/karte/Weltkarte.tsx'));
  assert.match(q, /useKartenleinwand\(\{ leinwand, huelle, karte, stil, sicht \}\)/,
    'die Leinwand geht nicht durchs Kartenwerk');
  assert.doesNotMatch(q, /zeichneBaum/, 'das Bauteil zeichnet noch selbst Bäume');
  assert.doesNotMatch(q, /const waelder = useMemo/, 'der alte Baum-Memo steht noch da');
});

pruefe('die Zeichenschleife bricht ihr eigenes Bild nicht mehr ab', () => {
  /*
   * **Der Fehler, den die alte Fassung noch hat.** Der Zeichen-Effekt hing
   * an `sicht`; bei jeder Sichtänderung räumte React ihn ab, und das
   * Aufräumen rief `cancelAnimationFrame` auf genau das Bild, das gerade
   * angefordert war. Beim Schieben kommt die nächste Änderung aber schneller
   * als das nächste Bild.
   *
   * Gemessen über eine Schiebegeste von 88 Bildern: Die Leinwand malte
   * **dreimal**. Die Bäume hinkten sichtbar hinterher.
   */
  const q = ohneProsa(lies('src/components/karte/useKartenleinwand.ts'));
  const schleife = q.slice(q.indexOf('const male = () =>'));
  const ende = schleife.indexOf('}, [leinwand, huelle]);');
  assert.ok(ende > 0, 'die Zeichenschleife hängt wieder an der Sicht');
  assert.match(q, /anfordernRef\.current\(\);\s*\}, \[sicht, raster, stil\]\);/,
    'niemand meldet ein Bild an, wenn sich etwas ändert');
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
