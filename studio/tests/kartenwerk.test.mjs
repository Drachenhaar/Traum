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

baue('src/lib/kartenwerk/atlas.ts', 'atlas.mjs');
baue('src/lib/kartenwerk/kachelwerk.ts', 'kachelwerk.mjs');
baue('src/lib/kartenwerk/raster.ts', 'raster.mjs');
baue('src/lib/kartenwerk/streuwerk.ts', 'streuwerk.mjs');

const { bildEintrag } = await import(join(bau, 'atlas.mjs'));
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
 * 5 · DER ATLAS
 * ==================================================================== */

console.log('\n5 · Der Atlas');

const verzeichnis = JSON.parse(readFileSync(join(wurzel, 'public/karte/artbook/atlas.json'), 'utf8'));

const falscherAtlas = {
  bild: { breite: 1 },
  verzeichnis: {
    stil: 'probe', breite: 256, hoehe: 256,
    arten: {
      wald: {
        varianten: 2, breiteZuHoehe: 0.8, ankerX: 0.5, ankerY: 0.96,
        stufen: [1, 0.5, 0.25],
        felder: [
          [[0, 0, 80, 100], [0, 0, 40, 50], [0, 0, 20, 25]],
          [[90, 0, 80, 100], [90, 0, 40, 50], [90, 0, 20, 25]],
        ],
      },
    },
  },
};

/** Ein Kontext, der mitschreibt, was gezeichnet wurde. */
const schreiber = () => {
  const befehle = [];
  const ctx = {
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    drawImage(...a) { befehle.push(a); },
  };
  return { ctx, befehle };
};

const stueckM = (h, variante = 0) => ({
  art: 'wald', variante, x: 100, y: 200, h, dreh: 0, spiegel: false,
  lage: 'bewuchs', ebene: 1,
});

pruefe('der gebackene Bildersatz liegt bei und beschreibt sich selbst', () => {
  /*
   * Die Dateien sind eingecheckt, damit `npm run build` ohne Browser
   * auskommt. Fehlten sie, liefe die Anwendung weiter – aber mit dem
   * Pinsel, und niemand merkte, dass die Grafiken verschwunden sind.
   */
  const w = verzeichnis.arten.wald;
  assert.ok(w, 'der Satz kennt keine Bäume');
  assert.equal(w.felder.length, w.varianten);
  for (const stufen of w.felder) {
    assert.equal(stufen.length, w.stufen.length, 'eine Variante hat nicht alle Mipstufen');
    for (let i = 1; i < stufen.length; i++) {
      assert.ok(stufen[i][3] < stufen[i - 1][3], 'die Stufen werden nicht gröber');
    }
  }
  /* Jedes Feld liegt im Bild. */
  for (const stufen of w.felder) {
    for (const [x, y, bw, bh] of stufen) {
      assert.ok(x >= 0 && y >= 0 && x + bw <= verzeichnis.breite && y + bh <= verzeichnis.hoehe,
        `ein Feld liegt ausserhalb des Atlas: ${x},${y},${bw},${bh}`);
    }
  }
});

pruefe('der Anker ist die Mitte der Unterkante', () => {
  /*
   * **Die wichtigste Zahl im Verzeichnis.** Ein Bild, das um seine Mitte
   * verankert wäre, rutschte beim Vergrössern nach unten weg – und niemand
   * sähe gleich, warum. Dieselbe Regel wie bei den Siedlungszeichen.
   */
  const w = verzeichnis.arten.wald;
  assert.equal(w.ankerX, 0.5);
  assert.ok(w.ankerY > 0.9, `der Anker sitzt bei ${w.ankerY} statt am Boden`);

  /* Und der Maler hält sich daran. */
  const e = bildEintrag(falscherAtlas, 'wald', 'bewuchs', 1);
  const { ctx, befehle } = schreiber();
  e.zeichne(ctx, stueckM(100), 1);
  const [, , , , , zx, zy, zb, zh] = befehle[0];
  assert.ok(Math.abs(zx + zb * 0.5) < 0.01, `waagerecht nicht zentriert: ${zx}`);
  assert.ok(Math.abs(zy + zh * 0.96) < 0.01, `der Fuss sitzt bei ${zy + zh}, nicht am Boden`);
});

