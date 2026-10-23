/**
 * Die Siedlungszeichen – und die Frage, wer sie dort hingestellt hat.
 *
 * ---
 *
 * **Worum es bei dieser Runde wirklich geht.**
 *
 * Hütte, Dorf und Burg sind drei Strichzeichnungen; das ist der kleinere
 * Teil. Der grössere ist derselbe Einwand wie beim Fluss: *„Die Karte würde
 * wohl wahllos erstellt."* Eine Karte, die sich ihre Dörfer selbst verteilt –
 * etwa eines je Seite im Buch, oder eines in die Mitte jeder Landmasse –,
 * sieht nach einer Sekunde besser aus und behauptet dabei etwas über die
 * Welt, das niemand behauptet hat. Das ist Gesetz 4: *Dragoncore ändert die
 * Welt nie ungefragt.*
 *
 * Geprüft wird deshalb beides: dass die Zeichen aussehen wie Zeichen, und
 * dass keines von selbst entsteht.
 *
 * Dazu kommt die Sorte Fehler, die man erst Wochen später merkt: Eine
 * Siedlung, die das Rückgängig nicht kennt. Eine, die beim Einlesen einer
 * Sicherung auf eine fremde Seite zeigt. Eine, die beim Aufrichten der Karte
 * verschwindet. Jede davon ist still, und jede hat hier eine Prüfung.
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
const bau = join(ARBEIT, 'siedlung');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
const baue = (quelle, name) =>
  execFileSync(
    'npx',
    ['esbuild', quelle, '--bundle', '--format=esm',
     `--outfile=${join(bau, name)}`, '--log-level=error'],
    { cwd: wurzel, stdio: 'inherit' },
  );
baue('src/lib/karte/siedlung.ts', 'siedlung.mjs');
baue('src/lib/karte/modell.ts', 'modell.mjs');

const { SIEDLUNGEN, istSiedlung, zeichen, alsSiedlungspfad } =
  await import(join(bau, 'siedlung.mjs'));
const { heileKarte, neueKarte, neueMarke } = await import(join(bau, 'modell.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

const lies = (p) => readFileSync(join(wurzel, p), 'utf8');
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/** Alle Punkte eines `d`-Pfades, der nur aus M und L besteht. */
const punkteAus = (d) =>
  [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

/* =======================================================================
 * 1 · DREI ZEICHEN, DIE MAN UNTERSCHEIDET
 * ==================================================================== */

console.log('\n1 · Drei Zeichen, die man unterscheidet');

pruefe('es gibt genau drei, und jedes hat Striche', () => {
  /*
   * Drei und nicht dreissig: Bei dieser Grösse wäre eine Mühle derselbe
   * Fleck wie ein Kloster, und der Verfasser hätte dreissig Wörter für drei
   * Bedeutungen. Siehe `siedlung.ts`.
   */
  assert.equal(SIEDLUNGEN.length, 3);
  for (const { id, name } of SIEDLUNGEN) {
    assert.ok(istSiedlung(id), `${id} gilt nicht als Siedlung`);
    assert.ok(name.length > 2, `${id} hat keinen Namen`);
    const z = zeichen(id);
    assert.ok(z.length >= 4, `${id} hat nur ${z.length} Züge`);
    for (const zug of z) assert.ok(zug.length >= 2, `${id} hat einen Zug aus einem Punkt`);
  }
});

pruefe('keine zwei Zeichen sind gleich', () => {
  /*
   * Sie sind aus denselben vier Strichen gebaut – Giebel, zwei Wände,
   * Grundlinie –, damit sie zusammengehörig aussehen. Zusammengehörig ist
   * nicht gleich: Wer Hütte und Dorf auf der Karte nicht auseinanderhält,
   * hat zwei Wörter für eine Bedeutung.
   */
  const d = SIEDLUNGEN.map((s) => alsSiedlungspfad(s.id, [0, 0], 100));
  assert.notEqual(d[0], d[1]);
  assert.notEqual(d[1], d[2]);
  assert.notEqual(d[0], d[2]);
});

pruefe('jedes steht auf dem Boden, nicht in der Luft', () => {
  /*
   * **Der Nullpunkt liegt auf der Grundlinie.** Das ist die eine
   * Eigenschaft, aus der alles andere folgt: Ein Zeichen, dessen
   * Mittelpunkt in der Luft liegt, rutscht beim Vergrössern nach unten weg,
   * und niemand sieht gleich, warum. Gemessen heisst das: Der *tiefste*
   * Punkt (in SVG der grösste y-Wert) ist genau die gesetzte Höhe.
   */
  for (const { id } of SIEDLUNGEN) {
    const p = punkteAus(alsSiedlungspfad(id, [400, 700], 60));
    const tiefster = Math.max(...p.map((q) => q[1]));
    assert.ok(Math.abs(tiefster - 700) < 0.02,
      `${id} steht bei ${tiefster.toFixed(2)} statt bei 700`);
    /* Und es ragt nach oben, nicht nach unten. */
    assert.ok(Math.min(...p.map((q) => q[1])) < 700 - 20,
      `${id} ist flach`);
  }
});

pruefe('es wächst mit der Grösse und bleibt auf seinem Fleck', () => {
  /*
   * Zwei Zusagen in einer: Die Höhe ist proportional zu `gr` – sonst wäre
   * die Grösse eines Dorfs beim Zoomen nicht mehr vorhersagbar – und der
   * Fusspunkt bleibt liegen, wo er liegt. Eine Burg, die beim Heranzoomen
   * über die Küste wandert, hat ihren Ort verloren.
   */
  for (const { id } of SIEDLUNGEN) {
    const klein = punkteAus(alsSiedlungspfad(id, [500, 500], 40));
    const gross = punkteAus(alsSiedlungspfad(id, [500, 500], 80));
    const hoch = (p) => Math.max(...p.map((q) => q[1])) - Math.min(...p.map((q) => q[1]));
    assert.ok(Math.abs(hoch(gross) / hoch(klein) - 2) < 0.02,
      `${id}: ${hoch(klein).toFixed(1)} → ${hoch(gross).toFixed(1)}`);
    assert.ok(Math.abs(Math.max(...gross.map((q) => q[1])) - 500) < 0.02);
  }
});

pruefe('es ist höher als breit – ein Zeichen, kein Band', () => {
  /*
   * Ein Siedlungszeichen muss in den Fangbereich passen, der um seine Mitte
   * gelegt wird (`zeichenGr * 0.8` im Bauteil). Wäre eines dreimal so breit
   * wie hoch, läge sein halbes Dorf ausserhalb des Kreises, auf den man
   * tippen kann.
   */
  for (const { id } of SIEDLUNGEN) {
    const p = punkteAus(alsSiedlungspfad(id, [0, 0], 100));
    const breit = Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0]));
    const hoch = Math.max(...p.map((q) => q[1])) - Math.min(...p.map((q) => q[1]));
    assert.ok(breit < hoch * 2.2, `${id}: ${breit.toFixed(0)} breit, ${hoch.toFixed(0)} hoch`);
  }
});

