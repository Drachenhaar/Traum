/*
 * Die Setzerei als Werkstatt.
 *
 * Zwei Arten von Prüfung, und die Trennung ist wichtig:
 *
 *   1. **Ausgeführt.** Entwurf, Parser und Feldgruppen sind reine Funktionen
 *      ohne Oberfläche. Sie werden gebündelt und wirklich aufgerufen – was
 *      hier steht, ist gerechnet und nicht gelesen. Genau das verlangt die
 *      Liste im Auftrag: „Wechsel zu Veredeln verliert keinen Inhalt",
 *      „Abbruch erzeugt keinen Entry" sind Aussagen über Verhalten.
 *
 *   2. **Gelesen.** Was nur in der Oberfläche existiert – dass die Vorschau
 *      dieselbe Setzung benutzt, dass zwei Spalten erst am Schreibtisch
 *      erscheinen –, wird am Quelltext geprüft. Schwächer, aber ehrlich: Ein
 *      Bauteil, das niemand einbindet, fällt sonst niemandem auf.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'node:fs';
import { ARBEIT } from './arbeit.mjs';

const S = ARBEIT;
for (const [aus, ein] of [
  ['w-draft', 'src/lib/setzerei/draft.ts'],
  ['w-transcribe', 'src/lib/transcribe.ts'],
  ['w-gruppen', 'src/lib/feldgruppen.ts'],
  ['w-vorlagen', 'src/lib/templates.ts'],
  ['w-darstellung', 'src/lib/setzerei/darstellung.ts'],
])
  execSync(`npx esbuild ${ein} --bundle --format=esm --outfile=${S}/t/${aus}.mjs`, { stdio: 'pipe' });

const D = await import(S + '/t/w-draft.mjs');
const TR = await import(S + '/t/w-transcribe.mjs');
const GR = await import(S + '/t/w-gruppen.mjs');
const VL = await import(S + '/t/w-vorlagen.mjs');
const DA = await import(S + '/t/w-darstellung.mjs');

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

/*
 * Quelltext ohne Kommentare.
 *
 * Zweimal in Folge hat eine Zusicherung in einem Kommentar gefunden, was sie
 * im Code verboten wollte – „hier stand `addRelation(…, 'related')`" und
 * „ein `<select>` ist auf einem Telefon ein Systemrad". Eine Pruefung, die
 * Code nicht von Prosa unterscheidet, prueft den Text und nicht das Programm.
 * Deshalb: Wer ein Verbot prueft, prueft es hier.
 */
const ohneProsa = (q) =>
  q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const setzerei = lies('../src/pages/book/Setzerei.tsx');
const setzfeld = lies('../src/components/setzerei/SetzFeld.tsx');
const veredel = lies('../src/components/setzerei/VeredelBlatt.tsx');
const abschnitt = lies('../src/components/setzerei/SetzAbschnitt.tsx');
const manuskript = lies('../src/components/setzerei/ManuskriptBlatt.tsx');
const bogen = lies('../src/components/setzerei/TypenBogen.tsx');
const schritte = lies('../src/components/setzerei/SetzereiSchritte.tsx');
const seitentext = lies('../src/components/entry/Seitentext.tsx');
const entrySpread = lies('../src/pages/book/EntrySpread.tsx');
const darstellungQ = lies('../src/lib/setzerei/darstellung.ts');
const gruppenQ = lies('../src/lib/feldgruppen.ts');
const templatesQ = lies('../src/lib/templates.ts');
const transcribeQ = lies('../src/lib/transcribe.ts');
const css = lies('../src/index.css');

/* ================================================== 1 Der Parser lebt noch */

const MANUSKRIPT = `Titel: Waldkoi
Kategorie: Kreatur
Art: Schleierkarpfen
Größe: 40 cm
Verhalten: friedlich, scheu, schwarmbildend
Farbpalette: Moosgrün #55604A, Messing #A8853F

Der Waldkoi zieht in kleinen Schwärmen durch den Nebelwald.`;

