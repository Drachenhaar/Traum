/**
 * Das Gebirge – die Zusagen des Höhenzuges.
 *
 * ---
 *
 * **Worum es geht.**
 *
 * Ein Gebirge wird nicht gespeichert, sondern gerechnet: aus einer Linie,
 * vier Zahlen und einem Startwert. Was hier geprüft wird, sind genau die
 * Eigenschaften, die diese Entscheidung tragen muss:
 *
 *   · Dieselbe Geometrie ergibt dieselbe Landschaft – immer, überall.
 *   · Eine kleine Änderung am Kamm wirkt **nur dort**.
 *   · Der schnelle Weg rechnet dasselbe wie der schlichte.
 *   · Der Höhenzug hängt zusammen und zerfällt nicht in einzelne Berge.
 *   · Was gespeichert wird, kommt unversehrt zurück – samt seiner Welt.
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
const bau = join(ARBEIT, 'gebirge');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
const baue = (quelle, name) =>
  execFileSync(
    'npx',
    ['esbuild', quelle, '--bundle', '--format=esm',
     `--outfile=${join(bau, name)}`, '--log-level=error'],
    { cwd: wurzel, stdio: 'inherit' },
  );

baue('src/lib/karte/gebirge.ts', 'gebirge.mjs');
baue('src/lib/karte/modell.ts', 'modell.mjs');

const G = await import(join(bau, 'gebirge.mjs'));
const M = await import(join(bau, 'modell.mjs'));

let geprueft = 0;
const pruefe = (was, fn) => { fn(); geprueft++; console.log(`  ✓ ${was}`); };
const lies = (p) => readFileSync(join(wurzel, p), 'utf8');
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const KAMM = {
  id: 'g1', seed: 4711, breite: 110, hoehe: 0.8, zerkluftung: 0.5,
  punkte: [[150, 400], [260, 362], [370, 400], [480, 352], [590, 386], [700, 344], [820, 380]],
};

/** Ein Gitter von Proben über den ganzen Zug. */
const proben = (k, schritt = 11) => {
  const kk = G.gebirgskasten(k);
  const aus = [];
  for (let y = kk.y0; y <= kk.y1; y += schritt) {
    for (let x = kk.x0; x <= kk.x1; x += schritt) aus.push([x, y, G.hoeheBei(x, y, k)]);
  }
  return aus;
};

console.log('\n1 · Dieselbe Landschaft');

pruefe('dieselbe Geometrie und derselbe Seed ergeben dieselbe Höhe', () => {
  /*
   * Die Zusage, auf der alles andere steht. Nichts hier hat einen Zustand,
   * keine Folge, kein „nächster Wert" – und deshalb ist dies keine
   * Beobachtung über einen Lauf, sondern eine über die Bauart.
   */
  const a = proben(KAMM);
  const b = proben({ ...KAMM, punkte: KAMM.punkte.map((p) => [...p]) });
  assert.equal(a.length, b.length);
  assert.ok(a.length > 400, `nur ${a.length} Proben – die Prüfung trifft zu wenig`);
  for (let i = 0; i < a.length; i++) {
    assert.equal(a[i][2], b[i][2], `bei ${a[i][0]},${a[i][1]}: ${a[i][2]} gegen ${b[i][2]}`);
  }
});

pruefe('ein anderer Seed ergibt eine andere Landschaft', () => {
  /*
   * Die Gegenseite: Wäre der Startwert wirkungslos, wäre jedes Gebirge
   * dasselbe Gebirge – und man merkte es erst, wenn zwei nebeneinander
   * stehen.
   */
  /*
   * **Gezählt wird nur, wo überhaupt Gebirge steht.** Der erste Anlauf nahm
   * alle Proben des Kastens – und weil der Kasten zu grossen Teilen leer
   * ist, blieb die Prüfung grün, als der Startwert nur noch in zwei von
   * drei Lagen wirkte. Eine Schwelle über einer Zahl, die zur Hälfte aus
   * Nullen besteht, misst die Nullen.
   */
  const a = proben(KAMM);
  const b = proben({ ...KAMM, seed: KAMM.seed + 1 });
  let drauf = 0;
  let anders = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i][2] <= 0 && b[i][2] <= 0) continue;
    drauf++;
    if (a[i][2] !== b[i][2]) anders++;
  }
  assert.ok(drauf > 300, `nur ${drauf} Proben liegen im Gebirge`);
  assert.ok(anders > drauf * 0.95,
    `nur ${anders} von ${drauf} Proben im Gebirge unterscheiden sich`);
});

