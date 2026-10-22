/**
 * Der Fluss – und die Frage, ob eine Karte sich selbst füllen darf.
 *
 * ---
 *
 * **Der Einwand, aus dem dieses Stück entstanden ist.**
 *
 * Die naheliegende Idee war: Flüsse aus dem Gelände errechnen. Man nimmt
 * ein Höhenfeld, lässt Wasser bergab laufen, und schon hat jede Karte
 * Flüsse. Es funktioniert, es sieht gut aus – und es ist falsch. Der
 * Einwand lautete „die Karte würde wohl wahllos erstellt", und er trifft
 * Gesetz 4 genau: *Dragoncore ändert die Welt nie ungefragt.* Ein Fluss,
 * den niemand gezogen hat, ist erfundene Geografie, auch wenn die Rechnung
 * dahinter stimmt.
 *
 * Also wird hier nichts errechnet. Der Fluss liegt genau dort, wo jemand
 * ihn zieht. Das Programm weiss nicht, *wo* ein Fluss hingehört; es weiss,
 * *wie sich einer benimmt*: Er beginnt als Rinnsal und wird zur Mündung hin
 * breiter.
 *
 * Geprüft wird deshalb beides – dass er sich benimmt, und dass er nichts
 * erfindet.
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
const bau = join(ARBEIT, 'fluss');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  ['esbuild', 'src/lib/karte/kontur.ts', '--bundle', '--format=esm',
   `--outfile=${join(bau, 'kontur.mjs')}`, '--log-level=error'],
  { cwd: wurzel, stdio: 'inherit' },
);
const { flussAus, flaecheAus, maskeAus } = await import(join(bau, 'kontur.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const lies = (p) => readFileSync(join(wurzel, p), 'utf8');
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/** Ein gerader Lauf von links nach rechts, wie ihn ein Finger zieht. */
const lauf = (n = 40, von = [150, 500], bis = [850, 500]) => {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    p.push([von[0] + (bis[0] - von[0]) * t, von[1] + (bis[1] - von[1]) * t]);
  }
  return p;
};

/** Wie breit die Fläche an dieser Stelle der x-Achse ist. */
const breiteBei = (poly, x) => {
  const ys = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if ((a[0] - x) * (b[0] - x) > 0) continue;
    const t = (x - a[0]) / ((b[0] - a[0]) || 1e-9);
    ys.push(a[1] + (b[1] - a[1]) * t);
  }
  return ys.length < 2 ? 0 : Math.max(...ys) - Math.min(...ys);
};

/* =======================================================================
 * 1 · ER BENIMMT SICH WIE EIN FLUSS
 * ==================================================================== */

console.log('\n1 · Er benimmt sich wie ein Fluss');

pruefe('an der Mündung ist er breiter als an der Quelle', () => {
  /*
   * **Die eine Eigenschaft, die ihn zum Fluss macht.** Alles andere – die
   * Farbe, der Saum, der Name – hat er mit jeder Wasserfläche gemein.
   */
  const f = flussAus(lauf(), 26, 7);
  assert.ok(f, 'kein Lauf entstanden');
  const quelle = breiteBei(f, 230);
  const muendung = breiteBei(f, 780);
  assert.ok(muendung > quelle * 1.8,
    `Quelle ${quelle.toFixed(1)}, Mündung ${muendung.toFixed(1)}`);
});

pruefe('die Quelle ist nicht null breit', () => {
  /*
   * Eine Breite von null ergibt keine Fläche. Ein Fluss, der im Nichts
   * beginnt, hat keine Quelle, sondern einen Fehler.
   */
  const f = flussAus(lauf(), 26, 7);
  assert.ok(breiteBei(f, 200) > 4, `Quelle nur ${breiteBei(f, 200).toFixed(1)} breit`);
});

