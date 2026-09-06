/**
 * Die Kuppel und der Himmel dahinter.
 *
 * Eine Wölbung ist entweder eine Behauptung oder eine Rechnung. Hier soll
 * sie eine Rechnung sein, also wird sie nachgerechnet: dass zum Rand hin
 * wirklich gestaucht wird, dass dabei kein Stern einen anderen überholt,
 * dass niemand über den Horizont fällt – und dass derselbe Band jedes Mal
 * derselbe ist.
 *
 * Jede Zusicherung wurde gegengeprüft: der Fehler, den sie fangen soll,
 * absichtlich wieder eingebaut, bis sie ausschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'himmel');
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/himmel.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'himmel.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const {
  aufKuppel,
  woelbung,
  sternenhimmel,
  milchstrasse,
  punktePfad,
  nachHelligkeit,
  saatAus,
  OEFFNUNG,
} = await import(join(bau, 'himmel.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/* Eine Punktwolke, die ein Rechteck ausfüllt – wie die eingepasste Anordnung. */
function wolke(n, breite = 400, hoehe = 620) {
  const p = [];
  for (let i = 0; i < n; i++) {
    /* Goldener Winkel auf einer Spirale: gleichmässig, aber nicht im Raster. */
    const w = i * 2.399963;
    const r = Math.sqrt((i + 0.5) / n);
    p.push({ x: (Math.cos(w) * r * breite) / 2, y: (Math.sin(w) * r * hoehe) / 2 });
  }
  return p;
}

const radius = (p, h) => Math.hypot((p.x - h.mx) / h.ax, (p.y - h.my) / h.ay);

/* =======================================================================
 * 1 · Die Wölbung
 * ==================================================================== */

console.log('\n1 · Die Wölbung');

pruefe('Scheitel bleibt Scheitel, Rand bleibt Rand', () => {
  assert.equal(woelbung(0, OEFFNUNG), 0);
  assert.ok(Math.abs(woelbung(1, OEFFNUNG) - 1) < 1e-12, `Rand landet auf ${woelbung(1, OEFFNUNG)}`);
});

pruefe('die Abbildung ist streng steigend – kein Stern überholt einen anderen', () => {
  let vorher = -1;
  for (let r = 0; r <= 1.0001; r += 0.005) {
    const jetzt = woelbung(Math.min(r, 1), OEFFNUNG);
    assert.ok(jetzt > vorher, `bei r=${r.toFixed(3)}: ${jetzt} folgt auf ${vorher}`);
    vorher = jetzt;
  }
});

pruefe('zum Rand hin wird gestaucht, zur Mitte hin gedehnt', () => {
  /* Gleich grosse Schritte in r werden zum Rand hin kleiner. */
  const schritt = (r) => woelbung(r + 0.05, OEFFNUNG) - woelbung(r, OEFFNUNG);
  const innen = schritt(0.0);
  const mitte = schritt(0.45);
  const aussen = schritt(0.95);
  assert.ok(innen > mitte, `innen ${innen.toFixed(4)} nicht grösser als mitte ${mitte.toFixed(4)}`);
  assert.ok(mitte > aussen, `mitte ${mitte.toFixed(4)} nicht grösser als aussen ${aussen.toFixed(4)}`);
  /* Und zwar deutlich: Der Rand muss auf gut die Hälfte zusammengehen. */
  assert.ok(aussen / innen < 0.55, `Randstauchung nur ${(aussen / innen).toFixed(2)}`);
});

pruefe('bei 70 Grad staucht der Rand auf 0.44 – gerechnet und nachgemessen', () => {
  /* Der Grenzwert der Ableitung am Rand ist Θ·cot Θ. */
  const erwartet = OEFFNUNG / Math.tan(OEFFNUNG);
  const gemessen = (woelbung(1, OEFFNUNG) - woelbung(0.999, OEFFNUNG)) / 0.001;
  assert.ok(Math.abs(erwartet - 0.4448) < 0.001, `Θ·cot Θ = ${erwartet.toFixed(4)}`);
  assert.ok(Math.abs(gemessen - erwartet) < 0.002, `gemessen ${gemessen.toFixed(4)}`);
});