console.log('\n2 · Kleine Änderung, kleine Wirkung');

pruefe('ein verschobener Kammpunkt wirkt nur in seiner Umgebung', () => {
  /*
   * **Die schwierigste Forderung, und sie ist eine Folge der Bauart.**
   *
   * Alles Zufällige hängt am Ort – am Fusspunkt des Kamms, nicht an einer
   * Bogenlänge. Deshalb verschiebt ein Punkt am Westende nicht das Ostende.
   * Mit einer Folge wäre das Gegenteil wahr, und `zufall.ts` sagt im Kopf,
   * warum.
   *
   * Geprüft wird **bitgenau**: Nicht „fast gleich", sondern gleich. Eine
   * Prüfung mit Toleranz hätte eine schleichende Verschiebung durchgelassen.
   */
  const verschoben = {
    ...KAMM,
    /* In **beide** Richtungen verschoben: Eine Probe, die nur die Höhe
       ändert, liesse einen Fehler durch, der nur an der Längsrichtung
       hängt – und genau so einer blieb beim Gegenproben unentdeckt. */
    punkte: KAMM.punkte.map((p, i) => (i === 1 ? [214, 300] : p)),
  };

  let fern = 0;
  let nah = 0;
  for (let y = 250; y <= 520; y += 7) {
    for (let x = 100; x <= 880; x += 7) {
      const a = G.hoeheBei(x, y, KAMM);
      const b = G.hoeheBei(x, y, verschoben);
      /* Weit weg vom verschobenen Punkt: exakt dasselbe. */
      if (x > 560) {
        assert.equal(a, b, `bei ${x},${y} hat sich etwas geändert: ${a} gegen ${b}`);
        fern++;
      } else if (a !== b) nah++;
    }
  }
  assert.ok(fern > 1500, `nur ${fern} ferne Proben`);
  assert.ok(nah > 200, `nur ${nah} Proben haben sich überhaupt geändert – wirkt der Zug?`);
});

pruefe('der Kasten enthält wirklich alles, was nicht null ist', () => {
  /*
   * Daran hängt das gezielte Entwerten: Was ausserhalb des Kastens liegt,
   * wird beim Ändern **nicht** neu gebacken. Reichte der Zug darüber
   * hinaus, bliebe dort ein Stück altes Gebirge stehen – und zwar
   * unsichtbar, bis jemand genau dorthin sieht.
   */
  const kk = G.gebirgskasten(KAMM);
  for (let y = kk.y0 - 60; y <= kk.y1 + 60; y += 9) {
    for (let x = kk.x0 - 60; x <= kk.x1 + 60; x += 9) {
      if (x >= kk.x0 && x <= kk.x1 && y >= kk.y0 && y <= kk.y1) continue;
      assert.equal(G.hoeheBei(x, y, KAMM), 0, `ausserhalb des Kastens steht Gebirge bei ${x},${y}`);
    }
  }
});

console.log('\n3 · Keine zweite Wahrheit');

