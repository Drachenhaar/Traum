/**
 * Der ZIP-Packer.
 *
 * Die eine Zusage, die zählt: **Was hier herauskommt, ist ein echtes ZIP.**
 * Das lässt sich nicht durch Selbstbespiegelung zeigen – ein Packer, der seine
 * eigenen Fehler wieder einliest, ist immer mit sich einig. Deshalb prüft
 * dieser Test mit dem **Info-ZIP `unzip`** des Systems: Es prüft die
 * Prüfsummen (`unzip -t`), packt aus, und die Bytes werden verglichen.
 *
 * Erst danach wird zusätzlich der eigene Leser geprüft.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'zip');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/zip.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'zip.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const { packe, entpacke, crc32, crcFertig } = await import(join(bau, 'zip.mjs'));

let geprueft = 0;
const pruefe = async (was, fn) => {
  await fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/* =======================================================================
 * 1 · DIE PRÜFSUMME
 * ==================================================================== */

console.log('\n1 · Die Prüfsumme');

await pruefe('CRC-32 stimmt mit den bekannten Werten überein', () => {
  /*
   * Die Probe aus der Norm: „123456789" ergibt 0xCBF43926. Ohne einen von
   * aussen bekannten Wert prüfte man nur, dass die Rechnung mit sich selbst
   * übereinstimmt – und eine falsche Prüfsumme ist mit sich immer einig.
   */
  const enc = new TextEncoder();
  assert.equal(crcFertig(crc32(enc.encode('123456789'))), 0xcbf43926);
  assert.equal(crcFertig(crc32(enc.encode(''))), 0x00000000);
  assert.equal(crcFertig(crc32(enc.encode('a'))), 0xe8b7be43);
});

/* =======================================================================
 * 2 · DAS ECHTE unzip
 * ==================================================================== */

console.log('\n2 · Das echte unzip');

/** Ein Blob als Datei ablegen – node kennt Blob, aber nicht writeFile(Blob). */
async function schreibe(pfad, blob) {
  writeFileSync(pfad, Buffer.from(await blob.arrayBuffer()));
}

const zufaellig = (n, saat) => {
  const b = new Uint8Array(n);
  let x = saat >>> 0;
  for (let i = 0; i < n; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    b[i] = x >>> 24;
  }
  return b;
};

await pruefe('unzip -t findet keinen Fehler', async () => {
  const archiv = await packe([
    { name: 'daten.json', daten: JSON.stringify({ app: 'dragoncore', teile: 3 }) },
    { name: 'bilder/img_1.png', daten: zufaellig(5000, 1) },
    { name: 'bilder/img_2.png', daten: zufaellig(64, 2) },
    { name: 'leer.bin', daten: new Uint8Array(0) },
  ]);
  const pfad = join(bau, 'probe.zip');
  await schreibe(pfad, archiv);

  /* Wirft, wenn unzip einen Fehler meldet – genau das ist die Prüfung. */
  const aus = execFileSync('unzip', ['-t', pfad], { encoding: 'utf8' });
  assert.match(aus, /No errors detected/);
});

await pruefe('unzip packt Byte für Byte dasselbe wieder aus', async () => {
  const bilder = {
    'bilder/a.png': zufaellig(20_000, 7),
    'bilder/tief/b.png': zufaellig(333, 8),
  };
  const json = JSON.stringify({ hallo: 'Welt', umlaut: 'Grösse & Mass' });
  const archiv = await packe([
    { name: 'daten.json', daten: json },
    ...Object.entries(bilder).map(([name, daten]) => ({ name, daten })),
  ]);
  const pfad = join(bau, 'rund.zip');
  await schreibe(pfad, archiv);

  const ziel = join(bau, 'aus');
  rmSync(ziel, { recursive: true, force: true });
  execFileSync('unzip', ['-q', pfad, '-d', ziel]);

  assert.equal(readFileSync(join(ziel, 'daten.json'), 'utf8'), json);
  for (const [name, daten] of Object.entries(bilder)) {
    assert.deepEqual(
      new Uint8Array(readFileSync(join(ziel, name))),
      daten,
      `${name} kam anders wieder heraus`,
    );
  }
});

await pruefe('die Verzeichnisstruktur bleibt erhalten', async () => {
  const archiv = await packe([{ name: 'bilder/tief/tiefer/x.png', daten: zufaellig(10, 3) }]);
  const pfad = join(bau, 'pfade.zip');
  await schreibe(pfad, archiv);
  const aus = execFileSync('zipinfo', ['-1', pfad], { encoding: 'utf8' });
  assert.equal(aus.trim(), 'bilder/tief/tiefer/x.png');
});

/* =======================================================================
 * 3 · DER EIGENE LESER
 * ==================================================================== */

console.log('\n3 · Der eigene Leser');

