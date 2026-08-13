import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/spiegel/regeln.ts src/lib/spiegel/schwelle.ts src/lib/spiegel/lesen.ts --bundle --format=esm --outdir=${S}/t --out-extension:.js=.mjs`, {stdio:'pipe'});
const R = await import(S+'/t/regeln.mjs');
const Sch = await import(S+'/t/schwelle.mjs');

let ok=0,bad=0;
const p=(n,i,s)=>{ if(JSON.stringify(i)===JSON.stringify(s)) ok++; else {bad++; console.log('FEHLER',n,'\n  ist :',JSON.stringify(i),'\n  soll:',JSON.stringify(s));} };

const e=(id,titel,typ,text='',felder={},tags=[],createdAt=0)=>({id,title:titel,type:typ,subtitle:'',category:'',
  description:text,tags,status:'Idee',favorite:false,createdAt,updatedAt:createdAt,linkedEntryIds:[],blocks:[],fields:felder});
const rel=(id,a,b,t)=>({id,fromId:a,toId:b,type:t,createdAt:0});

// --- Schwelle
p('unter 10 zu jung', Sch.reife(5).grad, 'zu-jung');
p('10 erste Spuren',  Sch.reife(10).grad, 'erste-spuren');
p('25 reif',          Sch.reife(25).grad, 'reif');

// --- Motiv braucht mehrere Typen
const nurOrte = Array.from({length:6},(_,i)=>e('o'+i,'Ort '+i,'location','Ein Wald voller Nebel'));
const motiveNurOrte = R.spiegle({entries:nurOrte,relations:[]}).filter(b=>b.id.startsWith('motiv:'));
p('ein Typ ergibt kein Motiv', motiveNurOrte.length, 0);

const gemischt = [
  e('a','Nebelwald','location','Ein Wald voller Nebel'),
  e('b','Waldhüter','character','Er lebt im Wald'),
  e('c','Der Wald singt','lore','Vom Wald erzählt man sich'),
  e('d','Waldkoi','creature','Schwimmt durch den Wald'),
];
const mm = R.spiegle({entries:gemischt,relations:[]}).filter(b=>b.id.startsWith('motiv:'));
p('vier Einträge, drei Typen ergeben ein Motiv', mm.length>0, true);
p('Motiv nennt Belege', mm[0]?.belege.length>=4, true);

// --- Grundgesetz: nie über die Person
const viele = [...gemischt,
  e('e','Nebelmoor','biome','Nebel über dem Moor'), e('f','Nebelfrau','character','Sie kam aus dem Nebel'),
  e('g','Nebellied','lore','Ein Lied vom Nebel'), e('h','Nebelglas','material','Glas aus Nebel'),
  e('i','Nebelpfad','location','Ein Pfad im Nebel'), e('j','Nebelkraut','plant','Wächst im Nebel'), e('k','Nebelsee','location','Nebel liegt auf dem See')];
const alle = R.spiegle({entries:viele,relations:[rel('r1','a','b','lives_in'),rel('r2','b','c','appears_in'),
  rel('r3','a','c','contains'),rel('r4','d','a','lives_in'),rel('r5','e','a','contains'),
  rel('r6','f','a','lives_in'),rel('r7','g','c','appears_in'),rel('r8','h','a','comes_from'),
  rel('r9','i','a','contains'),rel('r10','j','e','grows_in')]});
const verboten = /\bdu bist\b|\bdu hast ein\b|\bdeine persönlichkeit\b|\bdein charakter\b|\btrauma\b|\bdiagnos/i;
p('keine Aussage über die Person', alle.filter(b=>verboten.test(b.text)).length, 0);
p('alle mit Grundlage', alle.every(b=>b.belege.length>0), true);
p('alle mit Herkunft',  alle.every(b=>b.herkunft && b.herkunft.length>10), true);
p('alle mit Zweck',     alle.every(b=>['widerspruch','moeglichkeit','entwicklung','muster','frage'].includes(b.zweck)), true);

// --- Blinder Fleck: Feld fast immer leer, aber nicht immer
const mitLuecke = Array.from({length:8},(_,i)=>
  e('k'+i,'Figur '+i,'character','Text', i===0 ? {role:'Wächter'} : {}));
const fleck = R.spiegle({entries:mitLuecke,relations:[]}).filter(b=>b.id.startsWith('leer:'));
p('blinder Fleck gefunden', fleck.length>0, true);
p('blinder Fleck klingt nicht wie Kritik', fleck.every(b=>/unentdeckter Raum/.test(b.text)), true);

// --- Feld, das NIE gefüllt ist, gilt nicht als blinder Fleck
const nieGefuellt = Array.from({length:8},(_,i)=>e('n'+i,'Figur '+i,'character','Text',{}));
const keinFleck = R.spiegle({entries:nieGefuellt,relations:[]}).filter(b=>b.id.startsWith('leer:'));
p('nie gefülltes Feld ist kein blinder Fleck', keinFleck.length, 0);

// --- Tiefe Spiegelung ist selten
const werk = {entries:viele,relations:[]};
const tief = R.tiefeSpiegelung(R.spiegle(werk), werk);
p('tiefe Spiegelung bei 4+ Typen und 8+ Seiten', !!tief, true);
const kleinerWerk = {entries:gemischt,relations:[]};
p('keine tiefe Spiegelung bei wenig', !!R.tiefeSpiegelung(R.spiegle(kleinerWerk),kleinerWerk), false);

// --- Verwaiste Beziehungen zaehlen nicht mit
const mitWaisen = R.spiegle({entries:viele, relations:[
  rel('w1','a','b','lives_in'),
  rel('w2','geloescht1','geloescht2','follows_dna'),
  rel('w3','geloescht3','a','follows_dna'),
  rel('w4','geloescht4','geloescht5','follows_dna'),
  rel('w5','geloescht6','geloescht7','follows_dna'),
  rel('w6','geloescht8','geloescht9','follows_dna'),
]});
p('keine Beobachtung aus verwaisten Beziehungen',
  mitWaisen.filter(b=>b.id.startsWith('beziehung:')).length, 0);
const alleIds = new Set(viele.map(x=>x.id));
p('alle Belege existieren', mitWaisen.every(b=>b.belege.every(id=>alleIds.has(id))), true);

// --- Gleichstand bei Farben ergibt keine Aussage
const gleich = Array.from({length:8},(_,i)=>({...e('g'+i,'G'+i,'location','Text'),
  fields:{palette:['A #55604A','B #B01020']}}));
p('Farb-Gleichstand schweigt',
  R.spiegle({entries:gleich,relations:[]}).filter(b=>b.id.startsWith('farbe:')).length, 0);

// --- Klarer Vorsprung wird gemeldet
const klar = Array.from({length:8},(_,i)=>({...e('h'+i,'H'+i,'location','Text'),
  fields:{palette: i<7 ? ['Grün #55604A'] : ['Rot #B01020']}}));
p('klarer Farbvorsprung wird gezeigt',
  R.spiegle({entries:klar,relations:[]}).filter(b=>b.id.startsWith('farbe:')).length, 1);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
process.exit(bad?1:0);