pruefe('der schnelle Weg rechnet dasselbe wie der schlichte', () => {
  /*
   * `gebirgsfeld` sortiert je Kachel vor: Welcher Zug reicht herein, und
   * von ihm welche Abschnitte. Das brachte **51 ms auf 8 ms** je
   * Reliefkachel – und es ist genau die Sorte Abkürzung, die still etwas
   * anderes rechnet.
   *
   * Sie tat es auch: Weggelassene Abschnitte zogen über die weiche
   * Mittelung noch am Fusspunkt, und an jeder Kachelgrenze stand eine
   * senkrechte Naht. Seitdem ist die Reichweite begrenzt und der Filter
   * rechnet mit demselben Mass.
   *
   * Geprüft wird über **mehrere Ausschnitte**, denn der Fehler zeigte sich
   * nur an ihren Rändern.
   */
  /*
   * **Ein langer Kamm und kleine Ausschnitte.**
   *
   * Der erste Anlauf nahm einen Zug von siebenhundert Einheiten und
   * Ausschnitte von zweihundertfünfzig – da liess der Filter ohnehin fast
   * alles stehen, und die Gegenprobe „Einflussweite wieder unbegrenzt"
   * blieb grün. Geprüft wurde eine Abkürzung, die gar nicht abkürzte.
   *
   * Jetzt läuft der Kamm über die ganze Karte und die Ausschnitte sind
   * klein: Der Filter wirft wirklich Abschnitte weg, und wenn einer davon
   * noch etwas beiträgt, zeigt es sich.
   */
  const lang = {
    ...KAMM, id: 'lang',
    punkte: Array.from({ length: 19 }, (_, i) => [
      30 + i * 52, 400 + Math.sin(i / 2.2) * 70,
    ]),
  };
  const kaemme = [lang, { ...KAMM, id: 'g2', seed: 99, punkte: [[400, 120], [460, 700]] }];
  for (const [x0, y0, x1, y1] of [
    [120, 300, 245, 425], [245, 300, 370, 425], [370, 300, 495, 425],
    [495, 300, 620, 425], [620, 425, 745, 550], [745, 300, 870, 425],
    [310, 360, 435, 485],
  ]) {
    const feld = G.gebirgsfeld(kaemme, { x0, y0, x1, y1 });
    for (let y = y0; y <= y1; y += 5) {
      for (let x = x0; x <= x1; x += 5) {
        const schnell = feld(x, y);
        const schlicht = G.hoeheUeberall(x, y, kaemme);
        assert.ok(
          Math.abs(schnell - schlicht) < 1e-12,
          `bei ${x},${y}: schnell ${schnell}, schlicht ${schlicht}`,
        );
      }
    }
  }
});

pruefe('zwei Züge ergeben das Höhere und nicht die Summe', () => {
  /*
   * Eine Summe hätte an jeder Kreuzung einen Turm – und zwar einen, der
   * höher ist als alles, was jemand gezeichnet hat.
   */
  const a = { ...KAMM, id: 'a', punkte: [[200, 400], [800, 400]] };
  const b = { ...KAMM, id: 'b', seed: 77, punkte: [[500, 150], [500, 650]] };
  let getroffen = 0;
  for (let y = 350; y <= 450; y += 5) {
    for (let x = 450; x <= 550; x += 5) {
      const ha = G.hoeheBei(x, y, a);
      const hb = G.hoeheBei(x, y, b);
      const beide = G.hoeheUeberall(x, y, [a, b]);
      assert.equal(beide, Math.max(ha, hb), `bei ${x},${y}`);
      if (ha > 0.05 && hb > 0.05) getroffen++;
    }
  }
  assert.ok(getroffen > 50, `nur ${getroffen} Proben liegen in beiden Zügen – trifft die Prüfung?`);
});

console.log('\n4 · Ein Zug und keine Reihe von Bergen');

