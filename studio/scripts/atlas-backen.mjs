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
const typen = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript' };
const server = createServer((anfrage, antwort) => {
  const pfad = join(wurzel, 'scripts/atlas', (anfrage.url ?? '/').split('?')[0]);
  if (!pfad.startsWith(join(wurzel, 'scripts/atlas')) || !existsSync(pfad)) {
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

for (const stil of welche) {
  const { png, verzeichnis } = await seite.evaluate((s) => window.backe(s), stil);
  const ordner = join(wurzel, 'public/karte', stil);
  mkdirSync(ordner, { recursive: true });
  const daten = Buffer.from(png.split(',')[1], 'base64');
  writeFileSync(join(ordner, 'atlas.png'), daten);
  writeFileSync(join(ordner, 'atlas.json'), `${JSON.stringify(verzeichnis, null, 1)}\n`);

  const felder = Object.values(verzeichnis.arten)
    .reduce((n, a) => n + a.varianten * a.stufen.length, 0);
  console.log(
    `  ${stil}: ${verzeichnis.breite}×${verzeichnis.hoehe}, ` +
    `${felder} Felder, ${(daten.length / 1024).toFixed(0)} kB`,
  );
}

await browser.close();
server.close();
if (fehler.length) {
  console.error('Fehler in der Backstube:', fehler);
  process.exit(1);
}
