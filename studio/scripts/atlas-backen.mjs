/**
 * Den Bildersatz backen.
 *
 *     npm run atlas
 *
 * Öffnet `scripts/atlas/backstube.html` in einem Browser, lässt dort den
 * Atlas zeichnen und schreibt ihn nach `public/karte/<stil>/`. Von dort
 * kopiert ihn der Bau nach `dist/`, und von dort nimmt ihn der Dienstbote in
 * seinen Vorrat – die Karte zeichnet also auch ohne Netz.
 *
 * ---
 *
 * **Warum ein Browser und nicht Node.**
 *
 * Node kennt keine Zeichenfläche. Eine Bibliothek dafür wäre eine
 * Abhängigkeit mehr, die obendrein ein bisschen anders zeichnet als der
 * Browser, der die Bilder später anzeigt. Dieser Umweg kostet eine
 * Entwicklungsabhängigkeit, die ohnehin da ist, und liefert genau das Bild,
 * das später auf der Karte steht.
 *
 * **Und warum das Ergebnis ins Verzeichnis eingecheckt wird.**
 *
 * Damit `npm run build` ohne Browser auskommt. Wer die Kunst ändert, backt
 * neu und legt die neuen Dateien dazu – wie bei jeder anderen Grafik auch.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');
const STILE = process.argv.slice(2);
const welche = STILE.length ? STILE : ['artbook'];

/* Ein Modulskript braucht einen Server – über `file://` greift die
   Ursprungsregel des Browsers. */
const typen = {
  '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.png': 'image/png', '.webp': 'image/webp',
};
/*
 * Zwei Ordner: die Backstube und die gemalten Grafiken.
 *
 * `/assets/...` zeigt auf `assets/` im Projekt – dort legt man die
 * Illustrationen hin. Alles andere kommt aus `scripts/atlas`.
 */
const server = createServer((anfrage, antwort) => {
  const url = (anfrage.url ?? '/').split('?')[0];
  const wurzelOrdner = url.startsWith('/assets/') ? wurzel : join(wurzel, 'scripts/atlas');
  const pfad = url.startsWith('/assets/') ? join(wurzel, url) : join(wurzelOrdner, url);
  if (!pfad.startsWith(wurzelOrdner) || !existsSync(pfad)) {
    antwort.writeHead(404).end();
    return;
  }
  const art = typen[pfad.slice(pfad.lastIndexOf('.'))] ?? 'application/octet-stream';
  antwort.writeHead(200, { 'content-type': art }).end(readFileSync(pfad));
});
await new Promise((ok) => server.listen(0, ok));
const hafen = server.address().port;

/*
 * Playwright liegt hier global und nicht im Projekt – es ist Werkzeug und
 * keine Abhängigkeit der Anwendung. Beide Wege werden versucht, damit das
 * Backen auch auf einem Rechner läuft, der es örtlich installiert hat.
 */
const pw = await import('playwright').catch(() =>
  import('/opt/node22/lib/node_modules/playwright/index.js'));
const chromium = pw.chromium ?? pw.default?.chromium;
if (!chromium) throw new Error('Playwright nicht gefunden – npm i -D playwright');
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_BROWSERS_PATH
    ? {}
    : { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
);
const seite = await browser.newPage();
const fehler = [];
seite.on('pageerror', (e) => fehler.push(e.message));
await seite.goto(`http://localhost:${hafen}/backstube.html`);
await seite.waitForFunction(() => document.title === 'bereit', null, { timeout: 30000 });

let beanstandet = 0;
for (const stil of welche) {
  const { png, verzeichnis, bericht } = await seite.evaluate((s) => window.backe(s), stil);
  const ordner = join(wurzel, 'public/karte', stil);
  mkdirSync(ordner, { recursive: true });
  const daten = Buffer.from(png.split(',')[1], 'base64');
  writeFileSync(join(ordner, 'atlas.png'), daten);
  writeFileSync(join(ordner, 'atlas.json'), `${JSON.stringify(verzeichnis, null, 1)}\n`);

  const felder = Object.values(verzeichnis.arten)
    .reduce((n, a) => n + a.varianten * a.stufen.length, 0);
  console.log(
    `  ${stil}: ${verzeichnis.breite}×${verzeichnis.hoehe}, ${felder} Felder, ` +
    `${(daten.length / 1024).toFixed(0)} kB  ` +
    `(${bericht.gemalt} gemalt, ${bericht.gebacken} gebacken)`,
  );

  /*
   * **Beanstandungen brechen das Backen ab.**
   *
   * Nicht als Warnung: Eine Grafik, die den Vertrag verletzt, sieht einzeln
   * tadellos aus und fällt erst zwischen zweihundert anderen auf – und dann
   * weiss niemand mehr, welche es war. Hier ist der einzige Augenblick, in
   * dem es noch billig zu finden ist.
   */
  for (const k of bericht.klagen) console.error(`  ✗ ${k}`);
  beanstandet += bericht.klagen.length;
}

await browser.close();
server.close();
if (fehler.length) {
  console.error('Fehler in der Backstube:', fehler);
  process.exit(1);
}
if (beanstandet) {
  console.error(`\n  ${beanstandet} Beanstandung(en) – der Satz wurde geschrieben, aber er hält den Vertrag nicht.`);
  process.exit(1);
}
