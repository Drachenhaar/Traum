/**
 * Der Charakterbaukasten.
 *
 * Drei Zusagen tragen das Ganze, und alle drei sind messbar:
 *
 *   1. Die Reihenfolge gehört der Schicht, nicht dem Teil.
 *   2. Ein fehlendes Teil nimmt eine Schicht weg und zerstört nichts.
 *   3. Neue Teile ändern kein bestehendes Bildnis.
 *
 * Jede Zusicherung wurde gegengeprüft: der Fehler, den sie fangen soll,
 * absichtlich wieder eingebaut, bis sie ausschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'baukasten');
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/baukasten.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'baukasten.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const {
  SCHICHTEN,
  zeichenfolge,
  anweisung,
  wuerfle,
  istLeer,
  bedeutungen,
  nachSchichten,
  moeglichkeiten,
  bauUmschreiben,
  WURF,
} = await import(join(bau, 'baukasten.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const teil = (id, schicht, zusatz = {}) => ({
  id,
  schicht,
  name: id,
  quelle: { art: 'bild', bildId: `b_${id}` },
  ...zusatz,
});

/** Ein Vorrat mit mindestens einem Teil je Schicht. */
const VOLLER_VORRAT = SCHICHTEN.flatMap((s) => [
  teil(`${s.name}-a`, s.name, { toenbar: true }),
  teil(`${s.name}-b`, s.name),
]);

/* =======================================================================
 * 1 · Die Reihenfolge
 * ==================================================================== */

console.log('\n1 · Die Reihenfolge gehört der Schicht');

pruefe('gezeichnet wird in der Reihenfolge der Schichten', () => {
  const bauwerk = { lagen: {} };
  /* Absichtlich verkehrt herum eingetragen. */
  for (const s of [...SCHICHTEN].reverse()) bauwerk.lagen[s.name] = { teilId: `${s.name}-a` };
  const folge = zeichenfolge(bauwerk, VOLLER_VORRAT);
  assert.deepEqual(
    folge.map((g) => g.schicht.name),
    SCHICHTEN.map((s) => s.name),
    'der Stapel folgt der Eintragsreihenfolge statt den Schichten',
  );
});

pruefe('das Haar liegt vor dem Kopf, der Grund hinter allem', () => {
  const namen = SCHICHTEN.map((s) => s.name);
  assert.ok(namen.indexOf('grund') === 0, 'der Grund liegt nicht ganz hinten');
  assert.ok(namen.indexOf('haar') > namen.indexOf('kopf'), 'das Haar liegt hinter dem Kopf');
  assert.ok(namen.indexOf('hinterhaar') < namen.indexOf('koerper'), 'hinteres Haar liegt vor dem Körper');
  assert.ok(namen.indexOf('augen') > namen.indexOf('kopf'), 'die Augen liegen hinter dem Kopf');
  assert.ok(namen.indexOf('beiwerk') === namen.length - 1, 'das Beiwerk liegt nicht ganz vorn');
});

pruefe('ein Teil in der falschen Schicht wird nicht gezeichnet', () => {
  /*
   * Sonst hinge die Reihenfolge doch wieder am Bildbau: Wer ein Haar in die
   * Augenschicht einträgt, bekäme es zwischen Kopf und Mund gezeichnet.
   */
  const bauwerk = { lagen: { augen: { teilId: 'haar-a' } } };
  assert.equal(zeichenfolge(bauwerk, VOLLER_VORRAT).length, 0);
});

/* =======================================================================
 * 2 · Was fehlt, nimmt nur eine Schicht weg
 * ==================================================================== */

console.log('\n2 · Was fehlt, nimmt nur eine Schicht weg');

pruefe('eine Schicht ohne Teil zeichnet nichts und stört nichts', () => {
  const bauwerk = { lagen: { kopf: { teilId: 'kopf-a' }, augen: {}, haar: { teilId: 'haar-a' } } };
  const folge = zeichenfolge(bauwerk, VOLLER_VORRAT);
  assert.deepEqual(folge.map((g) => g.schicht.name), ['kopf', 'haar']);
});