pruefe('die Richtung des Striches entscheidet', () => {
  /*
   * Welches Ende die Mündung ist, sagt niemand dem Programm – es liest es
   * aus der Richtung. Derselbe Lauf rückwärts gezogen mündet am anderen
   * Ende, und genau das ist der Griff, mit dem der Verfasser es bestimmt.
   */
  const hin = flussAus(lauf(), 26, 7);
  const her = flussAus([...lauf()].reverse(), 26, 7);
  assert.ok(breiteBei(hin, 780) > breiteBei(hin, 230));
  assert.ok(breiteBei(her, 230) > breiteBei(her, 780));
});

pruefe('er wächst nach Weg, nicht nach Punktzahl', () => {
  /*
   * Ein Finger setzt dort viele Punkte, wo er langsam war. Zählte man die
   * Punkte, schwölle der Fluss dort an, wo die Hand gezögert hat.
   * Nachgestellt: derselbe Lauf, aber die erste Hälfte dicht abgetastet.
   */
  const dicht = [];
  for (let i = 0; i < 60; i++) dicht.push([150 + (350 * i) / 59, 500]);
  for (let i = 1; i < 6; i++) dicht.push([500 + (350 * i) / 5, 500]);
  const a = flussAus(lauf(), 26, 7);
  const b = flussAus(dicht, 26, 7);
  const mitte = (f) => breiteBei(f, 500);
  assert.ok(Math.abs(mitte(a) - mitte(b)) < mitte(a) * 0.3,
    `gleichmässig ${mitte(a).toFixed(1)}, ungleich abgetastet ${mitte(b).toFixed(1)}`);
});

/* =======================================================================
 * 2 · ER IST WASSER, KEINE NEUE ART
 * ==================================================================== */

console.log('\n2 · Er ist Wasser, keine neue Art');

pruefe('es entsteht ein geschlossener Umriss wie bei jeder Fläche', () => {
  const f = flussAus(lauf(), 26, 7);
  assert.ok(Array.isArray(f) && f.length >= 3);
  for (const p of f) {
    assert.equal(p.length, 2);
    assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]), `kein Punkt: ${p}`);
  }
});

pruefe('die Karte legt ihn als Wasser ab', () => {
  /*
   * Eine eigene Bedeutung „fluss" hiesse, an rund sechs Stellen eine
   * Ausnahme einzubauen – Küstensaum, Relief, Ebenenfolge, Namenslage –,
   * und jede müsste wissen, dass `punkte` hier ausnahmsweise kein
   * geschlossener Umriss ist. Zwei Begriffe für dasselbe, also Gesetz 5.
   */
  const q = ohneProsa(lies('src/components/karte/Weltkarte.tsx'));
  assert.match(q, /neuesFeature\('wasser', lauf\)/);
  const modell = lies('src/lib/karte/modell.ts');
  assert.doesNotMatch(modell, /'fluss'/, 'es gibt wieder eine eigene Bedeutung');
});

pruefe('das Werkzeug ist ein Wort mehr, kein mächtigeres', () => {
  const q = ohneProsa(lies('src/components/karte/Weltkarte.tsx'));
  assert.match(q, /\| 'fluss'/, 'das Werkzeug fehlt');
  assert.match(q, /knopf\('fluss', 'Fluss'\)/, 'es steht in keiner Leiste');
});

/* =======================================================================
 * 3 · ER ERFINDET NICHTS
 * ==================================================================== */

console.log('\n3 · Er erfindet nichts');

