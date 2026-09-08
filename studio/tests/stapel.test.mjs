/**
 * Der Stapel-Import.
 *
 * Die eine Zusage, an der alles hängt: **Gleiche Schicht und gleicher Name
 * ergeben ein Teil mit mehreren Ansichten, nicht mehrere Teile.** Bricht sie,
 * müsste man beim Drehen jede Schicht neu wählen, und dieselbe Figur wäre in
 * drei Ansichten drei Figuren.
 *
 * Jede Zusicherung ist gegengeprüft: der Fehler, den sie fangen soll,
 * absichtlich eingebaut, bis sie ausschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'stapel');
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/stapel.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'stapel.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const { deuteNamen, planeStapel, planIstBrauchbar, auskunft, schlicht } = await import(
  join(bau, 'stapel.mjs')
);

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/* =======================================================================
 * 1 · EINEN NAMEN DEUTEN
 * ==================================================================== */

console.log('\n1 · Einen Namen deuten');

pruefe('der geradlinige Fall', () => {
  assert.deepEqual(deuteNamen('haar_locken_vorn.png'), {
    schicht: 'haar',
    name: 'Locken',
    ansicht: 'vorn',
    art: 'flaeche',
  });
});

pruefe('Ansicht und Art dürfen fehlen', () => {
  /* Der häufigste Fall braucht gar keine Angabe – vorn und Fläche. */
  assert.deepEqual(deuteNamen('augen_schmal.png'), {
    schicht: 'augen',
    name: 'Schmal',
    ansicht: 'vorn',
    art: 'flaeche',
  });
});

pruefe('die Tusche wird erkannt und nicht Teil des Namens', () => {
  const d = deuteNamen('haar_locken_vorn_linie.png');
  assert.equal(d.art, 'linie');
  assert.equal(d.name, 'Locken', 'aus „Locken" wurde „Locken Linie"');
  assert.equal(d.ansicht, 'vorn');
});

pruefe('Linie ohne Ansichtsangabe gilt von vorn', () => {
  const d = deuteNamen('haar_locken_linie.png');
  assert.equal(d.art, 'linie');
  assert.equal(d.ansicht, 'vorn');
  assert.equal(d.name, 'Locken');
});

pruefe('Umlaute und Schreibweisen', () => {
  assert.equal(deuteNamen('körper_schlank_vorn.png').schicht, 'koerper');
  assert.equal(deuteNamen('koerper_schlank_vorn.png').schicht, 'koerper');
  assert.equal(deuteNamen('Ausrüstung-Gurt-links.png').schicht, 'ausruestung');
  /* Getrennt wird an Unterstrich, Bindestrich, Punkt und Leerzeichen. */
  assert.equal(deuteNamen('haar locken rechts.png').ansicht, 'rechts');
  assert.equal(deuteNamen('haar-locken-links.PNG').ansicht, 'links');
});

pruefe('andere Worte für dieselbe Schicht', () => {
  assert.equal(deuteNamen('frisur_zopf.png').schicht, 'haar');
  assert.equal(deuteNamen('waffe_klinge.png').schicht, 'ausruestung');
  assert.equal(deuteNamen('narbe_wange.png').schicht, 'male');
  assert.equal(deuteNamen('hintergrund_dunst.png').schicht, 'grund');
});

pruefe('mehrteilige Namen bleiben zusammen', () => {
  const d = deuteNamen('haar_langer_zopf_links.png');
  assert.equal(d.name, 'Langer zopf');
  assert.equal(d.ansicht, 'links');
});

pruefe('ohne Namen heisst das Teil wie seine Schicht', () => {
  /* `kopf_vorn.png` soll ein Teil „Kopf" ergeben und keinen namenlosen. */
  assert.equal(deuteNamen('kopf_vorn.png').name, 'Kopf');
  assert.equal(deuteNamen('kopf.png').name, 'Kopf');
});

pruefe('ein Pfad davor stört nicht', () => {
  const d = deuteNamen('C:\\Assets\\Koi\\haar_locken_vorn.png');
  assert.equal(d.schicht, 'haar');
  assert.equal(d.name, 'Locken');
  const e = deuteNamen('assets/haare/haar_locken_links.png');
  assert.equal(e.ansicht, 'links');
});

