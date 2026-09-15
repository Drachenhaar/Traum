/**
 * Was dasteht, wenn nichts dasteht.
 *
 * Die Prüfung, um die es hier geht, ist **nicht** „gibt es einen Satz?".
 * Sie lautet:
 *
 *   **Klingt der Satz nach der Welt oder nach der Datenbank?**
 *
 * Gesetz 3 dieses Projekts lautet: *Unvollständigkeit ist kein Fehler. Nichts
 * mahnt, nichts zählt fehlende Felder.* Ein leerer Raum, der „Noch keine
 * Beziehungen angelegt" sagt, bricht es – er redet über eine fehlende Zeile
 * in einer Tabelle. „Sie kennt noch niemanden" redet über eine Figur.
 *
 * Der Unterschied lässt sich prüfen, und darum geht es unten.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut, bis
 * die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const wurzel = join(import.meta.dirname, '..');
const bau = join(ARBEIT, 'ersatz');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  ['esbuild', 'src/lib/raum/ersatz.ts', '--bundle', '--format=esm',
   `--outfile=${join(bau, 'ersatz.mjs')}`, '--log-level=error'],
  { cwd: wurzel, stdio: 'inherit' },
);
const { ERSATZ, ersatzFuer, mitNamen } = await import(join(bau, 'ersatz.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const ALLE = Object.entries(ERSATZ);

/* =======================================================================
 * 1 · DIE VIER RICHTUNGEN DER FIGUR
 * ==================================================================== */

console.log('\n1 · Die vier Richtungen der Figur');

pruefe('jede Richtung der Charakterseite hat einen Satz', () => {
  /*
   * Das sind genau die vier Räume, die `figurkarte` anbietet. Fehlt einer,
   * öffnet sich dort ein Raum ohne Auskunft – und das ist der Zustand, gegen
   * den diese ganze Runde antritt.
   */
  for (const raum of ['wissen', 'herkunft', 'beziehungen', 'notizen']) {
    assert.ok(ersatzFuer(raum), `„${raum}" hat keinen Ersatz`);
  }
});

pruefe('jeder Satz ist ein anderer', () => {
  /*
   * Ein gemeinsames „Hier ist noch nichts." für alle vier wäre billiger und
   * würde die Tiefe zu einer Fläche mit vier Türen zu demselben Zimmer machen.
   */
  const saetze = ALLE.map(([, e]) => e.sagt);
  assert.equal(new Set(saetze).size, saetze.length, `doppelt: ${saetze}`);
  const waeren = ALLE.map(([, e]) => e.waere);
  assert.equal(new Set(waeren).size, waeren.length, `doppelt: ${waeren}`);
});

/* =======================================================================
 * 2 · DER TON
 * ==================================================================== */

console.log('\n2 · Der Ton');

pruefe('kein Satz redet über die Datenbank', () => {
  /*
   * Die Wörter, an denen man ein Formular erkennt. „Angelegt", „Eintrag",
   * „Feld", „Daten" – jedes davon verschiebt den Satz von der Welt auf die
   * Verwaltung.
   */
  const verraeter = /\b(angelegt|eintrag|einträge|feld|felder|daten|datensatz|liste|tabelle)\b/i;
  for (const [raum, e] of ALLE) {
    assert.ok(!verraeter.test(e.sagt), `${raum} sagt: „${e.sagt}"`);
    assert.ok(!verraeter.test(e.waere), `${raum} erklärt: „${e.waere}"`);
  }
});

pruefe('kein Satz mahnt', () => {
  /*
   * Gesetz 3 wörtlich genommen. Ein Ausrufezeichen, ein „solltest", ein
   * „fehlt" – alles drei macht aus einer Auskunft einen Vorwurf.
   */
  const mahnend = /\b(fehlt|fehlen|fehlend|solltest|musst|unvollständig|ergänze|vergiss)\b|!/i;
  for (const [raum, e] of ALLE) {
    assert.ok(!mahnend.test(e.sagt), `${raum} mahnt: „${e.sagt}"`);
    assert.ok(!mahnend.test(e.waere), `${raum} mahnt: „${e.waere}"`);
  }
});

pruefe('jeder Satz sagt „noch"', () => {
  /*
   * Das kleine Wort, das den ganzen Unterschied trägt: „Sie kennt niemanden"
   * ist ein Urteil über die Figur, „Sie kennt **noch** niemanden" eine
   * Feststellung über einen Stand. Unvollständigkeit ist kein Fehler,
   * sondern ein Zeitpunkt.
   */
  for (const [raum, e] of ALLE) {
    assert.ok(/\bnoch\b/.test(e.sagt), `${raum} sagt ohne „noch": „${e.sagt}"`);
  }
});