pruefe('der Kamm hängt durchgehend zusammen', () => {
  /*
   * **Die Forderung aus dem Auftrag, wörtlich.** Ein Gebirgskamm darf nicht
   * aussehen wie nebeneinandergestellte Bergaufkleber – also darf er
   * nirgends auf null fallen.
   *
   * Die Lage, die ihn zerreissen könnte, sind die Nebenrücken. Sie werden
   * deshalb **zum Grat hin ausgeblendet**; ohne diese eine Zeile fiele die
   * Höhe in jedem Tal bis auf den Boden, und der Zug zerfiele.
   */
  const auf = [];
  for (let t = 0.02; t <= 0.98; t += 0.01) {
    /* Einen Punkt auf dem Kamm finden: der mit dem kleinsten Abstand. */
    const i = Math.min(KAMM.punkte.length - 2, Math.floor(t * (KAMM.punkte.length - 1)));
    const f = t * (KAMM.punkte.length - 1) - i;
    const x = KAMM.punkte[i][0] + (KAMM.punkte[i + 1][0] - KAMM.punkte[i][0]) * f;
    const y = KAMM.punkte[i][1] + (KAMM.punkte[i + 1][1] - KAMM.punkte[i][1]) * f;
    auf.push(G.hoeheBei(x, y, KAMM));
  }
  const kleinste = Math.min(...auf);
  const groesste = Math.max(...auf);
  assert.ok(kleinste > 0.1, `der Kamm fällt auf ${kleinste.toFixed(3)} – er reisst`);
  /*
   * **Und zwar im Verhältnis zum Gipfel.** Eine absolute Schwelle allein
   * liess durch, dass die Nebenrücken auch am Grat durchgriffen: Der Kamm
   * sackte dann in jedem Tal auf ein Zehntel ab und blieb knapp über der
   * Zahl. Gemessen liegt das Verhältnis bei 0,42 – ein Sattel ist tiefer
   * als ein Gipfel, aber kein Loch.
   */
  assert.ok(kleinste / groesste > 0.3,
    `der tiefste Sattel ist nur ${(kleinste / groesste).toFixed(2)} des Gipfels – der Zug reisst`);
  /* Und er ist trotzdem kein Wulst: Gipfel und Sättel müssen sich zeigen. */
  assert.ok(groesste - kleinste > 0.25,
    `Gipfel ${groesste.toFixed(2)}, Sattel ${kleinste.toFixed(2)} – zu wenig Unterschied`);
});

pruefe('die Hänge tragen Rücken und Täler, der Grat nicht', () => {
  /*
   * **Beides zusammen, sonst misst man das Falsche.**
   *
   * Der erste Anlauf mass nur, wie stark die Höhe entlang eines Schnittes
   * schwankt. Das tut sie auch ohne Nebenrücken – die Gipfel allein
   * genügen dafür –, und die Gegenprobe „Nebenrücken ganz weg" blieb
   * folgerichtig grün.
   *
   * Was die Nebenrücken ausmacht, ist der **Unterschied** zwischen Grat und
   * Hang: Am Grat sind sie ausgeblendet, am Fuss wirken sie voll. Gemessen
   * schwankt die Höhe am Fuss 2,7-mal so stark wie nahe am Grat.
   */
  const schwankung = (u) => {
    const v = [];
    for (let s = 0.06; s <= 0.94; s += 0.01) {
      const i = Math.min(KAMM.punkte.length - 2, Math.floor(s * (KAMM.punkte.length - 1)));
      const f = s * (KAMM.punkte.length - 1) - i;
      const x = KAMM.punkte[i][0] + (KAMM.punkte[i + 1][0] - KAMM.punkte[i][0]) * f;
      const y = KAMM.punkte[i][1] + (KAMM.punkte[i + 1][1] - KAMM.punkte[i][1]) * f;
      v.push(G.hoeheBei(x, y + u * KAMM.breite, KAMM));
    }
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
    return { m, rel: sd / m };
  };
  const amGrat = schwankung(0.12);
  const amFuss = schwankung(0.6);
  assert.ok(amFuss.m > 0.03, `am Fuss steht fast nichts (${amFuss.m.toFixed(3)})`);
  assert.ok(amFuss.rel > 0.3, `am Fuss schwankt es nur ${amFuss.rel.toFixed(2)} – der Hang ist glatt`);
  assert.ok(amFuss.rel / amGrat.rel > 1.8,
    `Hang ${amFuss.rel.toFixed(2)} gegen Grat ${amGrat.rel.toFixed(2)} – die Rücken greifen überall gleich`);
});

console.log('\n5 · Aus dem Strich wird ein Kamm');