pruefe('was keine Siedlung ist, gilt auch nicht als eine', () => {
  for (const falsch of ['land', 'wasser', 'wald', 'fluss', '', 'Dorf', null, undefined, 3, {}]) {
    assert.equal(istSiedlung(falsch), false, `${String(falsch)} ging durch`);
  }
});

/* =======================================================================
 * 2 · NICHTS ENTSTEHT VON SELBST
 * ==================================================================== */

console.log('\n2 · Nichts entsteht von selbst');

pruefe('eine neue Karte hat keine Siedlung', () => {
  /*
   * Nicht „noch keine". *Keine.* Eine Karte, die mit drei Dörfern anfängt,
   * hat eine Geografie, die niemand gezeichnet hat.
   */
  assert.deepEqual(neueKarte('b1').marken, []);
});

pruefe('eine Marke entsteht nur mit einer Art und einem Ort', () => {
  const m = neueMarke('dorf', [120, 340]);
  assert.equal(m.art, 'dorf');
  assert.deepEqual(m.bei, [120, 340]);
  assert.ok(typeof m.id === 'string' && m.id.length > 1);
  assert.ok(Number.isFinite(m.seed));
});

pruefe('das Bauteil setzt die Marke dorthin, wo der Finger war', () => {
  /*
   * Der **Mittelwert des Zuges**, nicht sein Anfang und auch nicht irgendein
   * errechneter Ort. Wer tippt, rutscht ein paar Punkte weit; der Anfang
   * wäre die Stelle, an der der Finger aufsetzte, der Mittelwert die, die er
   * meinte.
   *
   * Und es gibt genau **eine** Stelle im ganzen Quelltext, die eine Marke
   * anlegt. Eine zweite wäre der Anfang des Verteilens.
   */
  const q = ohneProsa(lies('src/components/karte/Weltkarte.tsx'));
  assert.match(q, /const marke = neueMarke\(werkzeug, mitte\);/);
  assert.match(q, /spur\.reduce\(\(a, p\) => a \+ p\[0\], 0\) \/ spur\.length/,
    'die Lage kommt nicht aus dem Strich');
  assert.equal((q.match(/neueMarke\(/g) ?? []).length, 1, 'mehr als eine Quelle für Marken');
});

pruefe('keine Stelle im Programm verteilt Siedlungen', () => {
  /*
   * Die naheliegende Idee wäre: Für jede Seite im Buch, die noch keinen Ort
   * hat, ein Dorf in die nächstgelegene Landmasse. Es würde funktionieren
   * und es wäre erfundene Geografie – dieselbe Falle wie der errechnete
   * Fluss. Hier wird deshalb nachgesehen, dass niemand aus Einträgen,
   * Höhen oder Zufall Marken erzeugt.
   */
  for (const p of [
    'src/components/karte/Weltkarte.tsx',
    'src/pages/book/Weltkarte.tsx',
    'src/components/karte/Relief.tsx',
    'src/lib/karte/siedlung.ts',
    'src/lib/karte/modell.ts',
  ]) {
    const q = ohneProsa(lies(p));
    assert.doesNotMatch(q, /(lebende|entries|geordnet|namen)[^\n]*\.map\([^\n]*neueMarke/,
      `${p} erzeugt Marken aus dem Buch`);
    assert.doesNotMatch(q, /marken:\s*\[[^\]]*neueMarke\([^)]*\)\s*,\s*neueMarke/,
      `${p} legt mehrere Marken auf einmal an`);
  }
});

pruefe('die Liste der Seiten wird geordnet, nicht gefüllt', () => {
  /*
   * Dieselbe Zusage wie beim Fluss, jetzt auch für die Siedlungen: Eine
   * Seite, die schon ein Dorf hat, rutscht nach unten – sie fällt nicht
   * heraus, und es wird nichts von selbst gesetzt.
   */
  const q = ohneProsa(lies('src/pages/book/Weltkarte.tsx'));
  assert.match(q, /\(karte\.marken \?\? \[\]\)\.map\(\(m\) => m\.entryId\)/,
    'Siedlungen zählen nicht als Ort');
  assert.match(q, /return \[\.\.\.ohne, \.\.\.mit\];/, 'die Belegten fallen heraus');
  assert.doesNotMatch(q, /noch ohne Ort|fehlen|von \$\{/i, 'es mahnt');
});

/* =======================================================================
 * 3 · DIE HEILUNG WIRFT KEIN DORF UM
 * ==================================================================== */

console.log('\n3 · Die Heilung wirft kein Dorf um');

const roh = (marken) => ({
  id: 'k1', bookId: 'b1', seed: 3, styleId: 'artbook',
  features: [], marken, createdAt: 1, updatedAt: 2,
});

pruefe('eine gültige Marke kommt unverändert durch', () => {
  const k = heileKarte(roh([
    { id: 'm1', art: 'burg', bei: [100, 200], seed: 42, entryId: 'e9' },
  ]));
  assert.equal(k.marken.length, 1);
  assert.deepEqual(k.marken[0], { id: 'm1', art: 'burg', bei: [100, 200], seed: 42, entryId: 'e9' });
});

pruefe('eine unbekannte Art fällt weg, statt zur Hütte zu werden', () => {
  /*
   * **Kein Rückfall.** Der bequeme Weg wäre `istSiedlung(art) ? art :
   * 'huette'` – und dann stünde nach einem Einlesen eine Hütte, wo eine
   * Burg stand. Ein Dorf, das plötzlich etwas anderes ist, ist eine
   * Behauptung über die Welt; ein fehlendes ist ein Verlust. Von beidem ist
   * der Verlust der ehrlichere, denn man sieht ihn.
   */
  const k = heileKarte(roh([
    { id: 'm1', art: 'kloster', bei: [1, 2], seed: 1 },
    { id: 'm2', art: 'land', bei: [1, 2], seed: 1 },
    { id: 'm3', bei: [1, 2], seed: 1 },
  ]));
  assert.deepEqual(k.marken, []);
});

pruefe('eine Marke ohne brauchbare Lage fällt weg', () => {
  /*
   * Eine Siedlung *ist* ein Ort. Ohne Lage wäre sie ein Eintrag, der auf
   * der Karte nicht dasteht – und beim nächsten Speichern immer noch da.
   */
  const k = heileKarte(roh([
    { id: 'a', art: 'dorf', bei: [1], seed: 1 },
    { id: 'b', art: 'dorf', bei: [1, 2, 3], seed: 1 },
    { id: 'c', art: 'dorf', bei: ['1', '2'], seed: 1 },
    { id: 'd', art: 'dorf', bei: [NaN, 2], seed: 1 },
    { id: 'e', art: 'dorf', bei: [1, Infinity], seed: 1 },
    { id: 'f', art: 'dorf', seed: 1 },
    { id: 'g', art: 'dorf', bei: null, seed: 1 },
  ]));
  assert.deepEqual(k.marken, []);
});

pruefe('ein fehlender Startwert ist harmlos und bekommt einen', () => {
  const k = heileKarte(roh([{ id: 'm1', art: 'huette', bei: [5, 5] }]));
  assert.equal(k.marken.length, 1);
  assert.ok(Number.isFinite(k.marken[0].seed));
});

pruefe('eine Karte von vor dieser Runde ist keine beschädigte Karte', () => {
  /*
   * Jede gespeicherte Karte hat kein `marken`-Feld. Sie muss durchkommen,
   * und zwar mit einer leeren Liste – nicht mit `undefined`, denn sonst
   * müsste jede Stelle, die Marken liest, den Fall noch einmal kennen.
   */
  const alt = roh(undefined);
  delete alt.marken;
  assert.deepEqual(heileKarte(alt).marken, []);
  assert.deepEqual(heileKarte(roh('kaputt')).marken, []);
  assert.deepEqual(heileKarte(roh(17)).marken, []);
});

/* =======================================================================
 * 4 · DIE STILLEN FEHLER
 * ==================================================================== */

console.log('\n4 · Die stillen Fehler');

pruefe('das Rückgängig nimmt auch Siedlungen zurück', () => {
  /*
   * Hier stand `Kartenfeature[][]`. Mit den Siedlungen wäre das still
   * falsch geworden: Wer ein Dorf setzt und „Zurücknehmen" drückt, bekäme
   * sein Dorf nicht weg – und wer danach eine Küste zurücknimmt, bekäme die
   * Flächen von vorher und die Marken von jetzt. Zwei Zeitpunkte in einem
   * Bild, und niemand fände heraus, warum.
   */
  const q = ohneProsa(lies('src/pages/book/Weltkarte.tsx'));
  assert.match(q, /type Schritt = \{ features: Kartenfeature\[\]; marken: Kartenmarke\[\] \}/);
  assert.match(q, /\{ features: karte\.features, marken: karte\.marken \?\? \[\] \}/,
    'der Schritt legt die Marken nicht ab');
  assert.match(q, /features: vorher\.features, marken: vorher\.marken/,
    'das Zurücknehmen holt die Marken nicht');
});

pruefe('Abschrift und Sicherung schreiben die Seite um', () => {
  /*
   * Beide Stellen bauen ihre Karte mit einem Spread (`...k`). Der trägt
   * `marken` mit – **und mit der alten `entryId`**. In der Abschrift zeigte
   * ein Dorf dann auf die Seite des Originalbuchs, in der eingelesenen
   * Sicherung auf einen Eintrag, den es nicht mehr gibt. Ein Dorf, das auf
   * eine fremde Seite führt, ist schlimmer als eines ohne Seite.
   */
  const k = ohneProsa(lies('src/lib/kopie.ts'));
  assert.match(k, /marken: k\.marken\?\.map\(\(m\) => \(\{[\s\S]*?id: newId\('m'\)/,
    'die Abschrift behält die Kennung');
  assert.match(k, /entryId: m\.entryId \? u\.entries\.get\(m\.entryId\) : undefined/);
  const p = ohneProsa(lies('src/lib/portability.ts'));
  assert.match(p, /marken: k\.marken\?\.map\(\(m\) => \(\{/);
  assert.match(p, /entryId: m\.entryId \? neu\.get\(m\.entryId\) : undefined/);
});

pruefe('die Siedlungen sind auch im Relief da', () => {
  /*
   * Das Relief ist dieselbe Karte, nur anders angesehen (Gesetz 5).
   * Fehlten die Dörfer, hiesse das Aufrichten „deine Siedlungen sind weg" –
   * und wer nachsieht, findet sie flach wieder. Zwei Bilder derselben Welt,
   * die sich widersprechen.
   *
   * Und sie stehen auf der Höhe der Fläche unter ihnen, nicht auf null:
   * sonst schwebte ein Bergdorf unter seinem Berg.
   */
  const q = ohneProsa(lies('src/components/karte/Relief.tsx'));
  assert.match(q, /\(karte\.marken \?\? \[\]\)\.map\(/, 'das Relief zeichnet keine Marken');
  assert.match(q, /\}, \[karte\.features, karte\.marken\]\)/,
    'das gerechnete Bild merkt eine neue Siedlung nicht');
  /*
   * **Innerhalb des Zeichenblocks nachsehen, nicht in der ganzen Datei.**
   *
   * Der erste Anlauf prüfte nur, dass `imPolygon` irgendwo in dieser Datei
   * vorkommt. Die Gegenprobe – die Höhensuche aus dem Zeichenblock
   * entfernen – blieb grün, weil dieselbe Suche auch im Rahmen steht
   * (`kaesten`). Eine Prüfung, die den *Import* findet statt die
   * *Verwendung*, prüft nichts.
   */
  const zeichnet = q.slice(q.indexOf('{(karte.marken ?? []).map((m) => {'));
  assert.match(zeichnet, /imPolygon\(m\.bei\[0\], m\.bei\[1\], f\.punkte\)/,
    'die Höhe unter der Marke wird beim Zeichnen nicht gesucht');
  assert.match(zeichnet, /const \[px, py\] = iso\(m\.bei\[0\], m\.bei\[1\], h\);/,
    'das Zeichen steht nicht auf der gefundenen Höhe');
  assert.match(zeichnet, /alsSiedlungspfad\(m\.art, \[px, py\], SIEDLUNG_HOEHE\)/);
});

pruefe('eine Siedlung auf blankem Papier bleibt im Bild', () => {
  /*
   * Der Rahmen des Reliefs kommt aus den Flächen (`reliefSicht`). Eine
   * Marke, die zu keiner Fläche gehört – und das darf sie –, wüsste er
   * nicht. Gemessen am Bild wäre das eine Burg ausserhalb des Ausschnitts:
   * vorhanden, gespeichert, nicht zu sehen.
   */
  const q = ohneProsa(lies('src/components/karte/Relief.tsx'));
  const rahmen = q.slice(q.indexOf('const kaesten = folge.map'), q.indexOf('/* Die Bäume'));
  assert.match(rahmen, /for \(const m of karte\.marken \?\? \[\]\)/,
    'die Siedlungen zählen nicht zum Rahmen');
  assert.match(rahmen, /kaesten\.push\(/);
  assert.match(rahmen, /SIEDLUNG_HOEHE/, 'die Höhe des Zeichens fehlt im Rahmen');
});

pruefe('Fangbereich, Auswahlring und Zeichen teilen eine Zahl', () => {
  /*
   * Gesetz 5, in der kleinsten Form, die es gibt: Stünde die Grösse
   * dreimal da, wäre der Ring beim nächsten Nachjustieren neben dem Dorf
   * und der Fangbereich daneben. Es gibt genau eine Stelle, an der sie
   * steht – und drei, die sie lesen.
   */
  const q = ohneProsa(lies('src/components/karte/Weltkarte.tsx'));
  assert.equal((q.match(/const zeichenGr = /g) ?? []).length, 1);
  assert.ok((q.match(/zeichenGr/g) ?? []).length >= 5,
    'die Zahl wird nicht überall gelesen');
  assert.doesNotMatch(q, /alsSiedlungspfad\(m\.art, m\.bei, sicht\.w \* /,
    'das Zeichen rechnet die Grösse selbst');
});

pruefe('die leere Karte heisst leer, auch ohne Flächen', () => {
  /*
   * Hier stand `karte.features.length === 0`. Eine Karte mit drei Dörfern
   * und ohne Küste hätte weiter „Mal einen Fleck" unter den Dörfern stehen
   * – ein Hinweis, der etwas über das Bild behauptet, was man im Bild
   * widerlegt sieht.
   */
  for (const p of ['src/components/karte/Weltkarte.tsx', 'src/components/karte/Relief.tsx']) {
    const q = ohneProsa(lies(p));
    assert.match(q, /karte\.features\.length === 0 && \(karte\.marken \?\? \[\]\)\.length === 0/,
      `${p} hält eine Karte mit Dörfern für leer`);
  }
});

pruefe('die Siedlung ist antippbar und nicht nur ein Bild', () => {
  /*
   * Ein Strich von 1,4 Bildpunkten trifft kein Finger – der Fangbereich ist
   * deshalb ein Kreis. Und er liegt **nach** den Flächen im Quelltext,
   * damit er sie überdeckt: Wer ein Dorf antippt, meint das Dorf und nicht
   * das Land darunter.
   */
  const q = ohneProsa(lies('src/components/karte/Weltkarte.tsx'));
  assert.match(q, /onClick=\{\(\) => \{\s*if \(!bewegt\.current\) onWaehle\(m\.id\);/,
    'die Marke nimmt keine Finger an');
  const fang = q.indexOf('fang_');
  const flaechen = q.indexOf('{geordnet.map((f) => {');
  assert.ok(fang > flaechen && flaechen > 0,
    'der Fangbereich liegt unter den Flächen');
});

pruefe('ein Siedlungszeichen ist keine Küstenlinie', () => {
  /*
   * Der erste Anlauf zeichnete die Siedlungen in `stil.land.linie`. Im
   * gerenderten Bild war davon fast nichts zu sehen, und gemessen ist klar
   * warum: **1,29 : 1** auf Land, 1,23 : 1 auf Wald.
   *
   * Eine Küstenlinie liegt zwischen zwei Flächen und muss leise sein; ein
   * Siedlungszeichen liegt *auf* einer Fläche und muss gelesen werden.
   * `stil.marke` bringt 3,92 : 1 hell und 7,08 : 1 dunkel – dieselbe Tinte
   * wie der Name daneben, und das ist auch inhaltlich richtig: Zeichen und
   * Name sind eine Marke.
   */
  for (const p of ['src/components/karte/Weltkarte.tsx', 'src/components/karte/Relief.tsx']) {
    const q = ohneProsa(lies(p));
    /*
     * **`alsSiedlungspfad(m.art` und nicht `alsSiedlungspfad`.** Der erste
     * Anlauf suchte den blossen Namen – und fand die Import-Zeile ganz oben.
     * Eine Prüfung, die den Import findet statt die Verwendung, prüft
     * nichts; das ist in dieser Runde schon einmal passiert.
     */
    const i = q.indexOf('alsSiedlungspfad(m.art');
    assert.ok(i > 0, `${p} zeichnet kein Siedlungszeichen`);
    const block = q.slice(i, i + 900);
    assert.match(block, /stroke=\{stil\.marke\}/, `${p}: nicht in der Markenfarbe`);
    assert.doesNotMatch(block, /stroke=\{stil\.land\.linie\}/,
      `${p}: in der Küstenfarbe, also unsichtbar`);
  }
});

pruefe('der Tipp, der ein Dorf setzt, wählt nicht die Fläche darunter', () => {
  /*
   * **Im Bild gefunden, nicht im Quelltext.** Nach dem Setzen eines Dorfs
   * stand „Diese *Fläche*" da, mit der Küste darin – und das Dorf war aus
   * der Auswahl. Der Grund: Ein Tipp bewegt den Finger nicht, und nach dem
   * Loslassen schickt der Browser über demselben Punkt noch einen Klick. Der
   * traf die Landfläche, deren `onClick` nur fragt „war der Finger in
   * Bewegung?".
   *
   * Der Fangkreis der Marke konnte nicht helfen: Den gibt es in diesem
   * Augenblick noch nicht, denn die Marke entsteht erst beim Loslassen.
   */
  const q = ohneProsa(lies('src/components/karte/Weltkarte.tsx'));
  assert.match(q, /verbraucht\.current = true;/, 'der Tipp wird nicht verbraucht');
  assert.match(q, /if \(!bewegt\.current && !verbraucht\.current\) onWaehle\(f\.id\);/,
    'die Fläche lässt sich vom Nachklapp noch wählen');
  assert.match(q, /bewegt\.current = false;\s*\n\s*verbraucht\.current = false;/,
    'der nächste Fingerdruck setzt es nicht zurück');
});

pruefe('und das Bedienfeld der Siedlung ist ein eigenes', () => {
  /*
   * **Warum nicht ein gemeinsames.** Beides hat eine Art, eine Seite und
   * ein „entfernen" – aber die *Arten* gehören nicht zusammen. „Land,
   * Wasser, Wald, Hütte, Dorf, Burg" in einer Reihe liest sich wie sechs
   * gleichwertige Wahlmöglichkeiten, und dann tippt jemand auf seiner Küste
   * „Burg" und sie verschwindet. Eine Fläche kann keine Burg werden; sie
   * hat einen Umriss, keinen Ort.
   */
  const q = ohneProsa(lies('src/pages/book/Weltkarte.tsx'));
  assert.match(q, /\{marke && \(/, 'es gibt kein Bedienfeld für die Siedlung');
  assert.match(q, /Diese Siedlung/);
  assert.match(q, /Siedlung entfernen/);
  assert.match(q, /\{SIEDLUNGEN\.map\(\(s\) => \(/);
  /* Und die Bedeutungen der Flächen stehen nicht in derselben Reihe. */
  const feld = q.slice(q.indexOf('{marke && ('));
  assert.doesNotMatch(feld, /BEDEUTUNGEN\.map/, 'Flächenarten im Siedlungsfeld');
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
