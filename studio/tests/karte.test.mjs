/*
 * Die Karte.
 *
 * Eine Karte lässt sich schlecht prüfen, indem man sie ansieht – „sieht gut
 * aus" ist keine Zusicherung. Prüfbar ist etwas anderes, und es ist das, was
 * über Jahre zählt:
 *
 *   1. Kommt zweimal dasselbe heraus?
 *   2. Bleibt bei einer kleinen Änderung fast alles stehen?
 *   3. Überlebt die Karte den Weg durch die Datei und zurück?
 *   4. Erfindet das Verfeinern Geografie, die niemand gemalt hat?
 *
 * Der zweite Punkt ist der eigentliche Grund für die Bauart des Zufalls, und
 * er ist der einzige, den man beim Programmieren nicht bemerkt und beim
 * Benutzen sofort: Ein Wald, der bei jeder Randkorrektur neu würfelt, macht
 * eine Karte unbenutzbar, ohne je einen Fehler zu werfen.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
for (const f of ['zufall', 'modell', 'kontur', 'wald'])
  execSync(`npx esbuild src/lib/karte/${f}.ts --bundle --format=esm --outfile=${S}/t/k-${f}.mjs`, {
    stdio: 'pipe',
  });
const Z = await import(S + '/t/k-zufall.mjs');
const M = await import(S + '/t/k-modell.mjs');
const K = await import(S + '/t/k-kontur.mjs');
const W = await import(S + '/t/k-wald.mjs');

let ok = 0,
  bad = 0;
const p = (n, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else {
    bad++;
    console.log('FEHLER', n, '\n  ist :', JSON.stringify(ist), '\n  soll:', JSON.stringify(soll));
  }
};
const wahr = (n, b) => p(n, !!b, true);

/* ------------------------------------------------------- 1. Determinismus -- */

/* Ein Rechteck als Waldfläche – die einfachste Form, die eine Fläche ist. */
const rechteck = (x0, y0, x1, y1) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
const wald = { id: 'f1', art: 'wald', seed: 4711, punkte: rechteck(200, 200, 600, 500) };

const a = W.baeume(wald);
const b = W.baeume(wald);
wahr('1 der Wald hat Bäume', a.length > 40);
p('  zweimal gefragt, zweimal dasselbe', a, b);

/* Und ein anderer Startwert ergibt einen anderen Wald – sonst wäre der
 * Startwert Zierde. */
const anders = W.baeume({ ...wald, seed: 4712 });
wahr('  ein anderer Startwert, ein anderer Wald', JSON.stringify(anders) !== JSON.stringify(a));

/* Die Ortsfunktion selbst: gleiche Eingabe, gleiche Zahl – und benachbarte
 * Eingaben liegen nicht beieinander, sonst stünden die Bäume in Reihen. */
p('  der Ortszufall ist eine Funktion', Z.zahl(1, 2, 3), Z.zahl(1, 2, 3));
wahr('  Nachbarn sind nicht benachbart', Math.abs(Z.zahl(9, 5, 5) - Z.zahl(9, 5, 6)) > 0.05);

/* --------------------------------------------------------- 2. Stabilität -- */

/*
 * Die wichtigste Prüfung des ganzen Kartensystems.
 *
 * Die Waldfläche wächst am rechten Rand um zwanzig Punkte – vier Prozent. Ein
 * Verfahren mit Warteschlange (Poisson-Disk nach Bridson) würfelte danach
 * jeden Baum neu; hier müssen die alten stehen bleiben, weil jeder von ihnen
 * nur von seinem Ort abhängt.
 */
const gewachsen = { ...wald, punkte: rechteck(200, 200, 620, 500) };
const c = W.baeume(gewachsen);
const orte = (l) => new Set(l.map((t) => `${t.x.toFixed(3)}:${t.y.toFixed(3)}`));
const alt = orte(a);
const neu = orte(c);
const geblieben = [...alt].filter((o) => neu.has(o)).length;

wahr('2 die Fläche ist gewachsen', c.length > a.length);
/*
 * Nicht alle bleiben, und das ist richtig: Am alten Rand war der Saum locker,
 * und Bäume, die dort nur mit geringer Wahrscheinlichkeit standen, stehen im
 * Inneren jetzt sicher. Was zählt, ist die Größenordnung – neun von zehn.
 */
wahr(
  `  fast jeder Baum steht noch (${geblieben} von ${alt.size})`,
  geblieben > alt.size * 0.85,
);

/*
 * Auch das Verschieben ist eine kleine Änderung.
 *
 * Hier stand zuerst die entgegengesetzte Erwartung – „eine verschobene Fläche
 * ist ein neuer Wald" –, und sie war falsch gedacht. Weil das Gitter am
 * Kartenraum hängt und nicht an der Fläche, behält eine um zehn Punkte
 * verschobene Waldfläche fast alle ihre Bäume. Das ist nicht der Fehler,
 * sondern genau der Satz, um den es geht: kleine Geometrieänderung, kleine
 * sichtbare Änderung. Wer den Wald wirklich neu würfeln will, ändert den
 * Startwert – und nur dann.
 */
