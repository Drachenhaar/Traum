/*
 * Der Beispielband „Dragoncore".
 *
 * Ein Band, den niemand von Hand pflegt, verrottet leise: Ein Tippfehler in
 * einer Kennung macht aus einer Beziehung nichts, und *nichts* fällt beim
 * Durchblättern nie auf. Genau das wird hier gerechnet.
 *
 * Was hier **nicht** geprüft wird, ist, ob die Geschichte gut ist. Das findet
 * nur das Lesen.
 */

import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ARBEIT } from './arbeit.mjs';

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

/**
 * **Beide Bände, nicht nur der erste.**
 *
 * Diese Datei prüfte lange nur `dragoncore.ts`. Als ein zweiter Band
 * dazukam, wäre er ungeprüft ins Regal gewandert – mit eigenen Kanten, eigenen
 * Kennungen und einer eigenen Gelegenheit, eine Kante ins Leere zu setzen.
 * Die Liste unten ist deshalb die Stelle, an der ein dritter Band eingetragen
 * wird; alles Strukturelle gilt dann automatisch auch für ihn.
 */
const DATEIEN = [
  { id: 'dragoncore', datei: '../src/lib/beispiel/dragoncore.ts', mindestens: 40, kantenMin: 50 },
  { id: 'stillersee', datei: '../src/lib/beispiel/stillersee.ts', mindestens: 15, kantenMin: 25 },
];
const quelle = lies(DATEIEN[0].datei);

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

