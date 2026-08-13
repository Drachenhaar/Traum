/*
 * Der Satz.
 *
 * Geprueft wird nicht, ob es „schoen" aussieht – das entscheidet Papier. Es
 * wird geprueft, was still schiefgehen kann: eine Ueberschrift, die im
 * Umbruch reisst, ein Kapitel, das leer im Inhalt steht, ein Titel mit einem
 * spitzen Klammerzeichen, das das ganze Dokument zerlegt.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`node ${new URL('hilfen/bau-druck.mjs', import.meta.url).pathname} ${S}/t/druck.mjs`, { stdio: 'pipe' });
execSync(`npx esbuild src/lib/relations.ts --bundle --format=esm --outfile=${S}/t/rel3.mjs`, { stdio: 'pipe' });
const D = await import(S + '/t/druck.mjs');
const R = await import(S + '/t/rel3.mjs');

let ok = 0, bad = 0;
const p = (n, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { bad++; console.log('FEHLER', n, '\n  ist :', JSON.stringify(ist), '\n  soll:', JSON.stringify(soll)); }
};
const wahr = (n, b) => p(n, !!b, true);

const buch = {
  id: 'b1', title: 'Nebelwald', subtitle: 'Ein Band über Wasser und Wind',
  coverMaterial: 'leder', coverColor: 'moos', emblemType: 'none',
  owner: 'Philipp', worldName: 'Traum', createdAt: 1, updatedAt: 1,
};

let n = 0;
const e = (o) => ({
  id: 'e' + ++n, title: 'Titel ' + n, subtitle: '', type: 'location', category: '',
  description: '', tags: [], status: 'Idee', favorite: false, createdAt: 1, updatedAt: 1,
  linkedEntryIds: [], blocks: [], fields: {}, ...o,
});

const bau = async (entries, relations = [], format = D.FORMATE[0]) =>
  D.druckfassung({ buch, entries, index: R.buildRelationIndex(relations), format, mitBildern: false });

/* --------------------------------------------------- 1. Der Satzspiegel */

const html = await bau([
  e({ title: 'Mooshalde', type: 'location', description: 'Ein Tal.\n\nZwei Absätze.' }),
  e({ title: 'Elian', type: 'character', beginn: '1044', ende: '1092' }),
]);

wahr('1 @page mit Format', /@page\s*\{[^}]*size:\s*A4 portrait/.test(html));
/*
 * Der Kolumnentitel, und zwar als Regel.
 *
 * Hier stand `html.includes('content: string(kapitel)')` – und das war
 * bestanden, nachdem `string-set` laengst aus dem Satz geflogen war: Der
 * Suchbegriff steht woertlich im *Kommentar* darueber, der erklaert, warum es
 * ihn nicht mehr gibt. Ein Test, der die Erklaerung des Fehlers fuer die
 * Abwesenheit des Fehlers haelt.
 *
 * Deshalb wird jetzt innerhalb von @top-center gesucht, nicht im Dokument.
 */
const oben = html.match(/@top-center \{([^}]*)\}/)?.[1] ?? '';
wahr('  Kolumnentitel trägt den Buchtitel', oben.includes('content: "Nebelwald"'));
wahr('  und keine Regel, die Chromium ignoriert', !oben.includes('string('));
wahr('  Seitenzahl im Fuss',
  (html.match(/@bottom-center \{([^}]*)\}/)?.[1] ?? '').includes('content: counter(page)'));
