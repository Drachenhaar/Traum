/**
 * Warum „Weiter" gerade nicht geht.
 *
 * Gemessen, auf dem Telefon, vor dieser Runde: Zwei der Schritte in der
 * Erschaffung sperren den Knopf, beide bei Deckkraft 0,3, beide ohne ein
 * Wort dazu. Wer ihn drückt, bekommt nichts – keine Bewegung, keine Meldung,
 * kein Grund. Der Knopf selbst mass **2,06:1** gegen den dunklen Grund; man
 * konnte nicht einmal lesen, was einem da verwehrt wird.
 *
 * Das Bittere: Die Begründungen gab es längst, ausführlich und gut, im
 * Quelltext, für Programmierer. `Artwahl.tsx` erklärt, dass ein Buch ohne Art
 * vor einer Tür ohne Zimmer stünde; `bookIdentity.ts` sagt über den Namen
 * „Daran – und nur daran – hängt alles". Der Leser bekam Deckkraft 0,3.
 *
 * ---
 *
 * **Die Prüfung mit den Zähnen steht in Abschnitt 1.**
 *
 * Nicht „gibt es die zwei Sätze?" – die stehen jetzt da und werden nicht von
 * selbst verschwinden. Sondern: **Kommt je ein gesperrter Schritt ohne Grund
 * dazu?** Genau so sind diese beiden entstanden: Jemand schrieb
 * `weiterAus={!fertig}`, und niemandem fiel auf, dass damit eine Sackgasse
 * ohne Schild entstand.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut,
 * bis die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const wurzel = join(import.meta.dirname, '..');
const bau = join(ARBEIT, 'warten');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  ['esbuild', 'src/lib/bookTexts.ts', '--bundle', '--format=esm',
   `--outfile=${join(bau, 'texte.mjs')}`, '--log-level=error'],
  { cwd: wurzel, stdio: 'inherit' },
);
const { BUCH_TEXTE } = await import(join(bau, 'texte.mjs'));
const WARTEN = BUCH_TEXTE.geburt.warten;

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const lies = (p) => readFileSync(join(wurzel, p), 'utf8');
/** Ohne Prosa gelesen: Ein Aufruf in einem Kommentar ist keiner. */
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* =======================================================================
 * 1 · KEIN GESPERRTER SCHRITT OHNE GRUND
 * ==================================================================== */

console.log('\n1 · Kein gesperrter Schritt ohne Grund');

const geburtsseiten = readdirSync(join(wurzel, 'src/pages/geburt'))
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => ['src/pages/geburt/' + f, ohneProsa(lies('src/pages/geburt/' + f))]);

pruefe('jeder Schritt, der sperren kann, nennt auch einen Grund', () => {
  /*
   * **Die Prüfung, um die es hier geht.**
   *
   * Sie schaut nicht nach den zwei heutigen Sätzen, sondern nach der Form:
   * Wo immer ein Schritt `weiterAus` setzt, muss im selben Aufruf ein
   * `weiterWarum` stehen. Ein neuer Schritt, der das vergisst, baut die
   * Sackgasse ohne Schild nach – und zwar genau so, wie diese beiden
   * entstanden sind.
   *
   * `Geburt.tsx` ist ausgenommen: Dort steht die Bauform selbst, nicht ihre
   * Verwendung.
   */
  for (const [pfad, q] of geburtsseiten) {
    if (pfad.endsWith('Geburt.tsx')) continue;
    for (const aufruf of q.match(/<SzenenWeg[\s\S]*?\/>/g) ?? []) {
      if (!/weiterAus=/.test(aufruf)) continue;
      assert.match(
        aufruf,
        /weiterWarum=/,
        `${pfad}: ein Schritt sperrt, ohne zu sagen warum:\n${aufruf}`,
      );
    }
  }
});

pruefe('die beiden bekannten Schritte sind angeschlossen', () => {
  const art = ohneProsa(lies('src/pages/geburt/Artwahl.tsx'));
  assert.match(art, /weiterWarum=\{BUCH_TEXTE\.geburt\.warten\.art\}/);
  const titel = ohneProsa(lies('src/pages/geburt/Titelwahl.tsx'));
  assert.match(titel, /weiterWarum=\{BUCH_TEXTE\.geburt\.warten\.titel\}/);
});

/* =======================================================================
 * 2 · WANN DER GRUND DASTEHT
 * ==================================================================== */

console.log('\n2 · Wann der Grund dasteht');

const geburt = ohneProsa(lies('src/pages/geburt/Geburt.tsx'));

