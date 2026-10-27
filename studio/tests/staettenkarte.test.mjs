/**
 * Integrationsprüfung: dieselbe Stätte in Karte, Speicherung, Staffage,
 * Verschieben, Wiederherstellung, Kartenansicht und Weltimport.
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ARBEIT } from './arbeit.mjs';

const wurzel = join(import.meta.dirname, '..');
const bau = join(ARBEIT, 'staettenkarte');
rmSync(bau, { recursive: true, force: true });
mkdirSync(bau, { recursive: true });
for (const [quelle, datei] of [
  ['src/lib/karte/modell.ts', 'modell.mjs'],
  ['src/lib/kartenwerk/staettenwerk.ts', 'staettenwerk.mjs'],
]) execFileSync('npx', ['esbuild', quelle, '--bundle', '--format=esm',
  `--outfile=${join(bau, datei)}`, '--log-level=error'], { cwd: wurzel, stdio: 'inherit' });

const modell = await import(join(bau, 'modell.mjs'));
const werk = await import(join(bau, 'staettenwerk.mjs'));
let tests = 0;
function pruefe(satz, fn) { fn(); tests++; console.log('  ✓ ' + satz); }

pruefe('Leere neue Karten bleiben gültig und erzeugen keine Bauwerke', () => {
  const k = modell.neueKarte('buch1');
  assert.deepEqual(k.staetten, []);
  assert.deepEqual(k.marken, []);
});

pruefe('Haus, Turm und Brücke besitzen identische Fußpunkt-Konvention', () => {
  for (const b of werk.BAUFORMEN) {
    const s = modell.neueStaette(b.id, [300, 350]);
    assert.equal(s.bauform, b.id);
    assert.deepEqual(s.bei, [300, 350]);
    assert.ok(s.hoehe > 0 && s.hoehe <= 32);
    assert.ok(s.id.length > 0);
  }
});

pruefe('Die Karte heilt und erhält alle Bauwerke einschließlich Seitenbezug', () => {
  const karte = modell.neueKarte('b1');
  karte.worldId = 'welt1';
  karte.staetten = [
    { ...modell.neueStaette('haus', [510, 580]), entryId: 'eintrag2' },
    modell.neueStaette('bruecke', [160, 400]),
  ];
  const geheilt = modell.heileKarte(JSON.parse(JSON.stringify(karte)));
  assert.equal(geheilt.worldId, 'welt1');
  assert.equal(geheilt.staetten.length, 2);
  assert.equal(geheilt.staetten[0].entryId, 'eintrag2');
  assert.equal(geheilt.staetten[0].bauform, 'haus');
});

pruefe('Alte Karten ohne Stätten bleiben unverändert lesbar', () => {
  const alt = modell.neueKarte('b');
  delete alt.staetten;
  assert.deepEqual(modell.heileKarte(alt).staetten, []);
});

pruefe('Ungültige Elemente werden entfernt, niemals still in Häuser verwandelt', () => {
  const karte = modell.neueKarte('buch');
  karte.staetten = [
    {id:'falsch1',bauform:'schloss',bei:[150, 150],hoehe:30,seed:1},
    {id:'falsch2',bauform:'haus',bei:['x', 50],hoehe:30,seed:1},
    {id:'gültig',bauform:'turm',bei:[500, 450],hoehe:28,seed:1},
  ];
  const neu = modell.heileKarte(karte);
  assert.equal(neu.staetten.length, 1);
  assert.equal(neu.staetten[0].id, 'gültig');
});

pruefe('Bewegen verändert keine früher gespeicherte Kartenfassung', () => {
  const alt = [modell.neueStaette('haus', [110, 220])];
  const neu = werk.verschiebeStaette(alt, alt[0].id, [300, 400]);
  assert.deepEqual(alt[0].bei, [110, 220]);
  assert.deepEqual(neu[0].bei, [300, 400]);
  assert.notEqual(alt, neu);
});

pruefe('Ein Bauwerk erreicht Maler und Kachelwerk über bestehende Staffage', () => {
  const objekte = ['haus','turm','bruecke'].map((art,i) =>
    modell.neueStaette(art, [100+i*100, 300+i*40]));
  const staffage = werk.staettenStaffage(objekte);
  assert.deepEqual(staffage.map((s) => s.variante), [0,1,2]);
  assert.ok(staffage.every((s) => s.art === 'bauwerk' && s.ebene === 3));
  assert.ok(staffage.every((s) => s.lage === 'bewuchs'));
});

pruefe('Kachel-Entwertung umfasst Gebäudebild oberhalb des Bodenkontakts', () => {
  const s=modell.neueStaette('turm',[500,500]);
  const q=werk.staettenkasten(s);
  assert.ok(q.y0 < 500-s.hoehe && q.y1 > 500);
  assert.ok(q.x0 < 500 && q.x1 > 500);
});

pruefe('Buchseite und Weltimport behalten Bauwerke im Rückgängig und bei der Kopie', () => {
  const p = readFileSync(join(wurzel,'src/pages/book/Weltkarte.tsx'),'utf8');
  const port = readFileSync(join(wurzel,'src/lib/portability.ts'),'utf8');
  const k = readFileSync(join(wurzel,'src/components/karte/useKartenleinwand.ts'),'utf8');
  assert.match(p,/staetten: vorher\.staetten/);
  assert.match(p,/staetten: karte\.staetten \?\? \[\]/);
  assert.match(port,/staetten: k\.staetten\?\.map/);
  assert.match(k,/werk\.entwerte\(staettenkasten/);
});

console.log(`  ${tests} Prüfungen bestanden.`);