pruefe('eine kleine Öffnung lässt die Anordnung fast unverändert', () => {
  const flach = wolke(60);
  const { lagen } = aufKuppel(flach, 0.02);
  for (let i = 0; i < flach.length; i++) {
    assert.ok(
      Math.hypot(lagen[i].x - flach[i].x, lagen[i].y - flach[i].y) < 0.5,
      `Punkt ${i} ist um ${Math.hypot(lagen[i].x - flach[i].x, lagen[i].y - flach[i].y).toFixed(2)} gewandert`,
    );
  }
});

/*
 * Ein einzelner Stern ist hier nicht dabei, und das ist kein Schlupfloch:
 * Er *ist* der Mittelpunkt, sein Radius ist null, und einen Horizont, den
 * er berührt, gibt es nicht. Die Prüfung schlug daran an und hatte recht –
 * sie hatte nur eine Wolke gemeint, die eine Ausdehnung hat. Dass der
 * Einzelfall nicht abstürzt, steht weiter unten als eigene Prüfung.
 */
pruefe('kein Stern liegt hinter dem Horizont, und einer liegt darauf', () => {
  for (const n of [2, 7, 60, 400]) {
    const { lagen, horizont } = aufKuppel(wolke(n));
    let weiteste = 0;
    for (const p of lagen) {
      const r = radius(p, horizont);
      assert.ok(r <= 1 + 1e-9, `${n} Sterne: einer liegt bei r=${r.toFixed(4)}`);
      weiteste = Math.max(weiteste, r);
    }
    assert.ok(
      Math.abs(weiteste - 1) < 1e-9,
      `${n} Sterne: der äusserste liegt bei ${weiteste.toFixed(4)}, nicht auf dem Horizont`,
    );
  }
});

pruefe('die Richtung vom Mittelpunkt bleibt erhalten', () => {
  const flach = wolke(120);
  const { lagen, horizont } = aufKuppel(flach);
  for (let i = 0; i < flach.length; i++) {
    /* In elliptischen Koordinaten gerechnet – dort ist die Kuppel radial. */
    const vor = { u: (flach[i].x - horizont.mx) / horizont.ax, v: (flach[i].y - horizont.my) / horizont.ay };
    const nach = { u: (lagen[i].x - horizont.mx) / horizont.ax, v: (lagen[i].y - horizont.my) / horizont.ay };
    const l1 = Math.hypot(vor.u, vor.v);
    const l2 = Math.hypot(nach.u, nach.v);
    if (l1 < 1e-9 || l2 < 1e-9) continue;
    const kreuz = (vor.u / l1) * (nach.v / l2) - (vor.v / l1) * (nach.u / l2);
    assert.ok(Math.abs(kreuz) < 1e-9, `Punkt ${i} hat die Richtung gewechselt (${kreuz})`);
  }
});

pruefe('die Reihenfolge nach aussen bleibt erhalten', () => {
  const flach = wolke(200);
  const { lagen, horizont } = aufKuppel(flach);
  const vorher = flach.map((p, i) => [radius(p, horizont), i]).sort((a, b) => a[0] - b[0]);
  const nachher = lagen.map((p, i) => [radius(p, horizont), i]).sort((a, b) => a[0] - b[0]);
  assert.deepEqual(
    vorher.map((e) => e[1]),
    nachher.map((e) => e[1]),
    'zwei Sterne haben ihre Reihenfolge getauscht',
  );
});

pruefe('am Rand rücken die Sterne wirklich zusammen', () => {
  /*
   * Die Zahl, um die es geht: Wie viele Sterne liegen im äusseren Drittel
   * des Radius? Auf der flachen Anordnung so viele, wie dort Fläche ist –
   * auf der Kuppel mehr.
   */
  const flach = wolke(600);
  const { lagen, horizont } = aufKuppel(flach);
  const aussen = (menge) => menge.filter((p) => radius(p, horizont) > 0.75).length;
  const vorher = aussen(flach);
  const nachher = aussen(lagen);
  assert.ok(
    nachher > vorher * 1.15,
    `im äusseren Viertel vorher ${vorher}, nachher ${nachher} – das ist keine Wölbung`,
  );
});

pruefe('eine leere Wolke und ein einzelner Stern werfen nichts um', () => {
  assert.deepEqual(aufKuppel([]).lagen, []);
  const einer = aufKuppel([{ x: 5, y: 9 }]);
  assert.deepEqual(einer.lagen, [{ x: 5, y: 9 }]);
  assert.ok(Number.isFinite(einer.horizont.ax) && einer.horizont.ax > 0);
});

