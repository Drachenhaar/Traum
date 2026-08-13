// Romanstruktur und Randnotizen - ohne Browser.
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/roman/struktur.ts --bundle --format=esm --outfile=${S}/t/str.mjs`,{stdio:'pipe'});
execSync(`npx esbuild src/lib/roman/randnotizen.ts --bundle --format=esm --outfile=${S}/t/rand.mjs`,{stdio:'pipe'});
execSync(`npx esbuild src/lib/relations.ts --bundle --format=esm --outfile=${S}/t/rel.mjs`,{stdio:'pipe'});
const St = await import(S+'/t/str.mjs');
const R  = await import(S+'/t/rand.mjs');
const Rl = await import(S+'/t/rel.mjs');

let ok=0,bad=0;
const p=(n,ist,soll)=>{ if(JSON.stringify(ist)===JSON.stringify(soll)) ok++;
  else { bad++; console.log('FEHLER',n,'\n  ist :',JSON.stringify(ist),'\n  soll:',JSON.stringify(soll)); } };

let nr=0;
const E=(o)=>({ id:o.id??('e'+(++nr)), title:o.title??'', subtitle:'', type:o.type??'character',
  category:'', description:'', tags:[], status:'Idee', favorite:false,
  createdAt:o.createdAt??nr, updatedAt:1, linkedEntryIds:[], blocks:[],
  fields:o.fields??{}, beginn:o.beginn, ende:o.ende, deletedAt:o.deletedAt });
const rel=(f,t,ty)=>({ id:`r${f}${t}${ty}`, fromId:f, toId:t, type:ty, createdAt:1 });

/* ---------------- Struktur ---------------- */
p('roemisch VII', St.roemisch(7), 'VII');
p('roemisch 1938', St.roemisch(1938), 'MCMXXXVIII');
p('roemisch 0 bleibt Zahl', St.roemisch(0), '0');
p('woerter', [St.woerter('  Elian erreichte  Mooshalde. '), St.woerter(''), St.woerter('18.04.1038')], [3,0,1]);

const k1=E({id:'k1',type:'kapitel',title:'Ankunft',fields:{ordnung:'1'}});
const k2=E({id:'k2',type:'kapitel',title:'Abschied',fields:{ordnung:'2'}});
const s1=E({id:'s1',type:'szene',title:'A',fields:{ordnung:'2',manuskript:'ein zwei drei'}});
const s2=E({id:'s2',type:'szene',title:'B',fields:{ordnung:'1',manuskript:'vier fuenf'}});
const s3=E({id:'s3',type:'szene',title:'C',fields:{ordnung:'1',manuskript:'sechs'}});
const rom=E({id:'r1',type:'roman',title:'Mooshalde'});
const alle=[rom,k1,k2,s1,s2,s3];
const byId=new Map(alle.map(e=>[e.id,e]));
const idx=Rl.buildRelationIndex([
  rel('r1','k1','contains'), rel('r1','k2','contains'),
  rel('k1','s1','contains'), rel('k1','s2','contains'), rel('k2','s3','contains'),
]);

const baum=St.romanBaum(idx,byId,'r1');
p('Kapitel in Reihenfolge', baum.kapitel.map(k=>k.kapitel.id), ['k1','k2']);
p('Szenen nach Ordnung, nicht nach Anlage', baum.kapitel[0].szenen.map(s=>s.id), ['s2','s1']);
p('Szenenfolge quer', St.szenenFolge(baum).map(s=>s.id), ['s2','s1','s3']);
p('Woerter im Baum', St.baumWoerter(baum), 6);
p('Eltern einer Szene', St.elternVon(idx,byId,'s1').id, 'k1');
p('naechste Ordnung', St.naechsteOrdnung([s1,s2]), '3');
p('neu nummerieren meldet nur Aenderungen',
  St.neuNummerieren([s2,s1]), []);                       // s2=1, s1=2 stimmt schon
p('neu nummerieren nach Tausch',
  St.neuNummerieren([s1,s2]), [{id:'s1',ordnung:'1'},{id:'s2',ordnung:'2'}]);
p('verschieben', St.verschiebe([1,2,3,4],0,2), [2,3,1,4]);
p('verschieben ausserhalb bleibt', St.verschiebe([1,2,3],1,9), [1,3,2]);

// Geloeschtes taucht nicht auf
const byId2=new Map(byId); byId2.set('s1',{...s1,deletedAt:5});
p('Geloeschte Szene faellt weg',
  St.romanBaum(idx,byId2,'r1').kapitel[0].szenen.map(s=>s.id), ['s2']);

// Erzaehlreihenfolge != Weltzeit
const f1=E({id:'f1',type:'szene',title:'spaet',fields:{ordnung:'1'},beginn:'1038'});
const f2=E({id:'f2',type:'szene',title:'frueh',fields:{ordnung:'2'},beginn:'1012'});
p('Rueckblende bleibt in Erzaehlreihenfolge',
  St.nachOrdnung([f2,f1]).map(e=>e.id), ['f1','f2']);

// Kontext aus Kanten
const elian=E({id:'fig1',title:'Elian'}), mara=E({id:'fig2',title:'Mara'});
const arven=E({id:'ort1',title:'Arven',type:'location'});
const byId3=new Map([...byId,[elian.id,elian],[mara.id,mara],[arven.id,arven]]);
const idx3=Rl.buildRelationIndex([
  rel('s1','ort1','plays_at'), rel('s1','fig1','pov'),
  rel('fig1','s1','appears_in'), rel('fig2','s1','appears_in'),
]);
const kx=St.szeneKontext(idx3,byId3,'s1');
p('Kontext Ort/POV/Figuren', [kx.ort.title,kx.pov.title,kx.figuren.map(f=>f.title)],
  ['Arven','Elian',['Elian','Mara']]);
p('Signatur', St.signatur(kx,{...s1,beginn:'1038'}), 'Elian · Arven · 1038');
p('Signatur ohne Ort laesst nichts stehen',
  St.signatur({figuren:[],weltbezuege:[],pov:elian},{...s1,beginn:''}), 'Elian');

/* ---------------- Randnotizen ---------------- */
const welt=[E({id:'w1',title:'Mooshalde',type:'location'}), E({id:'w2',title:'Elian'}),
            E({id:'w3',title:'Mara'}), E({id:'w4',title:'Schmiede',type:'architecture'}),
            E({id:'w5',title:'Arven',type:'location',ende:'1041'}),
            E({id:'w6',title:'Ei',type:'prop'})];

p('erkennt bekannte Namen',
  R.erkenne('Elian erreichte Mooshalde.', welt).map(v=>v.entry.title), ['Elian','Mooshalde']);
p('zaehlt Vorkommen',
  R.erkenne('Elian sah Elian.', welt)[0].anzahl, 2);
p('kleingeschrieben zaehlt auch',
  R.erkenne('am rand von mooshalde', welt).map(v=>v.entry.title), ['Mooshalde']);
p('Wortgrenze: kein Treffer in Mooshaldenweg',
  R.erkenne('Der Mooshaldenweg war leer.', welt).map(v=>v.entry.title), []);
p('Umlautgrenze haelt',
  R.erkenne('Elians Pferd', welt).map(v=>v.entry.title), []);
p('zu kurze Titel schweigen',
  R.erkenne('Ein Ei lag da.', welt).map(v=>v.entry.title), []);
p('Szenen erkennen sich nicht selbst',
  R.erkenne('Ankunft in Arven war lang.', [...welt, E({id:'sz',title:'Ankunft in Arven',type:'szene'})])
    .map(v=>v.entry.title), ['Arven']);

const vs = R.schlageVor('Mara besitzt die alte Schmiede.', welt, []);
p('Vorschlag aus dem Satz', vs.map(v=>[v.vonId,v.typ,v.nachId]), [['w3','owns','w4']]);
p('Vorschlag traegt seinen Beleg', vs[0].satz, 'Mara besitzt die alte Schmiede.');
p('Vergangenheitsform erkannt',
  R.schlageVor('Mara besaß die Schmiede.', welt, []).map(v=>v.typ), ['owns']);
p('vorhandene Beziehung wird nicht vorgeschlagen',
  R.schlageVor('Mara besitzt die Schmiede.', welt, [rel('w3','w4','owns')]), []);
p('Gegenrichtung zaehlt als vorhanden',
  R.schlageVor('Mara besitzt die Schmiede.', welt, [rel('w4','w3','owns')]), []);
p('nichts erfinden: unbekanntes Ende',
  R.schlageVor('Mara besitzt den Sternenschlüssel.', welt, []), []);
p('satzuebergreifend wird nicht geraten',
  R.schlageVor('Mara ging fort. Die Schmiede besitzt Elian nicht mehr als Erbe.', welt, [])
    .every(v=>v.vonId!=='w3'), true);
p('zu grosse Luecke bricht ab',
  R.schlageVor('Mara besitzt seit vielen langen und dunklen Jahren die Schmiede.', welt, []), []);
p('laengere Verbform gewinnt',
  R.schlageVor('Elian gehört zu Mooshalde.', welt, []).map(v=>v.typ), ['member_of']);
p('Vorschlag lesbar',
  R.liesVorschlag(vs[0], new Map(welt.map(e=>[e.id,e]))), 'Mara → besitzt → Schmiede');

const w = R.pruefeZeit('1047', [welt[4]]);
p('Welt widerspricht der Szenenzeit', [w.length, w[0].art], [1,'vergangen']);
p('Widerspruch als Satz', w[0].text, 'Arven gilt zu diesem Zeitpunkt als vergangen – 1041.');
p('vor der Zeit', R.pruefeZeit('800',[E({id:'x',title:'Nordhain',beginn:'1044'})])[0].art, 'nochNicht');
p('passende Zeit schweigt', R.pruefeZeit('1030',[welt[4]]), []);
p('ohne Szenenzeit schweigt', R.pruefeZeit('',[welt[4]]), []);
p('unlesbare Szenenzeit schweigt', R.pruefeZeit('irgendwann',[welt[4]]), []);
p('zeitloser Bezug schweigt', R.pruefeZeit('1047',[welt[0]]), []);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