console.log('\n1 Der Parser');
const t = TR.transcribe(MANUSKRIPT, []);
pruefe('Der Titel kommt an', t.title === 'Waldkoi', t.title);
pruefe('Die Kategorie kommt an', t.category === 'Kreatur', t.category);
pruefe('Die Beschreibung kommt an', t.description.includes('Schwärmen'), t.description);
pruefe('Eigene Felder kommen an', t.fields.species === 'Schleierkarpfen', String(t.fields.species));
pruefe(
  'Die Farbpalette behält ihr Format',
  Array.isArray(t.fields.palette) && String(t.fields.palette[0]).startsWith('#'),
  JSON.stringify(t.fields.palette),
);
pruefe('Die automatische Typerkennung greift', t.suggestedType === 'creature', t.suggestedType);

/* Die manuelle Wahl schlägt die Erkennung – und ändert die Daten nicht. */
const tManuell = TR.transcribe(MANUSKRIPT, [], 'character');
/*
 * `suggestedType` bleibt bewusst der *Vorschlag* – es heisst so, und die
 * Erkennungszeile im Manuskript soll weiter sagen koennen, was das Buch von
 * sich aus gelesen haette. Die Wahl wirkt dort, wo sie wirken muss: Die
 * Felder werden gegen die gewaehlte Vorlage zugeordnet, und der Entwurf traegt
 * die gewaehlte Art.
 *
 * Die erste Fassung dieser Pruefung erwartete `suggestedType === 'character'`
 * und schlug fehl. Kein Fehler im Programm, sondern eine Pruefung, die sich
 * am Namen vergriffen hatte.
 */
pruefe(
  'Die manuelle Typwahl ordnet die Felder gegen die gewählte Vorlage zu',
  JSON.stringify(tManuell.fields) !== JSON.stringify(t.fields),
  JSON.stringify(tManuell.fields),
);
pruefe(
  'Der Entwurf trägt die gewählte Art',
  D.draftAus(tManuell, 'character').type === 'character',
);
pruefe(
  'Die manuelle Typwahl verändert Titel und Beschreibung nicht',
  tManuell.title === t.title && tManuell.description === t.description,
);

/* ================================================== 2 Der Entwurf */

console.log('2 Der Entwurf');
const d0 = D.draftAus(t, 'creature');
pruefe('Der Wechsel zu Veredeln verliert den Titel nicht', d0.title === 'Waldkoi');
pruefe('… und nicht die Beschreibung', d0.description === t.description);
pruefe('… und nicht die Felder', d0.fields.species === 'Schleierkarpfen');
pruefe('… und nicht die Blöcke', d0.blocks.length === t.blocks.length);
pruefe(
  'Erkannte Erwähnungen bleiben erhalten und sind voreingestellt an',
  d0.mentions.length === t.mentions.length &&
    d0.verbinden.length === t.mentions.length,
);

/* Ändern und zurücklesen – über die Stammangaben und über die eigenen Felder. */
let d1 = D.draftSetzen(d0, '#title', 'Nebelkoi');
d1 = D.draftSetzen(d1, 'size', '55 cm');
pruefe('Eine Änderung am Titel kommt an', D.draftWert(d1, '#title') === 'Nebelkoi');
pruefe('Eine Änderung an einem Feld kommt an', D.draftWert(d1, 'size') === '55 cm');
pruefe('Der Entwurf merkt sich, was von Hand kam', d1.beruehrt.includes('#title'));

/*
 * Der wichtigste Fall: zurück zum Manuskript, dort weiterschreiben, erneut
 * setzen. Was der Verfasser selbst geschrieben hat, muss stehen bleiben –
 * sonst ist der Rückweg eine Falle, und wer das einmal erlebt hat, geht nie
 * wieder zurück.
 */
const t2 = TR.transcribe(MANUSKRIPT + '\nLebensraum: Nebelwald', []);
const d2 = D.draftAuffrischen(d1, t2, 'creature');
pruefe('Zurück zum Manuskript löscht die eigene Arbeit nicht', d2.title === 'Nebelkoi', d2.title);
pruefe('… auch nicht in den Feldern', d2.fields.size === '55 cm', String(d2.fields.size));
pruefe(
  'Neues aus dem Manuskript kommt trotzdem an',
  D.draftWert(d2, 'habitat') === 'Nebelwald' || d2.description.includes('Nebelwald'),
  JSON.stringify({ habitat: d2.fields.habitat }),
);