pruefe('die Mipstufe richtet sich nach der gezeichneten Grösse', () => {
  /*
   * Nicht nach dem Zoom allein: Ein kleiner Baum bei starker Vergrösserung
   * braucht dieselbe Stufe wie ein grosser bei schwacher. Was zählt, ist,
   * wie viele Bildpunkte dieses eine Bild am Ende bedeckt.
   *
   * Ohne das flimmert ein Wald beim Schieben, weil der Browser bei jedem
   * Bild andere Quellpunkte trifft.
   */
  const e = bildEintrag(falscherAtlas, 'wald', 'bewuchs', 1);
  const stufeBei = (hoehe, massstab) => {
    const { ctx, befehle } = schreiber();
    e.zeichne(ctx, stueckM(hoehe), massstab);
    return befehle[0][4];
  };
  /* Gross gezeichnet – die feinste Stufe (Quellhöhe 100). */
  assert.equal(stufeBei(100, 1), 100);
  /* Winzig – die gröbste (25). */
  assert.equal(stufeBei(10, 1), 25);
  /* Klein, aber stark vergrössert: wieder die feinste. */
  assert.equal(stufeBei(10, 10), 100);
});

pruefe('eine unbekannte Variante stürzt nicht ab', () => {
  /*
   * Das Stilbuch sagt, wie viele Varianten es gibt, und das Streuwerk hält
   * sich daran. Trifft doch einmal eine Zahl daneben – ein älterer
   * Bildersatz, ein halb geladener Atlas –, soll ein Baum erscheinen und
   * nicht die Karte stehenbleiben.
   */
  const e = bildEintrag(falscherAtlas, 'wald', 'bewuchs', 1);
  const { ctx, befehle } = schreiber();
  e.zeichne(ctx, stueckM(100, 99), 1);
  assert.equal(befehle.length, 1);
});

pruefe('eine Art, die der Atlas nicht kennt, gibt keinen Eintrag', () => {
  /*
   * Dann entscheidet das Stilbuch, ob es einen Pinsel dafür hat. Ein
   * leerer Eintrag, der nichts zeichnet, wäre schlimmer: Er sähe aus wie
   * eine fehlende Fläche statt wie eine fehlende Grafik.
   */
  assert.equal(bildEintrag(falscherAtlas, 'berge', 'fels', 2), undefined);
});

pruefe('ohne Atlas malt der Pinsel – die Karte bleibt nie leer', () => {
  /*
   * Beim ersten Bild, ohne Netz, bei einer kaputten Datei. Eine Karte, die
   * ohne ihre Bilder weiss bleibt, wäre ein schlechter Tausch für etwas
   * schöneres Laub.
   */
  const q = ohneProsa(lies('src/lib/kartenwerk/stilbuch.ts'));
  assert.match(q, /if \(gemalt\) tabelle\[art\] = gemalt;/, 'das Bild hat keinen Vorrang');
  assert.match(q, /\{ \.\.\.pinselEintraege\(stil\) \}/, 'der Pinsel ist kein Rückfallweg');

  const a = ohneProsa(lies('src/lib/kartenwerk/atlas.ts'));
  assert.match(a, /if \(!antwort\.ok\) return undefined;/, 'ein fehlender Atlas wirft');
  assert.match(a, /\} catch \{\s*return undefined;/, 'ein Fehler beim Laden wirft');
});

