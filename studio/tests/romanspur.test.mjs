/**
 * Was der Roman über eine Figur weiss.
 *
 * Der Auftrag verlangt auf der Charakterseite „Kapitel, in denen er
 * vorkommt", Beziehungen und wichtige Orte – und zwar **ohne dass der Autor
 * das vorher manuell ausfüllt**. `romanspur` liest das aus den Szenentexten.
 *
 * Geprüft wird hier nicht nur, dass etwas gefunden wird, sondern vor allem,
 * dass die Auskunft stimmt: dass ein Kapitel nicht doppelt gezählt wird, dass
 * die Figur nicht neben sich selbst steht, und dass die Reihenfolge fest ist.
 * Eine falsche Zahl auf einer Seite, die niemand pflegt, fällt nie auf.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut, bis
 * die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'romanspur');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/roman/verzeichnis.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'verzeichnis.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const { romanspur } = await import(join(bau, 'verzeichnis.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/* ---------------------------------------------------------------- Bausteine */

const figur = (id, title, type = 'character') => ({
  id,
  title,
  type,
  fields: {},
  createdAt: 1,
  updatedAt: 1,
});

const szene = (id, kapitel, text) => ({
  szene: figur(id, id, 'szene'),
  kapitel,
  text,
});

const kap = (id, titel) => figur(id, titel, 'kapitel');

const ELARA = figur('e', 'Elara');
const DENIS = figur('d', 'Denis');
const MARUN = figur('m', 'Marun');
const NEBELWALD = figur('n', 'Nebelwald', 'location');

/* =======================================================================
 * 1 · WO SIE VORKOMMT
 * ==================================================================== */

console.log('\n1 · Wo sie vorkommt');

pruefe('die Szenen, in denen ihr Name steht', () => {
  const k = kap('k1', 'Erstes Kapitel');
  const spur = romanspur(ELARA, [DENIS], [
    szene('s1', k, 'Elara ging zum Ufer.'),
    szene('s2', k, 'Denis wartete allein.'),
    szene('s3', k, 'Elara kam zurück.'),
  ]);
  assert.deepEqual(
    spur.szenen.map((s) => s.szene.id),
    ['s1', 's3'],
  );
});

pruefe('die Zahl der Nennungen, nicht der Szenen', () => {
  /*
   * `anzahl` ist die Zahl im Untertitel („3× im Manuskript"). Sie zählt
   * Nennungen; zwei Szenen mit je zwei Nennungen sind vier, nicht zwei.
   */
  const spur = romanspur(ELARA, [], [
    szene('s1', undefined, 'Elara ging. Elara kam zurück.'),
    szene('s2', undefined, 'Am Tor stand Elara.'),
  ]);
  assert.equal(spur.anzahl, 3, `gezählt: ${spur.anzahl}`);
});

pruefe('eine Figur ohne Vorkommen hat keine Spur', () => {
  /*
   * Das ist die Bedingung, an der der ganze Block hängt: Findet sich nichts,
   * zeigt die Seite nichts. Kein „Noch keine Vorkommen" – eine Figur, die
   * noch nicht vorkommt, ist nicht unfertig, sie ist noch nicht dran.
   */
  const spur = romanspur(MARUN, [ELARA], [szene('s1', undefined, 'Elara ging allein.')]);
  assert.equal(spur.szenen.length, 0);
  assert.equal(spur.anzahl, 0);
  assert.equal(spur.zusammenMit.length, 0);
});

pruefe('ein Eintrag ohne Titel wird nicht gesucht', () => {
  /*
   * Zwei Fälle, und der zweite ist der gefährliche: Ein Eintrag aus einer
   * älteren Fassung hat womöglich gar kein `title`-Feld. Ohne die Wache in
   * `romanspur` fliegt die Charakterseite dann mit einem Fehler auseinander,
   * statt einfach nichts zu zeigen.
   */
  for (const ohne of [figur('x', '   '), { ...figur('x', 'x'), title: undefined }]) {
    const spur = romanspur(ohne, [ELARA], [szene('s1', undefined, 'Elara ging.')]);
    assert.equal(spur.szenen.length, 0);
    assert.equal(spur.zusammenMit.length, 0);
  }
});

/* =======================================================================
 * 2 · WER DANEBEN STEHT
 * ==================================================================== */

console.log('\n2 · Wer daneben steht');

pruefe('nur wer in denselben Szenen vorkommt', () => {
  const spur = romanspur(ELARA, [DENIS, MARUN], [
    szene('s1', undefined, 'Elara sah Denis am Tor.'),
    szene('s2', undefined, 'Marun war längst fort.'),
  ]);
  assert.deepEqual(
    spur.zusammenMit.map((z) => z.entry.title),
    ['Denis'],
  );
});

pruefe('sie steht nicht neben sich selbst', () => {
  /*
   * Der Eintrag ist auch Teil der Welt. Ohne Ausschluss stünde unter jeder
   * Figur an erster Stelle: sie selbst.
   */
  const spur = romanspur(ELARA, [ELARA, DENIS], [szene('s1', undefined, 'Elara sah Denis.')]);
  assert.ok(
    !spur.zusammenMit.some((z) => z.entry.id === ELARA.id),
    `steht bei sich selbst: ${spur.zusammenMit.map((z) => z.entry.title)}`,
  );
});

