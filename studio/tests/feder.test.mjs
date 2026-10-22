/**
 * Die Feder – warum eine Küstenlinie nicht überall gleich dick ist.
 *
 * Bis hierher wurde der Umriss einer Fläche *gestrichen*: `strokeWidth`
 * gilt für den ganzen Pfad, also ist die Linie überall gleich breit. Das ist
 * die Handschrift einer Maschine. Eine Feder wird in der Kurve dicker und im
 * Schwung dünner.
 *
 * ---
 *
 * **Was hier nicht geprüft wird, und warum.**
 *
 * Wie eine Linie *aussieht*, kann diese Datei nicht sagen – das stand im
 * Browser und ist dort auch nachgesehen worden. Geprüft wird, was darunter
 * zusammenbrechen würde, ohne dass man es gleich sieht:
 *
 *   **Dieselbe Küste muss dieselbe Feder bekommen.** Sonst flimmert die
 *   Karte beim Verschieben – ein Fehler, den man nicht sieht, sondern spürt.
 *
 *   **Die Linie darf nirgends verschwinden.** Eine Breite, die auf null
 *   fällt, ergibt eine Lücke, und Lücken sieht man erst auf dem fertigen
 *   Bild.
 *
 *   **Sie muss mitwachsen.** Alle Masse hängen an `dick`; eine halbierte
 *   Strichbreite soll eine halb so kräftige Feder ergeben, keine dünne
 *   Linie, die wild schlägt.
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
const bau = join(ARBEIT, 'feder');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
execFileSync(
  'npx',
  ['esbuild', 'src/lib/karte/feder.ts', '--bundle', '--format=esm',
   `--outfile=${join(bau, 'feder.mjs')}`, '--log-level=error'],
  { cwd: wurzel, stdio: 'inherit' },
);
const { federzug, gleichmaessig } = await import(join(bau, 'feder.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => {
  fn();
  geprueft++;
  console.log(`  ✓ ${was}`);
};

/** Ein Vieleck, wie es aus `flaecheAus` kommt: geschlossen, krumm, nicht rund. */
const kreis = (n = 40, r = 120, cx = 500, cy = 500, zacke = 0) => {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const rr = r * (1 + zacke * Math.sin(t * 7));
    p.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
  }
  return p;
};

/** Alle Zahlenpaare aus einer `d`-Angabe. */
const punkteAus = (d) => {
  const z = d.match(/-?\d+\.?\d*/g) ?? [];
  const aus = [];
  for (let i = 0; i + 1 < z.length; i += 2) aus.push([Number(z[i]), Number(z[i + 1])]);
  return aus;
};

/* =======================================================================
 * 1 · IMMER DIESELBE FEDER
 * ==================================================================== */

console.log('\n1 · Immer dieselbe Feder');

pruefe('derselbe Seed ergibt denselben Zug', () => {
  /*
   * **Die Zusage, an der die Ruhe der Karte hängt.**
   *
   * Jede Fläche trägt ihren `seed` ohnehin (siehe `Kartenfeature`). Käme die
   * Schwankung aus `Math.random`, bekäme die Küste bei jedem Neuzeichnen
   * eine neue Feder – und die Karte flimmerte unter dem Finger, sobald man
   * sie verschiebt.
   */
  const p = kreis();
  assert.equal(federzug(p, 2, 1234), federzug(p, 2, 1234));
});

pruefe('ein anderer Seed ergibt einen anderen Zug', () => {
  const p = kreis();
  assert.notEqual(federzug(p, 2, 1234), federzug(p, 2, 1235));
});

/* =======================================================================
 * 2 · DIE LINIE REISST NICHT AB
 * ==================================================================== */

console.log('\n2 · Die Linie reisst nicht ab');

