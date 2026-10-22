/**
 * Das leere Buch – ein Feld statt fünfzehn Fächern.
 *
 * Gemessen, erster Bildschirm eines frischen Buches, vor dieser Runde:
 *
 *     NOCH UNGESCHRIEBEN
 *     Naturgesetze · Essenz der Welt · Die lebendige Welt · Natur · Tiere ·
 *     Bewohner · Stimmen · Artefakte · Architektur & Gebautes · Materialien ·
 *     Kräfte · Geschichten · Die Zeitalter · Die Werkstatt · Notizen &
 *     Sammlungen
 *
 * Fünfzehn leere Fächer als Begrüssung, die Namen bei **2,51:1** – bei 15 px
 * kursiv weit unter der Schwelle. Gesetz 3 war dabei buchstäblich gewahrt:
 * nichts zählte, nichts mahnte. Die Wirkung auf einen Menschen war trotzdem
 * genau die, gegen die das Gesetz geschrieben wurde.
 *
 * Dazu eine Hinweiskette: Auf dem Inhaltsverzeichnis stehen Lesebändchen,
 * Gedankenfang und Suche alle drei, also kam nach jedem Wegklicken der
 * nächste Wegweiser. Einer verdeckte die Überschrift der Seite.
 *
 * ---
 *
 * **Was hier geprüft wird und was der Browser geprüft hat.**
 *
 * Diese Datei prüft die Form: dass die Sperren an der richtigen Grösse
 * hängen, dass es die fünf Anfänge nur einmal gibt, dass die Einladung
 * lesbar bleibt. Das Verhalten selbst wurde im Browser nachgestellt – leeres
 * Buch, Tippen, „Figur", und die entstandene Seite –, und die Zahlen aus
 * diesen Läufen stehen in den Begründungen.
 *
 * Jede Zusage wurde gegengeprobt: der Fehler absichtlich wieder eingebaut,
 * bis die Prüfung anschlug.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const wurzel = join(import.meta.dirname, '..');
const lies = (p) => readFileSync(join(wurzel, p), 'utf8');
/** Ohne Prosa gelesen: Ein Aufruf in einem Kommentar ist keiner. */
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const inhalt = ohneProsa(lies('src/pages/book/ContentsSpread.tsx'));
const seite = ohneProsa(lies('src/components/book/ErsteSeite.tsx'));
const ersterSchritt = lies('src/pages/onboarding/ErsterSchritt.tsx');
const leitfaden = ohneProsa(lies('src/components/leitfaden/Leitfaden.tsx'));

/* =======================================================================
 * 1 · DAS LEERE BUCH
 * ==================================================================== */

console.log('\n1 · Das leere Buch');