pruefe('er steht nur da, solange er stimmt', () => {
  /*
   * Ein Satz, der nach der Eingabe stehen bliebe, wäre eine Behauptung über
   * einen Zustand, den es nicht mehr gibt – und aus einer Auskunft würde ein
   * Vorwurf. Im Browser nachgestellt: nach dem Tippen ist der Satz weg und
   * der Verweis darauf ebenfalls.
   */
  assert.match(geburt, /const grund = weiterAus \? weiterWarum : undefined;/);
  assert.match(geburt, /\{grund && \(/, 'der Satz steht unabhängig von der Sperre da');
});

pruefe('auch Vorleseprogramme erfahren ihn', () => {
  /*
   * `disabled` allein sagt „nicht verfügbar" und verschweigt das Warum
   * genauso, wie die Deckkraft es dem Auge verschweigt.
   */
  assert.match(geburt, /aria-describedby=\{grund \? grundId : undefined\}/);
  assert.match(geburt, /id=\{grundId\}/, 'der Verweis zeigt auf nichts');
});

pruefe('der Grund ist hell genug, um gelesen zu werden', () => {
  /*
   * Am Bildschirm gemessen: 5,04:1. Eine frühere Zeile dieser Art stand bei
   * `/45` auf 2,65:1 – ein Satz, der eine Sackgasse erklärt und dabei selbst
   * kaum zu lesen ist, erklärt nichts.
   */
  const treffer = geburt.match(/id=\{grundId\}[\s\S]{0,300}?text-paper-400\/(\d+)/);
  assert.ok(treffer, 'die Grundzeile hat keine gemessene Schriftfarbe mehr');
  assert.ok(Number(treffer[1]) >= 70, `zu blass: /${treffer[1]}`);
});

pruefe('der gesperrte Knopf bleibt lesbar', () => {
  /*
   * Bei `opacity-30` mass das Wort „Weiter" 2,06:1 – man sah einen Ring mit
   * etwas darin. Bei `opacity-50` sind es 3,74:1: deutlich stiller als ein
   * offener Knopf, aber als Wort erkennbar. Eine Hausregel gab es nicht;
   * dieselbe Zahl steht schon in Bibliothek und Baukasten.
   */
  const treffer = geburt.match(/disabled:opacity-(\d+)/);
  assert.ok(treffer, 'der Knopf wird nicht mehr gedämpft');
  assert.ok(Number(treffer[1]) >= 50, `zu blass: opacity-${treffer[1]} (30 ≙ 2,06:1)`);
});

/* =======================================================================
 * 3 · DER TON
 * ==================================================================== */

console.log('\n3 · Der Ton');

const ALLE = Object.entries(WARTEN);

pruefe('kein Satz mahnt', () => {
  /*
   * Gesetz 3: Unvollständigkeit ist kein Fehler. Ein „bitte", ein
   * „erforderlich", ein Ausrufezeichen macht aus einer Auskunft eine
   * Aufforderung – und aus einem Buch ein Formular.
   */
  const mahnend =
    /\b(bitte|erforderlich|pflicht|musst|solltest|ungültig|fehler|eingabe|ausfüllen|vergiss)\b|!/i;
  for (const [wo, satz] of ALLE) {
    assert.ok(!mahnend.test(satz), `${wo} mahnt: „${satz}"`);
  }
});

pruefe('kein Satz redet vom Formular', () => {
  const verraeter = /\b(feld|felder|eingabe|formular|knopf|schaltfl|button|klick)\w*/i;
  for (const [wo, satz] of ALLE) {
    assert.ok(!verraeter.test(satz), `${wo} redet vom Formular: „${satz}"`);
  }
});

pruefe('jeder Satz sagt „noch"', () => {
  /*
   * Dasselbe kleine Wort wie im leeren Raum einer Figur: „Ohne Namen" ist
   * ein Urteil, „**Noch** ohne Namen" ein Zeitpunkt.
   */
  for (const [wo, satz] of ALLE) {
    assert.match(satz, /\bNoch\b/, `${wo} sagt ohne „noch": „${satz}"`);
  }
});

pruefe('jeder Satz nennt auch die Folge', () => {
  /*
   * Zu sagen, was fehlt, ist die halbe Auskunft; die andere Hälfte ist,
   * warum es fehlen darf oder eben nicht. „Noch ohne Namen." allein wäre
   * wieder nur eine Feststellung über ein leeres Feld.
   */
  for (const [wo, satz] of ALLE) {
    const saetze = satz.split(/(?<=\.)\s+/).filter(Boolean);
    assert.ok(saetze.length >= 2, `${wo} nennt keine Folge: „${satz}"`);
    assert.match(saetze[1], /Buch/, `${wo} redet in der Folge nicht vom Buch: „${saetze[1]}"`);
  }
});

pruefe('jeder Satz ist ein anderer', () => {
  const saetze = ALLE.map(([, s]) => s);
  assert.equal(new Set(saetze).size, saetze.length, `doppelt: ${saetze}`);
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