pruefe('der Strich wird ausgedünnt, das Ende bleibt', () => {
  /*
   * Ein Finger hinterlässt Hunderte Punkte, oft zwei auf demselben Fleck.
   * `hoeheBei` geht für jeden gefragten Ort jedes Segment durch – gemessen
   * kostete ein Kamm aus 45 Abschnitten **51 ms je Reliefkachel**.
   *
   * Und das Ende bleibt erhalten: Ein Kamm, der kurz vor dem Ende des
   * Striches aufhört, fühlt sich an, als hätte das Werkzeug nicht zugehört.
   */
  /*
   * **203 Punkte und nicht 200.**
   *
   * Bei zweihundert fiel der letzte Punkt genau auf einen Stützpunkt der
   * Ausdünnung – das Ende blieb also auch dann erhalten, wenn es gar nicht
   * eigens gesichert wurde, und die Gegenprobe dazu blieb grün. Eine
   * Prüfung, die nur durch die Wahl ihrer Zahlen besteht, prüft nichts.
   */
  const spur = [];
  for (let i = 0; i <= 203; i++) spur.push([100 + i * 3, 300 + Math.sin(i / 9) * 12]);
  const kamm = G.kammAus(spur, 24);
  assert.ok(kamm.length > 4, `nur ${kamm.length} Punkte`);
  assert.ok(kamm.length < 40, `${kamm.length} Punkte – es wurde nicht ausgedünnt`);
  assert.deepEqual(kamm[0], spur[0], 'der Anfang ging verloren');
  assert.deepEqual(kamm[kamm.length - 1], spur[spur.length - 1], 'das Ende ging verloren');
  for (let i = 1; i < kamm.length - 1; i++) {
    const d = Math.hypot(kamm[i][0] - kamm[i - 1][0], kamm[i][1] - kamm[i - 1][1]);
    assert.ok(d >= 24 - 1e-9, `zwei Punkte liegen nur ${d.toFixed(1)} auseinander`);
  }
});

pruefe('ein Tippen ergibt kein Gebirge', () => {
  /*
   * Wie bei den Flächen: Es entsteht nichts, und das ist richtig. Ein
   * Gebirge aus einem Punkt wäre ein Fleck, den niemand gewollt hat.
   */
  assert.equal(G.kammAus([[400, 400]], 24), undefined);
  assert.equal(G.kammAus([[400, 400], [402, 401]], 24), undefined);
  assert.ok(G.kammAus([[400, 400], [500, 400]], 24));
});

console.log('\n6 · Speichern und Zurückholen');

const roh = (zusatz) => ({
  id: 'k1', bookId: 'b1', worldId: 'w1', seed: 7, styleId: 'artbook',
  features: [{ id: 'f1', art: 'wald', punkte: [[1, 1], [9, 1], [5, 9]], seed: 3 }],
  marken: [], createdAt: 1, updatedAt: 2, ...zusatz,
});

pruefe('ein Gebirge übersteht das Speichern unverändert', () => {
  const k = M.heileKarte(roh({
    kaemme: [{
      id: 'g1', punkte: [[10, 10], [90, 40]], breite: 77, hoehe: 0.6,
      zerkluftung: 0.25, seed: 123, entryId: 'e1',
    }],
  }));
  assert.equal(k.kaemme.length, 1);
  assert.deepEqual(k.kaemme[0], {
    id: 'g1', punkte: [[10, 10], [90, 40]], breite: 77, hoehe: 0.6,
    zerkluftung: 0.25, seed: 123, entryId: 'e1', beginn: undefined, ende: undefined,
  });
});

pruefe('eine Karte ohne Gebirge bleibt eine gültige Karte', () => {
  /*
   * Jede Karte von vor dieser Runde hat keine Kämme. Eine Karte ohne Berge
   * ist keine beschädigte Karte – sie ist eine Karte ohne Berge.
   */
  const k = M.heileKarte(roh({}));
  assert.deepEqual(k.kaemme, []);
  assert.equal(k.features.length, 1, 'die Flächen sind mitverschwunden');
});

pruefe('die Welt geht beim Heilen nicht verloren', () => {
  /*
   * **Ein Datenverlust, gefunden beim Bau des Gebirges.**
   *
   * Hier fehlte `worldId`, und der Verlust war still: Der Laden holt Karten
   * mit `db.karten.where('worldId')`. Eine geheilte Karte kam ohne Welt
   * zurück, wurde beim nächsten Strich so gespeichert – und war beim
   * nächsten Öffnen weg. Nicht gelöscht, nur unauffindbar.
   *
   * Gemessen mit der Gebirgssonde: Nach dem Zeichnen stand in der Datenbank
   * `{id:'k_mess', book:'b1', world:undefined, f:3, g:1}`. Alle Daten da,
   * die Karte trotzdem leer.
   */
  assert.equal(M.heileKarte(roh({})).worldId, 'w1');
  assert.equal(M.heileKarte(roh({ worldId: undefined })).worldId, undefined);
});

