/**
 * Namen im Manuskript, die die Welt noch nicht kennt.
 *
 * Die Prüfung, um die es hier wirklich geht, ist **nicht** „findet es Denis?"
 * – das täte auch ein Vergleich auf Grossbuchstaben. Sie lautet:
 *
 *   **Schlägt es „Wald", „Tag" und „Hand" vor?**
 *
 * Im Deutschen ist jedes Substantiv gross. Eine Erkennung, die das nicht
 * beherrscht, schüttet den Verfasser mit Vorschlägen zu, und nach dem dritten
 * Mal schaltet er sie ab. Die halbe Datei unten prüft deshalb, was **nicht**
 * herauskommt.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut, bis
 * die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const bau = join(ARBEIT, 'namen');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  [
    'esbuild',
    'src/lib/roman/namen.ts',
    '--bundle',
    '--format=esm',
    `--outfile=${join(bau, 'namen.mjs')}`,
    '--log-level=error',
  ],
  { cwd: join(import.meta.dirname, '..'), stdio: 'inherit' },
);

const { findeNamen, ART_ZU_TYP, ART_NAME } = await import(join(bau, 'namen.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const namen = (text, bekannt = []) => findeNamen(text, bekannt).map((f) => f.name);
const artVon = (text, name) => findeNamen(text).find((f) => f.name === name)?.art;

/* =======================================================================
 * 1 · WAS GEFUNDEN WIRD
 * ==================================================================== */

console.log('\n1 · Was gefunden wird');

pruefe('Figuren, die im Text handeln', () => {
  const text =
    'Denis ging durch den Wald. Elara sagte nichts. ' +
    'Später kam Denis zurück, und Elara nickte ihm zu.';
  const f = namen(text);
  assert.ok(f.includes('Denis'), `Denis fehlt: ${f}`);
  assert.ok(f.includes('Elara'), `Elara fehlt: ${f}`);
});

pruefe('erfundene Orte, auch mit Artikel', () => {
  /*
   * „der Nebelwald" hat einen Begleiter und wäre nach dem ersten Merkmal
   * kein Name. Er kommt über das zweite herein: Er steht nicht im
   * Wörterbuch gewöhnlicher Wörter – erfundene Zusammensetzungen sind in
   * einer erfundenen Welt der Normalfall.
   */
  const text =
    'Sie ritten in den Nebelwald hinein. Der Nebelwald war still. ' +
    'Am Abend erreichten sie den Nebelwald erneut.';
  assert.ok(namen(text).includes('Nebelwald'));
});

pruefe('ein Ort wird als Ort erkannt', () => {
  const text = 'Sie zogen nach Mondsee. In Mondsee war Markt. Von Mondsee aus ging es weiter.';
  assert.equal(artVon(text, 'Mondsee'), 'ort');
});

pruefe('eine sprechende Person wird als Person erkannt', () => {
  const text = 'Marun sagte nichts. Dann fragte Marun doch. Marun lachte.';
  assert.equal(artVon(text, 'Marun'), 'person');
});

pruefe('jede Art hat eine Eintragsart und einen Namen', () => {
  for (const art of ['person', 'ort', 'ding']) {
    assert.ok(ART_ZU_TYP[art], `${art} hat keine Eintragsart`);
    assert.ok(ART_NAME[art], `${art} hat keinen Namen`);
  }
  /* Die Eintragsarten müssen es wirklich geben – siehe `lib/book.ts`. */
  assert.deepEqual(Object.values(ART_ZU_TYP).sort(), ['artifact', 'character', 'location']);
});

/* =======================================================================
 * 2 · WAS NICHT GEFUNDEN WIRD
 *
 * Die eigentliche Prüfung. Im Deutschen ist jedes Substantiv gross.
 * ==================================================================== */

console.log('\n2 · Was nicht gefunden wird');