pruefe('ein gelöschtes Bild zerstört kein Bildnis', () => {
  const bauwerk = {
    lagen: { koerper: { teilId: 'koerper-a' }, kopf: { teilId: 'kopf-a' }, haar: { teilId: 'haar-a' } },
  };
  const vorher = zeichenfolge(bauwerk, VOLLER_VORRAT);
  assert.equal(vorher.length, 3);
  /* Der Kopf wird gelöscht – der Rest muss stehen bleiben. */
  const ohneKopf = VOLLER_VORRAT.filter((t) => t.id !== 'kopf-a');
  const nachher = zeichenfolge(bauwerk, ohneKopf);
  assert.deepEqual(nachher.map((g) => g.schicht.name), ['koerper', 'haar']);
});

pruefe('ein leerer Vorrat wirft nichts um', () => {
  const bauwerk = { lagen: { kopf: { teilId: 'kopf-a' } } };
  assert.deepEqual(zeichenfolge(bauwerk, []), []);
  assert.equal(istLeer(bauwerk, []), true);
  assert.equal(istLeer({ lagen: {} }, VOLLER_VORRAT), true);
  assert.equal(istLeer(bauwerk, VOLLER_VORRAT), false);
});

/* =======================================================================
 * 3 · Neue Teile ändern nichts Bestehendes
 * ==================================================================== */

console.log('\n3 · Neue Teile ändern nichts Bestehendes');

pruefe('ein Bildnis bleibt gleich, wenn der Vorrat wächst', () => {
  const bauwerk = wuerfle(4711, VOLLER_VORRAT, ['#a00', '#0a0']);
  const vorher = zeichenfolge(bauwerk, VOLLER_VORRAT);

  /* Zwanzig neue Zeichnungen, quer über alle Schichten. */
  const gewachsen = [
    ...VOLLER_VORRAT,
    ...SCHICHTEN.flatMap((s) => [teil(`${s.name}-neu1`, s.name), teil(`${s.name}-neu2`, s.name)]),
  ];
  const nachher = zeichenfolge(bauwerk, gewachsen);

  assert.deepEqual(
    nachher.map((g) => `${g.schicht.name}:${g.teil.id}`),
    vorher.map((g) => `${g.schicht.name}:${g.teil.id}`),
    'das Bildnis hat sich durch neue Teile verändert',
  );
});

/* =======================================================================
 * 4 · Farbe nur, wo sie hingehört
 * ==================================================================== */

console.log('\n4 · Farbe nur, wo sie hingehört');

pruefe('ein nicht tönbares Teil bekommt keine Farbe', () => {
  const bunt = teil('bunt', 'haar');
  const grau = teil('grau', 'haar', { toenbar: true });
  assert.equal(anweisung(bunt, { farbe: '#c00' }).farbe, undefined);
  assert.equal(anweisung(grau, { farbe: '#c00' }).farbe, '#c00');
  /* Und ohne gewählte Farbe bleibt auch das tönbare Teil ungefärbt. */
  assert.equal(anweisung(grau, {}).farbe, undefined);
});

pruefe('die Vorgaben einer Lage stehen fest', () => {
  const a = anweisung(teil('x', 'haar'), {});
  assert.deepEqual(a, { spiegel: false, versatzX: 0, versatzY: 0, groesse: 1 });
  const b = anweisung(teil('y', 'haar'), { spiegel: true, versatzX: -3, groesse: 1.2 });
  assert.equal(b.spiegel, true);
  assert.equal(b.versatzX, -3);
  assert.equal(b.versatzY, 0);
  assert.equal(b.groesse, 1.2);
});

/* =======================================================================
 * 5 · Würfeln
 * ==================================================================== */

console.log('\n5 · Würfeln');

pruefe('dieselbe Saat ergibt dasselbe Bildnis', () => {
  const palette = ['#a00', '#0a0', '#00a'];
  assert.deepEqual(wuerfle(99, VOLLER_VORRAT, palette), wuerfle(99, VOLLER_VORRAT, palette));
});

pruefe('eine andere Saat ergibt ein anderes Bildnis', () => {
  const palette = ['#a00', '#0a0', '#00a'];
  const verschieden = [1, 2, 3, 4, 5].filter(
    (s) => JSON.stringify(wuerfle(s, VOLLER_VORRAT, palette)) !== JSON.stringify(wuerfle(0, VOLLER_VORRAT, palette)),
  );
  assert.equal(verschieden.length, 5, 'mehrere Saaten ergaben dasselbe Bildnis');
});

