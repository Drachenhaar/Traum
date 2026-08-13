import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/chronik/zustand.ts src/lib/chronik/zeit.ts --bundle --format=esm --outdir=${S}/t --out-extension:.js=.mjs`,{stdio:'pipe'});
const Zu = await import(S+'/t/zustand.mjs');
const Z  = await import(S+'/t/zeit.mjs');
let ok=0,bad=0;
const p=(n,i,s)=>{ if(JSON.stringify(i)===JSON.stringify(s)) ok++; else {bad++;console.log('FEHLER',n,'\n  ist :',JSON.stringify(i),'\n  soll:',JSON.stringify(s));} };
const e=(id,t,bg,en)=>({id,title:t,type:'character',beginn:bg,ende:en,category:'',subtitle:'',description:'',
  tags:[],status:'Idee',favorite:false,createdAt:0,updatedAt:0,linkedEntryIds:[],blocks:[],fields:{}});
const r=(id,a,b,typ,bg,en)=>({id,fromId:a,toId:b,type:typ,beginn:bg,ende:en,createdAt:0});
const bei=(j)=>Z.ordnung(Z.leseZeit(String(j)));

// Koenig lebt 1002-1080, herrscht aber nur 1032-1050
const welt = Zu.datiere([e('k','König','1002','1080'), e('reich','Reich','800','1200')]);
const rel  = [r('r1','k','reich','ruled','1032','1050')];
const gilt = (j)=>Zu.weltzustand(welt, rel, bei(j)).relationen.length;

p('vor der Herrschaft (1010)', gilt(1010), 0);
p('waehrend (1040)',           gilt(1040), 1);
p('nach der Herrschaft (1060)',gilt(1060), 0);
p('Randjahr Beginn (1032)',    gilt(1032), 1);
p('Randjahr Ende (1050)',      gilt(1050), 1);

// Ohne eigene Zeit: gilt solange beide bestehen (altes Verhalten)
const ohne = [r('r2','k','reich','lives_in',undefined,undefined)];
const giltO = (j)=>Zu.weltzustand(welt, ohne, bei(j)).relationen.length;
p('ohne Zeit: 1010 gilt', giltO(1010), 1);
p('ohne Zeit: 1090 nicht (König tot)', giltO(1090), 0);

// Nur Beginn gesetzt: gilt ab dann bis zum Lebensende
const abDann = [r('r3','k','reich','ruled','1032',undefined)];
const giltA = (j)=>Zu.weltzustand(welt, abDann, bei(j)).relationen.length;
p('nur ab: 1010 nicht', giltA(1010), 0);
p('nur ab: 1060 gilt',  giltA(1060), 1);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
process.exit(bad?1:0);