pruefe('wer öfter dabei ist, steht vorn', () => {
  const spur = romanspur(ELARA, [DENIS, MARUN], [
    szene('s1', undefined, 'Elara sah Denis. Marun stand daneben.'),
    szene('s2', undefined, 'Elara und Denis gingen weiter.'),
  ]);
  assert.deepEqual(
    spur.zusammenMit.map((z) => [z.entry.title, z.szenen]),
    [
      ['Denis', 2],
      ['Marun', 1],
    ],
  );
});

pruefe('bei gleicher Zahl entscheidet der Name', () => {
  /*
   * Eine Liste, die bei jedem Tastendruck die Reihenfolge wechselt, liest
   * niemand zu Ende.
   */
  const spur = romanspur(ELARA, [MARUN, DENIS], [szene('s1', undefined, 'Elara sah Denis und Marun.')]);
  assert.deepEqual(
    spur.zusammenMit.map((z) => z.entry.title),
    ['Denis', 'Marun'],
  );
});

pruefe('Szenen zählen, nicht Nennungen', () => {
  /*
   * Die Zahl hinter dem Namen heisst „so oft zusammen in einer Szene". Wer
   * in einer einzigen Szene fünfmal genannt wird, war trotzdem einmal dabei.
   */
  const spur = romanspur(ELARA, [DENIS], [
    szene('s1', undefined, 'Elara sah Denis. Denis nickte.'),
    szene('s2', undefined, 'Elara rief. Denis kam. Denis ging. Denis blieb fort.'),
  ]);
  assert.equal(spur.zusammenMit[0].szenen, 2, `gezählt: ${spur.zusammenMit[0].szenen}`);
});

pruefe('Orte stehen daneben wie Figuren', () => {
  /*
   * Der Auftrag nennt „wichtige Orte" ausdrücklich. Es gibt dafür keine
   * eigene Mechanik – ein Ort, der in ihren Szenen steht, steht bei ihr.
   */
  const spur = romanspur(ELARA, [NEBELWALD], [szene('s1', undefined, 'Elara ging in den Nebelwald.')]);
  assert.deepEqual(
    spur.zusammenMit.map((z) => z.entry.title),
    ['Nebelwald'],
  );
});

/* =======================================================================
 * 3 · WAS NICHT MITGEZÄHLT WIRD
 * ==================================================================== */

console.log('\n3 · Was nicht mitgezählt wird');

pruefe('Gelöschtes bleibt gelöscht', () => {
  /*
   * Ein gelöschter Eintrag liegt im Papierkorb und kann wiederkommen – aber
   * er steht nicht neben einer Figur, als wäre nichts gewesen.
   */
  const fort = { ...DENIS, deletedAt: 123 };
  const spur = romanspur(ELARA, [fort], [szene('s1', undefined, 'Elara sah Denis.')]);
  assert.equal(spur.zusammenMit.length, 0);
});

pruefe('Romanteile stehen nicht in der Besetzung', () => {
  /*
   * Szenen und Kapitel sind selbst Einträge. Ohne diese Grenze stünde unter
   * Elara das Kapitel, in dem sie vorkommt – als wäre es eine Figur.
   */
  const k = kap('k1', 'Am Ufer');
  const spur = romanspur(ELARA, [k, DENIS], [
    szene('s1', k, 'Elara stand am Ufer. Denis kam dazu.'),
  ]);
  assert.deepEqual(
    spur.zusammenMit.map((z) => z.entry.title),
    ['Denis'],
  );
});

/* =======================================================================
 * 4 · DIE KAPITEL
 * ==================================================================== */

console.log('\n4 · Die Kapitel');

pruefe('jede Szene bringt ihr Kapitel mit', () => {
  const eins = kap('k1', 'Erstes Kapitel');
  const zwei = kap('k2', 'Zweites Kapitel');
  const spur = romanspur(ELARA, [], [
    szene('s1', eins, 'Elara ging.'),
    szene('s2', eins, 'Elara kam.'),
    szene('s3', zwei, 'Elara blieb.'),
  ]);
  assert.deepEqual(
    spur.szenen.map((s) => s.kapitel.title),
    ['Erstes Kapitel', 'Erstes Kapitel', 'Zweites Kapitel'],
  );
});

pruefe('eine Szene ohne Kapitel verschweigt nicht die Szene', () => {
  /*
   * Wer eine Szene anlegt und noch kein Kapitel darüber gehängt hat, soll
   * sie trotzdem unter der Figur finden. Die Seite zeigt dann Szenen statt
   * Kapitel – aber sie zeigt etwas.
   */
  const spur = romanspur(ELARA, [], [szene('s1', undefined, 'Elara ging allein.')]);
  assert.equal(spur.szenen.length, 1);
  assert.equal(spur.szenen[0].kapitel, undefined);
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
