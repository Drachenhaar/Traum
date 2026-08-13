/*
 * Die Weltregeln, ohne Browser.
 *
 * Geprueft wird das Beispiel aus dem Auftrag – der Waldkoi und die
 * Sonnenbluete – und, genauso wichtig, dass die Regeln *schweigen*, wo alles
 * stimmt. Eine Regel, die immer etwas findet, ist keine Regel.
 */
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Absolute Pfade auf ein fremdes Arbeitsverzeichnis waeren beim naechsten
 * Rechner falsch – die Wurzel wird aus der Lage dieser Datei bestimmt. */
const WURZEL = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const dir = mkdtempSync(join(tmpdir(), 'welt-'));
const eintritt = join(dir, 'eintritt.ts');
writeFileSync(eintritt, `
export { weltsicht, folge, ohneBeziehung, ohneBild, pfad, umgebung, zustandBei, zustandImJahr, imJahr, galtZu, bestandZu } from '${WURZEL}/src/lib/welt/abfrage';
export { pruefeWelt, WELTREGELN } from '${WURZEL}/src/lib/welt/regeln';
`);
const aus = join(dir, 'aus.mjs');
await build({ entryPoints: [eintritt], bundle: true, format: 'esm', outfile: aus, logLevel: 'error' });
const W = await import(aus);

let ok = 0, fehl = 0;
const pruef = (name, wahr, zusatz='') => {
  if (wahr) { ok++; console.log('✓', name); }
  else { fehl++; console.log('✗', name, zusatz); }
};

const jetzt = Date.now();
let n = 0;
const e = (type, title, extra={}) => ({
  id: 'e' + (++n), type, title, subtitle:'', category:'', description:'', tags:[],
  status:'Idee', favorite:false, createdAt:jetzt, updatedAt:jetzt,
  linkedEntryIds:[], blocks:[], fields:{}, ...extra,
});
let m = 0;
const r = (from, to, type, extra={}) => ({
  id:'r'+(++m), fromId:from.id, toId:to.id, type, createdAt:jetzt, ...extra,
});

/* ---------------------------------------- Der Waldkoi und die Sonnenbluete */
const nebelwald = e('biome', 'Nebelwald');
const glutwueste = e('biome', 'Glutwüste');
const waldkoi = e('creature', 'Waldkoi');
const sonnenbluete = e('plant', 'Sonnenblüte');

let sicht = W.weltsicht(
  [nebelwald, glutwueste, waldkoi, sonnenbluete],
  [
    r(waldkoi, nebelwald, 'lives_in'),
    r(waldkoi, sonnenbluete, 'uses'),
    r(sonnenbluete, glutwueste, 'grows_in'),
  ],
);
let befunde = W.pruefeWelt(sicht);
const nahrung = befunde.filter((b) => b.id.startsWith('nahrung-fern'));
pruef('Waldkoi/Sonnenblüte wird erkannt', nahrung.length === 1, JSON.stringify(befunde.map(b=>b.id)));
if (nahrung.length) {
  console.log('   →', nahrung[0].text);
  pruef('  … als Frage, nicht als Fehler', nahrung[0].art === 'frage');
  pruef('  … nennt beide Betroffenen', nahrung[0].betrifft.length === 2);
}

/* ---------------------------------- Dieselbe Welt, aber die Bluete ist da */
const nebelbluete = e('plant', 'Nebelblüte');
sicht = W.weltsicht(
  [nebelwald, waldkoi, nebelbluete],
  [
    r(waldkoi, nebelwald, 'lives_in'),
    r(waldkoi, nebelbluete, 'uses'),
    r(nebelbluete, nebelwald, 'grows_in'),
  ],
);
pruef('Stimmige Welt bleibt still',
  W.pruefeWelt(sicht).filter((b) => b.id.startsWith('nahrung-fern')).length === 0);

/* --------------------------- Der Ort im Ort: kein Widerspruch durch Tiefe */
const observatorium = e('location', 'Observatorium');
const mooshalde = e('location', 'Mooshalde');
const eule = e('animal', 'Nebeleule');
const moos = e('plant', 'Silbermoos');
sicht = W.weltsicht(
  [nebelwald, mooshalde, observatorium, eule, moos],
  [
    r(mooshalde, observatorium, 'contains'),
    r(nebelwald, mooshalde, 'contains'),
    r(eule, observatorium, 'lives_in'),
    r(eule, moos, 'uses'),
    r(moos, nebelwald, 'grows_in'),
  ],
);
pruef('Ort im Ort zählt als derselbe Ort',
  W.pruefeWelt(sicht).filter((b) => b.id.startsWith('nahrung-fern')).length === 0,
  JSON.stringify(W.pruefeWelt(sicht).map(b=>b.text)));