wahr('  Kapitelanfänge ohne Kolumnentitel',
  /@page kapitelanfang \{[^@]*@top-center \{ content: ''; \}/.test(html));
wahr('  Einträge brechen nicht auf', /\.eintrag\s*\{[^}]*break-inside: avoid/.test(html));
wahr('  Überschrift bleibt bei ihrem Text', /\.eintrag h3\s*\{[^}]*break-after: avoid/.test(html));
wahr('  keine Schusterjungen', /p\s*\{[^}]*orphans: 2;\s*widows: 2/.test(html));
wahr('  innen mehr Rand als aussen (Bund)', html.includes('26mm') && html.includes('20mm'));

/* Ein Dokument, das sich selbst genügt: kein einziger Verweis nach draußen. */
p('  keine externen Adressen', (html.match(/(?:src|href)="(?!data:)[a-z]+:/gi) || []), []);
p('  keine Skripte', (html.match(/<script/gi) || []), []);

/* --------------------------------------------------- 2. Was drinsteht */

wahr('2 Umschlag trägt den Titel', /class="umschlag"[\s\S]*?<h1>Nebelwald<\/h1>/.test(html));
wahr('  Titelblatt nennt den Verfasser', html.includes('aufgezeichnet von Philipp'));
wahr('  Inhalt steht vor den Kapiteln',
  html.indexOf('class="inhalt"') < html.indexOf('class="trenner"'));
wahr('  Zeitspanne erscheint', html.includes('1044 – 1092'));
wahr('  Kolophon am Ende', html.lastIndexOf('class="kolophon"') > html.lastIndexOf('class="eintrag"'));

/* ------------------------------------- 3. Leere Kapitel fallen weg */

const eins = await bau([e({ title: 'Nur ein Ort', type: 'location' })]);
p('3 nur das benutzte Kapitel',
  (eins.match(/class="trenner"/g) || []).length, 1);
p('  Inhalt zählt genauso',
  (eins.match(/class="punkte"/g) || []).length, 1);
wahr('  Einzahl im Titelblatt', eins.includes('1 Eintrag in 1 Kapitel'));

/* ---------------------------------- 4. Gelöschte Seiten bleiben draußen */

const mitPapierkorb = await bau([
  e({ title: 'Bleibt', type: 'location' }),
  e({ title: 'Entnommen', type: 'location', deletedAt: 5 }),
]);
wahr('4 Entnommenes wird nicht gesetzt', !mitPapierkorb.includes('Entnommen'));
wahr('  der Rest schon', mitPapierkorb.includes('Bleibt'));

/* -------------------------------------------- 5. Verbindungen als Satz */

const a = e({ id: 'ea', title: 'Elian', type: 'character' });
const b = e({ id: 'eb', title: 'Mooshalde', type: 'location' });
const mitBez = await bau([a, b], [
  { id: 'r1', fromId: 'ea', toId: 'eb', type: 'lives_in', createdAt: 1 },
]);
wahr('5 Verbindung steht beim Eintrag', /class="verbindungen"/.test(mitBez));
wahr('  und nennt das Ziel', mitBez.includes('>Mooshalde</span>'));
wahr('  aus beiden Richtungen lesbar',
  (mitBez.match(/class="verbindungen"/g) || []).length === 2);
/* Eine Kante auf eine Seite, die nicht gedruckt wird, darf keine Leerstelle setzen. */
const halb = await bau([a], [{ id: 'r1', fromId: 'ea', toId: 'weg', type: 'lives_in', createdAt: 1 }]);
wahr('  Kante ins Nichts erzeugt keine Zeile', !halb.includes('class="verbindungen"'));

/* ------------------------------------------------------ 6. Die Farbtafel */

const bunt = await bau([
  e({ title: 'Palette', type: 'location', fields: { palette: ['#3a5f2b|Moosgrün', '#3A5F2B|moos', '#c9bda8|Sand'] } }),
  e({ title: 'Block', type: 'location', blocks: [{ id: 'b', type: 'material', data: { materials: [{ color: '#8c6510', name: 'Bernstein' }] } }] }),
  e({ title: 'Unfug', type: 'location', fields: { palette: ['rot|kein Hex', '#12345|zu kurz'] } }),
]);
wahr('6 Farbtafel erscheint', bunt.includes('class="farbtafel"'));
p('  nur echte Hex-Werte', (bunt.match(/class="flaeche"/g) || []).length, 3);
wahr('  dieselbe Farbe zählt einmal', (bunt.match(/#3a5f2b/gi) || []).length <= 2);
/*
 * Nur innerhalb der Tafel vergleichen: `#c9bda8` steht auch im Stylesheet
 * (die Punktlinie im Inhalt) und damit weit vor jedem Farbfeld. Ein Suchlauf
 * ueber das ganze Dokument misst hier nicht die Reihenfolge, sondern das CSS.
 */
const nurTafel = bunt.slice(bunt.indexOf('class="tafel"'));
wahr('  Häufigstes steht vorn',
  nurTafel.indexOf('#3a5f2b') < nurTafel.indexOf('#c9bda8'));
wahr('  ohne Farben keine Tafel', !html.includes('class="farbtafel"'));

/* ------------------------------- 6b. Kein Feld verrät seine Datenherkunft */

/*
 * Die Vorlage »Ort« hat eine Farbpalette, eine Bildliste und Verweisfelder.
 * Alle drei standen frueher roh im Satz – Rautenwerte, Ids, Pipes.
 */
const roh = await bau([
  e({ id: 'ziel', title: 'Nebelfeld', type: 'location' }),
  e({
    title: 'Mooshalde',
    type: 'location',
    fields: {
      palette: ['#3a5f2b|Moosgrün', '#c9bda8|Nebelsand'],
      images: ['img_k3f9x2', 'img_zzz'],
    },
  }),
]);
/*
 * Nur im Eintragsteil suchen. Die Farbtafel hinten *soll* Rautenwerte tragen –
 * ein Suchlauf ueber das ganze Dokument findet dort immer einen und
 * behauptete, das Feld sei roh geblieben.
 */
const vorDerTafel = roh.slice(0, roh.indexOf('class="farbtafel"'));
wahr('6b Farbwerte stehen nicht im Feld', !vorDerTafel.includes('#3a5f2b'));
wahr('  ihre Namen schon', roh.includes('Moosgrün; Nebelsand'));
p('  keine Bild-Ids im Satz', (roh.match(/img_/g) || []), []);
p('  kein Trennstrich aus der Datenhaltung', (roh.match(/#[0-9a-f]{6}\|/gi) || []), []);
wahr('  die Rubrik nennt die Vorlage, nicht den Schlüssel', roh.includes('<p class="rubrik">Ort</p>'));

/* -------------------------------------------- 7. Nichts zerlegt das Dokument */

const boese = await bau([
  e({
    title: '</style><script>alert(1)</script>',
    type: 'location',
    description: 'Ein "Zitat" & ein <Tag>',
    fields: { palette: ['#000000|"><b>fett'] },
  }),
]);
p('7 kein eingeschleustes Skript', (boese.match(/<script/gi) || []), []);
p('  das Stylesheet bleibt eines', (boese.match(/<\/style>/g) || []).length, 1);
wahr('  der Text steht trotzdem da', boese.includes('&amp; ein &lt;Tag&gt;'));

/* --------------------------------- 7b. Der Titel steht auch im Stylesheet */

const buchAlt = { ...buch };
Object.assign(buch, { title: 'Der "Nebel\\wald"' });
const kolumne = await bau([e({})]);
Object.assign(buch, buchAlt);
wahr('7b Kolumnentitel maskiert Anführungszeichen',
  kolumne.includes('content: "Der \\"Nebel\\\\wald\\""'));
/* Wenn die Maskierung greift, endet das Stylesheet dort, wo es soll. */
p('  das Stylesheet bleibt heil', (kolumne.match(/<\/style>/g) || []).length, 1);
wahr('  im Text steht er als HTML maskiert', kolumne.includes('Der &quot;Nebel\\wald&quot;'));

/* --------------------------------------------------------- 8. Die Formate */

p('8 drei Maße', D.FORMATE.map((f) => f.id), ['a4-hoch', 'a4-quer', 'tafelband']);
p('  unbekanntes Maß fällt zurück', D.formatById('gibtsnicht').id, 'a4-hoch');
const quer = await bau([e({})], [], D.formatById('a4-quer'));
wahr('  quer setzt quer', quer.includes('size: A4 landscape'));
const tafel = await bau([e({})], [], D.formatById('tafelband'));
wahr('  Tafelband ist quadratisch', tafel.includes('size: 240mm 240mm'));

/* ----------------------------------------------------- 9. Ein leeres Buch */

const leer = await bau([]);
wahr('9 leeres Buch bricht nicht', leer.startsWith('<!doctype html>'));
p('  ohne Kapitel', (leer.match(/class="trenner"/g) || []), []);
wahr('  und ohne Farbtafel', !leer.includes('class="farbtafel"'));

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
