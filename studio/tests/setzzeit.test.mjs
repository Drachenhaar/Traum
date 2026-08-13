import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/transcribe.ts --bundle --format=esm --outfile=${S}/t/transcribe.mjs`,{stdio:'pipe'});
const T = await import(S+'/t/transcribe.mjs');
let ok=0,bad=0;
const p=(n,i,s)=>{ if(JSON.stringify(i)===JSON.stringify(s)) ok++; else {bad++;console.log('FEHLER',n,'\n  ist :',JSON.stringify(i),'\n  soll:',JSON.stringify(s));} };
const z=(txt)=>{ const r=T.transcribe(txt,[]); return [r.beginn,r.ende]; };

p('Beginn/Ende',      z('Titel: X\nBeginn: 1032\nEnde: 1078'), ['1032','1078']);
p('Gründung/Untergang', z('Titel: X\nGründung: 812\nUntergang: 1104'), ['812','1104']);
p('Geboren/Gestorben', z('Titel: X\nGeboren: 1002\nGestorben: 1050'), ['1002','1050']);
p('nur Beginn',       z('Titel: X\nEntstanden: 700'), ['700','']);
p('vor der Zeit',     z('Titel: X\nBeginn: 300 v. Z.'), ['300 v. Z.','']);
p('genaues Datum',    z('Titel: X\nBeginn: 12.4.1032'), ['12.4.1032','']);

// Kein Datum -> nicht uebernehmen, aber auch nicht verschlucken
const r = T.transcribe('Titel: X\nTod: im Nebel verschollen', []);
p('unlesbares Ende nicht uebernommen', [r.beginn, r.ende], ['','']);
const bleibtIrgendwo = JSON.stringify(r.unmatched).includes('verschollen')
  || JSON.stringify(r.blocks).includes('verschollen')
  || r.description.includes('verschollen')
  || JSON.stringify(r.fields).includes('verschollen');
p('unlesbares Ende bleibt erhalten', bleibtIrgendwo, true);

// "von"/"bis" duerfen NICHT als Zeit gelten
p('von wird nicht als Zeit gelesen', z('Titel: X\nVon: dem Händler am Markt'), ['','']);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
process.exit(bad?1:0);