const leseBand = (d) => {
  const roh = lies(d.datei);
  const c = ohneProsa(roh);
  return {
    ...d,
    quelle: roh,
    code: c,
    kennungen: [...c.matchAll(/eintrag\('([a-z_0-9]+)',/g)].map((m) => m[1]),
    kanten: [...c.matchAll(/^\s*\['([a-z_0-9]+)',\s*'([a-z_]+)',\s*'([a-z_0-9]+)'/gm)].map((m) => ({
      von: m[1],
      art: m[2],
      nach: m[3],
    })),
  };
};
const BAENDE = DATEIEN.map(leseBand);
const band = (id) => BAENDE.find((b) => b.id === id);

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

console.log('\n1 Die Verbindungen');
for (const b of BAENDE) {
  console.log(`  · ${b.id}`);
  wahr(`    ${b.kennungen.length} Einträge gefunden`, b.kennungen.length >= b.mindestens);
  wahr(`    ${b.kanten.length} Kanten gefunden`, b.kanten.length >= b.kantenMin);

  const bekannt = new Set(b.kennungen);
  const verwaist = b.kanten.filter((k) => !bekannt.has(k.von) || !bekannt.has(k.nach));
  wahr(
    '    jede Kante hat zwei Enden, die es gibt',
    verwaist.length === 0,
    verwaist.map((k) => `${k.von} → ${k.nach}`).join(', '),
  );

  const doppelt = b.kennungen.filter((k, i) => b.kennungen.indexOf(k) !== i);
  wahr('    keine Kennung zweimal vergeben', doppelt.length === 0, doppelt.join(', '));

  const unbekannt = [...new Set(b.kanten.map((k) => k.art))].filter((a) => !arten.has(a));
  wahr('    jede Beziehungsart steht im Verzeichnis', unbekannt.length === 0, unbekannt.join(', '));
}

const kennungen = band('dragoncore').kennungen;
const kanten = band('dragoncore').kanten;

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
for (const b of BAENDE) {
  const stelle = b.code.search(/\*\*/);
  wahr(
    `  ${b.id}: kein Markdown im Text der Einträge`,
    stelle < 0,
    stelle < 0 ? '' : b.code.slice(Math.max(0, stelle - 60), stelle + 30).replace(/\n/g, ' '),
  );
}

/*
 * Jeder Eintrag sagt, worum es geht.
 *
 * Ein Eintrag ohne `description` ist im Register eine Zeile ohne Antwort –
 * und im Beispielband wäre das die schlechteste Werbung für das eigene Buch.
 */
/*
 * Erst zählen, dann prüfen. Findet der Ausdruck nichts, ist „keiner ohne
 * Beschreibung" trivial erfüllt – eine grüne Zeile, die nichts geprüft hat.
 *
 * Und über **beide** Bände: Diese Prüfung lief zuerst nur über den ersten.
 * Beim Gegenproben blieb sie grün, während im zweiten Band ein Eintrag ohne
 * Beschreibung stand – genau die Sorte Lücke, die man nur findet, wenn man
 * den Fehler absichtlich einbaut.
 */
for (const b of BAENDE) {
  const bloecke = [...b.quelle.matchAll(/eintrag\('([a-z_0-9]+)', '[a-z]+', \{([\s\S]*?)\n    \}\)/g)];
  wahr(`  ${b.id}: ${bloecke.length} Einträge im Zugriff`, bloecke.length === b.kennungen.length);
  const ohneBeschreibung = bloecke.filter((m) => !/description:/.test(m[2])).map((m) => m[1]);
  wahr(
    `  ${b.id}: jeder Eintrag hat eine Beschreibung`,
    ohneBeschreibung.length === 0,
    ohneBeschreibung.join(', '),
  );
}

/* ==========================================================================
 * 4  DER BAND STELLT SICH NUR HIN
 *
 * Er schlägt sich nicht selbst auf, und er schreibt nichts in das Buch, das
 * gerade offen ist. Das ist der Grund, warum es überhaupt ein eigener Band
 * ist – und deshalb wird es geprüft und nicht bloss beabsichtigt.
 * ======================================================================= */

console.log('\n4 Der Band bleibt bei sich');
const store = ohneProsa(lies('../src/store/useStudio.ts'));
const laden = store.slice(store.indexOf('async ladeBeispielband('), store.indexOf('async archiviereBuch'));
wahr('  die Ladeaktion gibt es', laden.length > 100);
/*
 * **Ein Weg ins Regal für alle Bände.**
 *
 * Hier stand `neuesBuch(DRAGONCORE_BUCH)` – eine Ladefunktion je Band. Genau
 * dort ist schon einmal die `worldId` vergessen worden, und fünfzig fremde
 * Einträge landeten im Buch des Lesers. Ein zweiter Band mit eigener
 * Ladefunktion wäre die zweite Gelegenheit dafür gewesen.
 */
wahr('  sie nimmt den Band aus der Liste', /bandMit\(welcher\)/.test(laden));
wahr('  sie legt ein eigenes Buch an', /neuesBuch\(band\.buch\)/.test(laden));
wahr('  sie baut mit Buch und Welt', /band\.baue\(buch\.id, buch\.worldId/.test(laden));
wahr('  und öffnet es nicht', !/oeffneBuch/.test(laden));
wahr('  sie schreibt nur in dieses Buch', /bulkPut\(entries\)/.test(laden) && /db\.books\.put\(buch\)/.test(laden));

/*
 * Die Kennungen bekommen den Bandpräfix.
 *
 * Ohne ihn zeigten die Beziehungen eines zweiten geladenen Bandes auf die
 * Einträge des ersten – zwei Bücher teilten sich still ihre Welt. Derselbe
 * Fehler ist beim Abschreiben eines Buches schon einmal passiert.
 */
for (const b of BAENDE) {
  wahr(`  ${b.id}: Kennungen tragen den Bandpräfix`, /\$\{bookId\}__\$\{id\}/.test(b.code));
}

/* ==========================================================================
 * 5  DIE TÜR IN DER BIBLIOTHEK
 * ======================================================================= */

console.log('\n5 Die Tür');
const regal = ohneProsa(lies('../src/pages/bibliothek/Bibliothek.tsx'));
wahr('  die Zeile steht im Regal', /BeispielZeile/.test(regal));
wahr('  sie nennt jeden Band beim Namen', /BEISPIELBAENDE/.test(regal) && /band\.titel/.test(regal));
/*
 * Jeder Band einzeln, und jeder nur einmal.
 *
 * Ein gemeinsamer Knopf für beide hätte zwei sehr verschiedene Welten in eine
 * Handlung gesteckt – und wer den ersten schon gesehen hat, bekäme den
 * zweiten nie angeboten. Zwei gleich benannte Bände nebeneinander wären
 * umgekehrt kein Angebot mehr, sondern ein Fehler mit Doppelklick als Ursache.
 */
wahr('  jeder Band wird einzeln angeboten', /ladeBeispielband\(band\.id\)/.test(regal));
wahr('  ein zweites Mal wird nicht geladen', /schonDa/.test(regal) && /x\.title === b\.titel/.test(regal));
wahr('  und jeder sagt, was er zeigt', /band\.worum/.test(regal));

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
for (const b of BAENDE) {
  const gewaehlt = b.code.match(/coverColor: '([a-z]+)'/)?.[1];
  wahr(`  ${b.id}: die Einbandfarbe „${gewaehlt}" gibt es`, !!gewaehlt && farben.has(gewaehlt));
}
/*
 * Und die beiden sehen im Regal verschieden aus.
 *
 * Zwei Bände in demselben Einband sind von weitem ein Band mit einem Schatten.
 */
{
  const einbaende = BAENDE.map((b) => b.code.match(/coverColor: '([a-z]+)'/)?.[1]);
  wahr('  kein Band sieht aus wie der andere', new Set(einbaende).size === einbaende.length, einbaende.join(', '));
}

/* ==========================================================================
 * 7  DER BAND GEHÖRT SEINER EIGENEN WELT
 *
 * Der teuerste Fehler dieses Bandes, und er war unsichtbar: Die Bauroutine
 * stempelte nur `bookId`. Seit Fassung 8 wird nach **Welt** geladen – fünfzig
 * Einträge ohne Welt sind herrenlos, und die Heilung beim nächsten Start gibt
 * Herrenloses dem Buch, das gerade vorne liegt, samt neuer `bookId`.
 *
 * Gemessen im Browser: Wer den Band einräumte und sein eigenes Buch offen
 * hatte, fand danach 51 Einträge in seiner Welt statt einem – Alve Reet und
 * das Glockenhaus im eigenen Register, und die Herkunft mit überschrieben.
 *
 * Deshalb wird hier nicht der Quelltext gelesen, sondern **gerechnet**.
 * ======================================================================= */

console.log('\n7 Der Band gehört seiner eigenen Welt');

const bau = join(ARBEIT, 'beispielband');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
const gebaute = {};
for (const b of BAENDE) {
  execFileSync(
    'npx',
    ['esbuild', b.datei.replace('../', ''), '--bundle', '--format=esm',
     `--outfile=${join(bau, b.id + '.mjs')}`, '--log-level=error'],
    { cwd: new URL('..', import.meta.url).pathname, stdio: 'inherit' },
  );
  const m = await import(join(bau, b.id + '.mjs'));
  const baue = m.dragoncore ?? m.stillersee;
  gebaute[b.id] = baue('buch_x', 'welt_x');
}

for (const b of BAENDE) {
  const gebaut = gebaute[b.id];
  console.log(`  · ${b.id}`);
  wahr('    der Band bringt Einträge mit', gebaut.entries.length > 0);
  wahr(
    '    jeder Eintrag trägt die Welt',
    gebaut.entries.every((e) => e.worldId === 'welt_x'),
    `${gebaut.entries.filter((e) => e.worldId !== 'welt_x').length} ohne Welt`,
  );
  wahr(
    '    jede Beziehung trägt die Welt',
    gebaut.relations.every((r) => r.worldId === 'welt_x'),
    `${gebaut.relations.filter((r) => r.worldId !== 'welt_x').length} ohne Welt`,
  );
  wahr(
    '    die Herkunft steht weiterhin daneben',
    gebaut.entries.every((e) => e.bookId === 'buch_x'),
  );
}

/*
 * Und die beiden Bände teilen keine einzige Kennung.
 *
 * Sie tragen zwar den Bandpräfix, aber wer beide lädt, hat zwei Welten
 * nebeneinander – und wenn dort zweimal `ort_see` stünde, wäre beim
 * Abschreiben oder Sichern nicht mehr zu sehen, welcher gemeint ist.
 */
{
  const a = new Set(band('dragoncore').kennungen);
  const gemeinsam = band('stillersee').kennungen.filter((k) => a.has(k));
  wahr('  kein Band benutzt die Kennungen des anderen', gemeinsam.length === 0, gemeinsam.join(', '));
}

/*
 * Und die Stelle, die ihn einräumt, muss beides reichen – und eine Weltzeile
 * anlegen. Ohne sie hätte die Welt keinen Namen, und `weltzeileFuer` fände
 * eine Welt, die es in der Tabelle nicht gibt.
 */
const speicherquelle = ohneProsa(lies('../src/store/useStudio.ts'));
const abschnitt = speicherquelle.slice(
  speicherquelle.indexOf('async ladeBeispielband'),
  speicherquelle.indexOf('async archiviereBuch'),
);
wahr('  die Welt wird mitgereicht', /band\.baue\(buch\.id,\s*buch\.worldId/.test(abschnitt));
wahr('  die Weltzeile wird geschrieben', /db\.welten\.put\(welt\)/.test(abschnitt));
wahr('  beides in derselben Transaktion', /db\.welten,/.test(abschnitt));

console.log(`\n${bestanden} bestanden, ${gescheitert} gescheitert`);
process.exit(gescheitert ? 1 : 0);