await pruefe('was gepackt wurde, kommt wieder heraus', async () => {
  const daten = { 'daten.json': 'x'.repeat(1000), 'bilder/a.png': zufaellig(4096, 11) };
  const archiv = await packe(
    Object.entries(daten).map(([name, d]) => ({ name, daten: d })),
  );
  const gelesen = await entpacke(archiv);

  assert.deepEqual([...gelesen.keys()].sort(), ['bilder/a.png', 'daten.json']);
  assert.equal(await gelesen.get('daten.json').text(), daten['daten.json']);
  assert.deepEqual(
    new Uint8Array(await gelesen.get('bilder/a.png').arrayBuffer()),
    daten['bilder/a.png'],
  );
});

await pruefe('ein leeres Archiv ist gültig und leer', async () => {
  const archiv = await packe([]);
  assert.deepEqual([...(await entpacke(archiv)).keys()], []);
  const pfad = join(bau, 'leer.zip');
  await schreibe(pfad, archiv);
  /*
   * `unzip -t` beendet sich bei einem leeren Archiv mit Status 1 und der
   * Meldung „zipfile is empty". Das ist sein Verhalten und kein Mangel des
   * Packers: Ein leeres ZIP ist gültig, unzip hält es nur für einen Anlass zur
   * Warnung. Geprüft wird deshalb die Meldung – „nicht als Archiv erkannt"
   * sähe anders aus.
   */
  let meldung = '';
  try {
    meldung = execFileSync('unzip', ['-t', pfad], { encoding: 'utf8' });
  } catch (err) {
    meldung = String(err.stdout ?? '');
  }
  assert.match(meldung, /zipfile is empty|No errors/);
  assert.doesNotMatch(meldung, /cannot find zipfile directory|not a zipfile/);
});

await pruefe('ein Archiv von fremder Hand lässt sich lesen', async () => {
  /*
   * Die Gegenrichtung, und sie ist die wichtigere: Ein Archiv, das **nicht**
   * von diesem Packer stammt, muss der eigene Leser trotzdem verstehen. Sonst
   * hätten Packer und Leser sich nur aufeinander abgestimmt.
   */
  const quelle = join(bau, 'fremd');
  rmSync(quelle, { recursive: true, force: true });
  mkdirSync(join(quelle, 'bilder'), { recursive: true });
  writeFileSync(join(quelle, 'daten.json'), '{"von":"unzip"}');
  writeFileSync(join(quelle, 'bilder', 'c.png'), Buffer.from(zufaellig(2048, 21)));

  const pfad = join(bau, 'fremd.zip');
  /* `-0` erzeugt ein Archiv ohne Kompression, wie unseres. */
  execFileSync('zip', ['-0', '-q', '-r', pfad, '.'], { cwd: quelle });

  const archiv = new Blob([readFileSync(pfad)]);
  const gelesen = await entpacke(archiv);
  assert.equal(await gelesen.get('daten.json').text(), '{"von":"unzip"}');
  assert.deepEqual(
    new Uint8Array(await gelesen.get('bilder/c.png').arrayBuffer()),
    zufaellig(2048, 21),
  );
});

await pruefe('was kein Archiv ist, wird als solches gemeldet', async () => {
  await assert.rejects(
    () => entpacke(new Blob(['das ist nur Text und kein Archiv'])),
    /kein ZIP-Archiv/,
  );
});

/* =======================================================================
 * 4 · DIE GRENZE, DIE ES ZU SPRENGEN GALT
 * ==================================================================== */

console.log('\n4 · Die Grenze');

await pruefe('viele Dateien bleiben beherrschbar', async () => {
  /*
   * Fünfhundert Bilder zu je 20 KB – zehn Megabyte. Kein grosser Stapel, aber
   * genug, um zu zeigen, dass nichts quadratisch wächst; die alte Sicherung
   * scheiterte an der Zeichenkettengrenze, nicht an der Zahl der Dateien.
   */
  const eintraege = [];
  for (let i = 0; i < 500; i++) {
    eintraege.push({ name: `bilder/img_${i}.png`, daten: zufaellig(20_000, i + 100) });
  }
  const begonnen = Date.now();
  const archiv = await packe(eintraege);
  const gedauert = Date.now() - begonnen;

  assert.ok(archiv.size > 10_000_000, `das Archiv ist nur ${archiv.size} Bytes gross`);
  const pfad = join(bau, 'viele.zip');
  await schreibe(pfad, archiv);
  assert.match(execFileSync('unzip', ['-t', pfad], { encoding: 'utf8' }), /No errors detected/);

  const gelesen = await entpacke(archiv);
  assert.equal(gelesen.size, 500);
  assert.ok(gedauert < 15_000, `das Packen dauerte ${gedauert} ms`);
});

await pruefe('Base64 in einer Zeichenkette wäre hier längst gescheitert', () => {
  /*
   * Die Rechnung, die den ganzen Umbau begründet – festgehalten, damit sie
   * nicht in einer Commit-Nachricht verschwindet.
   */
  const grenze = 512 * 1024 * 1024; // die Zeichenkettengrenze der Laufzeit
  const nutzbar = (grenze * 3) / 4; // Base64 bläht um ein Drittel auf
  const beiSiebenhundertKb = Math.floor(nutzbar / (700 * 1024));
  assert.ok(
    beiSiebenhundertKb < 1000,
    'die alte Sicherung hätte tausend Bilder getragen – dann wäre der Umbau unnötig',
  );
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