pruefe('gewöhnliche Substantive nicht – auch wenn sie oft vorkommen', () => {
  const text =
    'Der Wald war still. Der Wald roch nach Regen. Im Wald stand ein Haus. ' +
    'Das Haus war leer. Am Morgen kam der Wind. Der Wind trug den Regen fort. ' +
    'Sie hob die Hand. Ihre Hand zitterte. Die Hand war kalt.';
  const f = namen(text);
  for (const wort of ['Wald', 'Haus', 'Wind', 'Regen', 'Hand', 'Morgen']) {
    assert.ok(!f.includes(wort), `„${wort}" wurde vorgeschlagen: ${f}`);
  }
});

pruefe('Satzanfänge allein zählen nicht', () => {
  /*
   * „Plötzlich" steht dreimal am Satzanfang und ist gross – aber nie mitten
   * im Satz. Ohne diese Regel bekäme der Verfasser jedes Adverb als Figur
   * vorgeschlagen.
   */
  const text = 'Plötzlich wurde es still. Plötzlich rief jemand. Plötzlich war es vorbei.';
  assert.deepEqual(namen(text), []);
});

pruefe('ein unbekanntes Adverb am Satzanfang wird nicht zur Figur', () => {
  /*
   * Der Fall, den die Liste der Funktionswörter **nicht** fängt.
   *
   * „Zögernd" ist ein Partizip, das als Adverb gebraucht wird – gross am
   * Satzanfang, in keinem Wörterbuch dieser Datei, und es gibt Hunderte
   * davon. Sie alle aufzulisten wäre aussichtslos. Was sie verrät: Sie
   * stehen **nur** am Satzanfang gross. Ein Name steht auch mittendrin.
   *
   * Diese Prüfung fehlte zuerst. Die Gegenprobe – die Regel entfernen –
   * blieb grün, und damit war sie eine Regel, die niemand bewacht hätte.
   */
  const text = 'Zögernd blieb er stehen. Zögernd hob er die Hand.';
  assert.deepEqual(namen(text), []);
});

pruefe('was einmal vorkommt, wird nicht vorgeschlagen', () => {
  const text = 'Er traf Ferdinand am Steg und ging weiter, ohne sich umzudrehen.';
  assert.deepEqual(namen(text), []);
});

pruefe('was die Welt schon kennt, kommt nicht noch einmal', () => {
  const text = 'Denis ging. Denis kam zurück. Denis schwieg.';
  assert.ok(namen(text).includes('Denis'));
  const bekannt = [{ id: 'e1', title: 'Denis', type: 'character' }];
  assert.deepEqual(namen(text, bekannt), []);
});

pruefe('Gross- und Kleinschreibung trennt keine Figur', () => {
  const bekannt = [{ id: 'e1', title: 'DENIS', type: 'character' }];
  assert.deepEqual(namen('Denis ging. Denis kam. Denis schwieg.', bekannt), []);
});

pruefe('Kapitel und Szenen sind keine Weltbestandteile', () => {
  /*
   * Ein Kapitel heisst vielleicht „Nebelwald". Es als bekannt zu zählen
   * hiesse, den Ort nie vorzuschlagen, weil ein Kapitel so heisst.
   */
  const text = 'Sie ritten in den Nebelwald. Der Nebelwald schwieg. Im Nebelwald war es kalt.';
  const alsKapitel = [{ id: 'k1', title: 'Nebelwald', type: 'kapitel' }];
  assert.ok(namen(text, alsKapitel).includes('Nebelwald'));
});

pruefe('leerer Text ergibt nichts und stürzt nicht ab', () => {
  assert.deepEqual(findeNamen(''), []);
  assert.deepEqual(findeNamen('   \n\n '), []);
  assert.deepEqual(findeNamen(undefined), []);
});

/* =======================================================================
 * 3 · WAS ECHTE PROSA VERLANGT
 *
 * Beide Prüfungen unten stammen aus einem Absatz, der im Browser stand –
 * nicht aus dem Kopf. Beide waren zuerst rot.
 * ==================================================================== */

console.log('\n3 · Was echte Prosa verlangt');

pruefe('„fragte nach Marun" macht Marun nicht zum Ort', () => {
  /*
   * „nach" ist doppeldeutig: „nach Mondsee" ist eine Richtung, „fragte nach
   * Marun" eine Frage. Was sie unterscheidet, steht ein Wort weiter vorn.
   */
  const text =
    'Marun hatte ihn ihm gegeben, damals. Später fragte Elara nach Marun. ' +
    'Von Marun sprach danach niemand mehr.';
  assert.notEqual(artVon(text, 'Marun'), 'ort');
});

