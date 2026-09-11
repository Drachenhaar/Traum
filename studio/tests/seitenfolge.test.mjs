/**
 * Die von Hand gesetzte Seitenreihenfolge.
 *
 * Geprüft wird vor allem, was beim Umsortieren **nicht** passieren darf:
 * Ein Eintrag verschwindet, ein Eintrag steht doppelt im Buch, oder eine
 * gesetzte Folge überlebt ihre eigene Zurücknahme. Alle drei sind Fehler, die
 * man erst Wochen später bemerkt – und dann an einem Buch, in dem Arbeit
 * steckt.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut, bis
 * die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'seitenfolge');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/buch/seitenfolge.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'seitenfolge.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const { ordne, verschiebe, setzeFolge, abweichend } = await import(join(bau, 'seitenfolge.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/** Aus „abc" wird [{id:'a'},{id:'b'},{id:'c'}] – Prüfungen sollen lesbar sein. */
const liste = (s) => [...s].map((id) => ({ id }));
const ids = (l) => l.map((e) => e.id).join('');

/* =======================================================================
 * 1 · ORDNEN
 * ==================================================================== */

console.log('\n1 · Ordnen');

pruefe('ohne Folge bleibt alles, wie das Buch es ableitet', () => {
  assert.equal(ids(ordne(liste('abc'), undefined)), 'abc');
  assert.equal(ids(ordne(liste('abc'), [])), 'abc');
});

pruefe('die gesetzte Folge gilt', () => {
  assert.equal(ids(ordne(liste('abc'), ['c', 'a', 'b'])), 'cab');
});

pruefe('was es nicht mehr gibt, steht nicht im Buch', () => {
  /*
   * Der gelöschte Eintrag ist der häufigste Fall überhaupt: Die Folge nennt
   * ihn noch, die Welt nicht mehr. Er darf keine leere Seite hinterlassen.
   */
  assert.equal(ids(ordne(liste('ac'), ['c', 'b', 'a'])), 'ca');
});

pruefe('was neu ist, kommt ans Ende', () => {
  /*
   * Die Entscheidung, um die es geht: **nicht** an den alphabetischen Platz.
   * Ein neues Bild mitten in eine gesetzte Folge zu schieben hiesse, es an
   * einen Ort zu stellen, den niemand gewählt hat.
   */
  assert.equal(ids(ordne(liste('abcd'), ['c', 'a'])), 'cabd');
});

pruefe('eine Kennung steht auch bei doppelter Nennung nur einmal im Buch', () => {
  /*
   * Aus einer halb geschriebenen Sicherung kann eine Folge mit derselben
   * Kennung zweimal kommen. Ein Eintrag, der zweimal im Buch steht, bekommt
   * zwei Seitenzahlen – und ab da stimmt keine mehr.
   */
  assert.equal(ids(ordne(liste('abc'), ['b', 'b', 'a'])), 'bac');
});

pruefe('kein Eintrag geht beim Ordnen verloren', () => {
  /*
   * Die Zusage, die über allen steht. Wie die Folge auch aussieht – am Ende
   * sind genauso viele Seiten im Buch wie vorher.
   */
  for (const folge of [['c'], ['c', 'a'], ['x', 'y'], ['b', 'b'], ['d', 'c', 'b', 'a']]) {
    const raus = ordne(liste('abcd'), folge);
    assert.equal(raus.length, 4, `${folge} ergab ${ids(raus)}`);
    assert.equal([...new Set(raus.map((e) => e.id))].length, 4, `doppelt: ${ids(raus)}`);
  }
});

/* =======================================================================
 * 2 · VERSCHIEBEN
 * ==================================================================== */

console.log('\n2 · Verschieben');

pruefe('einen Platz nach vorn', () => {
  assert.deepEqual(verschiebe(['a', 'b', 'c'], 'c', -1), ['a', 'c', 'b']);
});

pruefe('einen Platz nach hinten', () => {
  assert.deepEqual(verschiebe(['a', 'b', 'c'], 'a', 1), ['b', 'a', 'c']);
});

