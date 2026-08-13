/*
 * Die Buchabschrift.
 *
 * Die eine Frage, um die es hier geht, laesst sich hart stellen: Steht in der
 * Abschrift irgendwo noch eine Kennung des Originals? Nicht „sieht es richtig
 * aus" – gesucht wird nach Zeichenketten, ueber den ganzen Datenbestand.
 *
 * Genau diese Frage hat den Fehler gefunden, den es hier gab: Die Bilder
 * behielten ihre Kennung, und weil `images.id` der Primaerschluessel ist, war
 * das Speichern der Abschrift ein Ueberschreiben – Buch A verlor seine Tafeln
 * an Buch B.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/kopie.ts --bundle --format=esm --outfile=${S}/t/kopie.mjs`, {
  stdio: 'pipe',
});
const K = await import(S + '/t/kopie.mjs');

let ok = 0,
  bad = 0;
const p = (n, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else {
    bad++;
    console.log('FEHLER', n, '\n  ist :', JSON.stringify(ist), '\n  soll:', JSON.stringify(soll));
  }
};
const wahr = (n, b) => p(n, !!b, true);

/* ------------------------------------------------------- Ein volles Buch -- */

const j = 1_700_000_000_000;
const e = (id, title, type, o = {}) => ({
  id, bookId: 'A', title, subtitle: '', type, category: '', description: '', tags: [],
  status: 'Idee', favorite: false, createdAt: j, updatedAt: j, linkedEntryIds: [], blocks: [],
  fields: {}, ...o,
});

const bestand = () => ({
  entries: [
    e('e_arin', 'Arin', 'character', {
      coverImage: 'img_1',
      linkedEntryIds: ['e_mira'],
      atmosphaere: { klangId: 'k_1', lautstaerke: 0.5, schleife: true, einblenden: 1, ausblenden: 1, vonSelbst: true },
      fields: { places: ['Mooshalde'] },
      blocks: [
        {
          id: 'b_1',
          type: 'moodboard',
          data: {
            imageIds: ['img_1', 'img_2'],
            entryIds: ['e_mira'],
            tiles: [{ id: 't1', imageId: 'img_2', caption: 'x' }],
            cards: [{ id: 'c1', title: 'y', note: '', source: '', imageId: 'img_1' }],
          },
        },
      ],
    }),
    e('e_mira', 'Mira', 'character'),
    e('e_ort', 'Mooshalde', 'location'),
  ],
  relations: [
    { id: 'r_1', bookId: 'A', fromId: 'e_arin', toId: 'e_ort', type: 'lives_in', createdAt: j },
    { id: 'r_2', bookId: 'A', fromId: 'e_mira', toId: 'e_ort', type: 'lives_in', createdAt: j },
    /* Eine Kante ins Nichts – sie darf nicht mitkommen. */
    { id: 'r_3', bookId: 'A', fromId: 'e_arin', toId: 'e_weg', type: 'knows', createdAt: j },
  ],
  images: [
    { id: 'img_1', bookId: 'A', title: 'Tafel 1', description: '', tags: [], category: '', prompt: '',
      negativePrompt: '', source: '', status: 'Idee', favorite: false, linkedEntryIds: [],
      fileName: 'a.png', mime: 'image/png', size: 1, width: 1, height: 1, createdAt: j, updatedAt: j },
    { id: 'img_2', bookId: 'A', title: 'Tafel 2', description: '', tags: [], category: '', prompt: '',
      negativePrompt: '', source: '', status: 'Idee', favorite: false, linkedEntryIds: [],
      fileName: 'b.png', mime: 'image/png', size: 1, width: 1, height: 1, createdAt: j, updatedAt: j },
  ],
  boards: [
    {
      id: 'bo_1', bookId: 'A', name: 'Bogen', camera: { x: 0, y: 0, zoom: 1 }, createdAt: j, updatedAt: j,
      items: [
        { id: 'i1', kind: 'entry', refId: 'e_arin', x: 0, y: 0, w: 1, h: 1, z: 0 },
        { id: 'i2', kind: 'image', refId: 'img_2', x: 0, y: 0, w: 1, h: 1, z: 1 },
        { id: 'i3', kind: 'note', text: 'nur Text', x: 0, y: 0, w: 1, h: 1, z: 2 },
      ],
    },
  ],
  klaenge: [{ id: 'k_1', bookId: 'A', title: 'Wind', fileName: 'w.wav', mime: 'audio/wav', size: 1, createdAt: j, updatedAt: j }],
});

const quelle = bestand();
const u = K.umschriftFuer(quelle);
const ab = K.schreibeAb(quelle, 'B', u);

/* -------------------- 1. Keine einzige Kennung des Originals bleibt stehen */

/*
 * Die harte Probe. Alle alten Kennungen als Zeichenkette gesucht, ueber den
 * ganzen abgeschriebenen Bestand. Was hier auftaucht, ist eine Verbindung
 * zwischen zwei Buechern, die es nicht geben darf.
 */