pruefe('„nach Mondsee" bleibt ein Ort', () => {
  const text = 'Sie zogen nach Mondsee. In Mondsee war Markt. Nach Mondsee kam der Winter.';
  assert.equal(artVon(text, 'Mondsee'), 'ort');
});

pruefe('„Der Nebelwald schwieg" macht daraus keine Figur', () => {
  /*
   * Zwei Regeln greifen ineinander, und beide stammen aus echter Prosa:
   * Ein Wort mit Artikel ist keine Person – „der Denis" ist Mundart –, und
   * deutsche Ortsnamen sind zusammengesetzt.
   */
  const text = 'Denis stand am Rand des Nebelwaldes. Der Nebelwald schwieg, wie immer.';
  assert.equal(artVon(text, 'Nebelwald'), 'ort');
});

pruefe('ein Gegenstand mit Artikel bleibt ein Gegenstand', () => {
  /*
   * Der Fall, der die Artikelregel wirklich braucht – und er fehlte zuerst.
   *
   * Das Sonnenrad **schweigt** und **sieht**: zwei Verben aus der Liste, die
   * eine Person ankündigen. Es hat keine Ortsendung, die es rettet. Ohne die
   * Regel „wer einen Artikel trägt, ist keine Person" wäre es eine Figur.
   *
   * Zwei Gegenproben davor blieben grün, weil andere Regeln den Fall vorher
   * abfingen. Eine Regel, die nur hinter anderen steht, ist nicht geprüft.
   */
  const text =
    'Das Sonnenrad sah alles. Das Sonnenrad schwieg. ' +
    'Am Morgen stand das Sonnenrad still.';
  assert.equal(artVon(text, 'Sonnenrad'), 'ding');
});

pruefe('gebeugte Formen zählen zur Grundform', () => {
  /*
   * „Der Nebelwald schwieg" und „am Rand des Nebelwaldes" sind für einen
   * Zeichenvergleich zwei Wörter. Gemessen fiel der Nebelwald deshalb durch:
   * einmal so, einmal so, keins zweimal.
   */
  const text = 'Denis stand am Rand des Nebelwaldes. Der Nebelwald schwieg.';
  const f = findeNamen(text);
  const nw = f.find((x) => x.name.toLowerCase().startsWith('nebelwald'));
  assert.ok(nw, `Nebelwald fehlt: ${f.map((x) => x.name)}`);
  assert.equal(nw.anzahl, 2, 'die beiden Formen wurden nicht zusammengelegt');
});

pruefe('aus einem Namen wird kein kürzerer erfunden', () => {
  /*
   * Die Bedingung, die das Zusammenlegen ehrlich hält: Nur wenn die
   * Grundform **selbst** vorkommt. Sonst schluckte „Denis" ein „Deni".
   */
  const f = namen('Denis ging. Am Ufer stand Denis. Denis schwieg.');
  assert.ok(f.includes('Denis'), `Denis fehlt: ${f}`);
  assert.ok(!f.some((n) => n.toLowerCase() === 'deni'), `„Deni" erfunden: ${f}`);
});

/* =======================================================================
 * 4 · ZWEITEILIGE NAMEN
 * ==================================================================== */

console.log('\n4 · Zweiteilige Namen');

pruefe('zwei grossgeschriebene Wörter nebeneinander sind ein Name', () => {
  /*
   * Im Deutschen wird ein Adjektiv klein geschrieben – „der graue Turm" –,
   * **ausser** es gehört zum Namen: „der Graue Turm". Diesen Unterschied
   * macht der Verfasser mit der Taste, und hier wird er gelesen.
   */
  const text =
    'Vor ihnen stand der Graue Turm. Der Graue Turm war leer. ' +
    'Am Abend erreichten sie den Grauen Turm nicht mehr.';
  assert.ok(namen(text).includes('Graue Turm'), `nicht gefunden: ${namen(text)}`);
});