pruefe('ein neuer Bildersatz leert den Kachelspeicher', () => {
  /*
   * Sonst stünden nach dem Eintreffen der Grafiken gemalte und gezeichnete
   * Bäume nebeneinander – je nachdem, welche Kachel wann entstanden ist.
   * Ein Fleck fremder Landschaft mitten in der neuen.
   */
  const q = ohneProsa(lies('src/components/karte/useKartenleinwand.ts'));
  assert.match(q, /if \(vorigesBuch\.current && vorigesBuch\.current !== stilbuch\) \{\s*werk\.leere\(\);/);
});

/* =======================================================================
 * 6 · DIE GRAFIKEN SIND AUSTAUSCHBAR
 *
 * Die gebackene Kunst ist Stufe eins, nicht das Ziel. Was hier geprüft
 * wird, ist nicht, wie sie aussieht, sondern dass sie sich ersetzen
 * lässt – ohne Änderung am Programm und ohne Änderung an den
 * Kartendaten.
 * ==================================================================== */

console.log('\n6 · Die Grafiken sind austauschbar');

pruefe('keine Stelle im Kartenwerk nennt eine Art beim Namen', () => {
  /*
   * **Die Zusage „neue Landschaftstypen ohne Umbau der Engine".**
   *
   * Sie wäre gebrochen, stünde irgendwo `if (art === 'berge')`. Das Stilbuch
   * geht über das durch, was der Bildersatz mitbringt; welche Arten das
   * sind, erfährt es erst zur Laufzeit.
   *
   * Das Streuwerk ist ausgenommen: Dort steht *wie* eine Art verteilt wird,
   * und ein Wald wird anders gestreut als eine Gebirgskette. Das ist
   * Bedeutung, nicht Gestaltung.
   */
  const q = ohneProsa(lies('src/lib/kartenwerk/stilbuch.ts'));
  assert.match(q, /for \(const art of Object\.keys\(atlas\?\.verzeichnis\.arten \?\? \{\}\)\)/,
    'das Stilbuch geht die Arten des Satzes nicht durch');
  /*
   * Nur `stilbuchFuer` – die **Pinseltabelle** darf ihre Arten nennen. Sie
   * ist das, was dieser Stil aus Code zeichnen kann, und das ist
   * Gestaltung. Generisch sein muss der Weg, auf dem Bilder hereinkommen.
   */
  const anfang = q.indexOf('export function stilbuchFuer');
  const generisch = q.slice(anfang, q.indexOf('function pinselEintraege', anfang));
  assert.ok(generisch.length > 200, 'stilbuchFuer nicht gefunden');
  assert.doesNotMatch(generisch, /'wald'|"wald"/, 'stilbuchFuer nennt eine Art beim Namen');
});

pruefe('der Bildersatz hängt am Stil, nicht an einer festen Zeichenkette', () => {
  /*
   * Sonst bekäme jeder spätere Stil die Bäume von Artbook. Und der dunkle
   * Band teilt den Satz mit dem hellen: Laub und Stamm sind in beiden
   * gleich, was sich ändert, ist Papier und Tinte.
   */
  const q = ohneProsa(lies('src/components/karte/useKartenleinwand.ts'));
  assert.match(q, /const satz = stil\.bildsatz;/);
  assert.match(q, /ladeAtlas\(satz, import\.meta\.env\.BASE_URL\)/);
  assert.doesNotMatch(q, /ladeAtlas\('artbook'/, 'der Satz ist fest verdrahtet');

  const st = ohneProsa(lies('src/lib/karte/stil.ts'));
  assert.match(st, /id: 'artbook-dunkel',[\s\S]{0,200}?bildsatz: 'artbook',/,
    'der dunkle Band hat einen eigenen Satz');
});

pruefe('eine gemalte Datei verdrängt die gebackene', () => {
  /*
   * **Der Austauschweg, an der Wirkung gemessen.** Unter
   * `assets/karte/artbook/` liegen die Illustrationen; im Verzeichnis muss
   * jede davon als `gemalt` stehen.
   *
   * Das ist der ganze Weg: Dateien hinlegen, `npm run atlas`. Kein
   * Programmteil, keine Kartendaten.
   *
   * **Hier stand einmal `h.includes('gebacken')`** – die Prüfung verlangte,
   * dass mindestens ein Bild noch aus dem Pinsel kommt. Das war richtig,
   * solange nur ein Platzhalter dalag, und wurde falsch, sobald der ganze
   * Satz gezeichnet war: Sie hätte den Erfolg gemeldet als Fehler. Geprüft
   * wird deshalb, was gemeint war – dass eine Datei das gebackene Bild
   * verdrängt –, und nicht, wie viele es gerade sind.
   */
  const v = JSON.parse(readFileSync(join(wurzel, 'public/karte/artbook/atlas.json'), 'utf8'));
  const h = v.arten.wald.herkunft;
  assert.ok(Array.isArray(h), 'das Verzeichnis sagt nicht, woher die Bilder stammen');
  assert.equal(h.length, v.arten.wald.varianten);
  assert.ok(h.every((q) => q === 'gemalt' || q === 'gebacken'), `fremde Herkunft: ${h}`);
  assert.equal(h[0], 'gemalt', 'die hinterlegte Illustration wurde nicht genommen');

  /*
   * **Und der Ofen muss es auch tun.** Das Erzeugnis allein genügt nicht:
   * Es liegt eingecheckt im Verzeichnis und bliebe richtig, auch wenn der
   * Weg dorthin kaputtginge. Erst beim nächsten Backen fiele es auf – also
   * genau dann, wenn jemand eine neue Illustration ausprobiert.
   */
  const b = ohneProsa(lies('scripts/atlas/backstube.html'));
  assert.match(b, /const bild = await lade\(bildpfad\(satzName, art, v\)\);/,
    'die Backstube sucht keine gemalten Dateien');
  assert.match(b, /herkunft: quellen\[art\]\.map\(\(q\) => \(q\.bild \? 'gemalt' : 'gebacken'\)\)/,
    'die Herkunft wird nicht aus der Quelle abgeleitet');
});

pruefe('der Vertrag steht an einer Stelle und wird wirklich geprüft', () => {
  /*
   * Einheitliche Perspektive, Lichtrichtung und Größenverhältnisse sind
   * keine Bitte an den Zeichner, sondern eine Bedingung, die das Backen
   * durchsetzt. Gemessen an einem Bild mit Licht von rechts:
   *
   *   ✗ wald_03.png: das Licht kommt nicht von links oben:
   *     links 90, rechts 154 – Vorsprung −52,7 %, nötig 1,5 %
   *   ✗ wald: im Satz leuchtet es teils von links, teils von rechts
   *
   * und `npm run atlas` endet mit 1.
   */
  const v = ohneProsa(lies('scripts/atlas/saetze.mjs'));
  for (const regel of ['fussAb', 'randFrei', 'verhaeltnisAbweichung', 'lichtVonLinks', 'mindestensDeckung']) {
    assert.match(v, new RegExp(`${regel}:`), `der Vertrag kennt ${regel} nicht`);
  }
  const b = ohneProsa(lies('scripts/atlas/backstube.html'));
  assert.match(b, /pruefe\(mass, def, VERTRAG\)/, 'einzelne Bilder werden nicht geprüft');
  assert.match(b, /pruefeSatz\(masse, VERTRAG\)/, 'der Satz als ganzer wird nicht geprüft');
  const a = ohneProsa(lies('scripts/atlas-backen.mjs'));
  assert.match(a, /if \(beanstandet\) \{[\s\S]{0,300}?process\.exit\(1\);/,
    'Beanstandungen brechen das Backen nicht ab');
});

pruefe('der Freisteller passt ein, statt nur zu beschneiden', () => {
  /*
   * **Was ein Bildmodell liefert, hält den Vertrag nie von selbst.**
   *
   * Es liefert ein Rechteck mit Hintergrund, und die Fußlinien stehen dort,
   * wo sie gerade standen. Nachgestellt mit acht Bäumen auf einem Blatt,
   * deren Fußlinien um ±15 Punkte streuten: Nach dem Freistellen hielten
   * **alle acht** die Fußpunktprüfung – weil der Einpasser nicht
   * beschneidet, sondern rechnet, welche Leinwand das Motiv braucht, damit
   * sein Fuß bei `ankerY` sitzt.
   *
   * Die Lichtrichtung kann er nicht geraderücken. Die muss aus dem Bild
   * kommen, und dafür gibt es `BILDANWEISUNG.md`.
   */
  const f = ohneProsa(lies('scripts/atlas/freisteller.html'));
  assert.match(f, /let H = mh \/ \(soll\.ankerY - obenLuft\);/,
    'die Leinwandhöhe folgt nicht dem Ankerpunkt');
  assert.match(f, /const zy = ziel\.height \* soll\.ankerY - mh;/,
    'der Fuß wird nicht auf den Anker gesetzt');
  assert.match(f, /let W = H \* soll\.breiteZuHoehe;/,
    'die Breite folgt nicht dem Seitenverhältnis');

  /* Und er flutet vom Rand, statt global nach Farbe zu löschen. */
  assert.match(f, /for \(let x = 0; x < w; x\+\+\) \{ stapel\.push\(x, \(h - 1\) \* w \+ x\); \}/,
    'die Flutfüllung startet nicht am Rand');

  const m = ohneProsa(lies('scripts/freistellen.mjs'));
  assert.match(m, /soll: masse, vertrag: VERTRAG,/,
    'der Freisteller liest den Vertrag nicht');
});

pruefe('ein Blatt wird an den Lücken geteilt, nicht in gleiche Spalten', () => {
  /*
   * **Der Fehler stand im gebackenen Atlas.** Der erste Anlauf teilte in
   * acht gleich breite Spalten. Ein Modell zeichnet die Bäume aber
   * verschieden breit: Die Eiche war breiter als ihre Spalte, bekam eine
   * **glatt abgeschnittene Krone**, und in die Nachbarspalten ragten
   * Splitter von ihr hinein.
   *
   * Also wird nicht gerechnet, sondern nachgesehen: Welche Bildspalten sind
   * vollständig durchsichtig? Dazwischen liegt je ein Baum.
   */
  const f = ohneProsa(lies('scripts/atlas/freisteller.html'));
  assert.match(f, /function luecken\(ctx, w, h, erwartet\)/, 'es gibt keine Lückensuche');
  assert.match(f, /const gruppen = luecken\(gctx, bild\.width, bild\.height, spalten\);/,
    'das Blatt wird nicht an den Lücken geteilt');
});

pruefe('berühren sich zwei Kronen, wird an der dünnsten Stelle getrennt', () => {
  /*
   * Gemessen an einem gelieferten Blatt: acht Bäume, aber nur **sechs**
   * Gruppen – zweimal griffen benachbarte Kronen ineinander, und eine Lücke
   * von null Bildpunkten findet keine Schwelle.
   *
   * Dann wird geteilt statt gesucht: die breiteste Gruppe an ihrer
   * dünnsten Stelle, und nur im mittleren Bereich – damit der Schnitt
   * zwischen zwei Kronen läuft und nicht am Rand einer entlang.
   */
  const f = ohneProsa(lies('scripts/atlas/freisteller.html'));
  assert.match(f, /while \(erwartet && breit\.length < erwartet && breit\.length > 0\)/,
    'berührende Motive werden nicht getrennt');
  assert.match(f, /if \(deckung\[x\] < bestW\)/, 'getrennt wird nicht an der dünnsten Stelle');
  assert.match(f, /const rand = Math\.round\(\(b - a\) \* 0\.2\);/,
    'der Schnitt darf auch am Rand liegen');
});

pruefe('ein schon freigestelltes Blatt wird nicht noch einmal freigestellt', () => {
  /*
   * Wer die Durchsichtigkeit mitbringt, hat sie meist von einem Werkzeug,
   * das mehr sieht als eine Flutfüllung – weiche Blattränder vor allem. Die
   * Flutfüllung noch einmal darüberlaufen zu lassen nähme nichts weg und
   * liesse nur Reste stehen, wo der Rand schon halb durchsichtig ist.
   *
   * Geteilt und eingepasst wird trotzdem: Ein Blatt mit acht Bäumen ist
   * auch freigestellt noch kein Satz aus acht Dateien.
   */
  const f = ohneProsa(lies('scripts/atlas/freisteller.html'));
  assert.match(f, /grund = schonFrei\s*\?\s*\{ r: -1, g: -1, b: -1 \}\s*:\s*freistellen\(/,
    'ein freigestelltes Blatt läuft trotzdem durch die Flutfüllung');
  const m = ohneProsa(lies('scripts/freistellen.mjs'));
  assert.match(m, /const schonFrei = args\.includes\('--frei'\);/, 'es gibt kein --frei');
  assert.match(m, /nachLuecken: true, schonFrei/, '--frei wird nicht durchgereicht');
});

pruefe('die Bildanweisung nennt dieselben Zahlen wie der Vertrag', () => {
  /*
   * Zwei Wahrheiten über dieselbe Regel sind der Anfang eines Satzes, der
   * nicht zusammenpasst: Wer nach dem Blatt arbeitet und am Prüfer
   * scheitert, hat kein Bild zu wenig, sondern eine Anweisung zu viel.
   */
  const a = lies('BILDANWEISUNG.md');
  assert.match(a, /acht Bäumen nebeneinander/, 'das Blatt wird nicht verlangt');
  assert.match(a, /links oben/, 'die Lichtrichtung fehlt');
  assert.match(a, /#EDEDE9/, 'der Hintergrundton fehlt');
  assert.match(a, /npm run freistellen -- <satz> <art> 8 --blatt/, 'der Weg fehlt');
  /* Die Farben müssen die des Satzes sein. */
  const v = ohneProsa(lies('scripts/atlas/saetze.mjs'));
  for (const ton of ['#7A8467', '#99A484', '#5C6749', '#6B6047']) {
    assert.ok(v.includes(ton), `${ton} steht nicht im Satz`);
    assert.ok(a.includes(ton), `${ton} fehlt in der Bildanweisung`);
  }
});

/* =======================================================================
 * 7 · DIE ALTE MASCHINE IST WIRKLICH WEG
 * ==================================================================== */

console.log('\n7 · Die alte Maschine ist wirklich weg');

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
  assert.match(q, /anfordernRef\.current\(\);\s*\}, \[sicht, raster, stilbuch\]\);/,
    'niemand meldet ein Bild an, wenn sich etwas ändert');
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
