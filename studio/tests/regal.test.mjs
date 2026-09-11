/**
 * Was dem Gerät gehört und was dem Buch.
 *
 * Eine Zusage trägt diese Datei, und sie war bis eben gebrochen:
 *
 *   **Ein buchgebundener Wert, den das Buch nicht hat, ist nicht da.**
 *
 * Vorher blieb stehen, was in der Grundlage stand. Beim Buchwechsel ist die
 * Grundlage aber die *bereits gemischte* Einstellung des vorigen Bandes –
 * `oeffneBuch` baut sie aus dem laufenden Zustand. Ein Buch ohne eigenes
 * Lesebändchen erbte damit das des zuletzt offenen.
 *
 * Gefunden wurde das nicht hier, sondern im Browser: Ein Roman schlug bei
 * „/inhalt" auf statt bei seinem Manuskript, weil davor ein Artbook auf seinem
 * Inhaltsverzeichnis gelegen hatte. Diese Datei sorgt dafür, dass es nicht
 * zurückkommt.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'regal');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/bibliothek.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'bibliothek.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const { sichtbareEinstellungen, zerlegeAenderung, BUCH_SCHLUESSEL, neuesBuch, imRegal, imArchiv } =
  await import(join(bau, 'bibliothek.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/* =======================================================================
 * 1 · KEIN ÜBERLAUF ZWISCHEN BÜCHERN
 * ==================================================================== */

console.log('\n1 · Kein Überlauf zwischen Büchern');

pruefe('ein Buch ohne Lesebändchen erbt keines', () => {
  /*
   * Der Fehler, der im Browser sichtbar wurde. `vorher` ist die gemischte
   * Einstellung, mit der das *vorige* Buch offen lag – genau das, was
   * `oeffneBuch` als Grundlage nimmt.
   */
  const vorher = { id: 'settings', lastSpreadKey: 'chapter:naturgesetze', nav: [] };
  const roman = neuesBuch({ title: 'Chroniken' });
  assert.equal(sichtbareEinstellungen(vorher, roman).lastSpreadKey, undefined);
});

pruefe('ein eigenes Lesebändchen wird gezeigt', () => {
  const vorher = { id: 'settings', lastSpreadKey: 'chapter:naturgesetze', nav: [] };
  const buch = neuesBuch({ lastSpreadKey: 'entry:abc' });
  assert.equal(sichtbareEinstellungen(vorher, buch).lastSpreadKey, 'entry:abc');
});

pruefe('kein buchgebundener Schlüssel läuft über', () => {
  /*
   * Nicht nur das Lesebändchen: Die Prüfung geht **jeden** Schlüssel der
   * Liste durch, damit ein neu hinzugefügter nicht stillschweigend zur
   * Ausnahme wird.
   */
  const vorher = { id: 'settings', nav: [] };
  for (const k of BUCH_SCHLUESSEL) vorher[k] = `aus dem vorigen Buch (${k})`;

  const leeresBuch = neuesBuch();
  const sicht = sichtbareEinstellungen(vorher, leeresBuch);

  for (const k of BUCH_SCHLUESSEL) {
    /* Was das Buch selbst mitbringt, darf natürlich dastehen. */
    if (leeresBuch[k] !== undefined) continue;
    assert.equal(sicht[k], undefined, `„${k}" ist aus dem vorigen Buch übergelaufen`);
  }
});

pruefe('Geräteeinstellungen bleiben stehen', () => {
  /*
   * Die Gegenrichtung, und sie ist genauso wichtig: Was dem *Gerät* gehört –
   * wie oft ans Sichern erinnert wird, wie die Navigation aussieht – darf
   * beim Buchwechsel nicht verschwinden.
   */
  const geraet = { id: 'settings', nav: ['a'], backupReminderDays: 30, seedVersion: 2 };
  const sicht = sichtbareEinstellungen(geraet, neuesBuch());
  assert.equal(sicht.backupReminderDays, 30);
  assert.equal(sicht.seedVersion, 2);
  assert.deepEqual(sicht.nav, ['a']);
});

pruefe('ohne Buch bleibt alles beim Gerät', () => {
  const geraet = { id: 'settings', nav: [], worldName: 'Dragoncore' };
  const sicht = sichtbareEinstellungen(geraet, undefined);
  assert.equal(sicht.book, undefined);
  assert.equal(sicht.worldName, 'Dragoncore');
});

pruefe('Listen fehlen nie', () => {
  /*
   * Die Oberfläche ruft `settings.goals.map` ohne Fragezeichen. Ein Buch aus
   * einer alten Sicherung hat vielleicht keine Liste – dann eine leere.
   */
  const sicht = sichtbareEinstellungen({ id: 'settings', nav: [] }, {
    ...neuesBuch(),
    goals: undefined,
    customTypes: undefined,
    recentIds: undefined,
  });
  assert.deepEqual(sicht.goals, []);
  assert.deepEqual(sicht.customTypes, []);
  assert.deepEqual(sicht.recentIds, []);
});

/* =======================================================================
 * 2 · DIE ZERLEGUNG
 * ==================================================================== */

console.log('\n2 · Die Zerlegung');

pruefe('jede Änderung landet auf genau einer Seite', () => {
  const { global, buch } = zerlegeAenderung({
    lastSpreadKey: 'x',
    worldName: 'Nebelreich',
    backupReminderDays: 7,
  });
  assert.equal(buch.lastSpreadKey, 'x');
  assert.equal(buch.worldName, 'Nebelreich');
  assert.equal(global.backupReminderDays, 7);
  assert.equal(global.lastSpreadKey, undefined);
  assert.equal(buch.backupReminderDays, undefined);
});

pruefe('das Buch selbst kommt nicht als Einstellung durch', () => {
  /*
   * Sonst schriebe eine Einstellungsänderung nebenbei den Einband um.
   */
  const { global, buch } = zerlegeAenderung({ book: { title: 'Fremd' }, id: 'settings' });
  assert.equal(global.book, undefined);
  assert.equal(buch.book, undefined);
  assert.equal(global.id, undefined);
});

/* =======================================================================
 * 3 · DAS REGAL
 * ==================================================================== */

console.log('\n3 · Das Regal');

pruefe('archivierte Bände stehen nicht im Regal', () => {
  const a = neuesBuch({ title: 'Offen' });
  const b = { ...neuesBuch({ title: 'Weggeräumt' }), archived: true };
  assert.deepEqual(imRegal([a, b]).map((x) => x.title), ['Offen']);
  assert.deepEqual(imArchiv([a, b]).map((x) => x.title), ['Weggeräumt']);
});

pruefe('zuletzt aufgeschlagen steht vorn', () => {
  const alt = { ...neuesBuch({ title: 'Alt' }), lastOpenedAt: 100 };
  const neu = { ...neuesBuch({ title: 'Neu' }), lastOpenedAt: 900 };
  assert.deepEqual(imRegal([alt, neu]).map((x) => x.title), ['Neu', 'Alt']);
  assert.deepEqual(imRegal([neu, alt]).map((x) => x.title), ['Neu', 'Alt']);
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
