// Suche als Navigation.
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/suche.ts --bundle --format=esm --outfile=${S}/t/su.mjs`,{stdio:'pipe'});
const Q = await import(S+'/t/su.mjs');
let ok=0,bad=0;
const p=(n,ist,soll)=>{ if(JSON.stringify(ist)===JSON.stringify(soll)) ok++;
  else { bad++; console.log('FEHLER',n,'\n  ist :',JSON.stringify(ist),'\n  soll:',JSON.stringify(soll)); } };
let nr=0;
const E=(id,title,o={})=>({ id, title, subtitle:'', type:o.type??'character', category:'', description:'',
  tags:[], status:'Idee', favorite:false, createdAt:++nr, updatedAt:1, linkedEntryIds:[], blocks:[],
  fields:{}, deletedAt:o.deletedAt });
const rel=(id,f,t,ty,o={})=>({ id, fromId:f, toId:t, type:ty, createdAt:1, beginn:o.beginn, ende:o.ende });

const welt=[E('h','König Halvar'),E('a','Königreich Aschen',{type:'location'}),
            E('v','Arven',{type:'location'}),E('m','Mara'),E('s','Schmiede',{type:'architecture'}),
            E('tot','Verschollenes',{deletedAt:9})];
const byId=new Map(welt.map(e=>[e.id,e]));
const rels=[rel('r1','h','a','ruled',{beginn:'1032',ende:'1050'}),
            rel('r2','a','v','contains'), rel('r3','m','s','owns'),
            rel('r4','h','tot','owns')];

p('Verb findet alle Herrschaften',
  Q.sucheVerbindungen('herrschte', rels, byId).map(v=>v.satz),
  ['König Halvar herrschte über Königreich Aschen (1032–1050)']);
p('Name findet seine Kanten',
  Q.sucheVerbindungen('mara', rels, byId).map(v=>v.satz), ['Mara besitzt Schmiede']);
p('zwei Begriffe schneiden',
  Q.sucheVerbindungen('halvar aschen', rels, byId).length, 1);
p('Zeit steht im Satz',
  Q.sucheVerbindungen('1032', rels, byId).length, 1);
p('Kante zu Geloeschtem faellt weg',
  Q.sucheVerbindungen('halvar', rels, byId).length, 1);
p('kurze Saetze zuerst',
  Q.sucheVerbindungen('e', rels, byId)[0].satz.length <= Q.sucheVerbindungen('e', rels, byId).at(-1).satz.length, true);
p('leere Suche schweigt', Q.sucheVerbindungen('  ', rels, byId), []);

p('Jahr fuehrt zum Zeitstrahl', Q.sucheZeit('1044').jahr, 1044);
p('Jahrestext', Q.sucheZeit('1044').text, 'Die Welt im Jahr 1044');
p('unscharfes Jahr auch', Q.sucheZeit('um 874').jahr, 874);
p('v. Z. auch', Q.sucheZeit('300 v. Z.').jahr, -300);
p('Wort ist kein Jahr', Q.sucheZeit('Halvar'), undefined);

p('Blatt ueber Namen', Q.sucheBlaetter('karte').map(b=>b.pfad), ['/karte']);
p('Blatt ueber Stichwort', Q.sucheBlaetter('backup').map(b=>b.pfad), ['/kolophon']);
p('Blatt ueber Anfang', Q.sucheBlaetter('zeitst').map(b=>b.pfad), ['/zeitstrahl']);
p('Roman findet Manuskript', Q.sucheBlaetter('roman')[0].pfad, '/roman');
p('ein Buchstabe schweigt', Q.sucheBlaetter('k'), []);
p('Unbekanntes schweigt', Q.sucheBlaetter('xyzabc'), []);
p('hoechstens drei Blaetter', Q.sucheBlaetter('e').length <= 3, true);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
