/**
 * Die Reihenfolge der Registerblätter je Buchtyp.
 *
 * Die Prüfung, um die es hier wirklich geht, ist **nicht** „steht Aussehen im
 * Artbook vorn?". Sie lautet:
 *
 *   **Geht in irgendeinem Buchtyp ein Blatt verloren?**
 *
 * Der Auftrag verlangt ausdrücklich, nichts zu löschen, was später noch
 * gebraucht wird. Eine Romanfigur, die am Spieltisch auftaucht, hat Werte –
 * und wer sie im Roman nicht mehr erreicht, kann sie dort auch nicht mehr
 * eintragen. Ein verlorenes Blatt fällt niemandem auf, der es gerade nicht
 * sucht; es fällt Monate später auf, wenn etwas fehlt, das jemand
 * geschrieben hat.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut, bis
 * die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const wurzel = join(import.meta.dirname, '..');
const bau = join(ARBEIT, 'registerfolge');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/figur/registerfolge.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'folge.mjs')}`,
    '--log-level=error',
  ],
  { cwd: wurzel, stdio: 'inherit' },
);
const { FOLGEN, ordneBlaetter, erstesBlattFuer } = await import(join(bau, 'folge.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/**
 * Die **echten** Blätter, aus der Quelle gelesen.
 *
 * Nicht abgeschrieben: Käme morgen ein achtes Blatt dazu, prüfte eine
 * abgeschriebene Liste weiter die sieben von heute – und genau das Blatt,
 * das niemand in die Reihenfolgen eingetragen hat, bliebe ungeprüft.
 */