const alteKennungen = [
  ...quelle.entries.map((x) => x.id),
  ...quelle.relations.map((x) => x.id),
  ...quelle.images.map((x) => x.id),
  ...quelle.boards.map((x) => x.id),
  ...quelle.klaenge.map((x) => x.id),
];
const alsText = JSON.stringify({ ...ab, images: ab.images.map(({ blobId, ...r }) => r) });
const durchgerutscht = alteKennungen.filter((k) => alsText.includes(`"${k}"`));
p('1 keine Kennung des Originals in der Abschrift', durchgerutscht, []);

/* Und die Gegenprobe: Das Original ist unangetastet. */
p('  das Original ist unveraendert', JSON.stringify(quelle), JSON.stringify(bestand()));

/* ------------------------------------- 2. Die Bilder: neue Kennung, eine Datei */

p('2 jedes Bild bekommt eine neue Kennung',
  ab.images.filter((m) => quelle.images.some((q) => q.id === m.id)), []);
p('  und zeigt auf die alte Datei',
  ab.images.map((m) => m.blobId).sort(), ['img_1', 'img_2']);
p('  alle im neuen Buch', [...new Set(ab.images.map((m) => m.bookId))], ['B']);
/*
 * Der eigentliche Fehler, als Zusicherung: Haetten die Datensaetze ihre
 * Kennung behalten, wuerde ein `put` den Datensatz des Originals ersetzen.
 */
wahr('  kein Datensatz teilt sich die Kennung mit dem Original',
  ab.images.every((m) => !quelle.images.some((q) => q.id === m.id)));

/* ------------------------------------------- 3. Alle Verweise zeigen mit */

const kopieArin = ab.entries.find((x) => x.title === 'Arin');
const neueBildIds = new Set(ab.images.map((m) => m.id));
const neueEintragIds = new Set(ab.entries.map((x) => x.id));

wahr('3 das Titelbild zeigt auf die Kopie', neueBildIds.has(kopieArin.coverImage));
p('  die alten Verknuepfungen ebenso',
  kopieArin.linkedEntryIds.every((x) => neueEintragIds.has(x)), true);
p('  Bildlisten im Block', kopieArin.blocks[0].data.imageIds.every((x) => neueBildIds.has(x)), true);
p('  Eintragslisten im Block', kopieArin.blocks[0].data.entryIds.every((x) => neueEintragIds.has(x)), true);
wahr('  Kacheln im Moodboard', neueBildIds.has(kopieArin.blocks[0].data.tiles[0].imageId));
wahr('  Karten im Block', neueBildIds.has(kopieArin.blocks[0].data.cards[0].imageId));
wahr('  der Klang', ab.klaenge.some((k) => k.id === kopieArin.atmosphaere.klangId));

const bogen = ab.boards[0];
wahr('  die Flaeche zeigt auf die kopierte Seite',
  neueEintragIds.has(bogen.items.find((i) => i.kind === 'entry').refId));
wahr('  und auf das kopierte Bild',
  neueBildIds.has(bogen.items.find((i) => i.kind === 'image').refId));
p('  ein Textzettel bleibt unberuehrt',
  bogen.items.find((i) => i.kind === 'note').text, 'nur Text');

/* -------------------------------------- 4. Kanten ins Nichts fallen weg */

p('4 nur vollstaendige Kanten', ab.relations.length, 2);
wahr('  beide Enden in der Kopie',
  ab.relations.every((r) => neueEintragIds.has(r.fromId) && neueEintragIds.has(r.toId)));

/* ------------------------------ 5. Die Abschrift hat keine Vorgeschichte */

const frisch = K.frischeBuchdaten(u, { id: 'A', title: 'X', recentIds: ['e_arin'], emblemImageId: 'img_1' });
p('5 kein Lesebaendchen', frisch.lastSpreadKey, undefined);
p('  kein Verlauf', frisch.recentIds, []);
p('  keine gemerkten Entdeckungen', frisch.entdeckungenAbsicht, []);
p('  kein Anerbieten-Gedaechtnis', frisch.anerbieten, []);
wahr('  aber das Zeichen zeigt auf das kopierte Bild',
  neueBildIds.has(frisch.emblemImageId));

/* --------------------------------------------------- 6. Randfaelle */

const leer = { entries: [], relations: [], images: [], boards: [], klaenge: [] };
p('6 ein leeres Buch bleibt leer', K.schreibeAb(leer, 'B'), leer);
const ohneBloecke = {
  ...leer,
  entries: [e('x', 'Ohne', 'page', { blocks: undefined, fields: undefined, linkedEntryIds: undefined })],
};
let geflogen = false;
try {
  K.schreibeAb(ohneBloecke, 'B');
} catch {
  geflogen = true;
}
p('  fehlende Felder bringen nichts zum Absturz', geflogen, false);

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