pruefe('was keine Schicht nennt, wird nicht gedeutet', () => {
  /*
   * Die Regel ist eng: Das **erste** Wort nennt die Schicht. Sie irgendwo im
   * Namen zu suchen wäre nachsichtiger und schlechter – „Kopf" ist auch ein
   * Teilname, und eine Regel, die mal so und mal so greift, ist bei
   * zweitausend Dateien nicht mehr zu überblicken.
   */
  assert.equal(deuteNamen('locken_haar_vorn.png'), null);
  assert.equal(deuteNamen('IMG_2043.png'), null);
  assert.equal(deuteNamen('.png'), null);
  assert.equal(deuteNamen(''), null);
});

pruefe('schlicht schreibt Umlaute um, statt sie wegzuwerfen', () => {
  /* Wer sie entfernte, machte aus „Rüstung" ein „Rstung". */
  assert.equal(schlicht('Rüstung'), 'ruestung');
  assert.equal(schlicht('Körper'), 'koerper');
  assert.equal(schlicht('Fläche'), 'flaeche');
  assert.equal(schlicht('Straße'), 'strasse');
});

/* =======================================================================
 * 2 · EINEN STAPEL PLANEN
 * ==================================================================== */

console.log('\n2 · Einen Stapel planen');

pruefe('gleicher Name, gleiches Teil – drei Dateien, ein Teil', () => {
  const { plaene, unklar } = planeStapel([
    'haar_locken_vorn.png',
    'haar_locken_links.png',
    'haar_locken_rechts.png',
  ]);
  assert.equal(unklar.length, 0);
  assert.equal(plaene.length, 1, 'aus einer Frisur wurden drei');
  assert.deepEqual(Object.keys(plaene[0].ansichten).sort(), ['links', 'rechts', 'vorn']);
  assert.equal(plaene[0].ansichten.links.flaeche, 'haar_locken_links.png');
});

pruefe('Fläche und Linie landen in derselben Ansicht', () => {
  const { plaene } = planeStapel(['haar_locken_vorn.png', 'haar_locken_vorn_linie.png']);
  assert.equal(plaene.length, 1);
  assert.deepEqual(plaene[0].ansichten.vorn, {
    flaeche: 'haar_locken_vorn.png',
    linie: 'haar_locken_vorn_linie.png',
  });
});

pruefe('verschiedene Namen bleiben verschiedene Teile', () => {
  const { plaene } = planeStapel(['haar_locken_vorn.png', 'haar_zopf_vorn.png']);
  assert.equal(plaene.length, 2);
});

pruefe('gleicher Name in anderer Schicht ist ein anderes Teil', () => {
  const { plaene } = planeStapel(['haar_band_vorn.png', 'kopfschmuck_band_vorn.png']);
  assert.equal(plaene.length, 2);
  assert.deepEqual(plaene.map((p) => p.schicht).sort(), ['haar', 'kopfschmuck']);
});

pruefe('Gross- und Kleinschreibung trennt keine Teile', () => {
  /*
   * `LOCKEN` und `locken` – und ausdrücklich nicht `Locken` gegen `locken`:
   * Diese beiden macht `grossAnfangen` ohnehin gleich, der Fall prüfte also
   * gar nichts. Genau so stand er hier zuerst, und die Gegenprobe lief grün
   * durch, obwohl die Schlüsselbildung kaputt war.
   */
  const { plaene } = planeStapel(['haar_LOCKEN_vorn.png', 'haar_locken_links.png']);
  assert.equal(plaene.length, 1, 'aus „LOCKEN" und „locken" wurden zwei Frisuren');
  assert.deepEqual(Object.keys(plaene[0].ansichten).sort(), ['links', 'vorn']);

  /* Auch Umlaute dürfen nicht trennen. */
  const { plaene: mitUmlaut } = planeStapel([
    'gewand_überwurf_vorn.png',
    'gewand_ueberwurf_links.png',
  ]);
  assert.equal(mitUmlaut.length, 1, '„überwurf" und „ueberwurf" wurden zwei Gewänder');
});

pruefe('doppelt belegte Stellen werden genannt, nicht heimlich entschieden', () => {
  const { plaene, doppelt } = planeStapel([
    'haar_locken_vorn.png',
    'haar_locken_vorn.jpg',
  ]);
  assert.equal(plaene.length, 1);
  /* Das erste gilt, das zweite wird gemeldet – nicht still genommen. */
  assert.equal(plaene[0].ansichten.vorn.flaeche, 'haar_locken_vorn.png');
  assert.deepEqual(doppelt, ['haar_locken_vorn.jpg']);
});

