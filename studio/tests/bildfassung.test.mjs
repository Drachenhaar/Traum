/**
 * Welche Auflösung eine Ansicht holt.
 *
 * Der Fehler, gegen den das hier steht, ist unsichtbar und teuer: Eine Kachel
 * von neunzig Punkten holt ein Bild von 1600 – man sieht keinen Unterschied,
 * man merkt ihn nur daran, dass das Buch auf dem Telefon stockt. Gemessen an
 * acht Kacheln mit je einem 1600er Bild: **17 MB gegen 512 kB.**
 *
 * Geprüft wird deshalb zweierlei: dass die Regel stimmt (`fassungFuer`), und
 * dass die Stellen, die klein zeigen, sie auch anwenden. Der zweite Teil liest
 * dafür den Quelltext – keine schöne Prüfung, aber die einzige, die anschlägt,
 * wenn jemand „full" wieder fest einträgt.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const wurzel = join(import.meta.dirname, '..');
const bau = join(ARBEIT, 'bildfassung');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  ['esbuild', 'src/lib/bildnis.ts', '--bundle', '--format=esm', `--outfile=${join(bau, 'bildnis.mjs')}`, '--log-level=error'],
  { cwd: wurzel, stdio: 'inherit' },
);
const { fassungFuer } = await import(join(bau, 'bildnis.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const lies = (p) => readFileSync(join(wurzel, p), 'utf8');

/* =======================================================================
 * 1 · DIE REGEL
 * ==================================================================== */

console.log('\n1 · Die Regel');

pruefe('was gross gezeigt wird, kommt gross', () => {
  assert.equal(fassungFuer('hauptbildnis'), 'full');
  assert.equal(fassungFuer('weltgrund'), 'full');
});

pruefe('was klein gezeigt wird, kommt klein', () => {
  assert.equal(fassungFuer('beziehungsbildnis'), 'thumb');
  assert.equal(fassungFuer('bildnisgrund'), 'thumb');
  assert.equal(fassungFuer('textur'), 'thumb');
});

/* =======================================================================
 * 2 · OB DIE REGEL ANGEWANDT WIRD
 * ==================================================================== */

console.log('\n2 · Ob die Regel angewandt wird');

pruefe('das Bildniswerk lässt sich die Fassung sagen', () => {
  /*
   * Vorher holte es immer `full`, egal wie gross es gezeigt wurde. Der
   * Parameter ist der ganze Unterschied.
   */
  const q = lies('src/components/baukasten/Bildniswerk.tsx');
  assert.ok(/fassung\?: Fassung/.test(q), 'kein Fassungs-Parameter');
  assert.ok(
    /getImageUrl\(id, fassung\)/.test(q),
    'holt nicht nach Fassung – steht dort wieder etwas Festes?',
  );
});

pruefe('gross bleibt die Voreinstellung', () => {
  /*
   * Eine Voreinstellung, die die Hauptansicht verschlechtert, um Kacheln zu
   * retten, hätte die Sache verkehrt herum. Wer klein zeigt, sagt es.
   */
  const q = lies('src/components/baukasten/Bildniswerk.tsx');
  assert.ok(/fassung = 'full'/.test(q), "Voreinstellung ist nicht 'full'");
});

pruefe('jede Kachelwand holt klein', () => {
  /*
   * Die Stellen, an denen viele Bildnisse nebeneinander stehen. Wächst eine
   * dazu, ohne `fassung` zu setzen, schlägt diese Prüfung an – und zwar
   * bevor jemand mit einem echten Buch darauf stösst.
   */
  for (const datei of [
    'src/pages/baukasten/Baukasten.tsx',
    'src/pages/baukasten/Baukastenwahl.tsx',
  ]) {
    const q = lies(datei);
    const werke = q.match(/<Bildniswerk[\s\S]*?\/>/g) ?? [];
    assert.ok(werke.length > 0, `${datei}: kein Bildniswerk gefunden`);
    const wand = werke.filter((w) => /darstellung="kopf"|feld === 'kopf'/.test(w));
    assert.ok(wand.length > 0, `${datei}: keine Kachel erkannt`);
    for (const w of wand) {
      assert.ok(
        /fassung="thumb"/.test(w),
        `${datei}: eine Kachel ohne kleine Fassung –\n${w}`,
      );
    }
  }
});

pruefe('das gebaute Bildnis folgt seinem Schacht', () => {
  /*
   * `fassungFuer` stand schon in dieser Datei – aber nur der Fotoweg fragte
   * danach. Das gebaute Bildnis holte seine Schichten immer voll, auch in
   * der Beziehungsliste, wo es achtundsechzig Punkte gross ist.
   */
  const q = lies('src/components/figur/Bildnis.tsx');
  const werk = (q.match(/<Bildniswerk[\s\S]*?\/>/g) ?? [])[0];
  assert.ok(werk, 'kein Bildniswerk in Bildnis.tsx');
  assert.ok(
    /fassung=\{fassungFuer\(schacht\)\}/.test(werk),
    `holt nicht nach Schacht –\n${werk}`,
  );
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