pruefe('am Rand geschieht nichts', () => {
  /*
   * `undefined` und nicht „dieselbe Liste": Der Aufrufer soll gar nicht erst
   * schreiben. Ein Buch, dessen Änderungsdatum sich beim Antippen eines
   * wirkungslosen Pfeils bewegt, lügt über seine Arbeit.
   */
  assert.equal(verschiebe(['a', 'b'], 'a', -1), undefined);
  assert.equal(verschiebe(['a', 'b'], 'b', 1), undefined);
});

pruefe('eine unbekannte Kennung verschiebt nichts', () => {
  /*
   * **Beide Richtungen.** Nach vorn fällt eine unbekannte Kennung von selbst
   * durch die Randprüfung – nach hinten nicht: Aus „nicht gefunden" wird
   * dabei ein gültig aussehender Platz, und die Liste käme mit einer Kennung
   * zurück, die es nie gab. Nur die zweite Zeile hier prüft die Wache
   * wirklich; die erste stand allein und hat den Fehler durchgelassen.
   */
  assert.equal(verschiebe(['a', 'b'], 'z', -1), undefined);
  assert.equal(verschiebe(['a', 'b'], 'z', 1), undefined);
});

pruefe('die hereingereichte Liste bleibt unangetastet', () => {
  /*
   * Sonst hätte die Oberfläche ihre Reihenfolge schon geändert, bevor das
   * Buch gespeichert ist – und bei einem Fehlschlag stünde beides
   * auseinander.
   */
  const vorher = ['a', 'b', 'c'];
  verschiebe(vorher, 'a', 1);
  assert.deepEqual(vorher, ['a', 'b', 'c']);
});

pruefe('Verschieben verliert keine Kennung', () => {
  let folge = ['a', 'b', 'c', 'd'];
  for (const [id, r] of [['d', -1], ['d', -1], ['a', 1], ['c', 1], ['b', -1]]) {
    folge = verschiebe(folge, id, r) ?? folge;
    assert.equal([...folge].sort().join(''), 'abcd', `verloren bei ${id}: ${folge}`);
  }
});

/* =======================================================================
 * 3 · SETZEN UND ZURÜCKNEHMEN
 * ==================================================================== */

console.log('\n3 · Setzen und zurücknehmen');

pruefe('eine Folge wird am Kapitel abgelegt', () => {
  assert.deepEqual(setzeFolge(undefined, 'wesen', ['b', 'a']), { wesen: ['b', 'a'] });
});

pruefe('andere Kapitel bleiben unberührt', () => {
  const bestand = { wesen: ['b', 'a'], orte: ['x'] };
  assert.deepEqual(setzeFolge(bestand, 'orte', ['y', 'x']), {
    wesen: ['b', 'a'],
    orte: ['y', 'x'],
  });
  /* Und der Bestand selbst wurde nicht verändert. */
  assert.deepEqual(bestand, { wesen: ['b', 'a'], orte: ['x'] });
});

pruefe('zurückgenommen heisst fort, nicht leer', () => {
  /*
   * Eine leere Liste wäre eine gesetzte Folge ohne Inhalt – `ordne` müsste
   * raten, was gemeint ist. Kein Eintrag heisst eindeutig „abgeleitet".
   */
  const raus = setzeFolge({ wesen: ['b', 'a'], orte: ['x'] }, 'wesen', undefined);
  assert.deepEqual(raus, { orte: ['x'] });
  assert.ok(!('wesen' in raus));
});

pruefe('das letzte Kapitel nimmt die ganze Tabelle mit', () => {
  /*
   * Damit ein Buch, dessen Folge man zurückgenommen hat, wieder genauso
   * aussieht wie eines, das nie eine hatte – auch in der Sicherung.
   */
  assert.equal(setzeFolge({ wesen: ['b', 'a'] }, 'wesen', undefined), undefined);
  assert.equal(setzeFolge({ wesen: ['b', 'a'] }, 'wesen', []), undefined);
});

/* =======================================================================
 * 4 · OB ES ETWAS ZURÜCKZUNEHMEN GIBT
 * ==================================================================== */

console.log('\n4 · Ob es etwas zurückzunehmen gibt');

pruefe('ohne Folge gibt es keine Abweichung', () => {
  assert.equal(abweichend(liste('abc'), undefined), false);
  assert.equal(abweichend(liste('abc'), []), false);
});