pruefe('zwei Sterne auf demselben Punkt teilen nicht durch null', () => {
  const { lagen, horizont } = aufKuppel([
    { x: 3, y: 3 },
    { x: 3, y: 3 },
  ]);
  for (const p of lagen) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  assert.ok(Number.isFinite(horizont.ax) && Number.isFinite(horizont.ay));
});

/* =======================================================================
 * 2 · Der Himmel dahinter
 * ==================================================================== */

console.log('\n2 · Der Himmel dahinter');

const HORIZONT = { mx: 0, my: 0, ax: 200, ay: 310 };

pruefe('derselbe Startwert ergibt denselben Himmel', () => {
  assert.deepEqual(sternenhimmel(4711, 200, HORIZONT), sternenhimmel(4711, 200, HORIZONT));
  assert.deepEqual(milchstrasse(4711, 150, HORIZONT), milchstrasse(4711, 150, HORIZONT));
});

pruefe('ein anderer Startwert ergibt einen anderen Himmel', () => {
  const a = sternenhimmel(1, 200, HORIZONT);
  const b = sternenhimmel(2, 200, HORIZONT);
  const gleich = a.filter((p, i) => p.x === b[i].x && p.y === b[i].y).length;
  assert.ok(gleich < 5, `${gleich} von 200 Sternen stehen an derselben Stelle`);
});

pruefe('kein Hintergrundstern liegt hinter dem Horizont', () => {
  for (const saat of [1, 77, 4711, -900]) {
    for (const p of sternenhimmel(saat, 400, HORIZONT)) {
      assert.ok(radius(p, HORIZONT) <= 1 + 1e-9, `Stern bei r=${radius(p, HORIZONT).toFixed(4)}`);
    }
    for (const p of milchstrasse(saat, 300, HORIZONT)) {
      assert.ok(radius(p, HORIZONT) <= 1 + 1e-9, `Bandstern bei r=${radius(p, HORIZONT).toFixed(4)}`);
    }
  }
});

pruefe('der Hintergrund ist zum Rand hin dichter – wie die Kuppel es verlangt', () => {
  /*
   * Gleichmässig über die Scheibe gestreut lägen im äusseren Viertel des
   * Radius 1 − 0.75² = 44 Prozent der Punkte. Über den Raumwinkel gestreut
   * sind es mehr, weil der Rand gestaucht ist.
   */
  const sterne = sternenhimmel(4711, 4000, HORIZONT);
  const anteil = sterne.filter((p) => radius(p, HORIZONT) > 0.75).length / sterne.length;
  assert.ok(anteil > 0.5, `nur ${(anteil * 100) | 0} % im äusseren Viertel – das ist eine Scheibe`);
});

pruefe('das Band ist ein Band und keine Streuung', () => {
  for (const saat of [1, 77, 4711]) {
    const band = milchstrasse(saat, 400, HORIZONT);
    assert.ok(band.length > 200, `${saat}: nur ${band.length} Sterne im Band`);
    /*
     * Ein Band hat eine Richtung. Gemessen über die Trägheitsachsen: Die
     * Streuung längs muss deutlich grösser sein als quer. Bei gleichmässiger
     * Streuung wäre das Verhältnis nahe 1.
     */
    const n = band.length;
    let sx = 0, sy = 0;
    for (const p of band) { sx += p.x / HORIZONT.ax; sy += p.y / HORIZONT.ay; }
    sx /= n; sy /= n;
    let xx = 0, yy = 0, xy = 0;
    for (const p of band) {
      const u = p.x / HORIZONT.ax - sx;
      const v = p.y / HORIZONT.ay - sy;
      xx += u * u; yy += v * v; xy += u * v;
    }
    xx /= n; yy /= n; xy /= n;
    const spur = xx + yy;
    const wurzel = Math.sqrt(Math.max(0, ((xx - yy) / 2) ** 2 + xy * xy));
    const gross = spur / 2 + wurzel;
    const klein = spur / 2 - wurzel;
    assert.ok(
      gross / klein > 1.6,
      `${saat}: Streuung längs zu quer nur ${(gross / klein).toFixed(2)} – das ist kein Band`,
    );
  }
});

pruefe('das Band ist dunkler als die Sterne davor', () => {
  const band = milchstrasse(4711, 300, HORIZONT);
  const hell = sternenhimmel(4711, 300, HORIZONT);
  const mittel = (m) => m.reduce((s, p) => s + p.helle, 0) / m.length;
  assert.ok(mittel(band) < mittel(hell) * 0.7, `Band ${mittel(band).toFixed(3)}, Himmel ${mittel(hell).toFixed(3)}`);
});