/* ---------------------------------------------- Die Kette endet im Nichts */
const nebeleiche = e('plant', 'Nebeleiche');
const holz = e('material', 'Nebeleichenholz');
const pult = e('furniture', 'Sternenbuchpult');
sicht = W.weltsicht(
  [nebeleiche, holz, pult],
  [r(pult, holz, 'made_of'), r(holz, nebeleiche, 'comes_from')],
);
befunde = W.pruefeWelt(sicht);
const kette = befunde.filter((b) => b.id.startsWith('herkunft-offen'));
pruef('Herkunft ohne Boden wird gemeldet', kette.length === 1);
if (kette.length) console.log('   →', kette[0].text);

/* Mit Boden schweigt sie */
sicht = W.weltsicht(
  [nebeleiche, holz, pult, nebelwald],
  [r(pult, holz, 'made_of'), r(holz, nebeleiche, 'comes_from'), r(nebeleiche, nebelwald, 'grows_in')],
);
pruef('Mit Boden schweigt sie',
  W.pruefeWelt(sicht).filter((b) => b.id.startsWith('herkunft-offen')).length === 0);

/* ----------------------------------------------- Zyklen brechen sie nicht */
const a = e('location', 'A'), b = e('location', 'B');
sicht = W.weltsicht([a, b], [r(a, b, 'contains'), r(b, a, 'contains')]);
let geplatzt = false;
try { W.pruefeWelt(sicht); } catch { geplatzt = true; }
pruef('Ein Zyklus in „enthält" bricht nichts', !geplatzt);

/* ------------------------------------------------------ Der Papierkorb */
const weg = e('creature', 'Entnommenes Wesen', { deletedAt: jetzt });
sicht = W.weltsicht([weg], []);
pruef('Entnommenes zählt nicht zur Welt',
  W.pruefeWelt(sicht).length === 0, JSON.stringify(W.pruefeWelt(sicht).map(b=>b.text)));

/* --------------------------------------------------------- Die Abfrage */
sicht = W.weltsicht(
  [nebeleiche, holz, pult, nebelwald],
  [r(pult, holz, 'made_of'), r(holz, nebeleiche, 'comes_from'), r(nebeleiche, nebelwald, 'grows_in')],
);
pruef('folge() geht hinaus', W.folge(sicht, pult.id, 'made_of').map(x=>x.title).join()==='Nebeleichenholz');
pruef('folge() geht herein', W.folge(sicht, holz.id, 'made_of', 'herein').map(x=>x.title).join()==='Sternenbuchpult');
const weg2 = W.pfad(sicht, pult.id, nebelwald.id);
pruef('pfad() findet Pult → Nebelwald', Array.isArray(weg2) && weg2.length === 4, JSON.stringify(weg2));
pruef('umgebung() reicht zwei Schritte', W.umgebung(sicht, pult.id, 2).size === 3);
pruef('ohneBild() findet den Wald', W.ohneBild(sicht, ['biome']).map(x=>x.title).join()==='Nebelwald');

/* ------------------------------------------------------------- Die Zeit */
const koenigA = e('character', 'König A', { beginn:'300', ende:'350' });
const reich = e('location', 'Reich', { beginn:'280' });
sicht = W.weltsicht([koenigA, reich], [r(koenigA, reich, 'ruled', { beginn:'320', ende:'340' })]);
/* Die Achse rechnet in Ordnungszahlen – imJahr() uebersetzt. */
pruef('bestandZu: Jahr 330 ja', W.bestandZu(sicht, koenigA.id, W.imJahr(330)));
pruef('bestandZu: Jahr 400 nein', !W.bestandZu(sicht, koenigA.id, W.imJahr(400)));
const kante = sicht.relations[0];
pruef('galtZu: Jahr 330 ja', W.galtZu(sicht, kante, W.imJahr(330)));
pruef('galtZu: Jahr 345 nein (eigene Spanne)', !W.galtZu(sicht, kante, W.imJahr(345)));
pruef('zustandImJahr(330) hat beide', W.zustandImJahr(sicht, 330).bestand.length === 2);
pruef('zustandImJahr(400): König fort, Reich bleibt',
  W.zustandImJahr(sicht, 400).bestand.map(d=>d.entry.title).join()==='Reich');

console.log(`\nERGEBNIS: ${ok}/${ok+fehl}`);
process.exit(fehl ? 1 : 0);