pruefe('eine Folge, die dasselbe sagt, ist keine Abweichung', () => {
  /*
   * Sie entsteht von selbst: Beim ersten Verschieben wird die sichtbare
   * Reihenfolge als Ganzes zur Folge. Wer danach zurückverschiebt, hat wieder
   * die Buchordnung – und soll nicht angeboten bekommen, sie „zurückzunehmen".
   */
  assert.equal(abweichend(liste('abc'), ['a', 'b', 'c']), false);
});

pruefe('eine verschobene Folge weicht ab', () => {
  assert.equal(abweichend(liste('abc'), ['b', 'a', 'c']), true);
});

pruefe('eine Folge, die nur den Rest betrifft, weicht nicht ab', () => {
  /*
   * Nennt die Folge nur „a", steht a vorn – da stand es schon. Ein
   * angebotenes „Zurück zur Buchordnung" wäre hier eine Handlung, die
   * sichtbar nichts tut.
   */
  assert.equal(abweichend(liste('abc'), ['a']), false);
  assert.equal(abweichend(liste('abc'), ['b']), true);
});

/* =======================================================================
 * 5 · IM GEBAUTEN BUCH
 *
 * Die Prüfungen oben zeigen, dass das Modul rechnet. Diese hier zeigen, dass
 * es angeschlossen ist – der Unterschied, an dem eine saubere Bibliothek
 * schon oft folgenlos geblieben ist.
 * ==================================================================== */

console.log('\n5 · Im gebauten Buch');

execFileSync(
  'npx',
  ['esbuild', 'src/lib/book.ts', '--bundle', '--format=esm', `--outfile=${join(bau, 'book.mjs')}`, '--log-level=error'],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);
const { buildBook } = await import(join(bau, 'book.mjs'));

/** Drei Orte, alphabetisch A B C – und damit auch in der abgeleiteten Ordnung. */
const orte = ['A', 'B', 'C'].map((t, i) => ({
  id: `x${i}`,
  title: t,
  type: 'location',
  category: '',
  tags: [],
  fields: {},
  createdAt: 1,
  updatedAt: 1,
}));
const kapitelId = buildBook(orte, 0).chapters[0].chapter.id;
const titel = (buch) => buch.chapters[0].entries.map((e) => e.title).join('');

pruefe('ohne Folge baut das Buch wie bisher', () => {
  assert.equal(titel(buildBook(orte, 0)), 'ABC');
});

pruefe('mit Folge steht im Buch, was gesetzt wurde', () => {
  assert.equal(titel(buildBook(orte, 0, { [kapitelId]: ['x2', 'x0'] })), 'CAB');
});

pruefe('die Seitenzahlen folgen der gesetzten Folge', () => {
  /*
   * Das Entscheidende: Nicht nur die Liste im Kapitel dreht sich, sondern das
   * Buch. Wer umsortiert und danach eine Seitenzahl liest, die zur alten
   * Ordnung gehört, hat ein Buch, das sich selbst widerspricht.
   */
  const buch = buildBook(orte, 0, { [kapitelId]: ['x2', 'x0'] });
  assert.ok(
    buch.pageOfEntry.get('x2') < buch.pageOfEntry.get('x0'),
    `C auf ${buch.pageOfEntry.get('x2')}, A auf ${buch.pageOfEntry.get('x0')}`,
  );
});

pruefe('die abgeleitete Ordnung bleibt daneben lesbar', () => {
  /*
   * Sie wird für genau eine Frage gebraucht – „gibt es etwas
   * zurückzunehmen?" – und muss deshalb die gesetzte Folge überleben.
   */
  const buch = buildBook(orte, 0, { [kapitelId]: ['x2', 'x0'] });
  assert.equal(buch.chapters[0].abgeleitet.map((e) => e.title).join(''), 'ABC');
  assert.equal(abweichend(buch.chapters[0].abgeleitet, ['x2', 'x0']), true);
});

pruefe('eine Folge für ein fremdes Kapitel ändert nichts', () => {
  assert.equal(titel(buildBook(orte, 0, { 'gibt-es-nicht': ['x2', 'x0'] })), 'ABC');
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
