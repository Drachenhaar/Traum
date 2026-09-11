/**
 * Die Welt.
 *
 * Vier Zusagen, und alle vier sind Zusagen an Menschen, auf deren Geräten
 * Arbeit liegt:
 *
 *   1. **Zwei Bücher ohne Weltkennung teilen nichts.** `undefined ===
 *      undefined` ist wahr, und genau daran wäre in einer Bibliothek aus
 *      Bestandsbüchern jeder mit jedem verwandt geworden.
 *   2. **Ein geliehener Name ist als geliehen erkennbar.** Solange niemand
 *      eine Welt benannt hat, zeigt Dragoncore den Titel ihres ältesten
 *      Bandes – aber es behauptet nicht, sie heisse so.
 *   3. **Ein eigener Name schlägt den geliehenen.** Sonst wäre das Benennen
 *      folgenlos.
 *   4. **Ein leerer Name nimmt die Benennung zurück**, statt „" zu zeigen.
 *
 * Jede Prüfung unten wurde gegengeprobt: der Fehler absichtlich wieder
 * eingebaut, bis die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'welten');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/welten.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'welten.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const {
  neueWelt,
  heileWelt,
  selbeWelt,
  nameFuer,
  weltenVon,
  waehlbareWelten,
  weltVon,
  weltzeileFuer,
  nimmtWeltMit,
} = await import(join(bau, 'welten.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

let n = 0;
const band = (patch = {}) => ({
  id: `buch_${++n}`,
  title: `Band ${n}`,
  worldName: '',
  createdAt: 1000 * n,
  updatedAt: 1000 * n,
  ...patch,
});
const welt = (id, name) => ({ id, name, createdAt: 0, updatedAt: 0 });

/* =======================================================================
 * 1 · EINE NEUE WELT
 * ==================================================================== */

console.log('\n1 · Eine neue Welt');

pruefe('eine neue Welt hat eine Kennung und keinen Namen', () => {
  const w = neueWelt();
  assert.match(w.id, /^welt_/);
  assert.equal(w.name, '');
  assert.ok(w.createdAt > 0);
});

pruefe('zwei neue Welten sind nicht dieselbe', () => {
  assert.notEqual(neueWelt().id, neueWelt().id);
});

pruefe('was keine Welt ist, wird keine', () => {
  /*
   * Was aus einer Sicherung kommt, ist nicht notwendigerweise das, was
   * hinausging. Eine Zeile ohne Kennung in die Ablage zu schreiben hiesse,
   * einen Datensatz anzulegen, den niemand je wiederfindet.
   */
  for (const müll of [null, undefined, 42, 'welt', {}, { name: 'Ohne Kennung' }, { id: '' }]) {
    assert.equal(heileWelt(müll), null, `${JSON.stringify(müll)} wurde zu einer Welt`);
  }
});

pruefe('eine beschädigte Welt wird geheilt statt verworfen', () => {
  const w = heileWelt({ id: 'w1', name: 42, tagline: '   ', createdAt: 'gestern' });
  assert.equal(w.id, 'w1');
  assert.equal(w.name, '');
  assert.equal(w.tagline, undefined);
  assert.equal(typeof w.createdAt, 'number');
});

/* =======================================================================
 * 2 · WER TEILT WAS
 * ==================================================================== */

console.log('\n2 · Wer teilt was');

pruefe('zwei Bücher ohne Weltkennung teilen nichts', () => {
  assert.equal(selbeWelt(band(), band()), false);
  assert.equal(selbeWelt(band({ worldId: undefined }), band({ worldId: undefined })), false);
  assert.equal(selbeWelt(band({ worldId: '' }), band({ worldId: '' })), false);
  assert.equal(selbeWelt(undefined, undefined), false);
});

pruefe('dieselbe Kennung heisst dieselbe Welt', () => {
  assert.equal(selbeWelt(band({ worldId: 'w' }), band({ worldId: 'w' })), true);
  assert.equal(selbeWelt(band({ worldId: 'w' }), band({ worldId: 'x' })), false);
});