pruefe('gewürfelt wird nur, was es gibt', () => {
  /* Ein Vorrat mit nur zwei Schichten – die anderen dürfen nicht auftauchen. */
  const schmal = [teil('k1', 'kopf'), teil('k2', 'kopf'), teil('h1', 'haar')];
  for (const saat of [1, 7, 4711, -3]) {
    const bauwerk = wuerfle(saat, schmal);
    for (const [schicht, lage] of Object.entries(bauwerk.lagen)) {
      assert.ok(['kopf', 'haar'].includes(schicht), `${schicht} wurde besetzt, obwohl es dafür nichts gibt`);
      assert.ok(schmal.some((t) => t.id === lage.teilId), `${lage.teilId} steht nicht im Vorrat`);
    }
    assert.equal(zeichenfolge(bauwerk, schmal).length, 2, 'nicht beide vorhandenen Schichten besetzt');
  }
});

pruefe('die Pflichtschichten werden immer besetzt, wenn es sie gibt', () => {
  for (const saat of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const bauwerk = wuerfle(saat, VOLLER_VORRAT);
    for (const schicht of WURF.immer) {
      assert.ok(bauwerk.lagen[schicht]?.teilId, `Saat ${saat}: ${schicht} blieb leer`);
    }
  }
});

pruefe('die übrigen Schichten kommen manchmal und nicht immer', () => {
  /*
   * Ein Bildnis, bei dem *alles* besetzt ist, ist so unbrauchbar wie eines,
   * bei dem nichts besetzt ist: Es sähe jedes Mal überladen aus.
   */
  const zaehler = new Map(WURF.manchmal.map((s) => [s, 0]));
  const runden = 200;
  for (let saat = 0; saat < runden; saat++) {
    const bauwerk = wuerfle(saat, VOLLER_VORRAT);
    for (const s of WURF.manchmal) if (bauwerk.lagen[s]?.teilId) zaehler.set(s, zaehler.get(s) + 1);
  }
  for (const [schicht, treffer] of zaehler) {
    const anteil = treffer / runden;
    assert.ok(anteil > 0.1, `${schicht} kam nur in ${(anteil * 100) | 0} % der Würfe`);
    assert.ok(anteil < 0.9, `${schicht} kam in ${(anteil * 100) | 0} % der Würfe – das ist immer`);
  }
});

pruefe('gewürfelte Farben kommen nur an tönbare Teile', () => {
  const palette = ['#a00', '#0a0'];
  for (let saat = 0; saat < 40; saat++) {
    const bauwerk = wuerfle(saat, VOLLER_VORRAT, palette);
    for (const g of zeichenfolge(bauwerk, VOLLER_VORRAT)) {
      if (!g.teil.toenbar) {
        assert.equal(g.lage.farbe, undefined, `${g.teil.id} ist nicht tönbar und trägt trotzdem eine Farbe`);
      }
    }
  }
});

pruefe('ohne Palette wird nichts eingefärbt', () => {
  const bauwerk = wuerfle(5, VOLLER_VORRAT, []);
  for (const g of zeichenfolge(bauwerk, VOLLER_VORRAT)) {
    assert.equal(g.lage.farbe, undefined);
  }
});

pruefe('ein leerer Vorrat ergibt ein leeres Bildnis', () => {
  assert.deepEqual(wuerfle(1, []), { lagen: {} });
});

/* =======================================================================
 * 6 · Ordnen und Zählen
 * ==================================================================== */

console.log('\n6 · Ordnen und Zählen');

pruefe('der Vorrat wird nach Schichten und Namen geordnet', () => {
  const gefaecher = nachSchichten([
    teil('Zwirn', 'haar'),
    teil('Ast', 'haar'),
    teil('Mitte', 'kopf'),
  ]);
  assert.deepEqual(gefaecher.get('haar').map((t) => t.name), ['Ast', 'Zwirn']);
  assert.deepEqual(gefaecher.get('kopf').map((t) => t.name), ['Mitte']);
  assert.deepEqual(gefaecher.get('gewand'), []);
});

pruefe('ein Teil in einer unbekannten Schicht verschwindet lautlos, statt zu stören', () => {
  const gefaecher = nachSchichten([teil('x', 'gibtesnicht'), teil('k', 'kopf')]);
  assert.equal([...gefaecher.values()].flat().length, 1);
});

