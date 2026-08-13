import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/spiegel/regeln.ts --bundle --format=esm --outfile=${S}/t/regeln.mjs`,{stdio:'pipe'});
const R = await import(S+'/t/regeln.mjs');
let ok=0,bad=0;
const p=(n,i,s)=>{ if(JSON.stringify(i)===JSON.stringify(s)) ok++; else {bad++;console.log('FEHLER',n,'\n  ist :',JSON.stringify(i),'\n  soll:',JSON.stringify(s));} };
const e=(id,t,ty,txt,bg)=>({id,title:t,type:ty,subtitle:'',category:'',description:txt,beginn:bg,tags:[],
  status:'Idee',favorite:false,createdAt:0,updatedAt:0,linkedEntryIds:[],blocks:[],fields:{}});
const wandel = (es) => R.spiegle({entries:es,relations:[]}).filter(b=>b.id.startsWith('weltwandel:'));

// Frueh: Krieg. Spaet: Handel. 14 datierte Seiten ueber 400 Jahre.
const welt = [
  // Neutrale Titel: Sonst trennen schon die Woerter im Titel die Haelften.
  ...Array.from({length:7},(_,i)=>e('f'+i,'Seite '+i, i%2?'lore':'location','Ein Krieg zog durch das Land', String(800+i*10))),
  ...Array.from({length:7},(_,i)=>e('s'+i,'Seite '+(7+i), i%2?'lore':'location','Der Handel bluehte auf', String(1150+i*10))),
];
const w = wandel(welt);
p('Wandel erkannt', w.length, 1);
// Mehrere Woerter sind gleich stark, und alle Aussagen darueber sind wahr.
// Geprueft wird deshalb der eigentliche Anspruch: Die genannte Richtung muss
// zu den Belegen passen. Belege 'f*' liegen frueh, 's*' spaet.
const spaeteBelege = (w[0]?.belege ?? []).filter(id=>id.startsWith('s')).length;
const fruehBelege  = (w[0]?.belege ?? []).filter(id=>id.startsWith('f')).length;
p('Richtung passt zu den Belegen',
  /späteren Zeit/.test(w[0]?.text ?? '') ? spaeteBelege > fruehBelege
                                          : fruehBelege > spaeteBelege, true);

// Bei gleichem Ausschlag muss immer dasselbe herauskommen.
const nochmal = wandel([...welt].reverse());
p('Ergebnis ist bestimmt, nicht zufaellig', nochmal[0]?.id, w[0]?.id);
p('nennt das Grenzjahr', /1150/.test(w[0]?.herkunft ?? ''), true);
p('hat Belege', (w[0]?.belege.length ?? 0) >= 3, true);
p('Zweck ist Entwicklung', w[0]?.zweck, 'entwicklung');
p('spricht ueber die Welt, nicht die Person',
  /du bist|deine persönlichkeit|dein charakter/i.test(w[0]?.text ?? ''), false);

// Zu wenige datierte Seiten -> schweigen
p('unter zwoelf datierten: still', wandel(welt.slice(0,10)).length, 0);

// Zu kurze Spanne -> schweigen
const eng = welt.map((x,i)=>({...x, beginn: String(1000 + i)}));
p('Spanne unter 20 Jahren: still', wandel(eng).length, 0);

// Ohne Datum -> schweigen
const ohne = welt.map(x=>({...x, beginn: undefined}));
p('ohne Datum: still', wandel(ohne).length, 0);

// Gleichmaessig verteilt -> kein Wandel
const gleich = welt.map((x,i)=>({...x, description:'Ein Wald voller Nebel', beginn:String(800+i*40)}));
p('kein Unterschied: still', wandel(gleich).length, 0);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
process.exit(bad?1:0);