pruefe('ein beschädigtes Gebirge fällt weg oder wird geklemmt', () => {
  /*
   * Eine Linie mit einem Punkt ist keine Linie und fällt weg. Eine Breite
   * von null dagegen wird geklemmt: Ein unsichtbares Gebirge, das trotzdem
   * dasteht, wäre schlimmer als ein schmales – man sähe nicht, was fehlt.
   */
  const k = M.heileKarte(roh({
    kaemme: [
      { id: 'a', punkte: [[1, 1]], breite: 50, hoehe: 0.5, zerkluftung: 0.5, seed: 1 },
      { id: 'b', punkte: 'nein', breite: 50, hoehe: 0.5, zerkluftung: 0.5, seed: 1 },
      { id: 'c', punkte: [[1, 1], [2, 2]], breite: 0, hoehe: 99, zerkluftung: -5, seed: 1 },
      { id: 'd', punkte: [[1, 1], [2, 2], ['x', 3], [4, 4]], breite: 50, hoehe: 0.5, zerkluftung: 0.5, seed: 2 },
    ],
  }));
  assert.deepEqual(k.kaemme.map((g) => g.id), ['c', 'd'], 'es blieb das Falsche übrig');
  assert.ok(k.kaemme[0].breite >= 8, `Breite ${k.kaemme[0].breite} – nicht geklemmt`);
  assert.ok(k.kaemme[0].hoehe <= 1 && k.kaemme[0].zerkluftung >= 0, 'nicht geklemmt');
  /* Der kaputte Punkt fiel weg, die heilen blieben. */
  assert.deepEqual(k.kaemme[1].punkte, [[1, 1], [2, 2], [4, 4]]);
});

