/**
 * Die Art eines Buches – und die Welt darunter.
 *
 * Zwei Zusagen tragen hier alles, und beide sind Zusagen an Menschen, auf
 * deren Geräten Arbeit liegt:
 *
 *   1. **Ein Buch ohne Art bekommt keine.** Es gibt keine stille Vorgabe, aus
 *      der später eine Oberfläche folgt. Wer nie gewählt hat, hat nicht
 *      gewählt.
 *   2. **Zwei Bücher teilen eine Welt nur, wenn sie dieselbe Kennung tragen.**
 *      Zwei Bücher *ohne* Kennung teilen nichts – sie sind zwei Unbekannte,
 *      nicht zweimal dieselbe.
 *
 * Beides klingt selbstverständlich und ist genau das, was ein flüchtig
 * geschriebener Rückfall kaputtmacht. Jede Prüfung unten wurde gegengeprobt:
 * der Fehler absichtlich wieder eingebaut, bis die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'buchart');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/buchart.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'buchart.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const {
  BUCHARTEN,
  buchartById,
  istBuchart,
  buchartVon,
  vorschlagFuer,
  artOderVorschlag,
} = await import(join(bau, 'buchart.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/** Ein Band mit den Feldern, die hier zählen. */
let laufend = 0;
const band = (patch = {}) => ({
  id: `buch_${++laufend}`,
  title: `Band ${laufend}`,
  worldName: '',
  createdAt: 1_000 * laufend,
  updatedAt: 1_000 * laufend,
  ...patch,
});

/* =======================================================================
 * 1 · DIE ARTEN
 * ==================================================================== */

console.log('\n1 · Die Arten');

pruefe('es gibt genau die drei Arten aus dem Auftrag', () => {
  assert.deepEqual(
    BUCHARTEN.map((a) => a.id),
    ['novel', 'artbook', 'rpg'],
  );
});

pruefe('jede Art nennt einen Arbeitsraum, und jeder ist ein anderer', () => {
  /*
   * Zwei Arten, die denselben Raum laden, wären genau die universelle
   * Oberfläche mit ausgeblendeten Knöpfen, die der Auftrag ausschliesst.
   */
  const raeume = BUCHARTEN.map((a) => a.raum);
  assert.equal(new Set(raeume).size, raeume.length, `zwei Arten teilen sich einen Raum: ${raeume}`);
  for (const a of BUCHARTEN) {
    assert.ok(a.name?.trim(), `${a.id} hat keinen Namen`);
    assert.ok(a.satz?.trim(), `${a.id} hat keinen Satz`);
  }
});

pruefe('was keine Art ist, wird nicht für eine gehalten', () => {
  for (const a of BUCHARTEN) assert.equal(istBuchart(a.id), true);
  for (const falsch of ['roman', 'Novel', 'NOVEL', '', undefined, null, 0, {}, ['novel']]) {
    assert.equal(istBuchart(falsch), false, `${JSON.stringify(falsch)} wurde für eine Art gehalten`);
  }
  assert.equal(buchartById('rpg')?.name, 'D&D / Rollenspiel');
  assert.equal(buchartById('kochbuch'), undefined);
});

/* =======================================================================
 * 2 · EIN BUCH OHNE ART BEKOMMT KEINE
 * ==================================================================== */

console.log('\n2 · Ein Buch ohne Art bekommt keine');

pruefe('ein Bestandsbuch hat keine Art – auch nicht heimlich', () => {
  /*
   * Die wichtigste Prüfung der Datei. Gäbe `buchartVon` hier irgendetwas
   * zurück, würde am nächsten Morgen jedes Buch auf jedem Gerät in einem
   * Arbeitsraum aufgehen, den niemand gewählt hat.
   */
  assert.equal(buchartVon(band()), undefined);
  assert.equal(buchartVon(undefined), undefined);
  assert.equal(buchartVon(band({ art: undefined })), undefined);
  /* Auch ein Buch mit ausgeprägtem Profil bleibt ohne Art. */
  assert.equal(buchartVon(band({ profil: { absicht: 'spiel' } })), undefined);
});

