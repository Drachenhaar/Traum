/**
 * Der Testlauf.
 *
 * `npm test` – ein Befehl, alle Prüfungen, ein Ergebnis. Bis eben lagen diese
 * Tests außerhalb des Projekts und mussten von Hand gestartet werden; damit
 * waren sie genau so viel wert wie die Erinnerung daran, dass es sie gibt.
 *
 * Kein Testrahmen. Jede Prüfung ist ein Programm, das etwas ausrechnet, mit
 * dem Erwarteten vergleicht und mit 0 oder 1 endet. Der Läufer hier startet
 * sie einzeln in einem eigenen Prozess – so nimmt ein Absturz in einer
 * Prüfung die anderen nicht mit, und der Bericht bleibt vollständig.
 *
 * Warum ein eigener Prozess je Datei: Die Prüfungen bauen die Quelldateien,
 * die sie prüfen, mit esbuild zu Bündeln zusammen und laden diese. Zwei
 * Prüfungen im selben Prozess teilten sich den Modulzwischenspeicher, und
 * eine, die ihr Bündel neu baut, bekäme das alte.
 */

import { readdirSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const bau = join(wurzel, '.testbau');

rmSync(bau, { recursive: true, force: true });
mkdirSync(join(bau, 't'), { recursive: true });

const nurDiese = process.argv.slice(2);
const dateien = readdirSync(join(wurzel, 'tests'))
  .filter((f) => f.endsWith('.test.mjs'))
  .filter((f) => !nurDiese.length || nurDiese.some((n) => f.includes(n)))
  .sort();

let gescheitert = 0;
const langsam = [];

for (const datei of dateien) {
  const beginn = Date.now();
  const lauf = spawnSync(process.execPath, [join(wurzel, 'tests', datei)], {
    cwd: wurzel,
    encoding: 'utf8',
  });
  const dauer = Date.now() - beginn;
  if (dauer > 4000) langsam.push(`${datei} (${(dauer / 1000).toFixed(1)} s)`);

  const name = datei.replace('.test.mjs', '').padEnd(14);
  const zeilen = (lauf.stdout ?? '').trimEnd().split('\n');
  const letzte = zeilen[zeilen.length - 1] ?? '';

  if (lauf.status === 0) {
    console.log(`  ✓ ${name} ${letzte}`);
  } else {
    gescheitert += 1;
    console.log(`  ✗ ${name} ${letzte}`);
    /* Bei einem Fehlschlag die ganze Ausgabe – sonst steht da nur „1 gescheitert". */
    const ausgabe = [lauf.stdout, lauf.stderr].filter(Boolean).join('\n').trimEnd();
    console.log(
      ausgabe
        .split('\n')
        .map((z) => `      ${z}`)
        .join('\n'),
    );
  }
}

rmSync(bau, { recursive: true, force: true });

console.log('');
if (langsam.length) console.log(`  langsam: ${langsam.join(', ')}`);
if (gescheitert) {
  console.log(`  ${gescheitert} von ${dateien.length} Prüfungen gescheitert.\n`);
  process.exit(1);
}
console.log(`  ${dateien.length} Prüfungen bestanden.\n`);