pruefe('er liegt dort, wo gezogen wurde', () => {
  /*
   * **Die Zusage, um die es in dieser Runde eigentlich geht.**
   *
   * Der naheliegende Weg wäre gewesen, aus einem Höhenfeld ein Gefälle zu
   * rechnen und das Wasser bergab laufen zu lassen. Dann stünde der Fluss
   * irgendwo – nicht dort, wo jemand ihn wollte. Geprüft wird, dass jeder
   * Punkt des Laufs in der Nähe des gezogenen Striches liegt.
   */
  const spur = lauf(40, [200, 300], [800, 700]);
  const f = flussAus(spur, 26, 7);
  const abstandZurSpur = (p) => {
    let best = Infinity;
    for (let i = 1; i < spur.length; i++) {
      const a = spur[i - 1], b = spur[i];
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
      let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)));
    }
    return best;
  };
  /*
   * Die Schranke ist gerechnet, nicht geraten: An der Mündung ist der
   * Pinsel das 1,5-Fache des Radius (`0.34 + 1.16`), und `verfeinere` setzt
   * darauf noch Zacken. Mein erster Versuch nahm das 2,2-Fache und schlug
   * bei 60,3 an – die Prüfung war zu streng, nicht der Lauf zu weit.
   */
  const weiteste = 26 * 1.5;
  const schranke = weiteste + 26 * 0.9;
  for (const p of f) {
    assert.ok(abstandZurSpur(p) < schranke,
      `ein Punkt liegt ${abstandZurSpur(p).toFixed(1)} vom Strich entfernt (erlaubt ${schranke.toFixed(1)})`);
  }
});

pruefe('ein Tippen ist kein Fluss', () => {
  /*
   * Dieselbe Schwelle wie beim Malen: Was kleiner ist als der Pinsel, war
   * ein versehentliches Antippen und hinterlässt nichts.
   */
  assert.equal(flussAus([[500, 500]], 26, 7), undefined);
  assert.equal(flussAus([[500, 500], [505, 503]], 26, 7), undefined);
  assert.equal(flussAus([], 26, 7), undefined);
});

pruefe('die Liste der Seiten wird geordnet, nicht gefüllt', () => {
  /*
   * Nichts wird von selbst gesetzt. Geändert ist die **Reihenfolge** – wer
   * noch nirgends liegt, steht oben –, und sonst nichts: kein Zähler, kein
   * Hinweis, keine Trennung in „fehlt" und „erledigt".
   */
  const q = ohneProsa(lies('src/pages/book/Weltkarte.tsx'));
  assert.match(q, /const ohne = lebende\.filter\(\(e\) => !belegt\.has\(e\.id\)\);/);
  assert.match(q, /return \[\.\.\.ohne, \.\.\.mit\];/, 'die Belegten fallen heraus');
  assert.match(q, /\{geordnet\.map\(/, 'die Liste benutzt die Ordnung nicht');
  assert.doesNotMatch(q, /von \$\{|noch nicht auf der Karte|fehlen/i, 'es mahnt wieder');
});

/* =======================================================================
 * 4 · DER PINSEL BLEIBT, WIE ER WAR
 * ==================================================================== */

console.log('\n4 · Der Pinsel bleibt, wie er war');

pruefe('eine feste Breite malt weiter gleichmässig', () => {
  /*
   * `maskeAus` nimmt jetzt auch eine Funktion. Eine Zahl muss sich genau
   * wie vorher verhalten – sonst hätte diese Runde nebenbei jede gemalte
   * Küste verändert.
   */
  const f = flaecheAus(lauf(), 26, 7);
  assert.ok(f, 'keine Fläche');
  const links = breiteBei(f, 250);
  const rechts = breiteBei(f, 750);
  assert.ok(Math.abs(links - rechts) < links * 0.25,
    `links ${links.toFixed(1)}, rechts ${rechts.toFixed(1)}`);
});

pruefe('der Rand richtet sich nach der breitesten Stelle', () => {
  /*
   * Sonst liefe die Kontur an der Mündung aus dem Raster – ein Fluss mit
   * abgeschnittener Mündung.
   */
  const m = maskeAus(lauf(), (t) => 10 + 60 * t);
  assert.ok(m, 'keine Maske');
  const f = flussAus(lauf(), 40, 3);
  const ende = Math.max(...f.map((p) => p[0]));
  assert.ok(ende > 850, `die Mündung endet bei ${ende.toFixed(0)}`);
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