pruefe('die fünfzehn Fächer stehen nur im begonnenen Buch', () => {
  /*
   * **Die Prüfung, um die es hier geht.**
   *
   * Die Liste selbst bleibt – ihre Begründung im Quelltext ist richtig:
   * „Ohne diese Zeilen könnte niemand entdecken, dass es sie geben könnte."
   * Nur im leeren Buch kippt sie von einer Einladung in eine Wand.
   */
  assert.match(
    inhalt,
    /\{noch > 0 && book\.emptyChapters\.length > 0 && \(/,
    'die leeren Kapitel hängen nicht mehr daran, ob schon etwas dasteht',
  );
});

pruefe('das leere Buch zeigt stattdessen das Feld', () => {
  assert.match(inhalt, /\{noch === 0 && \(/, 'das Feld hängt an der falschen Bedingung');
  assert.match(inhalt, /<ErsteSeite \/>/);
  assert.match(inhalt, /import \{ ErsteSeite \}/);
});

pruefe('beide hängen an derselben Zahl', () => {
  /*
   * Zwei verschiedene Bedingungen liessen einen Zustand zu, in dem beides
   * dasteht – oder keines. Die Zahl wird genau einmal gebildet.
   */
  const stellen = inhalt.match(/const noch = [^;]+;/g) ?? [];
  assert.equal(stellen.length, 1, `„noch" wird ${stellen.length}× gebildet`);
  assert.match(stellen[0], /book\.chapters\.length/);
});

pruefe('die Einladung ist lesbar, wo sie noch steht', () => {
  /*
   * `ink-faint` mass gegen das Papier 2,51:1, `ink-muted` misst 4,24:1.
   * Die Schwelle von 4,5:1 ist damit noch nicht erreicht, und das bleibt
   * so: Eine feste Deckkraft träfe nur eines der sechs Bänder, von denen
   * mehrere helle Schrift auf dunklem Grund setzen. Am Farbton selbst wird
   * auch nicht gedreht – er steht an 336 Stellen in 67 Dateien.
   */
  const zeile = inhalt.match(/<Link[\s\S]{0,400}?\{chapter\.title\}/);
  assert.ok(zeile, 'die Einladung sieht anders aus als erwartet');
  assert.doesNotMatch(zeile[0], /text-ink-faint\b/, 'die Einladung ist wieder bei 2,51:1');
  assert.match(zeile[0], /text-ink-muted\b/);
});

/* =======================================================================
 * 2 · DAS FELD
 * ==================================================================== */

console.log('\n2 · Das Feld');

pruefe('es gibt die fünf Anfänge nur einmal', () => {
  /*
   * Gesetz 5, keine zweite Wahrheit. Die Liste stand in `ErsterSchritt` und
   * wird von dort geholt – eine eigene Liste im Bauteil wäre die zweite.
   */
  assert.match(ersterSchritt, /export const ANFAENGE/);
  assert.match(seite, /import \{ ANFAENGE \} from '\.\.\/\.\.\/pages\/onboarding\/ErsterSchritt'/);
  assert.match(seite, /ANFAENGE\.map\(/);
  assert.doesNotMatch(seite, /const ANFAENGE/, 'das Bauteil führt eine eigene Liste');
});

pruefe('ohne Titel entsteht kein Eintrag', () => {
  /*
   * Ein Eintrag mit leerem Titel wäre nach `hasBookIdentity`-Logik eine
   * Karteileiche zwischen den echten Seiten – und die Eingabetaste ist
   * schnell gedrückt.
   */
  assert.match(seite, /if \(!fertig \|\| busy\) return;/);
  assert.match(seite, /const fertig = text\.trim\(\)\.length > 0;/);
  assert.match(seite, /title: text\.trim\(\)/);
});

pruefe('die fünf Anfänge sind vor dem ersten Wort nicht zu erreichen', () => {
  /*
   * Fünf Knöpfe vor dem ersten Wort wären eine Entscheidung über etwas, das
   * es noch nicht gibt – und genau die Wand, die hier weggeräumt wurde. Im
   * Browser nachgemessen: Deckkraft 0, `pointer-events: none`, `disabled`,
   * und `elementFromPoint` trifft den Abschnitt, nicht den Knopf.
   */
  assert.match(seite, /aria-hidden=\{!fertig\}/, 'Vorleseprogramme kündigen fünf Knöpfe an');
  assert.match(seite, /pointer-events-none/);
  assert.match(seite, /disabled=\{!fertig \|\| busy\}/);
});

pruefe('es fasst sich den Fokus nicht selbst', () => {
  /*
   * Auf dem Telefon risse die Tastatur sofort die halbe Buchseite an sich –
   * samt der Zeile darüber, die gerade erklärt, worum es geht. Bei der
   * Frage nach der Erschaffung ist das anders: Die steht allein.
   */
  assert.doesNotMatch(seite, /\.focus\(\)/, 'das Feld zieht den Fokus an sich');
});

pruefe('was entsteht, wird auch gezeigt', () => {
  assert.match(seite, /navigate\(`\/eintrag\/\$\{entry\.id\}`\)/);
});

/* =======================================================================
 * 3 · DIE HINWEISKETTE
 * ==================================================================== */

console.log('\n3 · Die Hinweiskette');

pruefe('nach einem Wegweiser kommt auf derselben Seite keiner mehr', () => {
  /*
   * Die Regel stand längst in `lib/leitfaden.ts`: „Einmal gesehen ist
   * erledigt. Wer weiterblättert, hat verstanden." Gehalten wurde sie
   * nicht. Im Browser gemessen: vorher drei nacheinander, jetzt einer.
   */
  assert.match(leitfaden, /if \(zuletztAuf === pathname\) return null;/);
  assert.match(leitfaden, /setZuletztAuf\(pathname\)/, 'der Merker wird nie gesetzt');
});

pruefe('beim Weiterblättern fällt der Merker', () => {
  /*
   * Ohne das gilt die Sperre für immer statt für diesen Besuch. Gemessen:
   * Nach Weiterblättern und Zurückkehren kam kein Wegweiser mehr – während
   * der Kommentar daneben genau das versprach.
   */
  const wechsel = leitfaden.match(/if \(letzterPfad !== pathname\) \{[\s\S]*?\n  \}/);
  assert.ok(wechsel, 'der Seitenwechsel sieht anders aus als erwartet');
  assert.match(wechsel[0], /setZuletztAuf\(undefined\)/, 'der Merker überlebt den Seitenwechsel');
});

pruefe('der Merker steht nicht in den Einstellungen', () => {
  /*
   * Er gilt für diesen Besuch, nicht für immer. In den Einstellungen wäre
   * er eine dauerhafte Sperre – und die gibt es schon: `erledigt`.
   */
  assert.doesNotMatch(leitfaden, /leitfaden: \{[^}]*zuletztAuf/);
  assert.match(leitfaden, /useState<string>\(\)/);
});

pruefe('der Merker wird gesetzt, bevor er gelesen wird', () => {
  /*
   * Kein Stilfrage: Stünde `useState` unter dem Seitenwechsel, riefe dieser
   * `setZuletztAuf` vor der Deklaration – ein Laufzeitfehler in der
   * zeitlichen Totzone, und zwar erst beim zweiten Seitenaufruf.
   */
  const deklaration = leitfaden.indexOf('const [zuletztAuf, setZuletztAuf]');
  const benutzung = leitfaden.indexOf('setZuletztAuf(undefined)');
  assert.ok(deklaration >= 0 && benutzung >= 0, 'eines von beiden fehlt');
  assert.ok(deklaration < benutzung, 'der Merker wird vor seiner Deklaration benutzt');
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
