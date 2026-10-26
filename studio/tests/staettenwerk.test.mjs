/**
 * Stättenwerk – fachliche Grundgesetze, bevor die Oberfläche angeschlossen wird.
 *
 * Die Stätte ist ein einzelnes Objekt, kein ausgebreitetes Siedlungszeichen.
 * Verschieben ändert nie das alte Dokument und zeichnet keine neue Geografie.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const wurzel = join(import.meta.dirname, '..');
const bau = join(ARBEIT, 'staettenwerk');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync('npx',
  ['esbuild', 'src/lib/kartenwerk/staettenwerk.ts', '--bundle', '--format=esm',
   `--outfile=${join(bau, 'staettenwerk.mjs')}`, '--log-level=error'],
  { cwd: wurzel, stdio: 'inherit' },
);

const { setzeStaette, verschiebeStaette, staettenInMalfolge, staettenStaffage } =
  await import(join(bau, 'staettenwerk.mjs'));

let bestanden = 0;
function pruefe(titel, fn) {
  fn();
  bestanden++;
  console.log(`  ✓ ${titel}`);
}
const eins = setzeStaette('h1', 'haus', [200, 230], 34, 71, 2);
const zwei = setzeStaette('h2', 'turm', [205, 130], 55, 72);
const drei = setzeStaette('h3', 'bruecke', [250, 230], 15, 73, 1);

pruefe('ein Haus besitzt eine ID und einen Fußpunkt im Kartenmaß', () => {
  assert.equal(eins.id, 'h1');
  assert.deepEqual(eins.bei, [200, 230]);
  assert.equal(eins.hoehe, 34);
  assert.equal(eins.variante, 2);
  assert.equal(eins.seed, 71);
});

pruefe('der Eingabepunkt wird kopiert, nicht im Objekt festgehalten', () => {
  const ort = [150, 177];
  const a = setzeStaette('unabhaengig', 'haus', ort, 35, 1);
  ort[0] = 900;
  assert.deepEqual(a.bei, [150, 177]);
});

pruefe('Verschieben ist rein und bewahrt alle anderen Häuser', () => {
  const vorher = [eins, zwei, drei];
  const nachher = verschiebeStaette(vorher, 'h1', [400, 500]);
  assert.deepEqual(vorher[0].bei, [200, 230]);
  assert.deepEqual(nachher[0].bei, [400, 500]);
  assert.notEqual(nachher[0], vorher[0]);
  assert.equal(nachher[1], vorher[1]);
  assert.equal(nachher[2], vorher[2]);
  assert.equal(nachher.length, vorher.length);
});

pruefe('ein nicht vorhandenes Haus erzeugt keine neue Stätte', () => {
  const alt = [eins, zwei];
  const neu = verschiebeStaette(alt, 'unbekannt', [500, 500]);
  assert.equal(neu.length, alt.length);
  assert.equal(neu[0], alt[0]);
  assert.equal(neu[1], alt[1]);
});

pruefe('ungültige Fußpunkte und Maße werden abgewehrt', () => {
  assert.throws(() => setzeStaette('', 'haus', [1, 2], 20, 1));
  assert.throws(() => setzeStaette('x', 'haus', [1, 2], 0, 1));
  assert.throws(() => setzeStaette('x', 'haus', [NaN, 2], 20, 1));
  assert.throws(() => setzeStaette('x', 'haus', [1, 2], 20, 1, -1));
  assert.throws(() => verschiebeStaette([eins], 'h1', [Infinity, 0]));
});

pruefe('die globale Malfolge orientiert sich am Fußpunkt und bleibt stabil', () => {
  const alt = [eins, drei, zwei];
  const sortiert = staettenInMalfolge(alt);
  assert.deepEqual(sortiert.map((x) => x.id), ['h2', 'h1', 'h3']);
  assert.deepEqual(alt.map((x) => x.id), ['h1', 'h3', 'h2']);
});

pruefe('die bestehende Staffage-Lage für Bauwerke wird wiederverwendet', () => {
  const ausgabe = staettenStaffage([eins, zwei]);
  assert.equal(ausgabe.length, 2);
  assert.deepEqual(ausgabe.map((s) => [s.x, s.y]), [[205, 130], [200, 230]]);
  assert.equal(ausgabe[1].art, 'bauwerk');
  assert.equal(ausgabe[1].h, 34);
  assert.equal(ausgabe[1].variante, 2);
  assert.equal(ausgabe[1].lage, 'bewuchs');
  assert.equal(ausgabe[1].ebene, 3);
});

console.log(`  ${bestanden} Prüfungen bestanden.`);
