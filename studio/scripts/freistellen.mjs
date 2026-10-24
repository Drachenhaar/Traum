/**
 * Rohbilder freistellen und einpassen.
 *
 *     npm run freistellen -- artbook wald 8
 *     npm run freistellen -- artbook wald 8 --blatt
 *
 * Nimmt, was ein Bildmodell geliefert hat, und macht daraus Dateien, die der
 * Vertrag aus `saetze.mjs` annimmt: freigestellt, mit dem Fuß auf der
 * Unterkante, im richtigen Seitenverhältnis, mit Luft ringsum.
 *
 *     assets/karte/<satz>/roh/<art>_00.png …    einzeln
 *     assets/karte/<satz>/roh/<art>_blatt.png   ein Blatt mit N nebeneinander
 *            ↓
 *     assets/karte/<satz>/<art>_00.png …
 *
 * ---
 *
 * **Warum das Blatt der bessere Weg ist.**
 *
 * Acht Bäume aus acht Aufrufen haben acht Lichtrichtungen, acht Strichstärken
 * und acht Größen – jeder für sich gut, zusammen kein Satz. Acht Bäume in
 * *einem* Bild sieht das Modell nebeneinander und gleicht sie an. Danach
 * werden sie hier aufgeschnitten.
 *
 * Der Prüfer beim Backen sagt trotzdem, ob es gereicht hat.
 *
 * ---
 *
 * **Was dieses Skript nicht kann.**
 *
 * Aus einem Bild mit kleinteiligem Hintergrund – Wiese, Himmel mit Wolken,
 * Schlagschatten auf dem Boden – etwas Brauchbares machen. Die Flutfüllung
 * braucht einen **einfarbigen, deutlich abgesetzten** Grund. Das gehört in
 * die Bildanweisung, nicht in dieses Skript.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a) => a !== '--');
const alsBlatt = args.includes('--blatt');
/* Das Rohbild bringt seine Durchsichtigkeit schon mit. */
const schonFrei = args.includes('--frei');
const [satzName, artName, anzahlRoh] = args.filter((a) => !a.startsWith('--'));
const anzahl = Number(anzahlRoh) || 8;

if (!satzName || !artName) {
  console.error('  npm run freistellen -- <satz> <art> [anzahl] [--blatt] [--frei]');
  process.exit(2);
}

const { SAETZE, VERTRAG } = await import('./atlas/saetze.mjs');
const soll = SAETZE[satzName]?.arten?.[artName];
if (!soll) {
  console.error(`  kein Satz "${satzName}" mit der Art "${artName}" in saetze.mjs`);
  process.exit(2);
}

