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

/* ------------------------------------------------------------------ 3 ---- */

/**
 * `rgb(var(--x) / 0.5)` verlangt Kanaele, keine Farbe.
 *
 * Dieselbe Familie wie oben, ein Glied weiter: Nicht zwei Arten in *einem*
 * Namen, sondern eine Schreibweise, die zu ihrem Namen nicht passt.
 *
 * Die meisten Marken dieses Buches liegen als „R G B" vor – nur so kann
 * Tailwind ihnen eine Deckkraft geben (`text-gold/60`). `--dc-blattgrund`
 * gehoert nicht dazu: Es steht als `#ebe1c9` da und wird direkt als Farbe
 * benutzt.
 *
 * Der echte Fall: In der Fussleiste der Setzerei stand
 * `rgb(var(--dc-blattgrund) / 0.97)`. `rgb(#ebe1c9 / 0.97)` ist ungueltig,
 * und ungueltige Angaben fallen ersatzlos aus – gemessen kam
 * `rgba(0, 0, 0, 0)` heraus. Also **gar kein** Hintergrund, und die Schrift
 * der Leiste stand mitten im scrollenden Text.
 *
 * Nichts sah kaputt aus. Es fehlte nur etwas, das nie da gewesen war.
 */
/*
 * Die Bandtoene zaehlen mit.
 *
 * `--dc-blattgrund` wird **nirgends im Stilblatt zugewiesen** – es kommt beim
 * Aufschlagen aus `lib/baende.ts` und wird per `setProperty` an die Wurzel
 * geschrieben. Die erste Fassung dieser Pruefung sah es deshalb nicht: Sie
 * kannte nur, was in CSS steht, und schwieg zu allem anderen.
 *
 * Genau daran ist sie beim ersten Versuch gescheitert – ich habe den Fehler
 * absichtlich wieder eingebaut, und sie meldete nichts. Eine Pruefung, die
 * ihren eigenen Anlass nicht faengt, ist keine.
 *
 * `bandAlsCss` bildet Tonname → Variablenname ab; die Werte stehen als
 * Literale in den sechs Baenden. Beides hier zusammenzulesen ist stumpf und
 * genau deshalb verlaesslich.
 */
const baende = readFileSync('src/lib/baende.ts', 'utf8');
const NAMENSPAAR = /'(--dc-[a-z0-9-]+)':\s*t\.(\w+)/g;
const TONWERT = /^\s*(\w+):\s*'([^']+)'/gm;

const tonArten = new Map(); // Tonname -> Art
for (const t of baende.matchAll(TONWERT)) {
  const art = artVon(t[2]);
  if (art) tonArten.set(t[1], art);
}
for (const t of baende.matchAll(NAMENSPAAR)) {
  const art = tonArten.get(t[2]);
  if (!art) continue;
  if (!arten.has(t[1])) arten.set(t[1], new Map());
  const je = arten.get(t[1]);
  if (!je.has(art)) je.set(art, new Set());
  je.get(art).add('src/lib/baende.ts');
}

const KANALNUTZUNG = /rgba?\(\s*var\((--dc-[a-z0-9-]+)\)/g;
const falscheKanaele = new Map();

/*
 * Kommentare zaehlen nicht.
 *
 * Beim ersten Lauf meldete diese Pruefung eine Stelle, an der die falsche
 * Schreibweise nur *zitiert* war – im Kommentar darueber, der erklaert, warum
 * sie falsch ist. Eine Pruefung, die Code nicht von Prosa unterscheidet,
 * prueft den Text und nicht das Programm.
 */
const ohneProsa = (q) => q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

for (const pfad of QUELLEN) {
  for (const t of ohneProsa(readFileSync(pfad, 'utf8')).matchAll(KANALNUTZUNG)) {
    const je = arten.get(t[1]);
    /* Unbekannt heisst: nirgends zugewiesen – dazu schweigen wir. */
    if (!je) continue;
    if (je.has('Farbkanaele')) continue;
    if (!je.has('Farbe')) continue;
    if (!falscheKanaele.has(t[1])) falscheKanaele.set(t[1], new Set());
    falscheKanaele.get(t[1]).add(pfad);
  }
}

if (falscheKanaele.size) {
  console.error('\nDiese Variablen werden als Farbkanaele gelesen, sind aber Farben:\n');
  for (const [name, wo] of falscheKanaele) {
    console.error(`  ${name}  –  benutzt in ${[...wo].join(', ')}`);
  }
  console.error(
    '\n`rgb(var(--x) / 0.5)` verlangt „R G B". Steht dort ein Hexwert, ist die\n' +
      'Angabe ungueltig und faellt ersatzlos aus – es gibt dann gar keine Farbe.\n' +
      'Entweder die Variable als Kanaele ablegen oder sie direkt benutzen:\n' +
      '  background: var(--x)\n' +
      '  linear-gradient(to bottom, transparent, var(--x))',
  );
  process.exit(1);
}

console.log('Keine Farbe wird als Farbkanal gelesen.');
