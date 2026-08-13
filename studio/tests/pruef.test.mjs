import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/chronik/pruefung.ts src/lib/chronik/zustand.ts --bundle --format=esm --outdir=${S}/t --out-extension:.js=.mjs`, { stdio:'pipe' });
const P = await import(S+'/t/pruefung.mjs');
const Zu = await import(S+'/t/zustand.mjs');

const e = (id, title, beginn, ende, type='character') =>
  ({ id, title, type, beginn, ende, tags:[], category:'', subtitle:'', description:'',
     status:'Idee', favorite:false, createdAt:0, updatedAt:0, linkedEntryIds:[], blocks:[], fields:{} });
const r = (id, fromId, toId, type) => ({ id, fromId, toId, type, createdAt:0 });

let ok=0, bad=0;
const p=(n,i,s)=>{ if(JSON.stringify(i)===JSON.stringify(s)) ok++; else { bad++; console.log('FEHLER',n,'\n  ist :',JSON.stringify(i),'\n  soll:',JSON.stringify(s)); } };
const arten = (entries, rels) => P.pruefe(Zu.datiere(entries), rels).map(b=>b.art+':'+b.id.split(':')[0]);

// 1 Ende vor Beginn
p('Ende vor Beginn',
  arten([e('a','Reich','1078','1032')],[]).filter(x=>x.startsWith('widerspruch')),
  ['widerspruch:ende-vor-beginn']);

// 2 saubere Daten -> kein Widerspruch
p('sauber',
  arten([e('a','Reich','1032','1078')],[]).filter(x=>x.startsWith('widerspruch')),
  []);

// 3 Ursache nach Wirkung
p('Ursache nach Wirkung',
  arten([e('a','Tod des Koenigs','1050'), e('b','Thronstreit','1040')],[r('r1','a','b','causes')])
    .filter(x=>x.startsWith('widerspruch')),
  ['widerspruch:ursache-nach-wirkung']);

// 4 Ursache vor Wirkung -> still
p('Ursache vor Wirkung',
  arten([e('a','Tod','1040'), e('b','Streit','1050')],[r('r1','a','b','causes')])
    .filter(x=>x.startsWith('widerspruch')),
  []);

// 5 Kind vor Elternteil
p('Kind vor Elternteil',
  arten([e('p','Mutter','1050'), e('k','Kind','1020')],[r('r1','p','k','parent_of')])
    .filter(x=>x.startsWith('widerspruch')),
  ['widerspruch:kind-vor-eltern']);

// 6 Toter erscheint spaeter (der Fall aus dem Auftrag)
p('Toter erscheint spaeter',
  arten([e('f','Figur','1000','1050'), e('s','Schlacht','1070','1070','lore')],
        [r('r1','f','s','appears_in')]).filter(x=>x.startsWith('widerspruch')),
  ['widerspruch:nach-dem-ende']);

// 7 Fehlende Zeit -> genau eine Luecke, keine Flut
const vieleOhne = Array.from({length:50},(_,i)=>e('x'+i,'Ohne '+i));
p('Luecke gebuendelt',
  P.pruefe(Zu.datiere(vieleOhne),[]).filter(b=>b.art==='luecke').length, 1);

// 8 Unlesbare Zeit
p('unlesbar gemeldet',
  arten([e('a','Seltsam','irgendwann')],[]).filter(x=>x.includes('unlesbar')),
  ['frage:unlesbar']);

// 9 Kein Datum -> keine falschen Widersprueche
p('ohne Daten keine Widersprueche',
  arten([e('a','A'), e('b','B')],[r('r1','a','b','causes')]).filter(x=>x.startsWith('widerspruch')),
  []);

// 10 Weltzustand
const welt = Zu.datiere([e('a','Reich','1032','1078'), e('b','Spaeter','1100'), e('c','Zeitlos')]);
const zst = Zu.weltzustand(welt, [], Zu.datiere([e('m','x','1050')])[0].zeit.von);
p('Weltzustand 1050', [zst.bestand.length, zst.nochNicht.length, zst.vergangen.length, zst.zeitlos.length], [1,1,0,1]);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
process.exit(bad?1:0);
