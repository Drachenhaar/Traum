/*
 * Der Beispielband „Mooshalde".
 *
 * Ein Band, den niemand von Hand pflegt, verrottet leise: Ein Tippfehler in
 * einer Kennung macht aus einer Beziehung nichts, und *nichts* fällt beim
 * Durchblättern nie auf. Genau das wird hier gerechnet.
 *
 * Was hier **nicht** geprüft wird, ist, ob die Geschichte gut ist. Das findet
 * nur das Lesen.
 */

import { readFileSync } from 'node:fs';

let bestanden = 0;
let gescheitert = 0;
function wahr(was, bedingung, hinweis = '') {
  if (bedingung) {
    bestanden++;
  } else {
    gescheitert++;
    console.error(`  ✗ ${was}${hinweis ? ` – ${hinweis}` : ''}`);
  }
}

const lies = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const quelle = lies('../src/lib/beispiel/mooshalde.ts');

/**
 * Die Prosa wegnehmen, bevor man im Quelltext sucht.
 *
 * Sonst findet eine Prüfung ihren eigenen Erklärtext und ist immer erfüllt –
 * der Fehler, der in diesem Projekt schon zweimal eine grüne Zeile erzeugt
 * hat, hinter der nichts stand.
 */
const ohneProsa = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const code = ohneProsa(quelle);

/* ==========================================================================
 * 1  KEINE KANTE INS LEERE
 *
 * Der wichtigste Abschnitt. Eine Beziehung, deren Ende es nicht gibt, taucht
 * im Graphen nicht auf, wirft keinen Fehler und ist von Hand nicht zu finden.
 * Die Bauroutine überspringt sie still – gut für den Betrieb, blind für den
 * Erbauer. Also zählt der Test nach.
 * ======================================================================= */