/*
 * Wenige helle, viele schwache.
 *
 * Der erste Versuch zählte, wie viele Sterne heller als 0.5 sind, und
 * verlangte weniger als ein Viertel. Das ging schief, sobald die
 * Helligkeitsspanne verschoben wurde: Bei 27 Prozent schlug er an, obwohl
 * die Verteilung genauso schief war wie vorher. Die Prüfung hing an den
 * Konstanten statt an der Form.
 *
 * Der Median sagt es ohne feste Zahlen: Bei einer Gleichverteilung liegt er
 * in der Mitte der vorgefundenen Spanne, bei einer schiefen weit darunter.
 */
pruefe('es gibt wenige helle und viele schwache Sterne', () => {
  const werte = sternenhimmel(4711, 2000, HORIZONT)
    .map((p) => p.helle)
    .sort((a, b) => a - b);
  const min = werte[0];
  const max = werte[werte.length - 1];
  const median = werte[Math.floor(werte.length / 2)];
  const lage = (median - min) / (max - min);
  assert.ok(lage < 0.3, `der Median liegt bei ${(lage * 100) | 0} % der Spanne – das ist fast gleichmässig`);
  /* Und ganz ohne helle Sterne wäre es kein Himmel. */
  assert.ok(max > min * 2, `hellster ${max.toFixed(2)}, schwächster ${min.toFixed(2)}`);
});

pruefe('null Sterne sind null Sterne', () => {
  assert.equal(sternenhimmel(1, 0, HORIZONT).length, 0);
  assert.equal(milchstrasse(1, 0, HORIZONT).length, 0);
});

/* =======================================================================
 * 3 · Zeichnen
 * ==================================================================== */

console.log('\n3 · Zeichnen');

pruefe('der Pfad enthält jeden Punkt und nichts sonst', () => {
  const punkte = sternenhimmel(4711, 50, HORIZONT);
  const d = punktePfad(punkte);
  assert.equal((d.match(/M/g) ?? []).length, 50, 'nicht jeder Punkt steht im Pfad');
  assert.ok(!/NaN|Infinity|undefined/.test(d), `Pfad enthält Unfug: ${d.slice(0, 120)}`);
});

pruefe('der Pfad ist leer, wenn es nichts zu zeichnen gibt', () => {
  assert.equal(punktePfad([]), '');
});

pruefe('die Lagen enthalten zusammen alle Punkte, und keinen zweimal', () => {
  const punkte = sternenhimmel(4711, 500, HORIZONT);
  for (const stufen of [1, 3, 4, 8]) {
    const lagen = nachHelligkeit(punkte, stufen);
    const summe = lagen.reduce((s, l) => s + l.punkte.length, 0);
    assert.equal(summe, punkte.length, `${stufen} Stufen: ${summe} statt ${punkte.length}`);
    const gesehen = new Set();
    for (const l of lagen) for (const p of l.punkte) gesehen.add(p);
    assert.equal(gesehen.size, punkte.length, `${stufen} Stufen: ein Punkt kam mehrfach vor`);
    assert.ok(lagen.every((l) => l.punkte.length > 0), 'eine leere Lage wäre ein Knoten ohne Inhalt');
  }
});

pruefe('hellere Punkte landen in helleren Lagen', () => {
  const punkte = sternenhimmel(4711, 500, HORIZONT);
  const lagen = nachHelligkeit(punkte, 4);
  for (let i = 1; i < lagen.length; i++) {
    const vorher = Math.max(...lagen[i - 1].punkte.map((p) => p.helle));
    const jetzt = Math.min(...lagen[i].punkte.map((p) => p.helle));
    assert.ok(vorher <= jetzt + 1e-9, `Lage ${i} beginnt bei ${jetzt} unter dem Ende ${vorher}`);
  }
});

pruefe('dieselbe Welt bekommt dieselbe Saat, eine andere eine andere', () => {
  assert.equal(saatAus('mooshalde'), saatAus('mooshalde'));
  assert.notEqual(saatAus('mooshalde'), saatAus('mooshaldf'));
  assert.notEqual(saatAus(''), saatAus('a'));
  assert.ok(Number.isInteger(saatAus('ein ziemlich langer Bandtitel mit Umlauten äöü')));
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