pruefe('der Teil wird nicht daneben noch einmal vorgeschlagen', () => {
  /*
   * Ohne Abzug stünde „Graue Turm" **und** „Turm" in der Liste, und der
   * Verfasser müsste raten, welches gemeint ist.
   */
  const text = 'Vor ihnen stand der Graue Turm. Der Graue Turm war leer. Im Graue Turm war es kalt.';
  const f = namen(text);
  assert.ok(f.includes('Graue Turm'));
  assert.ok(!f.includes('Turm'), `„Turm" steht daneben: ${f}`);
});

pruefe('ein Teil, der auch allein vorkommt, bleibt', () => {
  /*
   * Die Gegenprobe zum Abzug: „Aelfric" steht zweimal für sich und zweimal
   * in „Sankt Aelfric". Nach dem Abzug bleiben zwei – und damit zu Recht
   * beide Vorschläge.
   */
  const text =
    'Sie kamen zu Sankt Aelfric. Sankt Aelfric war verlassen. ' +
    'Aelfric hatte den Ort gebaut. Damals war Aelfric jung.';
  const f = namen(text);
  assert.ok(f.includes('Sankt Aelfric'), `Paar fehlt: ${f}`);
  assert.ok(f.includes('Aelfric'), `Teil fehlt: ${f}`);
});

pruefe('ein einmaliges Paar entlastet seinen Teil nicht', () => {
  /*
   * Wofür die Schwelle bei Paaren wirklich da ist – und die Gegenprobe
   * darauf blieb zuerst grün.
   *
   * „Alten Turm" steht genau einmal; das ist kein Name, sondern ein
   * Adjektiv, das zufällig gross am Satzanfang folgte. Zöge es trotzdem von
   * „Turm" ab, fiele der Turm unter die Schwelle und verschwände – ein
   * Vorschlag weniger, und niemand wüsste warum.
   */
  const text = 'Er sah den Alten Turm. Der Turm war leer.';
  const f = namen(text);
  assert.ok(f.includes('Turm'), `Turm verschwunden: ${f}`);
  assert.ok(!f.includes('Alten Turm'), `einmaliges Paar vorgeschlagen: ${f}`);
});

pruefe('Funktionswörter bilden kein Paar', () => {
  /*
   * „Der Wald" und „Sie Ging" sind keine Namen. Am Satzanfang steht sonst
   * jedes Wortpaar gross da.
   */
  const text = 'Der Wald schwieg. Der Wald roch nach Regen. Der Wald war alt.';
  assert.ok(!namen(text).some((n) => n.includes(' ')), `Paar gefunden: ${namen(text)}`);
});

/* =======================================================================
 * 5 · DIE ORDNUNG
 * ==================================================================== */

console.log('\n5 · Die Ordnung');

pruefe('das Häufigste steht oben', () => {
  const text =
    'Denis ging. Denis kam. Denis schwieg. Am Ufer wartete Denis. ' +
    'Elara sagte nichts. Neben ihr stand Elara nicht mehr.';
  const f = findeNamen(text);
  assert.equal(f[0].name, 'Denis');
  assert.ok(f.length >= 2, `nur ${f.length} Fund(e): ${f.map((x) => x.name)}`);
  assert.ok(f[0].anzahl > f[1].anzahl);
});

pruefe('die Reihenfolge steht fest', () => {
  /*
   * Eine Liste, die bei jedem Tastendruck springt, liest niemand zu Ende.
   * Bei gleicher Häufigkeit entscheidet der Name, nicht die Fundreihenfolge.
   */
  const text =
    'Zoltan ging. Am Tor stand Zoltan. Ansgar ging. Am Tor stand Ansgar.';
  assert.deepEqual(namen(text), ['Ansgar', 'Zoltan']);
});

pruefe('jeder Fund bringt seinen Beleg mit', () => {
  const f = findeNamen('Am Ufer wartete Elara. Elara hob die Hand. Elara schwieg.');
  const elara = f.find((x) => x.name === 'Elara');
  assert.ok(elara.beleg.includes('Elara'), `kein Beleg: „${elara.beleg}"`);
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
