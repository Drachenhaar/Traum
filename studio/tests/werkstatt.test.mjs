/*
 * Die Setzerei als Werkstatt.
 *
 * Der Umbau hat die Oberfläche verändert und ausdrücklich **nicht** das
 * Datenmodell. Genau das lässt sich prüfen – und genau das geht beim nächsten
 * Handgriff als Erstes verloren, weil ein verschwundenes Feld nicht weh tut:
 * Die Seite sieht danach nicht falsch aus, sie ist nur ärmer.
 *
 * Geprüft wird deshalb dreierlei:
 *
 *   1. dass die Präsentationsschicht abgeleitet ist und nicht je Typ
 *      hartkodiert – sonst kostet ein neuer Eintragstyp wieder eine eigene
 *      Setzerei;
 *   2. dass kein Feld beim Gruppieren verloren geht oder doppelt erscheint;
 *   3. dass die Vorschau die echte Seitensetzung benutzt und nicht eine
 *      zweite, nachgebaute.
 */

import { readFileSync } from 'node:fs';

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

const lies = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const darstellung = lies('../src/lib/setzerei/darstellung.ts');
const gruppen = lies('../src/lib/feldgruppen.ts');
const setzerei = lies('../src/pages/book/Setzerei.tsx');
const feldsatz = lies('../src/components/setzerei/Feldsatz.tsx');
const seitentext = lies('../src/components/entry/Seitentext.tsx');
const entrySpread = lies('../src/pages/book/EntrySpread.tsx');
const templates = lies('../src/lib/templates.ts');
const transcribe = lies('../src/lib/transcribe.ts');

/* ------------------------------------------------------ 1 Präsentation */

console.log('\n1 Die Darstellung ist abgeleitet');
pruefe('Es gibt eine eigene Darstellungsschicht', /export type Darstellung/.test(darstellung));
pruefe(
  'Sie leitet aus `kind` ab, statt je Typ zu entscheiden',
  /export function darstellungVon/.test(darstellung) && /switch \(def\.kind\)/.test(darstellung),
);
/*
 * Der eigentliche Punkt. Zweiunddreissig Vorlagen, und die Entscheidung, *wie*
 * ein Feld geschrieben wird, darf keine davon kennen – sonst ist es wieder
 * eine Setzerei je Typ, und ein neuer Eintragstyp kostet erneut Code.
 *
 * Die erste Fassung dieser Pruefung suchte Typnamen in der *ganzen* Datei und
 * schlug fehl. Zu Recht gefunden, falsch gedeutet: Die Namen stehen in
 * `WELTBEZUG` – „Herkunft zeigt auf einen Ort oder ein Biom". Das ist keine
 * Sonderbehandlung eines Typs, sondern die Auskunft, worauf ein Feld zeigen
 * darf, und ohne sie gibt es kein Weltwissen als Auswahlhilfe. Geprueft wird
 * deshalb der Teil, um den es geht: die Ableitung selbst.
 */
const ableitung = darstellung.slice(0, darstellung.indexOf('/* ------'));
const typen = [...templates.matchAll(/^    type: '(\w+)',$/gm)].map((m) => m[1]);
const genannt = typen.filter((t) => new RegExp(`'${t}'`).test(ableitung));
pruefe(
  'Die Ableitung kennt keinen einzigen Eintragstyp',
  genannt.length === 0,
  genannt.join(', '),
);
/* Und sie verzweigt auch sonst nirgends über einen Typ. */
pruefe(
  'Sie verzweigt nicht über den Typ',
  !/entry\.type|def\.type|EntryType\)/.test(ableitung),
);
pruefe(
  'Ausnahmen gibt es nur auf Feldebene',
  /const EIGENART: Record<string, Darstellung>/.test(darstellung),
);

pruefe(
  'Formatangaben werden vom Papier ferngehalten',
  /export function istFormatangabe/.test(darstellung) && /istFormatangabe/.test(feldsatz),
);
/*
 * Aber nur dort. „durch Komma getrennt" ist fuer ChatGPT eine noetige
 * Auskunft – wer sie aus dem Prompt entfernte, bekaeme Antworten, die die
 * Setzerei nicht mehr lesen kann.
 */
pruefe(
  'Im Prompt bleiben sie stehen',
  /durch Komma getrennt/.test(transcribe),
  'sonst antwortet ChatGPT in einem Format, das der Parser nicht liest',
);

/* --------------------------------------------------------- 2 Die Gruppen */