/* Eine abgewählte Verbindung bleibt abgewählt. */
const mitErwaehnung = {
  ...t,
  mentions: [{ entryId: 'e1', title: 'Nebelwald', via: 'Lebensraum' }],
};
const dm0 = D.draftAus(mitErwaehnung, 'creature');
const dm1 = { ...dm0, verbinden: [] };
const dm2 = D.draftAuffrischen(dm1, mitErwaehnung, 'creature');
pruefe('Eine abgewählte Verbindung bleibt abgewählt', dm2.verbinden.length === 0);

/* ================================================== 3 Nichts wird gespeichert */

console.log('3 Kein Eintrag vor der letzten Handlung');
/*
 * Die härteste Zusicherung dieses Umbaus, und die einzige, die man am
 * Quelltext prüfen muss: `createEntry` darf genau einmal vorkommen, und zwar
 * in der Handlung, die „Ins Buch setzen" heisst. Jede weitere Stelle wäre ein
 * Eintrag, der entsteht, ohne dass jemand es wollte.
 */
const rufe = ohneProsa(setzerei)
  .split('\n')
  .filter((z) => z.includes('createEntry('));
pruefe('`createEntry` steht genau einmal in der Setzerei', rufe.length === 1, rufe.join(' | '));
pruefe(
  'Der Entwurf trägt eine sprechende, nie gespeicherte Kennung',
  /id: 'entwurf-ungespeichert'/.test(lies('../src/lib/setzerei/draft.ts')),
);
pruefe(
  'Kein Bauteil der Setzerei speichert selbst',
  ![setzfeld, veredel, abschnitt, manuskript, bogen, schritte].some((q) =>
    /createEntry|updateEntry|db\./.test(ohneProsa(q)),
  ),
);
/* Die Vorschau nimmt den Entwurf, nicht einen gespeicherten Eintrag. */
pruefe('Die Vorschau liest den Entwurf', /alsEntry\(draft\)/.test(setzerei));

/* ================================================== 4 Die drei Phasen */

console.log('4 Die drei Phasen');
pruefe(
  'Es gibt genau drei und sie stehen an einer Stelle',
  /export type SetzereiPhase = 'manuskript' \| 'veredeln' \| 'seite'/.test(
    lies('../src/lib/setzerei/draft.ts'),
  ),
);
pruefe('Die Schrittfolge benutzt dieselbe Aufzählung', /SetzereiPhase/.test(schritte));
/*
 * Auf dem Telefon ist immer genau eine Phase der Hauptinhalt. Geprüft wird
 * die Form: jede Phase hängt an `phase === …`, und keine steht daneben.
 */
