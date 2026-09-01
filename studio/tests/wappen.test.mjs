/*
 * Die Zeichen des Buches.
 *
 * Ein Zeichen ist eine Identität. Es steht auf dem Einband, auf der
 * Besitzseite, auf jeder Kapitelmarke – und es darf sich unter keinen
 * Umständen still gegen ein anderes austauschen. Genau das wäre beim
 * Einpflegen der fünfzehn geprägten Siegel beinahe passiert: Sieben Namen
 * gab es schon (Drache, Baum, Mond, Sonne, Feder, Flamme, Welle). Hätte ein
 * Siegel eine dieser Kennungen bekommen, fände `emblemById` den ersten
 * Treffer, und jedes Buch mit dem gezeichneten Drachen trüge über Nacht den
 * geprägten.
 *
 * Das fällt niemandem auf, weil es nicht kaputt aussieht – es sieht nur
 * anders aus, als man es in Erinnerung hatte.
 */

import { readFileSync, readdirSync } from 'node:fs';

let bestanden = 0;
let gescheitert = 0;
function pruefe(was, bedingung, hinweis = '') {
  if (bedingung) {
    bestanden++;
  } else {
    gescheitert++;
    console.error(`  ✗ ${was}${hinweis ? ` – ${hinweis}` : ''}`);
  }
}

const quelle = readFileSync(new URL('../src/lib/emblems.tsx', import.meta.url), 'utf8');
const kennungen = [...quelle.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
const labels = [...quelle.matchAll(/label: '([^']+)'/g)].map((m) => m[1]);

console.log('\n1 Kennungen');
pruefe('Es gibt Zeichen', kennungen.length > 0);
const doppelt = kennungen.filter((k, i) => kennungen.indexOf(k) !== i);
/*
 * Der eigentliche Fund. `emblemById` nimmt den ersten Treffer – bei zwei
 * gleichen Kennungen ist das zweite Zeichen unerreichbar, und wer es einmal
 * gewählt hatte, bekommt beim nächsten Laden das erste.
 */
pruefe(
  'Keine Kennung kommt zweimal vor',
  doppelt.length === 0,
  doppelt.length ? `doppelt: ${[...new Set(doppelt)].join(', ')}` : '',
);
/*
 * Labels dürfen sich zwischen den beiden Gruppen wiederholen – „Drache"
 * gezeichnet und „Drache" geprägt sind zwei sinnvolle Einträge. Innerhalb
 * einer Gruppe wäre dieselbe Beschriftung ein Fehler, und über die Gruppen
 * hinweg muss die Wahl die beiden unterscheidbar *aussprechen*: Für eine
 * Vorlesehilfe waren es sonst zwei Mal dasselbe Zeichen.
 */
const trennung = quelle.indexOf("id: 'siegel-");
const inGruppe = (name, ab, bis) =>
  [...quelle.slice(ab, bis).matchAll(/label: '([^']+)'/g)].map((m) => m[1]);
for (const [gruppe, ab, bis] of [
  ['Zeichnungen', 0, trennung],
  ['Siegel', trennung, quelle.length],
]) {
  const l = inGruppe(gruppe, ab, bis);
  pruefe(`Kein Label kommt innerhalb der ${gruppe} zweimal vor`, new Set(l).size === l.length);
}

console.log('2 Die geprägten Siegel');
const siegel = kennungen.filter((k) => k.startsWith('siegel-'));
pruefe('Die Siegel tragen ein eigenes Präfix', siegel.length >= 15, `${siegel.length} gefunden`);
pruefe(
  'Kein Siegel heißt wie eine Zeichnung',
  siegel.every((s) => !kennungen.includes(s.slice('siegel-'.length))
    || kennungen.filter((k) => k === s).length === 1),
  'sonst überschreibt es das gezeichnete Zeichen',
);

/*
 * Datei und Eintrag müssen sich decken – in beide Richtungen. Eine Datei ohne
 * Eintrag liegt tot im Bündel; ein Eintrag ohne Datei bricht den Bau. Das
 * zweite fängt der Übersetzer, das erste niemand.
 */
console.log('3 Dateien und Einträge');
const ordner = new URL('../src/assets/wappen/', import.meta.url);
const dateien = readdirSync(ordner).filter((d) => d.endsWith('.webp'));
const eingebunden = [...quelle.matchAll(/from '\.\.\/assets\/wappen\/([^']+)'/g)].map((m) => m[1]);
pruefe(
  'Jede Wappendatei wird auch benutzt',
  dateien.every((d) => eingebunden.includes(d)),
  dateien.filter((d) => !eingebunden.includes(d)).join(', '),
);
pruefe(
  'Jede eingebundene Datei liegt auch vor',
  eingebunden.every((d) => dateien.includes(d)),
  eingebunden.filter((d) => !dateien.includes(d)).join(', '),
);
pruefe('Es sind fünfzehn Siegel', dateien.length === 15, `${dateien.length}`);

/*
 * 4 Kommt die Trennung bei der Wahl an?
 *
 * Sechsundzwanzig Kacheln in einem Topf wären keine Wahl mehr – und die
 * Trennung ist keine Kosmetik: Eine Zeichnung erbt `currentColor` und wird im
 * Elfenbein-Band silbern; ein Siegel bringt sein Gold mit. Wer das nicht
 * sieht, wählt Gold für einen Silberband.
 *
 * Und wieder die alte Lektion: dass `nimmtFarbeAn` existiert, heißt nicht,
 * dass die Wahl es benutzt.
 */
console.log('4 Ankunft in der Wahl');
pruefe('Es gibt eine Regel, die beide Arten trennt', /export function nimmtFarbeAn/.test(quelle));
const wahl = readFileSync(new URL('../src/pages/geburt/Zeichenwahl.tsx', import.meta.url), 'utf8');
pruefe('Die Wahl benutzt sie', /nimmtFarbeAn/.test(wahl));
pruefe('Die Wahl beschriftet die zweite Gruppe', /Geprägte Siegel/.test(wahl));
/*
 * Vier Namen gibt es zweimal – Drache, Sonne, Flamme, Welle. Sichtbar sind
 * das zwei völlig verschiedene Kacheln unter zwei Überschriften; gesprochen
 * war es bis hierher zweimal derselbe Satz.
 */
pruefe(
  'Ein geprägtes Siegel spricht sich anders aus als seine Zeichnung',
  /geprägtes Siegel`/.test(wahl) && /aria-label=\{name\}/.test(wahl),
  'sonst heißen zwei Kacheln für eine Vorlesehilfe gleich',
);
/*
 * Ein Medaillon mit Ring, Rauten und Relief ist bei 32 Punkten ein goldener
 * Fleck. Die Siegelkacheln müssen größer sein als die der Strichzeichnungen.
 */
const groessen = [...wahl.matchAll(/kachel\(p, (\d+), (\d+)\)/g)].map((m) => [+m[1], +m[2]]);
pruefe('Beide Gruppen haben eigene Kachelgrößen', groessen.length === 2, `${groessen.length}`);
pruefe(
  'Die Siegel bekommen mehr Platz als die Zeichnungen',
  groessen.length === 2 && groessen[1][1] > groessen[0][1],
  groessen.map(([a, b]) => `${a}/${b}`).join(' → '),
);

console.log(`\n  ${bestanden} bestanden, ${gescheitert} gescheitert\n`);
process.exit(gescheitert ? 1 : 0);