const verschoben = W.baeume({ ...wald, punkte: rechteck(210, 210, 610, 510) });
const mitgekommen = [...alt].filter((o) => orte(verschoben).has(o)).length;
wahr(
  `  ein verschobener Wald ist derselbe Wald (${mitgekommen} von ${alt.size})`,
  mitgekommen > alt.size * 0.8,
);

/* Kein Baum steht außerhalb. */
wahr(
  '  alle Bäume liegen in der Fläche',
  a.every((t) => M.imPolygon([t.x, t.y], wald.punkte)),
);

/* Und keine zwei stehen aufeinander. */
let engste = Infinity;
for (let i = 0; i < a.length; i++)
  for (let j = i + 1; j < a.length; j++)
    engste = Math.min(engste, Math.hypot(a[i].x - a[j].x, a[i].y - a[j].y));
wahr(`  keiner steht im anderen (engster Abstand ${engste.toFixed(1)})`, engste >= 14.9);

/* -------------------------------------------------------- 3. Die Semantik -- */

p('3 es gibt genau drei Bedeutungen', M.BEDEUTUNGEN.map((x) => x.id), ['land', 'wasser', 'wald']);

const mitUnfug = M.heileKarte({
  id: 'k1',
  bookId: 'B',
  seed: 7,
  features: [
    { id: 'f1', art: 'wald', seed: 1, punkte: rechteck(0, 0, 10, 10) },
    /* Keine der drei Bedeutungen – eine spätere Fassung, ein Tippfehler,
     * eine bearbeitete Datei. Sie fällt weg, die Karte bleibt. */
    { id: 'f2', art: 'gebirge', seed: 2, punkte: rechteck(0, 0, 10, 10) },
    /* Zwei Punkte sind keine Fläche. */
    { id: 'f3', art: 'land', seed: 3, punkte: [[0, 0], [1, 1]] },
  ],
});
p('  eine fremde Bedeutung fällt weg, die Karte bleibt', mitUnfug.features.map((f) => f.id), ['f1']);
p('  ein Ausreißer nimmt nicht die Karte mit', mitUnfug.id, 'k1');

/* -------------------------------------------------------- 4. Die Persistenz */

const voll = {
  id: 'k2',
  bookId: 'B',
  seed: 123,
  styleId: 'artbook',
  features: [
    /* Die Reihenfolge der Felder ist die von `heileKarte` – verglichen wird
     * als Zeichenkette, und das ist hier gewollt: Es soll wirklich *dasselbe*
     * herauskommen und nicht etwas Gleichwertiges. */
    { id: 'f1', art: 'wasser', punkte: rechteck(10, 10, 90, 90), seed: 55, entryId: 'e_meer' },
    { id: 'f2', art: 'land', punkte: rechteck(100, 100, 200, 200), seed: 66 },
  ],
  createdAt: 1,
  updatedAt: 2,
};
p('4 durch die Datei und zurück', M.heileKarte(JSON.parse(JSON.stringify(voll))), voll);

/*
 * Der Startwert überlebt – und mit ihm der Wald.
 *
 * Das ist keine doppelte Prüfung zur vorigen Zeile: Dort ging es um Gleichheit
 * der Daten, hier um die Folge davon. Ein neu gezogener Startwert wäre ein
 * gültiges Kartendokument und trotzdem eine andere Karte.
 */
const zurueck = M.heileKarte(JSON.parse(JSON.stringify({ ...voll, features: [wald] })));
p('  derselbe Wald nach dem Laden', W.baeume(zurueck.features[0]), a);

/* ---------------------------------------------------- 5. Die Entry-Referenz */

const namenlos = M.heileKarte({
  id: 'k3',
  bookId: 'B',
  features: [{ id: 'f1', art: 'land', seed: 1, punkte: rechteck(0, 0, 10, 10) }],
});
/*
 * Unvollständigkeit ist kein Fehler.
 *
 * Eine Fläche ohne Verweis ist gültig, wird geladen, wird gezeichnet – und es
 * gibt keinen Ort im Code, an dem daraus eine Warnung wird. Diese Zusicherung
 * prüft die Abwesenheit einer Mahnung, und genau deshalb steht sie hier.
 */
p('5 eine namenlose Landschaft ist gültig', namenlos.features.length, 1);
p('  und trägt keinen Verweis', namenlos.features[0].entryId, undefined);
p('  der Verweis überlebt, wenn es einen gibt', M.heileKarte(voll).features[0].entryId, 'e_meer');