console.log('2 Die Gruppen');
const gruppenIds = [...gruppen.matchAll(/\{ id: '(\w+)', label: '([^']*)'/g)].map((m) => ({
  id: m[1],
  label: m[2],
}));
pruefe('Es gibt Gruppen', gruppenIds.length > 0);
/*
 * Zwei Abschnitte namens „Der Kern" standen im ersten Lauf untereinander –
 * einer mit Titel und Kategorie, einer mit Rolle und Alter. Das ist keine
 * Kosmetik: Eine Gliederung, die denselben Namen zweimal vergibt, gliedert
 * nichts.
 */
const labels = gruppenIds.map((g) => g.label).filter(Boolean);
pruefe(
  'Keine zwei Gruppen heißen gleich',
  new Set(labels).size === labels.length,
  labels.filter((l, i) => labels.indexOf(l) !== i).join(', '),
);
pruefe(
  'Die Setzerei führt Stammangaben und Kennzeichen in einem Abschnitt',
  /gruppenAlle\.find\(\(g\) => g\.gruppe\.id === 'kern'\)/.test(setzerei) &&
    /filter\(\(g\) => g\.gruppe\.id !== 'kern'\)/.test(setzerei),
);

/* Jedes zugeordnete Feld gehört genau einer Gruppe. */
const zuordnung = {};
const doppelt = [];
for (const m of gruppen.matchAll(/zuordnen\('(\w+)',\s*\[([\s\S]*?)\]\)/g)) {
  for (const k of m[2].matchAll(/'([\w]+)'/g)) {
    if (zuordnung[k[1]]) doppelt.push(`${k[1]} (${zuordnung[k[1]]} + ${m[1]})`);
    zuordnung[k[1]] = m[1];
  }
}
pruefe('Kein Feld ist zwei Gruppen zugeordnet', doppelt.length === 0, doppelt.join(', '));

const bekannt = new Set(gruppenIds.map((g) => g.id));
const unbekannt = [...new Set(Object.values(zuordnung))].filter((g) => !bekannt.has(g));
pruefe(
  'Jede Zuordnung zeigt auf eine Gruppe, die es gibt',
  unbekannt.length === 0,
  unbekannt.join(', '),
);

/*
 * Wieviel faellt in die Schublade? „Weiteres" ist der ehrliche Ausweg fuer
 * Felder, an die niemand gedacht hat – aber wenn die Haelfte einer Figur dort
 * landet, ist die Gliederung keine.
 */
const charakter = templates.slice(
  templates.indexOf("type: 'character'"),
  templates.indexOf("type: 'creature'"),
);
const figurFelder = [...charakter.matchAll(/key: '(\w+)'/g)].map((m) => m[1]);
const rest = figurFelder.filter((k) => !zuordnung[k]);
pruefe(
  'Bei einer Figur fällt höchstens ein Feld unter „Weiteres"',
  rest.length <= 1,
  rest.join(', '),
);

/* ------------------------------------------------------- 3 Die Vorschau */

console.log('3 Die Vorschau ist die echte Seite');
pruefe('Der Seitenkörper ist ein eigenes Bauteil', /export function Seitentext/.test(seitentext));
/*
 * Und beide benutzen ihn. Dass ein Bauteil existiert, heisst nicht, dass es
 * benutzt wird – dieselbe Lektion wie bei der Setzerei, die nie auf den
 * Buchseiten ankam, und bei den Baenden, die niemand fand.
 */
pruefe('Die Buchseite benutzt ihn', /<Seitentext entry=\{entry\}/.test(entrySpread));
pruefe('Die Vorschau benutzt ihn', /<Seitentext entry=\{entwurf\}/.test(setzerei));
/*
 * Und die Buchseite baut ihn nicht *daneben* noch einmal. Die Initiale ist
 * dafuer der beste Zeuge: Sie steht in genau einer Datei, oder die Vorschau
 * ist wieder eine Faelschung.
 */
pruefe(
  'Die Buchseite setzt den Fließtext nicht ein zweites Mal',
  !/prose-book dropcap/.test(entrySpread),
  'die Initiale steht in Seitentext',
);
pruefe('Die Vorschau führt nirgendwohin', /verweise=\{false\}/.test(setzerei));

/* ----------------------------------------------------- 4 Nichts verloren */