pruefe('eine unbekannte Art zählt als keine', () => {
  /*
   * Aus einer Sicherung, aus einer neueren Fassung, aus einem Tippfehler –
   * was hier ankommt, ist nicht immer eines der drei Wörter. Ein unbekannter
   * Wert darf keinen Arbeitsraum aufschliessen.
   */
  assert.equal(buchartVon(band({ art: 'kochbuch' })), undefined);
  assert.equal(buchartVon(band({ art: 'Novel' })), undefined);
  assert.equal(buchartVon(band({ art: 42 })), undefined);
});

pruefe('eine gewählte Art wird durchgereicht', () => {
  assert.equal(buchartVon(band({ art: 'novel' })), 'novel');
  assert.equal(buchartVon(band({ art: 'artbook' })), 'artbook');
  assert.equal(buchartVon(band({ art: 'rpg' })), 'rpg');
});

/* =======================================================================
 * 3 · DER VORSCHLAG
 * ==================================================================== */

console.log('\n3 · Der Vorschlag');

pruefe('jede Absicht führt zu einer gültigen Art', () => {
  for (const absicht of ['erzaehlen', 'welt', 'spiel', 'entwerfen', 'zeigen', 'frei']) {
    const art = vorschlagFuer(band({ profil: { absicht } }));
    assert.ok(istBuchart(art), `${absicht} ergab ${art}`);
  }
});

pruefe('die Absicht bestimmt den Vorschlag', () => {
  assert.equal(vorschlagFuer(band({ profil: { absicht: 'erzaehlen' } })), 'novel');
  assert.equal(vorschlagFuer(band({ profil: { absicht: 'zeigen' } })), 'artbook');
  assert.equal(vorschlagFuer(band({ profil: { absicht: 'spiel' } })), 'rpg');
  assert.equal(vorschlagFuer(band({ profil: { absicht: 'entwerfen' } })), 'rpg');
  assert.equal(vorschlagFuer(band({ profil: { absicht: 'welt' } })), 'artbook');
});

pruefe('ein Buch ohne alles bekommt einen Vorschlag und keinen Absturz', () => {
  assert.ok(istBuchart(vorschlagFuer(band())));
  assert.ok(istBuchart(vorschlagFuer(undefined)));
  assert.ok(istBuchart(vorschlagFuer(band({ profil: 'kaputt' }))));
});

pruefe('der alte Weg wird weiter gelesen', () => {
  /*
   * `weg` ist das Feld von vor `profil`. Es steht in jeder alten Sicherung,
   * und ein Buch aus jener Zeit soll einen sinnvollen Vorschlag bekommen
   * statt der Vorgabe.
   */
  assert.equal(vorschlagFuer(band({ weg: 'spielleiter' })), 'rpg');
  assert.equal(vorschlagFuer(band({ weg: 'erzaehler' })), 'novel');
  assert.equal(vorschlagFuer(band({ weg: 'weltenbauer' })), 'artbook');
});

pruefe('die Wahl schlägt den Vorschlag', () => {
  /*
   * Ein Spielleiter, der sich für einen Roman entschieden hat, hat sich für
   * einen Roman entschieden. Eine Ableitung darf das nicht überstimmen.
   */
  const eigensinnig = band({ art: 'novel', profil: { absicht: 'spiel' } });
  assert.equal(vorschlagFuer(eigensinnig), 'rpg');
  assert.equal(artOderVorschlag(eigensinnig), 'novel');
  assert.equal(artOderVorschlag(band({ profil: { absicht: 'spiel' } })), 'rpg');
});

/*
 * Die Welt wird in `welten.test.mjs` geprüft.
 *
 * Sie stand hier, solange sie nur eine Kennung an einem Buch war. Seit sie ein
 * eigener Datensatz mit eigenem Namen ist, gehört sie nicht mehr in die Datei,
 * die prüft, was ein Buch ist.
 */

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
