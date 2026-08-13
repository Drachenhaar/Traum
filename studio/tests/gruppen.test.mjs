// Die Feldgruppierung direkt pruefen - kein Feld darf verloren gehen.
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
import { mkdirSync } from 'fs';
const S = ARBEIT;
mkdirSync(S+'/t',{recursive:true});
execSync(`npx esbuild src/lib/feldgruppen.ts --bundle --format=esm --outfile=${S}/t/fg.mjs`,{stdio:'pipe'});
execSync(`npx esbuild src/lib/templates.ts  --bundle --format=esm --outfile=${S}/t/tpl.mjs`,{stdio:'pipe'});
const G = await import(S+'/t/fg.mjs');
const T = await import(S+'/t/tpl.mjs');
const tpls = Object.values(T).find(v=>Array.isArray(v)&&v[0]?.fields);

let ok=0,bad=0;
const p=(n,ist,soll)=>{ if(JSON.stringify(ist)===JSON.stringify(soll)) ok++;
  else { bad++; console.log('FEHLER',n,'\n  ist :',JSON.stringify(ist),'\n  soll:',JSON.stringify(soll)); } };
const F = (...k) => k.map(key=>({key}));

// 1. Kein Feld geht verloren - ueber alle 28 Vorlagen
let verloren = [];
for (const t of tpls) {
  const rein = t.fields.map(f=>f.key);
  const raus = G.gruppiere(t.fields).flatMap(g=>g.felder.map(f=>f.key));
  if (rein.length !== raus.length || rein.some(k=>!raus.includes(k))) verloren.push(t.type);
}
p('kein Feld geht verloren', verloren, []);

// 2. Reihenfolge innerhalb einer Gruppe bleibt die der Vorlage
p('Reihenfolge in der Gruppe',
  G.gruppiere(F('personality','goals','face','routine','hair','speech','wishes')).map(g=>g.felder.map(f=>f.key)),
  [['personality','face','hair'],['goals','routine','speech'],['wishes']]);

// 3. Gruppenreihenfolge folgt FELDGRUPPEN, nicht dem Eingang
p('Gruppenreihenfolge',
  G.gruppiere(F('prompt','wishes','habitat','personality','goals','light','growth')).map(g=>g.gruppe.id),
  ['wesen','wirkung','umfeld','leben','sinne','inneres','handwerk']);

// 4. Leere Gruppen entfallen
p('keine leeren Gruppen',
  G.gruppiere(F('personality','face','hair','goals','routine','speech','voice')).every(g=>g.felder.length>0), true);

// 5. Kurze Listen bleiben ungegliedert
p('sechs Felder ohne Gliederung',
  G.gruppiere(F('instruments','tempo','mood','light','goals','face')).map(g=>[g.gruppe.id,g.felder.length]),
  [['alles',6]]);
p('sieben Felder werden gegliedert',
  G.gruppiere(F('instruments','tempo','mood','light','goals','face','hair')).length > 1, true);
p('nichts bleibt nichts', G.gruppiere([]), []);

// 6. Die Sammelgruppe traegt weder Ueberschrift noch Frage
const alles = G.gruppiere(F('a','b','c'))[0].gruppe;
p('Sammelgruppe ohne Beschriftung', [alles.label, alles.frage], ['','']);

// 7. „Weiteres" wird beim Bearbeiten beschriftet, im Lesemodus nicht befragt
const w = G.FELDGRUPPEN.find(g=>g.id==='weiteres');
p('Weiteres: Label ja, Frage nein', [w.label, w.frage], ['Weiteres','']);

// 8. Unbekanntes faellt ans Ende, verschwindet aber nicht
p('unbekannter Schluessel', G.gruppeVon('voellig_neues_feld'), 'weiteres');
p('Unbekanntes steht hinten',
  G.gruppiere(F('xyz','personality','goals','face','habitat','light','growth')).map(g=>g.gruppe.id).at(-1),
  'weiteres');

// 9. Zwei Zuordnungen, die aus dem Lesemodus kamen
p('Vergangenheit ist kein Umfeld', G.gruppeVon('background'), 'inneres');
p('Ausdrucksbilder sind Herstellung', G.gruppeVon('expressions'), 'handwerk');

// 10. Jede Gruppe in FELDGRUPPEN wird auch wirklich benutzt
const benutzt = new Set(tpls.flatMap(t=>t.fields.map(f=>G.gruppeVon(f.key))));
p('keine tote Gruppe', G.FELDGRUPPEN.filter(g=>!benutzt.has(g.id)).map(g=>g.id), []);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