console.log('4 Was bleiben muss');
for (const [was, muster] of [
  ['Der Rohtextimport', /transcribe\(text, living, chosenType \|\| undefined\)/],
  ['Gerüst einsetzen', /blankTemplateFor\(activeType\)/],
  ['Die Vorlage für ChatGPT', /promptTemplateFor\(activeType, settings\.worldName\)/],
  ['Die Wahl der Art', /templatesByFamily/],
  ['Das Speichern', /createEntry\(activeType, \{/],
  ['Die erkannten Erwähnungen', /addRelation\(entry\.id, mention\.entryId/],
  ['Die Textblöcke', /blocks: entwurf\.blocks/],
  ['Die Weltzeit', /beginn: entwurf\.beginn/],
]) {
  pruefe(`${was} ist noch da`, muster.test(setzerei));
}

/*
 * Die vollstaendige Feldliste bleibt erreichbar – als Wahl, nicht als
 * Vorgabe. Sie war der Grund, warum die alte Setzerei wie eine Datenbank
 * aussah, und sie ist trotzdem noetig: Wer eine Vorlage baut oder einen
 * Importfehler sucht, braucht die technischen Schluessel.
 */
pruefe(
  'Die volle Feldliste ist eine Wahl, keine Vorgabe',
  /Alle Felder des Gerüsts anzeigen/.test(setzerei) && /useState\(false\)/.test(setzerei),
);

/*
 * Der Fund, den keine Zusicherung hatte – nur der Lauf am Gerät.
 *
 * Der von Hand gesetzte Weltbezug legte ein generisches `related` neben das
 * `comes_from`, das der Parser aus „Herkunft:" schon abgeleitet hatte. Zwei
 * Kanten für eine Aussage, eine davon ungenauer; `addRelation` faengt nur
 * Doppelungen *gleicher* Art ab. Am Ende standen im Weltgraphen zwei Striche
 * zwischen denselben zwei Seiten, und niemand haette das je bemerkt.
 */
console.log('4b Eine Verbindung, eine Kante');
pruefe(
  'Die Beschriftung → Kante-Zuordnung steht an einer Stelle',
  /export function beziehungFuer/.test(transcribe) &&
    (transcribe.match(/comes_from: \[/g) ?? []).length === 1,
  'zwei Tabellen für dieselbe Zuordnung sind zwei Wahrheiten',
);
pruefe('Die Setzerei leiht sie sich, statt sie abzuschreiben', /beziehungFuer/.test(setzerei));
pruefe(
  'Was der Parser verbunden hat, wird nicht zweimal verbunden',
  /schonVerbunden\.has\(zielId\)/.test(setzerei),
);
/*
 * Diese Zusicherung suchte zuerst die alte Zeile im ganzen Quelltext – und
 * fand sie, im Kommentar darueber, wo sie zitiert steht. Eine Pruefung, die
 * Code nicht von Prosa unterscheidet, prueft den Text und nicht das Programm.
 * Geprueft wird deshalb die *Form des Aufrufs*: Die Kante muss aus der
 * Beschriftung kommen; `related` darf nur der Rueckfall dahinter sein.
 */
const aufruf =
  setzerei
    .split('\n')
    /* Kommentarzeilen beginnen mit `*` – der Aufruf tut das nicht. */
    .filter((z) => !/^\s*\*/.test(z) && z.includes('addRelation(entry.id, zielId,'))
    .join('\n') || '';
pruefe(
  'Der Weltbezug leitet die Kante ab statt sie zu raten',
  /beziehungFuer\(/.test(aufruf) && /\?\? 'related'/.test(aufruf),
  aufruf || 'kein Aufruf gefunden',
);

console.log('5 Mobil');
/*
 * Zwei Spalten auf einer Handbreite waren der urspruengliche Fehler. Der
 * Nebeneinander-Satz darf deshalb nur ab `lg:` greifen.
 */
const spalten = [...setzerei.matchAll(/(\S*)grid-cols-\[/g)].map((m) => m[1]);
pruefe(
  'Zwei Spalten gibt es erst am Schreibtisch',
  spalten.every((p) => p.startsWith('lg:')),
  spalten.join(', '),
);
pruefe('Es gibt drei Schritte', /'manuskript' \| 'veredeln' \| 'seite'/.test(setzerei));
/*
 * Sechzehn Punkte sind die Untergrenze fuer jedes Feld, in das getippt wird –
 * darunter zoomt Safari beim Hineintippen.
 */
const zuKlein = [...feldsatz.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)]
  .map((m) => Number(m[1]))
  .filter((n) => n < 15 && n > 0);
pruefe(
  'Die Schreibflächen sind groß genug für Safari',
  /font-serif text-\[16px\]/.test(feldsatz),
  `kleinste Grade: ${[...new Set(zuKlein)].join(', ')}`,
);
pruefe(
  'Das Manuskript bricht auf dem Telefon nicht nach drei Wörtern um',
  /font-serif text-\[16px\][^"]*sm:font-mono/.test(setzerei),
  'Monoschrift bei 16px trägt auf 390 Punkten nur 24 Zeichen',
);

console.log(`\n  ${bestanden} bestanden, ${gescheitert} gescheitert\n`);
process.exit(gescheitert ? 1 : 0);