pruefe('Bücher ohne Welt tauchen in keiner Welt auf', () => {
  const sicht = weltenVon([band(), band({ worldId: 'w' })], []);
  assert.equal(sicht.length, 1);
  assert.equal(sicht[0].buecher.length, 1);
});

pruefe('eine gespeicherte Welt ohne Bände erscheint nicht', () => {
  /*
   * Sie entsteht, wenn das letzte Buch einer Welt gelöscht wird. In der
   * Auswahl wäre sie ein Eintrag, den niemand wählen kann und niemand
   * versteht.
   */
  const sicht = weltenVon([band({ worldId: 'w' })], [welt('w', 'Da'), welt('leer', 'Weg')]);
  assert.deepEqual(sicht.map((x) => x.id), ['w']);
  assert.deepEqual(waehlbareWelten([band({ worldId: 'w' })], [welt('leer', 'Weg')]).map((x) => x.id), ['w']);
});

/* =======================================================================
 * 3 · WIE EINE WELT HEISST
 * ==================================================================== */

console.log('\n3 · Wie eine Welt heisst');

pruefe('ohne eigenen Namen leiht sie ihn beim ältesten Band', () => {
  const alt = band({ worldId: 'w', worldName: 'Nebelreich', createdAt: 100 });
  const jung = band({ worldId: 'w', worldName: 'Später', createdAt: 900 });
  /* Die Reihenfolge der Eingabe darf nicht entscheiden. */
  assert.equal(nameFuer(undefined, [jung, alt]).name, 'Nebelreich');
  assert.equal(nameFuer(undefined, [alt, jung]).name, 'Nebelreich');
});

pruefe('ein geliehener Name ist als geliehen erkennbar', () => {
  /*
   * Die Zusage, an der die Oberfläche hängt: Ein geliehener Name darf
   * angezeigt, aber nicht behauptet werden. Ohne `benannt` liesse sich beides
   * nicht unterscheiden, und ein Eingabefeld zeigte den Buchtitel, als sei
   * die Welt bereits so getauft.
   */
  assert.equal(nameFuer(undefined, [band({ worldName: 'Geliehen' })]).benannt, false);
  assert.equal(nameFuer(welt('w', ''), [band({ worldName: 'Geliehen' })]).benannt, false);
  assert.equal(nameFuer(welt('w', '   '), [band({ worldName: 'Geliehen' })]).benannt, false);
});

pruefe('ein eigener Name schlägt den geliehenen', () => {
  const b = [band({ worldId: 'w', worldName: 'Geliehen' })];
  const { name, benannt } = nameFuer(welt('w', 'Nebelreich'), b);
  assert.equal(name, 'Nebelreich');
  assert.equal(benannt, true);
  assert.equal(weltenVon(b, [welt('w', 'Nebelreich')])[0].name, 'Nebelreich');
});

pruefe('ein leerer Name nimmt die Benennung zurück', () => {
  /*
   * Wer sich vertippt hat, soll nicht mit einem falschen Namen leben, weil
   * das Feld sich nicht leeren lässt. Danach gilt wieder der geliehene.
   */
  const b = [band({ worldId: 'w', worldName: 'Geliehen' })];
  assert.equal(nameFuer(welt('w', ''), b).name, 'Geliehen');
});

pruefe('ohne Weltnamen springt der Buchtitel ein', () => {
  const b = [band({ worldId: 'w', worldName: '  ', title: 'Die Chroniken' })];
  assert.equal(nameFuer(undefined, b).name, 'Die Chroniken');
});

pruefe('ganz ohne alles bleibt sie unbenannt und stürzt nicht ab', () => {
  assert.equal(nameFuer(undefined, []).name, 'Unbenannte Welt');
  assert.equal(nameFuer(undefined, [band({ title: '', worldName: '' })]).name, 'Unbenannte Welt');
});

pruefe('geteilte Welten stehen oben', () => {
  const sicht = weltenVon(
    [
      band({ worldId: 'einsam' }),
      band({ worldId: 'geteilt' }),
      band({ worldId: 'geteilt' }),
    ],
    [welt('einsam', 'Aaa'), welt('geteilt', 'Zzz')],
  );
  assert.equal(sicht[0].id, 'geteilt');
});