const quelle = readFileSync(join(wurzel, 'src/components/figur/Register.ts'), 'utf8');
const abschnitt = quelle.slice(quelle.indexOf('export const REGISTERBLAETTER'));
const BLAETTER = [...abschnitt.matchAll(/\{\s*id:\s*'([a-z]+)'/g)].map((m) => ({ id: m[1] }));
const ARTEN = ['novel', 'artbook', 'rpg'];

const ids = (l) => l.map((b) => b.id);

/* =======================================================================
 * 1 · WAS SICH NIE ÄNDERN DARF
 * ==================================================================== */

console.log('\n1 · Was sich nie ändern darf');

pruefe('die echten Blätter wurden gefunden', () => {
  /*
   * Ohne diese Zeile prüfte alles Folgende eine leere Liste und wäre grün,
   * ohne irgendetwas zu behaupten.
   */
  assert.ok(BLAETTER.length >= 7, `nur ${BLAETTER.length} Blätter gelesen: ${ids(BLAETTER)}`);
  assert.ok(ids(BLAETTER).includes('faehigkeiten'), `gelesen: ${ids(BLAETTER)}`);
});

pruefe('jeder Buchtyp zeigt alle Blätter', () => {
  /*
   * Die Zusage, auf die es ankommt. Kein Buchtyp verliert eines.
   */
  for (const art of ARTEN) {
    const raus = ordneBlaetter(BLAETTER, art);
    assert.equal(raus.length, BLAETTER.length, `${art}: ${raus.length} statt ${BLAETTER.length}`);
    assert.deepEqual(
      [...ids(raus)].sort(),
      [...ids(BLAETTER)].sort(),
      `${art} zeigt andere Blätter: ${ids(raus)}`,
    );
  }
});

pruefe('kein Buchtyp erfindet ein Blatt', () => {
  /*
   * Die Gegenrichtung: Ein Tippfehler in einer Reihenfolge („faehigkeit"
   * statt „faehigkeiten") würde sonst stillschweigend ein Blatt ans Ende
   * schieben und niemandem auffallen.
   */
  const bekannt = new Set(ids(BLAETTER));
  for (const art of ARTEN) {
    for (const id of FOLGEN[art]) {
      assert.ok(bekannt.has(id), `${art} nennt „${id}" – so ein Blatt gibt es nicht`);
    }
  }
});

pruefe('jedes Blatt steht in jeder Reihenfolge', () => {
  /*
   * Nicht dasselbe wie oben: `ordneBlaetter` hängt Unbekanntes hinten an, die
   * Reihenfolge wäre also auch dann vollständig, wenn eine Tabelle ein Blatt
   * gar nicht nennt. Dann stünde es aber in jedem Buch am Ende, statt an dem
   * Platz, den jemand für es vorgesehen hätte.
   */
  for (const art of ARTEN) {
    for (const b of BLAETTER) {
      assert.ok(
        FOLGEN[art].includes(b.id),
        `„${b.id}" fehlt in der Reihenfolge für ${art} – es landete stumm hinten`,
      );
    }
  }
});

pruefe('keine Reihenfolge nennt ein Blatt zweimal', () => {
  for (const art of ARTEN) {
    assert.equal(
      new Set(FOLGEN[art]).size,
      FOLGEN[art].length,
      `${art} nennt etwas doppelt: ${FOLGEN[art]}`,
    );
  }
});

/* =======================================================================
 * 2 · WAS SICH UNTERSCHEIDET
 * ==================================================================== */

console.log('\n2 · Was sich unterscheidet');

pruefe('die Übersicht steht überall vorn', () => {
  /*
   * Sie stellt die Figur vor und ist für jeden Buchtyp dieselbe. Ein Buch
   * schlägt man am Anfang auf; die Unterscheidung beginnt danach.
   */
  for (const art of ARTEN) {
    assert.equal(erstesBlattFuer(BLAETTER, art), 'uebersicht', `${art} beginnt anders`);
  }
});

pruefe('jedes Buch stellt etwas anderes an die zweite Stelle', () => {
  /*
   * Die eigentliche Behauptung dieses Moduls. Wären zwei Buchtypen gleich,
   * wäre die Unterscheidung eine Behauptung ohne Wirkung.
   */
  const zweite = ARTEN.map((art) => ordneBlaetter(BLAETTER, art)[1].id);
  assert.deepEqual(zweite, ['wesen', 'aussehen', 'faehigkeiten'], `gefunden: ${zweite}`);
  assert.equal(new Set(zweite).size, 3);
});

pruefe('im Roman steht das Innere vor dem Äusseren', () => {
  const r = ids(ordneBlaetter(BLAETTER, 'novel'));
  assert.ok(r.indexOf('wesen') < r.indexOf('aussehen'), r.join(' · '));
  assert.ok(r.indexOf('vergangenheit') < r.indexOf('faehigkeiten'), r.join(' · '));
});

pruefe('am Spieltisch steht vorn, was man mitten im Spiel braucht', () => {
  const r = ids(ordneBlaetter(BLAETTER, 'rpg'));
  assert.ok(r.indexOf('faehigkeiten') < r.indexOf('vergangenheit'), r.join(' · '));
  assert.ok(r.indexOf('beziehungen') < r.indexOf('aussehen'), r.join(' · '));
});

/* =======================================================================
 * 3 · DAS BUCH VON GESTERN
 * ==================================================================== */

console.log('\n3 · Das Buch von gestern');

pruefe('ohne Buchart bleibt die Reihenfolge unberührt', () => {
  /*
   * Kein Rückfall auf `novel`, kein Raten. Auf diesen Geräten liegt Arbeit.
   */
  assert.deepEqual(ids(ordneBlaetter(BLAETTER, undefined)), ids(BLAETTER));
});

pruefe('ohne Buchart wird auch nichts anderes aufgeschlagen', () => {
  assert.equal(erstesBlattFuer(BLAETTER, undefined), BLAETTER[0].id);
});

pruefe('die hereingereichte Liste bleibt unangetastet', () => {
  const vorher = ids(BLAETTER);
  ordneBlaetter(BLAETTER, 'rpg');
  assert.deepEqual(ids(BLAETTER), vorher);
});

pruefe('ein unbekanntes Blatt fällt nicht weg', () => {
  /*
   * Käme morgen ein achtes Blatt dazu und würde in keine Reihenfolge
   * eingetragen, soll es hinten stehen – nicht verschwinden. Die Prüfung
   * oben sorgt dafür, dass das ein Versehen bleibt und kein Zustand.
   */
  const mehr = [...BLAETTER, { id: 'traeume' }];
  for (const art of ARTEN) {
    const raus = ids(ordneBlaetter(mehr, art));
    assert.ok(raus.includes('traeume'), `${art} verlor das neue Blatt`);
    assert.equal(raus[raus.length - 1], 'traeume', `${art}: ${raus.join(' · ')}`);
  }
});

/* =======================================================================
 * 4 · OB ES ANGESCHLOSSEN IST
 * ==================================================================== */

console.log('\n4 · Ob es angeschlossen ist');

pruefe('die Kante ordnet nach dem Buch', () => {
  /*
   * Quelltext, nicht Verhalten – aber die einzige Prüfung, die anschlägt,
   * wenn jemand wieder `REGISTERBLAETTER.map` schreibt und die Reihenfolge
   * damit stillschweigend ausser Kraft setzt.
   */
  const q = readFileSync(join(wurzel, 'src/components/figur/Registerkante.tsx'), 'utf8');
  assert.ok(/ordneBlaetter/.test(q), 'die Registerkante ordnet nicht');
  assert.ok(
    !/REGISTERBLAETTER\.map/.test(q),
    'die Registerkante geht wieder unsortiert durch REGISTERBLAETTER',
  );
});

pruefe('die Charakterseite schlägt nach dem Buch auf', () => {
  const q = readFileSync(join(wurzel, 'src/pages/figur/Charakterseite.tsx'), 'utf8');
  /*
   * Der **Aufruf**, nicht der Name. Die erste Fassung dieser Prüfung suchte
   * nur „erstesBlattFuer" – und fand die `import`-Zeile, die auch dann noch
   * dasteht, wenn niemand die Funktion mehr benutzt. Sie war grün, während
   * die Seite wieder starr aufschlug.
   */
  assert.ok(
    /erstesBlattFuer\(\s*REGISTERBLAETTER/.test(q),
    'die Charakterseite ruft erstesBlattFuer nicht auf',
  );
  assert.ok(
    /useState\(anfang\)/.test(q),
    'die Charakterseite beginnt nicht mit dem errechneten Blatt',
  );
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