for (const p of ['manuskript', 'veredeln', 'seite']) {
  pruefe(`„${p}" wird nur in seiner Phase gezeigt`, new RegExp(`phase === '${p}'`).test(setzerei));
}
/* Zwei Spalten erst am Schreibtisch. */
const spalten = [...setzerei.matchAll(/(\S*)grid-cols-\[/g)].map((m) => m[1]);
pruefe(
  'Zwei Spalten gibt es erst am Schreibtisch',
  spalten.every((p) => p.startsWith('lg:')),
  spalten.join(', '),
);
pruefe('Die Schrittfolge ist keine Tab-Leiste', !/fixed|bottom-0/.test(schritte));
/*
 * Und die Vorschau am Schreibtisch bleibt stehen.
 *
 * Ohne `sticky` stand sie oben im Raster: Sobald man beim Veredeln nach unten
 * arbeitete, war die rechte Bildschirmhälfte leer – eine halbe Seite Nichts
 * neben der Arbeit. Eine Vorschau, die man nicht sieht, während man ändert,
 * was sie zeigen soll, ist keine.
 */
pruefe(
  'Die Vorschau am Schreibtisch scrollt nicht weg',
  /lg:sticky/.test(setzerei) && /lg:self-start/.test(setzerei),
);

/* ================================================== 5 Erkennung in Worten */

console.log('5 Was das Buch erkennt');
pruefe('Die Bausteine werden gezählt', D.bausteineIn(t) > 0, String(D.bausteineIn(t)));
const satz = D.erkanntesInWorten(t, 'creature');
pruefe('Es entsteht ein Satz', satz.endsWith('ab.'), satz);
pruefe('Er nennt höchstens vier Dinge', (satz.match(/,/g) ?? []).length <= 2, satz);
/*
 * Nichts wird erfunden: Was nicht im Manuskript stand, darf im Satz nicht
 * vorkommen. „Verhalten" stand drin, „Revier" nicht.
 */
pruefe('Er nennt nichts, was nicht dasteht', !/revier|stimme|spuren/i.test(satz), satz);
/*
 * Der Fund, den nur der Gerätelauf hatte: „Ein Name, eine Einordnung,
 * **ein art** und **eine größe** zeichnen sich bereits ab." Zwei Fehler in
 * einem Halbsatz – ein geratenes Geschlecht und ein kleingeschriebenes
 * deutsches Substantiv.
 *
 * Feldnamen stehen jetzt ohne Artikel und gross. Geprüft wird beides.
 */
/*
 * Die erste Fassung verbot jedes kleingeschriebene Wort nach einem Komma –
 * und schlug an „, eine Einordnung" an, einem festen und richtigen Halbsatz.
 * Eine Zusicherung, die auch das Richtige verbietet, ist keine.
 *
 * Geprüft wird deshalb genau das, worum es geht: Ein Feldname steht so da,
 * wie die Vorlage ihn schreibt, und ohne Artikel davor.
 */
const genannteFelder = VL.templateFor('creature')
  .fields.map((f) => f.label)
  .filter((l) => satz.includes(l));
pruefe('Der Satz nennt Feldnamen, wie die Vorlage sie schreibt', genannteFelder.length > 0, satz);
for (const label of genannteFelder) {
  pruefe(
    `„${label}" steht ohne geratenen Artikel`,
    !new RegExp(`\\b(ein|eine|einen)\\s+${label}`).test(satz),
    satz,
  );
  pruefe(`„${label}" bleibt großgeschrieben`, !satz.includes(label.toLowerCase()), satz);
}
pruefe(
  'Der Artikel kommt aus der Vorlage, nicht aus dem Bauch',
  D.artikelFuer('creature') === 'eine' &&
    D.artikelFuer('location') === 'einen' &&
    D.artikelFuer('biome') === 'ein',
  [D.artikelFuer('creature'), D.artikelFuer('location'), D.artikelFuer('biome')].join(', '),
);

/* ================================================== 6 Alle Feldarten */

console.log('6 Jede Feldart bleibt darstellbar');
/*
 * `FieldKind` hat acht Werte. Fehlte einer im Renderer, verschwände jedes Feld
 * dieser Art lautlos von der Seite – kein Fehler, keine Meldung, nur ein Feld
 * weniger. Deshalb wird die Aufzählung aus der Quelle gelesen statt hier
 * abgeschrieben.
 */
const arten = [
  ...templatesQ
    .slice(templatesQ.indexOf('export type FieldKind'), templatesQ.indexOf('export interface FieldDef'))
    .matchAll(/'(\w+)'/g),
].map((m) => m[1]);
pruefe('Acht Feldarten gefunden', arten.length === 8, arten.join(', '));
for (const art of arten) {
  pruefe(
    `„${art}" hat eine Lesedarstellung und eine Bearbeitung`,
    (setzfeld.match(new RegExp(`case '${art}':`, 'g')) ?? []).length >= 2,
  );
}
pruefe('Bilder benutzen den vorhandenen Wähler', /ImagePicker/.test(setzfeld));
pruefe('Verweise benutzen den vorhandenen Wähler', /EntryLinkPicker/.test(setzfeld));
/* Keine Klappliste: eine Auswahl wird als Marken gesetzt. */
pruefe('`select` erscheint nicht als HTML-Klappliste', !/<select/.test(ohneProsa(setzfeld)));

/* ================================================== 7 Papier zuerst */

console.log('7 Papier zuerst');
pruefe(
  'Ein Feld ist zuerst Text und erst auf Verlangen ein Eingabeelement',
  /offen \? \(/.test(setzfeld) && /Lesedarstellung/.test(setzfeld),
);
pruefe(
  'Es ist immer höchstens ein Feld offen',
  /useState<string \| null>\(null\)/.test(veredel) && /offen === def\.key/.test(veredel),
);
pruefe('Leere Felder liegen hinter einer Zeile', /weitere Angaben ergänzen/.test(abschnitt));
/*
 * Und ganz leere Abschnitte hinter einer einzigen.
 *
 * Am Gerät standen vier Überschriften untereinander, unter jeder genau ein
 * kursives „Eine weitere Angabe ergänzen" – vier Behauptungen über Inhalt,
 * den es nicht gibt, getrennt durch drei Haarlinien, die nichts trennten.
 */
pruefe(
  'Ganz leere Abschnitte liegen hinter einer Zeile',
  /leereAbschnitte/.test(veredel) && /weitere Abschnitte stehen bereit/.test(veredel),
);
/*
 * Eine Beschriftung steht einmal da. `SetzFeld` bringt seine eigene Rubrik
 * mit; in einer `Angabe` trägt die Rubrik dort schon den Namen. Der erste
 * Anlauf blendete sie mit `sr-only` weg – fürs Auge richtig, für eine
 * Vorlesehilfe „Art. Art. Schleierkarpfen".
 */
pruefe(
  'Ein Feld in einer Angabe lässt seine Rubrik weg statt sie zu verstecken',
  /ohneRubrik/.test(setzfeld) && !/sr-only/.test(ohneProsa(veredel)),
);
pruefe(
  'Die Bauteile der Setzerei werden benutzt',
  /from '\.\/Setzerei'/.test(veredel) && /Angabe|Zitat|Rubrik/.test(veredel),
);
pruefe('Das Zitat läuft über den vorhandenen Block', /createBlock\('quote'\)/.test(veredel));
pruefe('Ohne Zitat wird keines erfunden', /Zitat hinzufügen/.test(veredel));

/* ================================================== 8 Die Feldgruppen */

console.log('8 Die Feldgruppen');
pruefe('Die Setzerei baut keine zweite Feldliste', /gruppiere\(/.test(veredel));
const gruppenIds = [...gruppenQ.matchAll(/\{ id: '(\w+)', label: '([^']*)'/g)].map((m) => m[2]);
const doppelteLabel = gruppenIds.filter((l, i) => l && gruppenIds.indexOf(l) !== i);
pruefe('Keine zwei Gruppen heißen gleich', doppelteLabel.length === 0, doppelteLabel.join(', '));

const zuordnung = {};
const doppelt = [];
for (const m of gruppenQ.matchAll(/zuordnen\('(\w+)',\s*\[([\s\S]*?)\]\)/g))
  for (const k of m[2].matchAll(/'([\w]+)'/g)) {
    if (zuordnung[k[1]]) doppelt.push(k[1]);
    zuordnung[k[1]] = m[1];
  }
pruefe('Kein Feld liegt in zwei Gruppen', doppelt.length === 0, doppelt.join(', '));

/* Jede Vorlage lässt sich gruppieren, ohne ein Feld zu verlieren. */
let verloren = [];
for (const tpl of VL.allTemplates()) {
  const felder = tpl.fields.filter((f) => !f.anderswo);
  const drin = GR.gruppiere(felder).flatMap((g) => g.felder.map((f) => f.key));
  const fehlt = felder.filter((f) => !drin.includes(f.key));
  if (fehlt.length) verloren.push(`${tpl.type}: ${fehlt.map((f) => f.key).join(', ')}`);
}
pruefe('Keine Vorlage verliert beim Gruppieren ein Feld', verloren.length === 0, verloren.join(' | '));

/* ================================================== 9 Die Darstellung */

console.log('9 Die Darstellungsschicht');
pruefe('Sie ist abgeleitet', typeof DA.darstellungVon === 'function');
const ableitung = darstellungQ.slice(0, darstellungQ.indexOf('/* ------'));
const typen = [...templatesQ.matchAll(/^    type: '(\w+)',$/gm)].map((m) => m[1]);
const genannt = typen.filter((x) => new RegExp(`'${x}'`).test(ableitung));
pruefe('Die Ableitung kennt keinen Eintragstyp', genannt.length === 0, genannt.join(', '));
/* Jede Feldart bekommt eine Darstellung – keine fällt durch. */
for (const art of arten) {
  const d = DA.darstellungVon({ key: 'x', label: 'X', kind: art });
  pruefe(`„${art}" bekommt eine Darstellung`, typeof d === 'string' && d.length > 0, String(d));
}

/* ================================================== 10 Vorschau und Kanten */

console.log('10 Vorschau und Verbindungen');
pruefe('Der Seitenkörper ist ein eigenes Bauteil', /export function Seitentext/.test(seitentext));
pruefe('Die Buchseite benutzt ihn', /<Seitentext entry=\{entry\}/.test(entrySpread));
pruefe('Die Vorschau benutzt ihn', /<Seitentext entry=\{alsEntry\(draft\)\}/.test(setzerei));
pruefe(
  'Die Buchseite setzt den Fließtext nicht ein zweites Mal',
  !/prose-book dropcap/.test(entrySpread),
);
pruefe(
  'Die Beschriftung → Kante-Zuordnung steht an einer Stelle',
  /export function beziehungFuer/.test(transcribeQ) &&
    (transcribeQ.match(/comes_from: \[/g) ?? []).length === 1,
);
const kantenAufruf = ohneProsa(setzerei)
  .split('\n')
  .filter((z) => z.includes('addRelation(entry.id, zielId,'))
  .join('\n');
pruefe(
  'Der Weltbezug leitet die Kante ab statt sie zu raten',
  /beziehungFuer\(/.test(kantenAufruf) && /\?\? 'related'/.test(kantenAufruf),
  kantenAufruf || 'kein Aufruf',
);
pruefe(
  'Was der Parser verbunden hat, wird nicht zweimal verbunden',
  /verbunden\.has\(zielId\)/.test(setzerei),
);

/* ================================================== 11 Was bleiben muss */

console.log('11 Was bleiben muss');
for (const [was, muster] of [
  ['Der Rohtextimport', /transcribe\(text, living, gewaehlterTyp \|\| undefined\)/],
  ['Gerüst einsetzen', /blankTemplateFor\(typ\)/],
  ['Die Vorlage für ChatGPT', /promptTemplateFor\(typ, settings\.worldName\)/],
  ['Die vollständige Typauswahl', /templatesByFamily/],
  ['Die Textblöcke', /blocks: draft\.blocks/],
  ['Die Weltzeit', /beginn: draft\.beginn/],
  ['Die Schlagworte', /tags: draft\.tags/],
]) {
  pruefe(`${was} ist noch da`, muster.test(setzerei) || muster.test(bogen));
}
/* Der Typenbogen führt keine eigene Liste. */
pruefe(
  'Der Typenbogen schreibt die Arten nicht ab',
  /templatesByFamily\(\)/.test(bogen) && !/'creature'|'location'|'character'/.test(ohneProsa(bogen)),
);

/* ================================================== 12 Bewegung */

console.log('12 Bewegung');
pruefe('Es gibt eine Setzbewegung', /\.satz-eintritt/.test(css) && /dcSetzen/.test(css));
const dauer = Number((css.match(/animation: dcSetzen (\d+)ms/) ?? [])[1]);
pruefe('Sie dauert 300 bis 450 Millisekunden', dauer >= 300 && dauer <= 450, `${dauer}ms`);
pruefe(
  'Wer keine Bewegung will, bekommt keine',
  /prefers-reduced-motion: reduce\)\s*\{\s*\.satz-eintritt/.test(css),
);
pruefe('Kein Federn, kein Leuchten', !/bounce|glow|sparkle/i.test(css.slice(css.indexOf('dcSetzen'), css.indexOf('dcSetzen') + 400)));

console.log(`\n  ${bestanden} bestanden, ${gescheitert} gescheitert\n`);
process.exit(gescheitert ? 1 : 0);
