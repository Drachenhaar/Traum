/**
 * Welche Tailwind-Klasse steht im Quelltext, aber nicht im gebauten CSS?
 *
 * Anlass: Vier schwebende Tafeln – der Gedankenfang, das Szenenblatt, das
 * Kapitelzeichen und das Mehr-Menue – standen wochenlang ohne Hintergrund im
 * Buch. Auf dem Telefon sah man mitten durch sie hindurch auf die Seite
 * darunter, und der Text war unlesbar.
 *
 * Die Ursache war eine einzige Ziffer: `bg-cream-50/98`. Tailwinds
 * Deckkraftskala kennt nur Fuenferschritte; 98 gibt es nicht, die Klasse wird
 * nicht erzeugt, und der Browser ignoriert einen unbekannten Klassennamen
 * kommentarlos. Nichts schlaegt fehl. Der Typpruefer sieht nichts – es ist ja
 * eine Zeichenkette. Der Build meldet nichts. Die Oberflaeche sieht am
 * Schreibtisch fast richtig aus, weil dort meistens Papier hinter dem Papier
 * liegt.
 *
 * Genau deshalb gibt es dieses Skript: Es vergleicht jede benutzte Klasse mit
 * Deckkraftangabe gegen das, was wirklich im CSS gelandet ist. Was fehlt, ist
 * wirkungslos – und wirkungslos ist schlimmer als falsch, weil es niemandem
 * auffaellt.
 *
 * Aufruf:  npm run klassen     (nach einem Build)
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CSS_ORDNER = 'dist/assets';
if (!existsSync(CSS_ORDNER)) {
  console.error('Kein Build gefunden. Erst „npm run build“, dann diese Pruefung.');
  process.exit(2);
}

const css = readdirSync(CSS_ORDNER)
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(CSS_ORDNER, f), 'utf8'))
  .join('\n');

const dateien = [];
(function lauf(ordner) {
  for (const name of readdirSync(ordner)) {
    const pfad = join(ordner, name);
    if (statSync(pfad).isDirectory()) lauf(pfad);
    else if (/\.(tsx|ts)$/.test(name)) dateien.push(pfad);
  }
})('src');

/* Nur Klassen mit Deckkraftangabe – dort steckt die Falle. */
const NUTZUNG =
  /\b((?:bg|text|border|from|via|to|ring|divide|placeholder|decoration|outline|accent|caret|fill|stroke)-[a-z0-9-]+\/\d{1,3})\b/g;

const fehlend = new Map();

for (const pfad of dateien) {
  for (const treffer of readFileSync(pfad, 'utf8').matchAll(NUTZUNG)) {
    const klasse = treffer[1];
    /*
     * So steht die Klasse im CSS: der Schraegstrich ist maskiert. Der
     * fuehrende Selektorpunkt darf *nicht* gefordert werden – bei einer
     * Variante steht davor noch `hover\:` oder `sm\:`. Dahinter muss eine
     * Grenze stehen, sonst passt `/7` auf `/70`.
     */
    const gesucht = klasse.replace(/\./g, '\\.').replace(/\//g, '\\/');
    const alsRegex = new RegExp(
      gesucht.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[{,:.\\s)])',
    );
    if (alsRegex.test(css)) continue;
    if (!fehlend.has(klasse)) fehlend.set(klasse, new Set());
    fehlend.get(klasse).add(pfad);
  }
}

if (fehlend.size === 0) {
  console.log('Alle Deckkraftklassen sind im CSS angekommen.');
  process.exit(0);
}

console.error('Diese Klassen stehen im Quelltext, aber nicht im CSS – sie tun nichts:\n');
for (const [klasse, wo] of [...fehlend].sort()) {
  const stufe = Number(klasse.split('/').pop());
  const grund = stufe % 5 !== 0 ? `  (${stufe} ist kein Fuenferschritt)` : '';
  console.error(`  ${klasse}${grund}`);
  for (const p of wo) console.error(`      ${p}`);
}
console.error('\nTailwinds Deckkraftskala kennt nur Vielfache von 5.');
process.exit(1);