pruefe('jeder Abschnitt bekommt ein eigenes Viereck', () => {
  /*
   * Zwei lange Ringe wären billiger und hätten eine bekannte Schwäche: An
   * einer Ecke, die schärfer ist als der Versatz breit, überschlägt sich die
   * innere Seite, und `nonzero` zählt die Schleife als Loch. Vier Ecken je
   * Abschnitt, alle gleich herum, können das nicht.
   */
  /*
   * Die Zahl richtet sich nach dem **abgetasteten** Umriss, nicht nach dem
   * eingegebenen: `federzug` tastet vorher im Mass der Strichbreite neu ab.
   * Mein erster Versuch verglich mit der Eingabe (40) und schlug bei 171
   * an – die Prüfung war falsch, nicht das Bauteil.
   */
  const p40 = kreis(40);
  const d = federzug(p40, 2, 7);
  const teile = d.split('Z').filter((t) => t.trim());
  assert.equal(teile.length, gleichmaessig(p40, 2 * 2.5).length,
    `${teile.length} Teilstücke, aber ${gleichmaessig(p40, 5).length} abgetastete Punkte`);
  for (const t of teile) {
    assert.equal((t.match(/[ML]/g) ?? []).length, 4, `ein Teilstück hat keine vier Ecken: ${t}`);
  }
});

pruefe('benachbarte Vierecke stossen genau aneinander', () => {
  /*
   * **Hier entstünden die Lücken.** Teilen zwei Nachbarn ihre Kante nicht
   * exakt, klafft zwischen ihnen ein Spalt – auf dem Bildschirm eine
   * gestrichelte Küste. Geprüft wird auf Gleichheit der Zeichenkette, nicht
   * auf Nähe: Gerundet wird einmal, am Ende, für beide gleich.
   */
  const d = federzug(kreis(30), 2.5, 99);
  const teile = d.split('Z').map((t) => t.trim()).filter(Boolean);
  for (let i = 0; i < teile.length; i++) {
    const a = punkteAus(teile[i]);
    const b = punkteAus(teile[(i + 1) % teile.length]);
    /* Ecke 2 und 3 des einen sind Ecke 1 und 4 des nächsten. */
    assert.deepEqual(a[1], b[0], `Spalt zwischen ${i} und ${i + 1}`);
    assert.deepEqual(a[2], b[3], `Spalt zwischen ${i} und ${i + 1}`);
  }
});

pruefe('die Breite fällt nie auf null', () => {
  /*
   * Eine Breite von null ist ein unsichtbares Stück Linie. Die untere
   * Schranke steht als `Math.max` im Bauteil; hier wird nachgerechnet, dass
   * sie wirkt – bei jeder Schwankung, auch bei einer übertriebenen.
   */
  for (const schwank of [0, 0.55, 1, 3]) {
    for (const seed of [1, 17, 4711, 99991]) {
      const teile = federzug(kreis(36), 2, seed, schwank).split('Z').filter((t) => t.trim());
      for (const t of teile) {
        const q = punkteAus(t);
        const breite = Math.hypot(q[0][0] - q[3][0], q[0][1] - q[3][1]);
        assert.ok(breite > 0.05, `Breite ${breite} bei Schwankung ${schwank}, Seed ${seed}`);
      }
    }
  }
});

/* =======================================================================
 * 3 · DAS MASS HÄNGT AN DER STRICHBREITE
 * ==================================================================== */

console.log('\n3 · Das Mass hängt an der Strichbreite');

pruefe('doppelte Strichbreite, doppelt so kräftige Feder', () => {
  /*
   * Wer morgen `stil.strich` ändert, soll eine entsprechend kräftige Feder
   * bekommen – keine feste Zahl, die bei feinem Strich wild schlägt.
   */
  const p = kreis();
  const mass = (dick) => {
    const teile = federzug(p, dick, 5).split('Z').filter((t) => t.trim());
    const breiten = teile.map((t) => {
      const q = punkteAus(t);
      return Math.hypot(q[0][0] - q[3][0], q[0][1] - q[3][1]);
    });
    return breiten.reduce((s, b) => s + b, 0) / breiten.length;
  };
  const eins = mass(1);
  const zwei = mass(2);
  assert.ok(Math.abs(zwei / eins - 2) < 0.08, `Verhältnis ${(zwei / eins).toFixed(3)} statt 2`);
});

