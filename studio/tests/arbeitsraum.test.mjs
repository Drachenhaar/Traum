/**
 * Die Arbeitsräume.
 *
 * Eine Tabelle mit Adressen prüft sich selbst zu leicht: Man vergleicht die
 * Zeichenkette mit der Zeichenkette, die danebensteht, und alles ist grün –
 * auch wenn die Adresse in der App zu einer leeren Seite führt.
 *
 * Deshalb liest diese Prüfung **die App selbst**: die Kapitelkennungen aus
 * `lib/book.ts` und die Routen aus `App.tsx`. Ein Eingang, den der Router
 * nicht kennt, oder ein Kapitel, das es nicht gibt, fällt hier auf und nicht
 * erst bei dem, der darauf tippt.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const wurzel = join(import.meta.dirname, '..');
const bau = join(ARBEIT, 'arbeitsraum');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
for (const [quelle, ziel] of [
  ['src/lib/arbeitsraum.ts', 'arbeitsraum.mjs'],
  ['src/lib/book.ts', 'book.mjs'],
]) {
  execFileSync(
    'npx',
    ['esbuild', quelle, '--bundle', '--format=esm', `--outfile=${join(bau, ziel)}`, '--log-level=error'],
    { cwd: wurzel, stdio: 'inherit' },
  );
}

const { ARBEITSRAEUME, raumFuer, eingangFuer } = await import(join(bau, 'arbeitsraum.mjs'));
const { CHAPTERS } = await import(join(bau, 'book.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/** Alle Adressen, die in den Räumen vorkommen. */
const alleZiele = () => {
  const ziele = [];
  for (const raum of Object.values(ARBEITSRAEUME)) {
    ziele.push(raum.eingang);
    for (const a of raum.anfaenge) ziele.push(a.ziel);
  }
  return ziele;
};

/* =======================================================================
 * 1 · DREI RÄUME, DREI TÜREN
 * ==================================================================== */

console.log('\n1 · Drei Räume, drei Türen');

pruefe('jede Art hat einen Raum', () => {
  assert.deepEqual(Object.keys(ARBEITSRAEUME).sort(), ['artbook', 'novel', 'rpg']);
});

pruefe('kein Raum teilt seinen Eingang mit einem anderen', () => {
  /*
   * Die Prüfung, an der die ganze Trennung hängt. Zwei Arten, die an
   * derselben Adresse landen, sind eine Oberfläche mit zwei Namen – genau
   * das, was der Auftrag ausschliesst.
   */
  const eingaenge = Object.values(ARBEITSRAEUME).map((r) => r.eingang);
  assert.equal(
    new Set(eingaenge).size,
    eingaenge.length,
    `zwei Räume teilen einen Eingang: ${eingaenge.join(', ')}`,
  );
});

pruefe('jeder Raum trägt einen eigenen Namen und eine eigene Kennung', () => {
  const ids = Object.values(ARBEITSRAEUME).map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of Object.values(ARBEITSRAEUME)) {
    assert.ok(r.name?.trim(), `${r.id} hat keinen Namen`);
    assert.ok(r.leer?.trim(), `${r.id} sagt nichts über den leeren Zustand`);
  }
});

/* =======================================================================
 * 2 · DIE ADRESSEN GIBT ES WIRKLICH
 * ==================================================================== */

console.log('\n2 · Die Adressen gibt es wirklich');

pruefe('jede Kapiteladresse zeigt auf ein Kapitel, das es gibt', () => {
  /*
   * `/kapitel/orte` sah lange richtig aus. Es gibt kein Kapitel „orte" –
   * das Kapitel heisst `architektur`. Ohne diese Prüfung wäre der erste
   * Anfang eines Rollenspielbuchs ins Leere gelaufen.
   */
  const bekannt = new Set(CHAPTERS.map((c) => c.id));
  for (const ziel of alleZiele()) {
    const treffer = /^\/kapitel\/(.+)$/.exec(ziel);
    if (!treffer) continue;
    assert.ok(bekannt.has(treffer[1]), `Kapitel „${treffer[1]}" gibt es nicht (aus ${ziel})`);
  }
});

pruefe('jede Adresse ist im Router eingetragen', () => {
  /*
   * Gelesen aus `App.tsx`, nicht abgeschrieben. Wer dort eine Route
   * umbenennt, bekommt hier den Hinweis – und nicht der Verfasser, der auf
   * einen toten Anfang tippt.
   */
  const app = readFileSync(join(wurzel, 'src/App.tsx'), 'utf8');
  const routen = new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]));
  assert.ok(routen.size > 20, `nur ${routen.size} Routen gefunden – wird App.tsx noch gelesen?`);

  for (const ziel of alleZiele()) {
    /* `/kapitel/architektur` deckt die Route `/kapitel/:id` ab. */
    const passt =
      routen.has(ziel) ||
      [...routen].some((r) => {
        if (!r.includes(':')) return false;
        const muster = new RegExp(`^${r.replace(/:[^/]+/g, '[^/]+')}$`);
        return muster.test(ziel);
      });
    assert.ok(passt, `„${ziel}" ist keine Route in App.tsx`);
  }
});

pruefe('kein Raum verspricht mehr als vier Anfänge', () => {
  for (const r of Object.values(ARBEITSRAEUME)) {
    assert.ok(r.anfaenge.length >= 1, `${r.id} bietet keinen Anfang`);
    assert.ok(r.anfaenge.length <= 4, `${r.id} bietet ${r.anfaenge.length} Anfänge`);
  }
});

pruefe('der Schreibraum bietet genau einen Anfang', () => {
  /*
   * Ausdrücklich und einzeln geprüft, weil es die eine Stelle ist, an der
   * Vollständigkeit die falsche Tugend wäre: „Der Roman soll radikal einfach
   * sein." Vier Kacheln vor der ersten Seite wären das Gegenteil.
   */
  assert.equal(ARBEITSRAEUME.novel.anfaenge.length, 1);
});

/* =======================================================================
 * 3 · DAS BUCH VON GESTERN
 * ==================================================================== */

console.log('\n3 · Das Buch von gestern');

pruefe('ohne Art gibt es keinen Raum', () => {
  assert.equal(raumFuer(undefined), undefined);
  assert.equal(raumFuer(''), undefined);
});

pruefe('ohne Art und ohne Lesebändchen bleibt es beim alten Weg', () => {
  /*
   * Die Zusage an alle, auf deren Geräten Arbeit liegt: Ein Band ohne Art
   * schlägt auf wie immer. Fiele er in einen Arbeitsraum, hätte eine
   * Programmänderung sein Buch umgebaut.
   */
  assert.equal(eingangFuer(undefined, undefined), '/besitz');
});

pruefe('mit Art führt der erste Weg in den Raum', () => {
  assert.equal(eingangFuer('novel', undefined), '/roman');
  assert.equal(eingangFuer('artbook', undefined), '/inhalt');
  assert.equal(eingangFuer('rpg', undefined), '/anhang');
});

pruefe('das Lesebändchen schlägt den Eingang', () => {
  /*
   * Wer zuletzt in Kapitel sieben war, will dorthin – nicht jedes Mal in die
   * Eingangshalle. Der Raum ist die Antwort auf „wo fange ich an", nicht auf
   * „wo war ich".
   */
  assert.equal(eingangFuer('novel', '/kapitel/bewohner'), '/kapitel/bewohner');
  assert.equal(eingangFuer('rpg', '/eintrag/abc'), '/eintrag/abc');
  assert.equal(eingangFuer(undefined, '/vorwort'), '/vorwort');
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