/* =======================================================================
 * 4 · DIE ZEILE UNTER DEM BUCH
 * ==================================================================== */

console.log('\n4 · Die Zeile unter dem Buch');

pruefe('ein einzelner Band zeigt keine Welt', () => {
  /*
   * „Jedes Buch hat eine Welt" ist keine Auskunft. Erst der zweite Band macht
   * die Zeile zu einer Aussage.
   */
  const allein = band({ worldId: 'w' });
  assert.equal(weltzeileFuer(allein, [allein], [welt('w', 'Nebelreich')]), undefined);
});

pruefe('zwei Bände derselben Welt zeigen sie beide', () => {
  const a = band({ worldId: 'w' });
  const b = band({ worldId: 'w' });
  const welten = [welt('w', 'Nebelreich')];
  assert.equal(weltzeileFuer(a, [a, b], welten), 'Nebelreich');
  assert.equal(weltzeileFuer(b, [a, b], welten), 'Nebelreich');
});

pruefe('ein Band ohne Weltkennung zeigt nie eine Zeile', () => {
  const ohne = band();
  assert.equal(weltzeileFuer(ohne, [ohne, band(), band()], []), undefined);
  assert.equal(weltVon(ohne, [ohne], []), undefined);
});

pruefe('die Zeile zeigt den benannten Namen, nicht den geliehenen', () => {
  const a = band({ worldId: 'w', worldName: 'Die Chroniken des Nebelwaldes' });
  const b = band({ worldId: 'w', worldName: 'Die Chroniken des Nebelwaldes' });
  assert.equal(weltzeileFuer(a, [a, b], []), 'Die Chroniken des Nebelwaldes');
  assert.equal(weltzeileFuer(a, [a, b], [welt('w', 'Nebelreich')]), 'Nebelreich');
});

/* =======================================================================
 * 5 · WER NIMMT DIE WELT MIT
 *
 * Die gefährlichste Regel des Programms: Seit das Weltwissen der Welt gehört,
 * würde ein falsches Ja hier einem anderen Band seine Figuren, Orte und
 * Karten unter den Händen wegnehmen.
 * ==================================================================== */

console.log('\n5 · Wer nimmt die Welt mit');

pruefe('der letzte Band einer Welt nimmt sie mit', () => {
  const allein = band({ worldId: 'w' });
  assert.equal(nimmtWeltMit(allein, [allein]), true);
});

pruefe('ein Band mit Geschwistern nimmt nichts mit', () => {
  const a = band({ worldId: 'w' });
  const b = band({ worldId: 'w' });
  assert.equal(nimmtWeltMit(a, [a, b]), false);
  assert.equal(nimmtWeltMit(b, [a, b]), false);
});

pruefe('ein archivierter Geschwisterband zählt mit', () => {
  /*
   * Ein Buch wegzuräumen heisst nicht, es aufzugeben. Wer sein Artbook ins
   * Archiv gestellt und danach die Kampagne gelöscht hat, soll seine Welt
   * beim Zurückholen vorfinden.
   */
  const a = band({ worldId: 'w' });
  const archiviert = band({ worldId: 'w', archived: true });
  assert.equal(nimmtWeltMit(a, [a, archiviert]), false);
});

pruefe('ein Band einer anderen Welt hält nichts auf', () => {
  const a = band({ worldId: 'w' });
  const fremd = band({ worldId: 'andere' });
  assert.equal(nimmtWeltMit(a, [a, fremd]), true);
});

pruefe('ein Band ohne Weltkennung nimmt nie etwas mit', () => {
  /*
   * `undefined === undefined` ist wahr. Ohne diese Zeile löschte ein Buch
   * ohne Kennung die Inhalte *aller* anderen kennungslosen Bände mit.
   */
  const ohne = band();
  assert.equal(nimmtWeltMit(ohne, [ohne]), false);
  assert.equal(nimmtWeltMit(ohne, [ohne, band(), band()]), false);
  assert.equal(nimmtWeltMit(undefined, []), false);
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