pruefe('Ungedeutetes wird gesammelt und nicht angefasst', () => {
  const { plaene, unklar } = planeStapel(['haar_locken_vorn.png', 'IMG_1.png', 'notiz.txt']);
  assert.equal(plaene.length, 1);
  assert.deepEqual(unklar, ['IMG_1.png', 'notiz.txt']);
});

pruefe('die Reihenfolge der Dateien bleibt erhalten', () => {
  const { plaene } = planeStapel(['mund_a.png', 'augen_b.png', 'haar_c.png']);
  assert.deepEqual(plaene.map((p) => p.name), ['A', 'B', 'C']);
});

pruefe('eine Linie ohne Fläche ergibt kein Teil', () => {
  /* Tusche allein lässt sich nicht einfärben und hat nichts, worüber sie läge. */
  const { plaene } = planeStapel(['haar_locken_vorn_linie.png']);
  assert.equal(plaene.length, 1);
  assert.equal(planIstBrauchbar(plaene[0]), false);

  const { plaene: mitFlaeche } = planeStapel([
    'haar_locken_vorn_linie.png',
    'haar_locken_vorn.png',
  ]);
  assert.equal(planIstBrauchbar(mitFlaeche[0]), true);
});

/* =======================================================================
 * 3 · DIE AUSKUNFT VOR DEM EINLESEN
 * ==================================================================== */

console.log('\n3 · Die Auskunft vor dem Einlesen');

pruefe('sie zählt, was wirklich entsteht', () => {
  const namen = [
    'haar_locken_vorn.png',
    'haar_locken_links.png',
    'haar_locken_vorn_linie.png',
    'haar_zopf_vorn.png',
    'augen_schmal_vorn.png',
    'bart_voll_vorn_linie.png', // Linie ohne Fläche – ergibt kein Teil
    'IMG_9.png', // nicht zu deuten
    'haar_zopf_vorn.jpg', // doppelt belegt
  ];
  const a = auskunft(planeStapel(namen), namen.length);
  assert.equal(a.dateien, 8);
  assert.equal(a.teile, 3, 'gezählt wird, was entsteht – nicht, was hochgeladen wurde');
  assert.equal(a.ohneFlaeche, 1);
  assert.equal(a.unklar, 1);
  assert.equal(a.doppelt, 1);
});

pruefe('sie zählt je Schicht, in Schichtreihenfolge', () => {
  /*
   * Die Reihenfolge ist die des Stapels und nicht die der Dateien: Wer eine
   * Auskunft liest, will sie so sortiert sehen wie den Baukasten selbst.
   */
  const a = auskunft(
    planeStapel(['haar_a_vorn.png', 'koerper_b_vorn.png', 'augen_c_vorn.png']),
    3,
  );
  assert.deepEqual(a.jeSchicht, [
    { schicht: 'koerper', anzahl: 1 },
    { schicht: 'augen', anzahl: 1 },
    { schicht: 'haar', anzahl: 1 },
  ]);
});

pruefe('ein grosser Stapel bleibt beherrschbar', () => {
  /*
   * Zweitausend Dateien, wie sie wirklich kämen: fünfhundert Teile in vier
   * Schichten, jedes von vorn und von links, jedes mit Tusche.
   */
  const namen = [];
  const schichten = ['haar', 'augen', 'mund', 'gewand'];
  for (const s of schichten) {
    for (let i = 0; i < 125; i++) {
      for (const ansicht of ['vorn', 'links']) {
        namen.push(`${s}_nummer${i}_${ansicht}.png`);
        namen.push(`${s}_nummer${i}_${ansicht}_linie.png`);
      }
    }
  }
  assert.equal(namen.length, 2000);

  const begonnen = Date.now();
  const plan = planeStapel(namen);
  const gedauert = Date.now() - begonnen;

  assert.equal(plan.plaene.length, 500, 'aus 2000 Dateien wurden nicht 500 Teile');
  assert.equal(plan.unklar.length, 0);
  assert.equal(plan.doppelt.length, 0);
  /* Jedes Teil trägt zwei Ansichten mit je Fläche und Linie. */
  for (const p of plan.plaene) {
    assert.deepEqual(Object.keys(p.ansichten).sort(), ['links', 'vorn']);
    assert.ok(p.ansichten.vorn.flaeche && p.ansichten.vorn.linie);
  }
  assert.ok(gedauert < 1000, `das Planen dauerte ${gedauert} ms`);
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