/* =======================================================================
 * 3 · HÖCHSTENS EINE TÜR
 * ==================================================================== */

console.log('\n3 · Höchstens eine Tür');

pruefe('keine Richtung bietet zwei Handlungen an', () => {
  /*
   * Zwei Knöpfe in einem leeren Raum sind ein Bedienfeld, und die Mitte
   * gehört dem Werk (Gesetz 1).
   */
  for (const [raum, e] of ALLE) {
    assert.ok(e.tuer === undefined || typeof e.tuer.text === 'string', `${raum}: Tür unklar`);
  }
});

pruefe('die Räume der Beziehungskette haben keine Tür', () => {
  /*
   * Man kommt dorthin nur über eine getroffene Wahl; ein „lege etwas an"
   * hinge dort in der Luft, weil das Anzulegende erst entsteht, wenn zwei
   * Figuren schon verbunden sind.
   */
  for (const raum of ['beziehung', 'gemeinsameGeschichte']) {
    assert.equal(ersatzFuer(raum).tuer, undefined, `${raum} bietet eine Tür an`);
  }
});

pruefe('jede Tür führt an einen Ort, den es gibt', () => {
  for (const [raum, e] of ALLE) {
    if (!e.tuer) continue;
    assert.ok(['eintrag', 'setzerei'].includes(e.tuer.ziel), `${raum}: Ziel „${e.tuer.ziel}"`);
  }
});

/* =======================================================================
 * 4 · DER NAME
 * ==================================================================== */

console.log('\n4 · Der Name');

pruefe('der Name wird eingesetzt', () => {
  assert.equal(mitNamen('%s kennt noch niemanden.', 'Elara'), 'Elara kennt noch niemanden.');
});

pruefe('eine namenlose Figur hinterlässt keine Lücke', () => {
  /*
   * Es gibt sie: gerade angelegt, noch nicht benannt. „Über  ist noch nichts
   * aufgeschrieben." mit einem Loch in der Mitte wäre ein sichtbarer Fehler
   * an einer Stelle, die Ruhe ausstrahlen soll.
   */
  for (const name of [undefined, '', '   ']) {
    const raus = mitNamen('%s kennt noch niemanden.', name);
    assert.ok(!/\s\s/.test(raus), `Lücke in „${raus}"`);
    assert.ok(raus.startsWith('Diese Figur'), raus);
  }
});

pruefe('der Satz beginnt gross', () => {
  /*
   * „diese Figur kennt noch niemanden." mit kleinem d wäre der Beweis, dass
   * hier ein Baustein eingesetzt wurde statt eines Satzes.
   */
  for (const [, e] of ALLE) {
    const raus = mitNamen(e.sagt, undefined);
    assert.ok(/^[A-ZÄÖÜ]/.test(raus), raus);
  }
});

pruefe('ein Name mit Umlaut übersteht das Einsetzen', () => {
  assert.equal(mitNamen('%s steht noch nirgendwo.', 'Ödling'), 'Ödling steht noch nirgendwo.');
});

/* =======================================================================
 * 5 · OB ES ANGESCHLOSSEN IST
 * ==================================================================== */

console.log('\n5 · Ob es angeschlossen ist');

const lies = (p) => readFileSync(join(wurzel, p), 'utf8');

pruefe('die Karte bietet die leeren Richtungen still an', () => {
  const q = lies('src/lib/raum/figurkarte.ts');
  assert.ok(!/:\s*undefined,/.test(q), 'eine Richtung wird wieder ganz weggelassen');
  assert.ok(/!hatWissen/.test(q) && /!hatHerkunft/.test(q) && /!hatNotizen/.test(q),
    'die stillen Richtungen sind nicht markiert');
});

pruefe('die vier Räume zeigen den Ersatz', () => {
  /*
   * Ohne diese Zeile stünden die Sätze in einer Datei, die niemand aufruft –
   * geprüft, gepflegt und wirkungslos.
   */
  const q = lies('src/components/figur/Figurraeume.tsx');
  for (const raum of ['wissen', 'herkunft', 'beziehungen', 'notizen']) {
    assert.ok(
      new RegExp(`<Ersatzraum raum="${raum}"`).test(q),
      `der Raum „${raum}" zeigt den Ersatz nicht`,
    );
  }
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