const kennungen = [...code.matchAll(/eintrag\('([a-z_0-9]+)',/g)].map((m) => m[1]);
const kanten = [...code.matchAll(/^\s*\['([a-z_0-9]+)',\s*'([a-z_]+)',\s*'([a-z_0-9]+)'/gm)].map(
  (m) => ({ von: m[1], art: m[2], nach: m[3] }),
);

console.log('\n1 Die Verbindungen');
wahr(`  ${kennungen.length} Einträge gefunden`, kennungen.length >= 40);
wahr(`  ${kanten.length} Kanten gefunden`, kanten.length >= 50);

const bekannt = new Set(kennungen);
const verwaist = kanten.filter((k) => !bekannt.has(k.von) || !bekannt.has(k.nach));
wahr(
  '  jede Kante hat zwei Enden, die es gibt',
  verwaist.length === 0,
  verwaist.map((k) => `${k.von} → ${k.nach}`).join(', '),
);

const doppelt = kennungen.filter((k, i) => kennungen.indexOf(k) !== i);
wahr('  keine Kennung zweimal vergeben', doppelt.length === 0, doppelt.join(', '));

/*
 * Und die Beziehungsarten müssen es geben.
 *
 * Eine erfundene Art wie `verursacht` statt `causes` würde gespeichert,
 * angezeigt und wäre trotzdem falsch: Die Umkehrung („ging hervor aus") kennt
 * nur die Liste in `relations.ts`, und eine unbekannte Art hat keine.
 */
const arten = new Set(
  [...ohneProsa(lies('../src/lib/relations.ts')).matchAll(/id: '([a-z_]+)',\s*\n\s*label:/g)].map(
    (m) => m[1],
  ),
);
const unbekannt = [...new Set(kanten.map((k) => k.art))].filter((a) => !arten.has(a));
wahr('  jede Beziehungsart steht im Verzeichnis', unbekannt.length === 0, unbekannt.join(', '));

/* ==========================================================================
 * 2  DIE TRAGENDE KETTE
 *
 * Der ganze Sinn dieses Bandes ist eine Kette, die quer durch Pflanze, Tier,
 * Gebäude und Mensch läuft. Reisst ein Glied heraus, ist der Band eine
 * Sammlung schöner Einzelseiten – und beweist nichts mehr.
 * ======================================================================= */

console.log('\n2 Die Kette von der Ursache zur Wirkung');
const kette = [
  ['fig_wenzel', 'pfl_nebeleiche'],
  ['pfl_nebeleiche', 'kre_nebelzug'],
  ['kre_nebelzug', 'arc_glockenhaus'],
  ['arc_glockenhaus', 'mus_haldenschlag'],
  ['mus_haldenschlag', 'tier_haeher'],
];
for (const [von, nach] of kette) {
  wahr(
    `  ${von} → ${nach}`,
    kanten.some((k) => k.von === von && k.nach === nach && k.art === 'causes'),
  );
}

/* ==========================================================================
 * 3  WAS AUF DIE SEITE KOMMT
 * ======================================================================= */

console.log('\n3 Der Satz auf den Seiten');

/*
 * Kein Markdown im Fliesstext.
 *
 * Die Buchseiten setzen keinen Markdown – `**so**` stand wörtlich auf der
 * Seite von Hedda Amsel, mit Sternchen. Gefunden wurde es nicht beim Lesen
 * des Quelltextes, sondern auf einem Bildschirmfoto.
 */
/*
 * Gesucht wird im Quelltext **ohne** Prosa – und zwar rundheraus.
 *
 * Der erste Versuch wollte die Zeichenketten einzeln herausschneiden und
 * paarte dabei Anführungszeichen quer durch die Datei: 541 „Textstellen" bei
 * 50 Einträgen, und die eine Stelle mit Sternchen lag ausgerechnet zwischen
 * zwei Treffern. Die Prüfung war grün, während der Fehler dastand.
 *
 * Ohne Kommentare bleibt im Quelltext nichts übrig, was zwei Sternchen
 * nebeneinander tragen dürfte – TypeScript kennt hier keine Potenz. Also
 * genügt die einfache Frage, und sie kann nicht danebengreifen.
 */
const stelle = code.search(/\*\*/);
wahr(
  '  kein Markdown im Text der Einträge',
  stelle < 0,
  stelle < 0 ? '' : code.slice(Math.max(0, stelle - 60), stelle + 30).replace(/\n/g, ' '),
);

/*
 * Jeder Eintrag sagt, worum es geht.
 *
 * Ein Eintrag ohne `description` ist im Register eine Zeile ohne Antwort –
 * und im Beispielband wäre das die schlechteste Werbung für das eigene Buch.
 */
const bloecke = [...quelle.matchAll(/eintrag\('([a-z_0-9]+)', '[a-z]+', \{([\s\S]*?)\n    \}\)/g)];
/*
 * Erst zählen, dann prüfen. Findet der Ausdruck nichts, ist „keiner ohne
 * Beschreibung" trivial erfüllt – eine grüne Zeile, die nichts geprüft hat.
 */
wahr(`  ${bloecke.length} Einträge im Zugriff`, bloecke.length === kennungen.length);
const ohneBeschreibung = bloecke.filter((m) => !/description:/.test(m[2])).map((m) => m[1]);
wahr('  jeder Eintrag hat eine Beschreibung', ohneBeschreibung.length === 0, ohneBeschreibung.join(', '));

/* ==========================================================================
 * 4  DER BAND STELLT SICH NUR HIN
 *
 * Er schlägt sich nicht selbst auf, und er schreibt nichts in das Buch, das
 * gerade offen ist. Das ist der Grund, warum es überhaupt ein eigener Band
 * ist – und deshalb wird es geprüft und nicht bloss beabsichtigt.
 * ======================================================================= */

console.log('\n4 Der Band bleibt bei sich');
const store = ohneProsa(lies('../src/store/useStudio.ts'));
const laden = store.slice(store.indexOf('async ladeBeispielband()'), store.indexOf('async archiviereBuch'));
wahr('  die Ladeaktion gibt es', laden.length > 100);
wahr('  sie legt ein eigenes Buch an', /neuesBuch\(MOOSHALDE_BUCH\)/.test(laden));
wahr('  und öffnet es nicht', !/oeffneBuch/.test(laden));
wahr('  sie schreibt nur in dieses Buch', /bulkPut\(entries\)/.test(laden) && /db\.books\.put\(buch\)/.test(laden));

/*
 * Die Kennungen bekommen den Bandpräfix.
 *
 * Ohne ihn zeigten die Beziehungen eines zweiten geladenen Bandes auf die
 * Einträge des ersten – zwei Bücher teilten sich still ihre Welt. Derselbe
 * Fehler ist beim Abschreiben eines Buches schon einmal passiert.
 */
wahr('  Kennungen tragen den Bandpräfix', /\$\{bookId\}__\$\{id\}/.test(code));

/* ==========================================================================
 * 5  DIE TÜR IN DER BIBLIOTHEK
 * ======================================================================= */

console.log('\n5 Die Tür');
const regal = ohneProsa(lies('../src/pages/bibliothek/Bibliothek.tsx'));
wahr('  die Zeile steht im Regal', /BeispielZeile/.test(regal));
wahr('  sie nennt den Band beim Namen', /BEISPIEL_TITEL/.test(regal));
/*
 * Und sie lädt nur einmal. Zwei gleich benannte Bände nebeneinander wären
 * kein Angebot mehr, sondern ein Fehler mit Doppelklick als Ursache.
 */
wahr('  ein zweites Mal wird nicht geladen', /schonDa/.test(regal) && /b\.title === BEISPIEL_TITEL/.test(regal));

/* ==========================================================================
 * 6  DER EINBAND
 *
 * `moos` sah aus wie eine gültige Farbe und ist eine *Band*farbe. Der Wert
 * fiel still auf Umbra zurück; der Einband sah aus wie jeder andere.
 * ======================================================================= */

console.log('\n6 Der Einband');
const farben = new Set(
  [...ohneProsa(lies('../src/lib/bookIdentity.ts')).matchAll(/id: '([a-z]+)',\s*\n\s*label:/g)].map((m) => m[1]),
);
const gewaehlt = code.match(/coverColor: '([a-z]+)'/)?.[1];
wahr(`  die Einbandfarbe „${gewaehlt}" gibt es`, !!gewaehlt && farben.has(gewaehlt));

console.log(`\n${bestanden} bestanden, ${gescheitert} gescheitert`);
process.exit(gescheitert ? 1 : 0);