const typen = { '.html': 'text/html', '.mjs': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const server = createServer((anfrage, antwort) => {
  const url = (anfrage.url ?? '/').split('?')[0];
  const basis = url.startsWith('/assets/') ? wurzel : join(wurzel, 'scripts/atlas');
  const pfad = url.startsWith('/assets/') ? join(wurzel, url) : join(basis, url);
  if (!pfad.startsWith(basis) || !existsSync(pfad)) { antwort.writeHead(404).end(); return; }
  antwort
    .writeHead(200, { 'content-type': typen[pfad.slice(pfad.lastIndexOf('.'))] ?? 'application/octet-stream' })
    .end(readFileSync(pfad));
});
await new Promise((ok) => server.listen(0, ok));
const hafen = server.address().port;

const pw = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.js'));
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_BROWSERS_PATH
    ? {}
    : { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
);
const seite = await browser.newPage();
await seite.goto(`http://localhost:${hafen}/freisteller.html`);
await seite.waitForFunction(() => document.title === 'bereit', null, { timeout: 30000 });

const ziel = join(wurzel, 'assets/karte', satzName);
mkdirSync(ziel, { recursive: true });

/*
 * Die Höchsthöhe: doppelt so hoch wie der Satz verlangt.
 *
 * Mehr nützt nichts – gepackt wird ohnehin auf die Mipstufen herunter –, und
 * es bläht das Verzeichnis auf. Doppelt lässt Luft für eine spätere, feinere
 * Mipstufe, ohne neu freistellen zu müssen.
 */
const hoechstens = soll.hoehe * 2;

const schreibe = (nr, daten) => {
  const name = `${artName}_${String(nr).padStart(2, '0')}.png`;
  writeFileSync(join(ziel, name), Buffer.from(daten.split(',')[1], 'base64'));
  return name;
};

/*
 * Nur die Zahlen ins Fenster, nicht den Pinsel.
 *
 * `soll` trägt auch `male` – eine Funktion, und die lässt sich nicht über
 * die Fernsteuerung reichen. Der Freisteller braucht sie ohnehin nicht: Er
 * passt ein, er zeichnet nicht.
 */
const masse = {
  hoehe: soll.hoehe,
  breiteZuHoehe: soll.breiteZuHoehe,
  ankerX: soll.ankerX,
  ankerY: soll.ankerY,
};

const einstellungen = {
  soll: masse, vertrag: VERTRAG,
  /* Der Hintergrund darf um diesen Farbabstand schwanken und gilt noch als
     Hintergrund; bis `weich` darüber wird der Punkt teildurchsichtig. */
  toleranz: 70, weich: 60, hoechstens,
};

let geschrieben = 0;
if (alsBlatt) {
  const quelle = `/assets/karte/${satzName}/roh/${artName}_blatt.png`;
  if (!existsSync(join(wurzel, quelle))) {
    console.error(`  ${quelle} fehlt`);
    process.exit(2);
  }
  const { bilder, grund, gruppen } = await seite.evaluate(
    ([u, e]) => window.freistelle(u, e),
    [quelle, { ...einstellungen, spalten: anzahl, zeilen: 1, nachLuecken: true, schonFrei }],
  );
  console.log(`  Blatt: ${gruppen} Motive an den Lücken gefunden` +
    (schonFrei ? ' (schon freigestellt)' : `, Grund rgb(${grund.r},${grund.g},${grund.b})`));
  if (gruppen !== anzahl) {
    /*
     * Nicht abbrechen: Vielleicht sind es wirklich neun, vielleicht
     * berühren sich zwei. Beides sieht man am Ergebnis – und wer hier
     * abbricht, zwingt zum Raten statt zum Nachsehen.
     */
    console.error(`  ! erwartet waren ${anzahl}. Berühren sich zwei Motive, oder ist eines zerfallen?`);
  }
  for (let i = 0; i < bilder.length; i++) {
    if (!bilder[i]) { console.error(`  ✗ Feld ${i} ist leer – Hintergrund zu nah am Motiv?`); continue; }
    console.log(`  ✓ ${schreibe(i, bilder[i])}`);
    geschrieben++;
  }
} else {
  for (let i = 0; i < anzahl; i++) {
    const quelle = `/assets/karte/${satzName}/roh/${artName}_${String(i).padStart(2, '0')}.png`;
    if (!existsSync(join(wurzel, quelle))) continue;
    const { bilder, grund } = await seite.evaluate(
      ([u, e]) => window.freistelle(u, e),
      [quelle, { ...einstellungen, spalten: 1, zeilen: 1 }],
    );
    if (!bilder[0]) { console.error(`  ✗ ${quelle} wurde vollständig weggeschnitten`); continue; }
    console.log(`  ✓ ${schreibe(i, bilder[0])}  (Grund rgb(${grund.r},${grund.g},${grund.b}))`);
    geschrieben++;
  }
}

await browser.close();
server.close();

if (!geschrieben) {
  console.error('  nichts geschrieben – liegen die Rohbilder unter assets/karte/<satz>/roh/ ?');
  process.exit(1);
}
console.log(`\n  ${geschrieben} Bild(er) eingepasst. Jetzt: npm run atlas`);