pruefe('ohne Schwankung ist die Linie gleichmässig', () => {
  /*
   * `schwankung: 0` muss genau das alte Verhalten ergeben – eine Linie
   * gleicher Breite. Ohne diesen Rückweg liesse sich die Feder nicht
   * abschalten, wenn sie jemandem einmal im Weg ist.
   */
  const teile = federzug(kreis(24), 2, 3, 0).split('Z').filter((t) => t.trim());
  const breiten = teile.map((t) => {
    const q = punkteAus(t);
    return Math.hypot(q[0][0] - q[3][0], q[0][1] - q[3][1]);
  });
  const min = Math.min(...breiten);
  const max = Math.max(...breiten);
  assert.ok(max - min < 0.02, `Breite schwankt zwischen ${min} und ${max}`);
});

/* =======================================================================
 * 4 · WAS NICHTS ERGIBT, ERGIBT NICHTS
 * ==================================================================== */

console.log('\n4 · Was nichts ergibt, ergibt nichts');

pruefe('zu wenige Punkte ergeben eine leere Angabe', () => {
  /*
   * Ein leeres `d` zeichnet nichts. Das ist die richtige Antwort auf einen
   * Umriss aus zwei Punkten – zeichnete man stattdessen irgendetwas, stünde
   * es auf der Karte und niemand wüsste, woher.
   */
  assert.equal(federzug([], 2, 1), '');
  assert.equal(federzug([[0, 0], [1, 1]], 2, 1), '');
  assert.equal(federzug(kreis(), 0, 1), '');
  assert.equal(federzug(kreis(), -1, 1), '');
});

pruefe('ein Haarstrich bringt das Abtasten nicht zum Stehen', () => {
  /*
   * **Der Fall, der wirklich gefährlich ist.**
   *
   * Der Abtastschritt hängt an der Strichbreite. Wird sie winzig, fällt er
   * auf die untere Schranke von 1e-6 – und ein Umriss von 750 Einheiten
   * Umfang ergäbe dreiviertel einer Milliarde Punkte. Das friert nicht nur
   * die Karte ein, sondern den ganzen Bildschirm.
   *
   * Mein erster Versuch prüfte stattdessen zwei gleiche Punkte
   * hintereinander – dort ist der Abstand null, die Schleife läuft gar nicht
   * erst, und die Gegenprobe blieb folgerichtig grün. Die Prüfung traf den
   * Fall nicht, den sie zu treffen glaubte.
   */
  const t0 = Date.now();
  const d = federzug(kreis(40), 1e-9, 1);
  const dauer = Date.now() - t0;
  assert.ok(typeof d === 'string');
  assert.ok(dauer < 2000, `${dauer} ms – das Abtasten läuft davon`);
  assert.ok(d.length < 4_000_000, `${d.length} Zeichen Pfadangabe`);

  /* Und entartete Punkte dürfen trotzdem nichts anrichten. */
  assert.ok(gleichmaessig([[0, 0], [0, 0], [0, 0]], 1).length < 10000);
});

/* =======================================================================
 * 5 · OB SIE ÜBERHAUPT GEZOGEN WIRD
 * ==================================================================== */

console.log('\n5 · Ob sie überhaupt gezogen wird');

const lies = (p) => readFileSync(join(wurzel, p), 'utf8');
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

pruefe('die Karte zieht die Feder statt zu streichen', () => {
  const q = ohneProsa(lies('src/components/karte/Weltkarte.tsx'));
  assert.match(q, /d=\{federzug\(f\.punkte, stil\.strich, f\.seed \?\? 1\)\}/);
  assert.match(q, /import \{ federzug \}/);
});

pruefe('die Fläche trägt keine zweite Linie mehr', () => {
  /*
   * Bliebe `stroke` an der Fläche stehen, läge die gleichmässige Maschinen­
   * linie unter der Feder – und man sähe von der Feder nur die dickeren
   * Stellen.
   */
  const q = ohneProsa(lies('src/components/karte/Weltkarte.tsx'));
  const flaeche = q.match(/<path\s+d=\{d\}\s+fill=\{c\.flaeche\}[\s\S]{0,200}?\/>/);
  assert.ok(flaeche, 'die Fläche sieht anders aus als erwartet');
  assert.doesNotMatch(flaeche[0], /stroke/, 'die Fläche wird wieder gestrichen');
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