pruefe('gezählt wird, wie viele Bildnisse ein Vorrat hergibt', () => {
  /* Zwei Köpfe und ein Haar: (2+1)·(1+1) − 1 = 5. */
  assert.equal(moeglichkeiten([teil('k1', 'kopf'), teil('k2', 'kopf'), teil('h', 'haar')]), 5);
  assert.equal(moeglichkeiten([]), 0);
  assert.equal(moeglichkeiten([teil('k', 'kopf')]), 1);
  /*
   * Die Zahl, die den Baukasten rechtfertigt: Zwei Zeichnungen je Schicht
   * ergeben schon mehr als hunderttausend Gesichter – ohne Farbe, ohne
   * Spiegelung, ohne Versatz.
   */
  assert.ok(moeglichkeiten(VOLLER_VORRAT) > 100000, moeglichkeiten(VOLLER_VORRAT));
});

/* =======================================================================
 * 7 · Bedeutung
 * ==================================================================== */

console.log('\n7 · Bedeutung');

pruefe('was eine Bedeutung trägt, lässt sich auslesen', () => {
  const vorrat = [
    teil('narbe', 'male', { bedeutung: 'Von der Seilerbahn, im dritten Winter.' }),
    teil('haar', 'haar'),
    teil('band', 'kopfschmuck', { bedeutung: '  ' }),
  ];
  const bauwerk = {
    lagen: { male: { teilId: 'narbe' }, haar: { teilId: 'haar' }, kopfschmuck: { teilId: 'band' } },
  };
  assert.deepEqual(bedeutungen(bauwerk, vorrat), ['Von der Seilerbahn, im dritten Winter.']);
});

pruefe('die Bedeutungen stehen in der Reihenfolge der Schichten', () => {
  const vorrat = [
    teil('a', 'beiwerk', { bedeutung: 'zuletzt' }),
    teil('b', 'grund', { bedeutung: 'zuerst' }),
  ];
  const bauwerk = { lagen: { beiwerk: { teilId: 'a' }, grund: { teilId: 'b' } } };
  assert.deepEqual(bedeutungen(bauwerk, vorrat), ['zuerst', 'zuletzt']);
});

/* =======================================================================
 * 8 · UMSCHREIBEN
 *
 * Gebraucht beim Abschreiben eines Buches und beim Einlesen einer Sicherung.
 * `tests/kopie.test.mjs` prüft die ganze Kette am vollen Bestand; hier stehen
 * die Randfälle, die dort nicht vorkommen.
 * ==================================================================== */

console.log('\n8 · Umschreiben');

pruefe('umgeschrieben wird die Kennung, sonst nichts', () => {
  const karte = new Map([['alt', 'neu']]);
  const ergebnis = bauUmschreiben(
    { lagen: { haar: { teilId: 'alt', farbe: '#fff', spiegel: true, versatzX: 3, groesse: 1.2 } } },
    karte,
  );
  assert.deepEqual(ergebnis.lagen.haar, {
    teilId: 'neu',
    farbe: '#fff',
    spiegel: true,
    versatzX: 3,
    groesse: 1.2,
  });
});

pruefe('eine Lage ohne Teil zeigt nirgendwohin und bleibt', () => {
  /*
   * Farbe und Versatz ohne Teil sind eine gültige Lage – sie zeichnet nur
   * nichts. Sie beim Umschreiben wegzuwerfen wäre stiller Verlust.
   */
  const ergebnis = bauUmschreiben({ lagen: { grund: { farbe: '#000' } } }, new Map());
  assert.deepEqual(ergebnis.lagen.grund, { farbe: '#000' });
});

pruefe('eine Lage auf ein unbekanntes Teil fällt weg', () => {
  const ergebnis = bauUmschreiben(
    { lagen: { haar: { teilId: 'fremd' }, kopf: { teilId: 'alt' } } },
    new Map([['alt', 'neu']]),
  );
  assert.equal(ergebnis.lagen.haar, undefined);
  assert.equal(ergebnis.lagen.kopf.teilId, 'neu');
});

pruefe('kein Bildnis bleibt kein Bildnis', () => {
  assert.equal(bauUmschreiben(undefined, new Map([['alt', 'neu']])), undefined);
});

pruefe('das ursprüngliche Bildnis wird nicht angetastet', () => {
  /*
   * Beim Abschreiben liegen Original und Kopie gleichzeitig im Speicher. Ein
   * Umschreiben an Ort und Stelle änderte das Original mit – und der Schaden
   * fiele erst auf, wenn jemand das Originalbuch neu aufschlägt.
   */
  const vorher = { lagen: { kopf: { teilId: 'alt', farbe: '#fff' } } };
  bauUmschreiben(vorher, new Map([['alt', 'neu']]));
  assert.deepEqual(vorher, { lagen: { kopf: { teilId: 'alt', farbe: '#fff' } } });
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
