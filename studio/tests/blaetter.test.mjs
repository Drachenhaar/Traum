/*
 * Jedes Blatt hat eine Tür.
 *
 * Gemeldet als: „Wir hatten die anderen grafischen Buchseiten. Sie sind noch
 * nicht direkt einsehbar, und ich würde direkten Zugang haben wollen."
 *
 * Nachgezählt hatte das Buch rund dreissig Adressen und der Anhang erreichte
 * fünfzehn. Der Rest hing an einem Weg: die Weltkarte hinter einer
 * Tiefengeste, das Tafelteil in Blattform hinter dem Register, die
 * Charakterseite hinter den Blättern einer Figur.
 *
 * Das ist ein Fehler, den man nicht sieht. Eine Seite, die es gibt und zu der
 * keine Tür führt, sieht nicht kaputt aus – sie ist einfach nicht da. Kein
 * Bild, kein Typfehler und kein Testlauf hätte sie gemeldet; gemeldet hat sie
 * ein Mensch, der sie vermisste.
 *
 * Deshalb prüft diese Datei die einzige Zusicherung, die das verhindert:
 * **Jede Route, die ein Blatt des Buches ist, wird irgendwo genannt.** Wer
 * morgen eine Seite hinzufügt und die Tür vergisst, erfährt es hier und nicht
 * in einem halben Jahr.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';

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

const lies = (pf) => readFileSync(new URL(pf, import.meta.url), 'utf8');
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const app = lies('../src/App.tsx');
const anhang = lies('../src/pages/book/Appendix.tsx');
const verzeichnis = lies('../src/pages/book/Blattverzeichnis.tsx');

/* ------------------------------------------------- 1. Die Blätter des Buches */

/*
 * Die Routen kommen aus `App.tsx` und nicht aus einer Liste hier.
 *
 * Eine abgeschriebene Liste wäre genau der Fehler, den diese Datei sucht: Sie
 * wäre beim nächsten neuen Blatt unvollständig, ohne dass etwas auffällt.
 */
const alle = [...ohneProsa(app).matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
wahr('1 die Routen lassen sich aus App.tsx lesen', alle.length > 20);

/*
 * Was hier **nicht** geprüft wird, und warum:
 *
 *   `*`           der Auffangfall,
 *   `/`           der Umschlag – er ist die Adresse des geschlossenen Buches,
 *   `:id`-Routen  sie brauchen einen Eintrag; ihre Türen stehen bei dem
 *                 Eintrag, zu dem sie gehören (die Charakterseite steht im
 *                 Verzeichnis mit dem Namen der Figur, nicht als Muster),
 *   Umleitungen   `<Navigate>` – sie sind selbst nur Türen zu etwas anderem.
 */
const umleitung = new Set(
  [...ohneProsa(app).matchAll(/<Route\s+path="([^"]+)"\s+element=\{<Navigate/g)].map((m) => m[1]),
);
const blaetter = alle.filter(
  (r) => r !== '*' && r !== '/' && !r.includes(':') && !umleitung.has(r),
);
wahr(`  und es sind mehr als ein Dutzend Blätter (${blaetter.length})`, blaetter.length >= 15);

/* ------------------------------------------------------------ 2. Jede Tür */

/*
 * Genannt heisst: irgendwo im Buch steht diese Adresse als Ziel. Gesucht wird
 * in **allen** Quellen und nicht nur im Anhang – eine Seite, die von ihrem
 * Eintrag aus erreichbar ist, braucht keine zweite Tür im Verzeichnis.
 */
const quellen = [];
const sammle = (pf) => {
  for (const name of readdirSync(new URL(pf, import.meta.url))) {
    const voll = pf + '/' + name;
    if (statSync(new URL(voll, import.meta.url)).isDirectory()) sammle(voll);
    else if (/\.tsx?$/.test(name)) quellen.push(ohneProsa(lies(voll)));
  }
};
sammle('../src');
const gesamt = quellen.join('\n');

const ohneTuer = blaetter.filter((r) => {
  /* Als Ziel genannt – `to="/x"`, `to: '/x'`, `to={'/x'}` oder `navigate('/x')`. */
  const muster = new RegExp(
    `to=["']${r}["']|to:\\s*['"]${r}['"]|to=\\{['"]${r}['"]\\}|navigate\\(['"]${r}['"]`,
  );
  return !muster.test(gesamt);
});
p('2 kein Blatt ohne Tür', ohneTuer, []);

/* -------------------------------------------- 3. Eine Liste, nicht zwei */

/*
 * Der Anhang und das Blattverzeichnis zeigen dieselben Werkzeuge. Zwei
 * handgeschriebene Listen derselben Sache sind in diesem Projekt schon
 * mehrfach auseinandergelaufen: Wer eines hinzufügt, trägt es in eine ein und
 * vergisst die andere, und es sieht nichts kaputt aus.
 */
wahr('3 der Anhang gibt seine Werkzeuge heraus', /export function anhangWerkzeuge/.test(anhang));
wahr('  das Verzeichnis liest sie von dort', /anhangWerkzeuge\(/.test(verzeichnis));

/*
 * Und schreibt sie nicht selbst ab. Geprüft an drei Adressen, die im Anhang
 * stehen – stünde eine davon auch im Verzeichnis, wäre die Liste doppelt.
 */
const abgeschrieben = ['/karte', '/zeitstrahl', '/register'].filter((r) =>
  new RegExp(`to:\\s*['"]${r}['"]`).test(ohneProsa(verzeichnis)),
);
p('  und schreibt sie nicht ab', abgeschrieben, []);

/* ------------------------------------------- 4. Was das Verzeichnis nennt */

/*
 * Die zwei Blätter, die der Anlass für diese Seite waren, müssen wirklich
 * darauf stehen. Eine Prüfung, die nur „es gibt ein Verzeichnis" sagt, prüft
 * die Überschrift und nicht den Inhalt.
 */
for (const r of ['/weltkarte', '/tafelteil'])
  wahr(`4 „${r}" steht im Verzeichnis`, new RegExp(`['"]${r}['"]`).test(verzeichnis));

/* Die Figurenblätter entstehen aus den Figuren des Buches, nicht aus einer Liste. */
wahr('  die Figurenblätter kommen aus den Einträgen',
  /type === 'character'/.test(verzeichnis) && /\/figur\/\$\{/.test(verzeichnis));
wahr('  und der Charakterspiegel je Figur', /\/spiegel\/\$\{/.test(verzeichnis));

/*
 * Leere Gruppen bleiben still – dieselbe Regel wie überall im Buch. Eine
 * Rubrik „Figurenblätter" mit nichts darunter ist ein Versprechen, das die
 * Seite nicht hält.
 */
wahr('  und leere Gruppen bleiben still', /if \(!blaetter\.length\) return null/.test(verzeichnis));

/* Das Verzeichnis fragt kein Profil – das ist sein ganzer Zweck. */
wahr('  es fragt kein Profil', !/ordne\(|profilVon\(/.test(ohneProsa(verzeichnis)));

/* Und es zählt die Einträge nicht ab; das tut das Register. */
wahr('  und zählt die Einträge nicht ab',
  /Register/.test(verzeichnis) && !/livingEntries\(entries\)\.map/.test(ohneProsa(verzeichnis)));

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
