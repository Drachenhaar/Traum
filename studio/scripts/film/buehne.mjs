/**
 * Die Bühne: ein Server über dem Build, die echten Maler als Bündel, ein
 * Browser davor.
 *
 * ---
 *
 * **Warum das eine eigene Datei ist.**
 *
 * Zwei Werkzeuge brauchen genau diesen Aufbau – der Film und das Relief in
 * drei Dimensionen. Abgeschrieben wäre er zweimal da und bei der dritten
 * Änderung einmal falsch.
 *
 * ---
 *
 * **Warum die Bildprüfung ihn trotzdem nicht benutzt.**
 *
 * `bilder-pruefen.mjs` hat denselben Aufbau noch einmal für sich. Das ist
 * Absicht und keine Nachlässigkeit: Sie ist die Wache. Teilte sie sich ihren
 * Unterbau mit den Werkzeugen, die sie bewacht, könnte ein Fehler darin
 * beide zugleich blenden – die Prüfung würde grün melden, weil sie mit
 * demselben Fehler zeichnet wie das Geprüfte. Eine Wache, die aus derselben
 * Quelle trinkt, bewacht nichts.
 */

import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, '..', '..');

const TYPEN = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

/**
 * Bühne aufbauen.
 *
 * `arbeit` ist das Verzeichnis für Zwischenstände; dort landet auch das
 * Bündel der Maler. Zurück kommt die Basisadresse, der Browser und ein
 * Abbau.
 */
export async function oeffneBuehne(arbeit, auch = {}) {
  const DIST = join(wurzel, 'dist');
  if (!existsSync(DIST)) {
    throw new Error('Kein Build gefunden. Erst „npm run build".');
  }
  mkdirSync(arbeit, { recursive: true });

  /* ---- Die echten Maler bündeln ---------------------------------------- */
  execFileSync(
    'npx',
    ['esbuild', 'scripts/bilder/werkbank.ts', '--bundle', '--format=esm',
     `--outfile=${join(arbeit, 'werkbank.mjs')}`, '--log-level=error'],
    { cwd: wurzel, stdio: 'inherit' },
  );

  const server = createServer((anfrage, antwort) => {
    const pfad = (anfrage.url ?? '/').split('?')[0];
    let datei;
    /*
     * `auch` bildet Pfade auf Verzeichnisse ab – damit kann ein Werkzeug
     * eigene Dateien danebenlegen, ohne sie in den Build zu schieben. Der
     * Dateiname wird dabei vom Pfad abgeschnitten: Ohne das könnte eine
     * Anfrage mit `..` aus dem Verzeichnis herausgreifen.
     */
    const eigen = Object.entries(auch)
      .find(([vorn]) => pfad === vorn || pfad.startsWith(`${vorn}/`));
    if (eigen) {
      const name = pfad.slice(eigen[0].length).replace(/^\//, '');
      datei = join(eigen[1], name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name);
    } else if (pfad === '/werkbank.mjs') datei = join(arbeit, 'werkbank.mjs');
    else if (pfad === '/leer.html') {
      antwort.writeHead(200, { 'content-type': 'text/html' })
        .end('<!doctype html><title>leer</title>');
      return;
    } else {
      datei = join(DIST, pfad.replace(/^\/Traum\/studio/, '').replace(/^\//, '') || 'index.html');
    }
    if (!existsSync(datei) || !datei.startsWith(wurzel)) { antwort.writeHead(404).end(); return; }
    antwort
      .writeHead(200, {
        'content-type': TYPEN[datei.slice(datei.lastIndexOf('.'))] ?? 'application/octet-stream',
      })
      .end(readFileSync(datei));
  });
  await new Promise((ok) => server.listen(0, ok));
  const basis = `http://localhost:${server.address().port}/`;

  /*
   * Playwright liegt im Behälter und nicht in den Abhängigkeiten. Der erste
   * Versuch ist deshalb der gewöhnliche Weg, der zweite der Behälterpfad –
   * wer das Projekt woanders auscheckt, braucht nur `npm i -D playwright`.
   */
  const pw = await import('playwright').catch(() =>
    import('/opt/node22/lib/node_modules/playwright/index.js'));
  const chromium = pw.chromium ?? pw.default?.chromium;
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_BROWSERS_PATH
      ? {}
      : { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
  );

  return {
    basis,
    browser,
    async schliesse() {
      await browser.close();
      server.close();
    },
  };
}
