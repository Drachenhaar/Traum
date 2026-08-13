import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/schemas.ts --bundle --format=esm --outfile=${S}/t/schemas.mjs`,{stdio:'pipe'});
const Sc = await import(S+'/t/schemas.mjs');
let ok=0,bad=0;
const p=(n,i,s)=>{ if(JSON.stringify(i)===JSON.stringify(s)) ok++; else {bad++;console.log('FEHLER',n,'\n  ist :',JSON.stringify(i),'\n  soll:',JSON.stringify(s));} };

const datei = {
  app:'dragoncore-studio', version:1, exportedAt:0,
  entries:[{id:'e1',title:'X',type:'character',createdAt:0,updatedAt:0,
            beginn:'1002', ende:'1050', zukuenftigesFeld:'bleibt'}],
  relations:[{id:'r1',fromId:'e1',toId:'e1',type:'ruled',createdAt:0,
              beginn:'1032', ende:'1050', auchNeu:'bleibt'}],
  images:[],
  settings:{ worldName:'Nebelwelt', book:{id:'b1',title:'Nebelwelt',createdAt:7}, spiegelAus:true },
};
const r = Sc.backupSchema.safeParse(datei);
p('Datei wird angenommen', r.success, true);
if (r.success) {
  p('Eintrag: beginn ueberlebt', r.data.entries[0].beginn, '1002');
  p('Eintrag: ende ueberlebt',   r.data.entries[0].ende, '1050');
  p('Eintrag: unbekanntes Feld ueberlebt', r.data.entries[0].zukuenftigesFeld, 'bleibt');
  p('Beziehung: beginn ueberlebt', r.data.relations[0].beginn, '1032');
  p('Beziehung: unbekanntes Feld ueberlebt', r.data.relations[0].auchNeu, 'bleibt');
  p('Einstellungen: book ueberlebt', r.data.settings.book.title, 'Nebelwelt');
  p('Einstellungen: "Begonnen am" ueberlebt', r.data.settings.book.createdAt, 7);
  p('Einstellungen: spiegelAus ueberlebt', r.data.settings.spiegelAus, true);
}
console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
process.exit(bad?1:0);