/* ------------------------------------------------- 6. Vom Strich zur Fläche */

/*
 * Eine Kritzelei, wie ein Finger sie macht: hin, zurück, sich selbst
 * kreuzend. Als Polygon gelesen wäre das eine Schleife ohne Innen.
 */
const kritzel = [];
for (let i = 0; i <= 40; i++) kritzel.push([300 + i * 5, 300 + Math.sin(i / 3) * 40]);
for (let i = 40; i >= 0; i--) kritzel.push([300 + i * 5, 360 + Math.cos(i / 4) * 30]);

const flaeche = K.flaecheAus(kritzel, 22, 999);
wahr('6 aus dem Strich wird eine Fläche', flaeche && flaeche.length > 8);
p('  zweimal derselbe Strich, dieselbe Fläche', K.flaecheAus(kritzel, 22, 999), flaeche);

/* Der Mittelpunkt des Gekritzels liegt in der Fläche – sonst hätte der
 * Randverfolger die Form von innen nach außen gedreht. */
wahr('  der Fleck ist innen', M.imPolygon([400, 330], flaeche));

/* Ein Tippen ist kein Fleck. */
p('  ein Tippen ergibt nichts', K.flaecheAus([[500, 500]], 20, 1), undefined);
/* Auch ein Wischer, der kürzer ist als der Pinsel breit. */
p('  ein Wischer unter Pinselbreite auch nicht',
  K.flaecheAus([[500, 500], [508, 503]], 30, 1), undefined);
p('  und gar nichts ergibt nichts', K.flaecheAus([], 20, 1), undefined);

/*
 * Die Haarrisse zwischen zwei Bahnen.
 *
 * Wer eine Landmasse füllt, wischt in Bahnen, und zwischen zwei Bahnen bleibt
 * ein Spalt. Ohne das Schließen der Maske läuft die Konturverfolgung in diesen
 * Spalt hinein und wieder heraus – die fertige Fläche hat dann feine Striche
 * quer durch das Land. Im ersten gerenderten Bild war genau das zu sehen.
 *
 * Geprüft wird am Ergebnis: Ein Punkt mitten im Spalt muss *in* der Fläche
 * liegen.
 */
const bahnen = [];
for (let i = 0; i <= 20; i++) bahnen.push([200 + i * 15, 300]);
for (let i = 20; i >= 0; i--) bahnen.push([200 + i * 15, 355]);
const land = K.flaecheAus(bahnen, 20, 7);
wahr('  zwei Bahnen ergeben eine Fläche', land && land.length > 6);
wahr('  der Spalt dazwischen ist zu', M.imPolygon([350, 327], land));

/*
 * Und die Gegenprobe: Was jemand wirklich offen gelassen hat, bleibt offen.
 *
 * Sonst wäre aus dem Schließen ein Mitschreiben geworden – die Karte würde
 * entscheiden, dass zwischen zwei Inseln eigentlich Land gemeint war.
 */
const getrennt = [];
for (let i = 0; i <= 20; i++) getrennt.push([200 + i * 15, 300]);
for (let i = 20; i >= 0; i--) getrennt.push([200 + i * 15, 560]);
const zwei = K.flaecheAus(getrennt, 20, 7);
p('  eine echte Lücke bleibt eine Lücke', M.imPolygon([350, 430], zwei), false);

/*
 * Die Grenze der Verfeinerung.
 *
 * Aus einem Kreis darf eine unruhige Küste werden und keine Fjordlandschaft.
 * Geprüft wird am härtesten Maß: Kein Punkt darf sich weiter bewegen als der
 * Deckel erlaubt – auch dann nicht, wenn die Fläche riesig ist.
 */
const kreis = [];
for (let i = 0; i < 64; i++) {
  const t = (i / 64) * Math.PI * 2;
  kreis.push([500 + Math.cos(t) * 400, 500 + Math.sin(t) * 400]);
}
const rau = K.verfeinere(kreis, 4242);
let weiteste = 0;
for (let i = 0; i < kreis.length; i++)
  weiteste = Math.max(weiteste, Math.hypot(rau[i][0] - kreis[i][0], rau[i][1] - kreis[i][1]));
wahr(`  die Küste wird unruhig (${weiteste.toFixed(1)})`, weiteste > 1);
wahr('  und erfindet keine Buchten', weiteste <= 14.001);
p('  gleich viele Punkte – nichts kommt dazu', rau.length, kreis.length);

/* Das Glätten rundet, ohne die Fläche zu verlassen. */
const eckig = rechteck(100, 100, 400, 400);
const rund = K.glaette(eckig);
wahr('  Glätten macht aus vier Ecken viele Punkte', rund.length > eckig.length);
wahr(
  '  und bleibt im Kasten',
  rund.every(([x, y]) => x >= 99 && x <= 401 && y >= 99 && y <= 401),
);

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
