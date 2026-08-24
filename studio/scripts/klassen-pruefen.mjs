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

if (fehlend.size > 0) {
  meldeFehlende();
  process.exit(1);
}
console.log('Alle Deckkraftklassen sind im CSS angekommen.');


function meldeFehlende() {
  console.error('Diese Klassen stehen im Quelltext, aber nicht im CSS – sie tun nichts:\n');
  for (const [klasse, wo] of [...fehlend].sort()) {
    const stufe = Number(klasse.split('/').pop());
    const grund = stufe % 5 !== 0 ? `  (${stufe} ist kein Fuenferschritt)` : '';
    console.error(`  ${klasse}${grund}`);
    for (const p of wo) console.error(`      ${p}`);
  }
  console.error('\nTailwinds Deckkraftskala kennt nur Vielfache von 5.');
}

/* ------------------------------------------------------------------ 2 ---- */

/**
 * Traegt eine CSS-Variable zwei verschiedene Arten von Wert?
 *
 * Zweiter Anlass, gleiche Falle. `--dc-bogen` war eine Zahl (0…1), die die
 * Raumschicht sechzigmal je Sekunde neu schreibt – und ich habe denselben
 * Namen fuer eine Farbe benutzt. `--dc-falz` ging genauso aus: eine Zahl fuer
 * die Falzstaerke, eine Farbe fuer den Falzschatten.
 *
 * Der Schaden ist beide Male derselbe und beide Male unsichtbar:
 * `var(--x, ruecklage)` greift auf die Ruecklage **nur zurueck, wenn `--x`
 * gar nicht gesetzt ist**. Steht dort ein Wert der falschen Art, wird die
 * ganze Deklaration ungueltig – und CSS wirft sie still weg. Kein Fehler,
 * keine Warnung, nur eine Regel, die es nicht mehr gibt.
 *
 * Merksatz: **Eine CSS-Variable ist ein globaler Name.**
 */

const QUELLEN = [...dateien, 'src/index.css'];
const arten = new Map(); // name -> Map<art, Set<pfad>>

const ZUWEISUNG = /(--dc-[a-z0-9-]+)\s*:\s*([^;}]+)/g;

/** Grob, aber ausreichend: Farbe, Zahl, Laenge, Dauer – oder „egal“. */
function artVon(wert) {
  const w = wert.trim().toLowerCase();
  if (w.startsWith('var(') || w.includes('calc(')) return null;
  if (/^#[0-9a-f]{3,8}$/.test(w) || /^(rgba?|hsla?|color)\(/.test(w)) return 'Farbe';
  if (/^-?\d*\.?\d+$/.test(w)) return 'Zahl';
  if (/^-?\d*\.?\d+(px|rem|em|vh|vw|%)$/.test(w)) return 'Laenge';
  if (/^-?\d*\.?\d+m?s$/.test(w)) return 'Dauer';
  if (/^-?\d*\.?\d+deg$/.test(w)) return 'Winkel';
  if (/^\d{1,3} \d{1,3} \d{1,3}$/.test(w)) return 'Farbkanaele';
  return null;
}

/*
 * Wer schreibt diese Namen zur Laufzeit?
 *
 * Beide echten Faelle hatten dieselbe Gestalt: Ein Name, den die Raumschicht
 * waehrend der Geste sechzigmal je Sekunde mit einer *Zahl* beschreibt, wurde
 * anderswo als *Farbe* gelesen. Dass CSS selbst eine Ruhelage dafuer setzt,
 * ist dagegen der Normalfall und kein Fehler – deshalb zaehlt hier nur die
 * eine gefaehrliche Paarung: **beschrieben zur Laufzeit, gelesen als Farbe.**
 */
const LAUFZEIT = /setProperty\(\s*'(--dc-[a-z0-9-]+)'/g;
const laufzeit = new Map();
for (const pfad of dateien) {
  for (const t of readFileSync(pfad, 'utf8').matchAll(LAUFZEIT)) {
    if (!laufzeit.has(t[1])) laufzeit.set(t[1], new Set());
    laufzeit.get(t[1]).add(pfad);
  }
}

for (const pfad of QUELLEN) {
  const inhalt = readFileSync(pfad, 'utf8');
  for (const t of inhalt.matchAll(ZUWEISUNG)) {
    const art = artVon(t[2]);
    if (!art) continue;
    if (!arten.has(t[1])) arten.set(t[1], new Map());
    const je = arten.get(t[1]);
    if (!je.has(art)) je.set(art, new Set());
    je.get(art).add(pfad);
  }
}

const doppelt = [...arten].filter(([, je]) => je.size > 1);

/* Zur Laufzeit beschrieben und im Stilblatt als Farbe gelesen. */
for (const [name, wo] of laufzeit) {
  const je = arten.get(name);
  if (!je) continue;
  if (!je.has('Farbe') && !je.has('Farbkanaele')) continue;
  const zusammen = new Map(je);
  zusammen.set('Laufzeitwert', wo);
  if (!doppelt.some(([n]) => n === name)) doppelt.push([name, zusammen]);
}

if (doppelt.length) {
  console.error('\nDiese CSS-Variablen tragen zwei Arten von Wert:\n');
  for (const [name, je] of doppelt) {
    console.error(`  ${name}`);
    for (const [art, wo] of je) console.error(`      als ${art}:  ${[...wo].join(', ')}`);
  }
  console.error(
    '\nvar(--x, ruecklage) greift nur, wenn --x *ungesetzt* ist. Ein Wert der\n' +
      'falschen Art macht die Deklaration ungueltig – lautlos. Neuen Namen geben.',
  );
  process.exit(1);
}

console.log('Keine CSS-Variable traegt zwei Arten von Wert.');
