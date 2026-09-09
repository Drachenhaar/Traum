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
  selbeWelt,
  weltenVon,
  weltzeileFuer,
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

/* =======================================================================
 * 4 · DIE WELT
 * ==================================================================== */

console.log('\n4 · Die Welt');

pruefe('zwei Bücher ohne Weltkennung teilen nichts', () => {
  /*
   * Der Fehler, der hier lauert: `a.worldId === b.worldId` ist für zwei
   * Bände ohne Kennung wahr – `undefined === undefined`. In einer Bibliothek
   * aus Bestandsbüchern wäre danach jeder mit jedem verwandt.
   */
  assert.equal(selbeWelt(band(), band()), false);
  assert.equal(selbeWelt(band({ worldId: undefined }), band({ worldId: undefined })), false);
  assert.equal(selbeWelt(band({ worldId: '' }), band({ worldId: '' })), false);
  assert.equal(selbeWelt(band({ worldId: 'welt_a' }), band()), false);
  assert.equal(selbeWelt(undefined, undefined), false);
});

pruefe('dieselbe Kennung heisst dieselbe Welt', () => {
  assert.equal(selbeWelt(band({ worldId: 'welt_a' }), band({ worldId: 'welt_a' })), true);
  assert.equal(selbeWelt(band({ worldId: 'welt_a' }), band({ worldId: 'welt_b' })), false);
});

pruefe('Welten werden aus den Bänden gesammelt', () => {
  const buecher = [
    band({ worldId: 'w1', worldName: 'Nebelreich', art: 'artbook' }),
    band({ worldId: 'w1', worldName: 'Nebelreich', art: 'rpg' }),
    band({ worldId: 'w2', worldName: 'Mooshalde', art: 'novel' }),
    band({ /* ohne Welt */ }),
  ];
  const welten = weltenVon(buecher);
  assert.deepEqual(
    welten.map((w) => [w.id, w.name, w.buecher.length]),
    [
      ['w1', 'Nebelreich', 2],
      ['w2', 'Mooshalde', 1],
    ],
  );
});

pruefe('der Name kommt vom ältesten Band', () => {
  /*
   * Die Reihenfolge in der Eingabeliste darf nicht entscheiden – sonst hiesse
   * dieselbe Welt je nach Sortierung anders.
   */
  const alt = band({ worldId: 'w', worldName: 'Zuerst', createdAt: 100 });
  const jung = band({ worldId: 'w', worldName: 'Später', createdAt: 900 });
  assert.equal(weltenVon([jung, alt])[0].name, 'Zuerst');
  assert.equal(weltenVon([alt, jung])[0].name, 'Zuerst');
});

pruefe('eine Welt ohne Namen bekommt den Titel ihres Bandes', () => {
  const namenlos = band({ worldId: 'w', worldName: '   ', title: 'Die Chroniken' });
  assert.equal(weltenVon([namenlos])[0].name, 'Die Chroniken');
});

pruefe('geteilte Welten stehen oben', () => {
  const welten = weltenVon([
    band({ worldId: 'einsam', worldName: 'Einsam' }),
    band({ worldId: 'geteilt', worldName: 'Geteilt' }),
    band({ worldId: 'geteilt', worldName: 'Geteilt' }),
  ]);
  assert.equal(welten[0].id, 'geteilt');
});

/* =======================================================================
 * 5 · DIE ZEILE UNTER DEM BUCH
 * ==================================================================== */

console.log('\n5 · Die Zeile unter dem Buch');

pruefe('ein einzelner Band zeigt keine Welt', () => {
  /*
   * „Jedes Buch hat eine Welt" ist keine Auskunft. Erst der zweite Band macht
   * die Zeile zu einer Aussage.
   */
  const allein = band({ worldId: 'w', worldName: 'Nebelreich' });
  assert.equal(weltzeileFuer(allein, [allein]), undefined);
  assert.equal(weltzeileFuer(allein, [allein, band({ worldId: 'anders' })]), undefined);
});

pruefe('zwei Bände derselben Welt zeigen sie beide', () => {
  const a = band({ worldId: 'w', worldName: 'Nebelreich', art: 'artbook' });
  const b = band({ worldId: 'w', worldName: 'Nebelreich', art: 'rpg' });
  const alle = [a, b];
  assert.equal(weltzeileFuer(a, alle), 'Nebelreich');
  assert.equal(weltzeileFuer(b, alle), 'Nebelreich');
});

pruefe('ein Band ohne Weltkennung zeigt nie eine Zeile', () => {
  const ohne = band();
  assert.equal(weltzeileFuer(ohne, [ohne, band(), band()]), undefined);
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