pruefe('das Rückgängig nimmt die Gebirge mit', () => {
  /*
   * Derselbe stille Fehler wie damals bei den Siedlungen: Wer einen Kamm
   * zieht und „Zurücknehmen" drückt, bekäme ihn sonst nicht weg – und wer
   * danach eine Küste zurücknimmt, bekäme Flächen von vorhin und Gebirge
   * von jetzt. Zwei Zeitpunkte in einem Bild.
   */
  const q = ohneProsa(lies('src/pages/book/Weltkarte.tsx'));
  assert.match(q, /type Schritt = \{[\s\S]{0,200}?kaemme: Gebirgskamm\[\];/,
    'ein Schritt merkt sich die Gebirge nicht');
  assert.match(q, /kaemme: karte\.kaemme \?\? \[\]/, 'beim Ablegen fehlen sie');
  assert.match(q, /kaemme: vorher\.kaemme/, 'beim Zurücknehmen fehlen sie');
});

pruefe('der Name steht auf der Mitte des Kamms und dreht sich mit', () => {
  /*
   * **Die Lücke, die erst beim Nachsehen auffiel.**
   *
   * Im Bedienfeld liess sich ein Zug mit einer Seite verknüpfen, auf der
   * Karte stand davon nie etwas – Flächen und Siedlungen bekamen ihre
   * Beschriftung, Gebirge nicht. Ein halber Faden: Er tut nichts Falsches,
   * er tut nur nichts.
   *
   * Die Mitte wird nach **Bogenlänge** gemessen und nicht nach der Zahl der
   * Punkte. Bei ungleich verteilten Punkten – und ein ausgedünnter
   * Fingerzug ist genau das – liegt der mittlere Punkt nicht in der Mitte.
   */
  const gerade = [[100, 400], [900, 400]];
  const l = G.kammlage(gerade, 100);
  assert.ok(Math.abs(l.mx - 500) < 1, `die Mitte liegt bei ${l.mx}`);
  assert.equal(l.grad, 0);
  /* Zur beschienenen Seite gerückt – nach oben, nicht auf den Grat. */
  assert.ok(l.my < 400 - 20, `der Name sitzt bei ${l.my} statt über dem Kamm`);

  /* Ungleich verteilt: der mittlere Punkt ist nicht die Mitte. */
  const schief = [[100, 400], [820, 400], [860, 400], [900, 400]];
  assert.ok(Math.abs(G.kammlage(schief, 100).mx - 500) < 1,
    'die Mitte folgt den Punkten statt der Länge');

  /* Und er dreht sich mit dem Kamm. */
  assert.ok(Math.abs(G.kammlage([[100, 100], [900, 900]], 100).grad - 45) < 1);
});

pruefe('der Name steht nie auf dem Kopf', () => {
  /*
   * Welche Richtung jemand gezogen hat, ist eine Sache der Hand und keine
   * der Welt. Ein Zug von Ost nach West bekäme sonst einen Namen, den man
   * nur über die Schulter liest.
   */
  for (const kamm of [
    [[900, 400], [100, 400]],
    [[900, 900], [100, 100]],
    [[800, 200], [200, 700]],
  ]) {
    const grad = G.kammlage(kamm, 100).grad;
    assert.ok(grad > -90.1 && grad < 90.1, `der Name steht auf ${grad} Grad`);
  }
});

pruefe('das Bauteil zeichnet den Namen wirklich', () => {
  const q = ohneProsa(lies('src/components/karte/Weltkarte.tsx'));
  assert.match(q, /const lage = kammlage\(punkteVon\(g\), g\.breite\);/,
    'der Gebirgsname wird nicht gesetzt');
  /* Mit demselben Saum wie die anderen Namen – sonst steht er im Relief. */
  const abschnitt = q.slice(q.indexOf('const lage = kammlage('));
  assert.match(abschnitt.slice(0, 900), /paintOrder="stroke"/, 'dem Namen fehlt der Saum');
});

console.log('\n7 · Nur ergänzt, nichts ersetzt');

pruefe('das Gebirge ist ein Kachelmaler und keine zweite Zeichenmaschine', () => {
  /*
   * Das Kachelwerk kennt zwei Lagen; bisher lief nur `bewuchs`. Das
   * Gebirge ist die erste – ein zweiter Zwischenspeicher mit einem zweiten
   * Pinsel, auf derselben Maschine.
   */
  const q = ohneProsa(lies('src/components/karte/useKartenleinwand.ts'));
  assert.match(q, /new Kachelwerk\(\s*'grund'/, 'das Relief hat kein eigenes Kachelwerk');
  assert.match(q, /maleGebirge\(ctx, kach, massstab/, 'das Relief wird nicht gekachelt');
  /* Erst der Grund, dann der Bewuchs – Bäume stehen auf Bergen. */
  const i = q.indexOf('maleLage(ctx, grund');
  const j = q.indexOf('maleLage(ctx, werk');
  assert.ok(i > 0 && j > i, 'der Bewuchs wird vor dem Grund gemalt');

  /*
   * Und es entwertet gezielt, statt alles wegzuwerfen – nach dem Kasten
   * des Kamms. Seit es eine Baumgrenze gibt, geht das durch `beide`, weil
   * auch die Bewuchskacheln betroffen sind; die Zusage ist dieselbe.
   */
  assert.match(q, /beide\(gebirgskasten\(k\)\);/, 'eine Kammänderung entwertet nicht gezielt');
  assert.match(q, /werk\.entwerte\(kasten\);/, 'das Relief wird nicht nach Kasten entwertet');
});

pruefe('das Relief wird beim Schwenken nicht neu gerechnet', () => {
  /*
   * Es hängt im Kachelwerk, und das kennt nur Kacheln. Was hier geprüft
   * wird, ist die Umkehrung: Dass **nichts** das Werk bei einer
   * Sichtänderung leert – sonst wäre der ganze Zwischenspeicher wertlos.
   */
  const q = ohneProsa(lies('src/components/karte/useKartenleinwand.ts'));
  const abschnitt = q.slice(q.indexOf('const werk = grundRef.current;'));
  const ende = abschnitt.indexOf('}, [kaemme, stil]);');
  assert.ok(ende > 0, 'das Entwerten hängt an etwas anderem als Kämmen und Stil');
  assert.doesNotMatch(abschnitt.slice(0, ende), /sicht/, 'das Relief hängt an der Sicht');
});

console.log(`\n${geprueft} Prüfungen bestanden.\n`);
