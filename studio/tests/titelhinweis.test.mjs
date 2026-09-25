/**
 * Die Frage nach dem Namen – und die Welt, die daran hängt.
 *
 * Hier standen zwei verschiedene Dinge in einem Atemzug:
 *
 *     Frage:       „Wie soll dein **Buch** heißen?"
 *     Platzhalter: „Der Name deiner **Welt**"
 *
 * Seit Fassung 8 sind das nicht mehr zwei Worte für dasselbe. Die Welt ist
 * gemeinsam, das Buch bestimmt, wie man sie erlebt; ein zweiter Band kann in
 * derselben Welt stehen. Dieser Unterschied trägt den halben Aufbau des
 * Programms – und ausgerechnet dort, wo jemand ihm zum ersten Mal begegnet,
 * wurde er verwischt.
 *
 * **Im einen Fall war der Platzhalter schlicht falsch.** Wer sein Buch einer
 * bestehenden Welt zuordnet, wurde aufgefordert, deren Namen einzutragen –
 * obwohl sie längst einen hat und ihn behält (`Geburt.tsx`:
 * `worldName: gewaehlteWelt?.name ?? einband.title`).
 *
 * Geprüft wird deshalb zweierlei: dass der Satz je nach Lage ein anderer ist,
 * und – das ist die Prüfung mit den Zähnen – dass der Platzhalter nie wieder
 * nach der Welt fragt.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut,
 * bis die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const wurzel = join(import.meta.dirname, '..');
const bau = join(ARBEIT, 'titelhinweis');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  ['esbuild', 'src/lib/bookTexts.ts', '--bundle', '--format=esm',
   `--outfile=${join(bau, 'texte.mjs')}`, '--log-level=error'],
  { cwd: wurzel, stdio: 'inherit' },
);
const { BUCH_TEXTE, titelHinweis } = await import(join(bau, 'texte.mjs'));
const T = BUCH_TEXTE.geburt.titel;

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const lies = (p) => readFileSync(join(wurzel, p), 'utf8');
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* =======================================================================
 * 1 · DIE FRAGE UND DAS FELD MEINEN DASSELBE
 * ==================================================================== */

console.log('\n1 · Die Frage und das Feld meinen dasselbe');

pruefe('die Frage gilt dem Buch', () => {
  assert.match(T.frage, /Buch/);
  assert.doesNotMatch(T.frage, /Welt/, T.frage);
});

pruefe('das Feld fragt nicht nach der Welt', () => {
  /*
   * **Die Prüfung, um die es hier geht.**
   *
   * Der alte Platzhalter „Der Name deiner Welt" stand über einem Feld, das
   * `identity.title` schreibt. Wer ihn wörtlich nahm und sein Buch einer
   * bestehenden Welt zuordnete, trug den Namen einer Welt ein, die schon
   * einen hatte.
   */
  assert.doesNotMatch(T.platzhalter, /Welt/, `das Feld fragt wieder nach der Welt: „${T.platzhalter}"`);
  assert.match(T.platzhalter, /Buch/, `das Feld sagt nicht, wofür es ist: „${T.platzhalter}"`);
});

/* =======================================================================
 * 2 · DER HINWEIS RICHTET SICH NACH DER LAGE
 * ==================================================================== */

console.log('\n2 · Der Hinweis richtet sich nach der Lage');

pruefe('eine neue Welt trägt den Namen mit', () => {
  const s = titelHinweis(undefined);
  assert.match(s, /Welt, die mit diesem Buch beginnt/, s);
});

pruefe('eine bestehende Welt behält ihren', () => {
  const s = titelHinweis('Das Tal der stillen Riesen');
  assert.match(s, /Das Tal der stillen Riesen/, s);
  assert.match(s, /behält ihren eigenen/, s);
  assert.doesNotMatch(s, /die mit diesem Buch beginnt/, s);
});

pruefe('die beiden Sätze sind nicht derselbe', () => {
  assert.notEqual(titelHinweis(undefined), titelHinweis('Irgendeine Welt'));
});

pruefe('eine leere Angabe gilt als „keine"', () => {
  /*
   * „Die Welt  behält ihren eigenen." mit einem Loch in der Mitte wäre
   * schlimmer als der Satz, der hier vorher stand.
   */
  for (const leer of [undefined, '', '   ', '\t\n']) {
    assert.equal(titelHinweis(leer), T.hinweisNeueWelt, `bei ${JSON.stringify(leer)}`);
  }
});

pruefe('keine Marke bleibt im Satz stehen', () => {
  /*
   * `%s` auf dem Bildschirm ist der sichtbare Beweis, dass hier ein
   * Baustein eingesetzt wurde statt eines Satzes.
   */
  for (const welt of [undefined, 'Mooshalde', '  Mooshalde  ']) {
    assert.doesNotMatch(titelHinweis(welt), /%s/, `bei ${JSON.stringify(welt)}`);
  }
});

pruefe('der Weltname steht in Anführungszeichen', () => {
  /*
   * Ohne sie liest sich „Die Welt Das Tal der stillen Riesen behält ihren
   * eigenen." wie ein verunglückter Satz. Auch eine Welt, die schlicht
   * „Die Welt" heisst, bleibt so erkennbar.
   */
  assert.match(titelHinweis('Die Welt'), /„Die Welt“/);
});

pruefe('Umlaute und Leerzeichen überstehen das Einsetzen', () => {
  assert.match(titelHinweis('  Ödland am Fluß  '), /„Ödland am Fluß“/);
});

pruefe('beide Sätze versprechen, dass es umkehrbar ist', () => {
  /*
   * Der beruhigende Halbsatz war im alten Hinweis das Wichtigste: Wer hier
   * steht, hat noch nichts geschrieben und soll sich nicht festlegen
   * müssen. Er darf in keiner der beiden Lagen wegfallen.
   */
  for (const welt of [undefined, 'Mooshalde']) {
    assert.match(titelHinweis(welt), /jederzeit ändern/, `bei ${welt}`);
  }
});

pruefe('kein Satz mahnt', () => {
  const mahnend = /\b(bitte|erforderlich|musst|solltest|achtung|fehler)\b|!/i;
  for (const welt of [undefined, 'Mooshalde']) {
    assert.ok(!mahnend.test(titelHinweis(welt)), titelHinweis(welt));
  }
});

/* =======================================================================
 * 3 · OB DIE SEITE ÜBERHAUPT WEISS, IN WELCHER LAGE SIE STEHT
 * ==================================================================== */

console.log('\n3 · Ob die Seite weiß, in welcher Lage sie steht');

pruefe('die Titelseite fragt den Hinweis ab, statt ihn festzuschreiben', () => {
  const q = ohneProsa(lies('src/pages/geburt/Titelwahl.tsx'));
  assert.match(q, /hinweis=\{titelHinweis\(welt\)\}/, 'der Hinweis steht wieder fest');
});

pruefe('nur eine bestehende Welt wird durchgereicht', () => {
  /*
   * **Der Fehler, der hier lauert.**
   *
   * Würde stattdessen `entwurf.worldName` weitergegeben, stünde beim
   * allerersten Buch der Satz „Die Welt … behält ihren eigenen." da – über
   * einer Welt, die es noch gar nicht gibt und die gleich den Titel dieses
   * Buches tragen wird. Aus einer Auskunft würde wieder eine Falschaussage,
   * nur in der anderen Richtung.
   */
  const q = ohneProsa(lies('src/pages/geburt/Geburt.tsx'));
  assert.match(q, /welt=\{gewaehlteWelt\?\.name\}/, 'die Titelseite bekommt die falsche Welt');
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
