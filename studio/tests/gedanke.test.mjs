import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/gedanke.ts --bundle --format=esm --outfile=${S}/t/ged.mjs`,{stdio:'pipe'});
const G = await import(S+'/t/ged.mjs');
let ok=0,bad=0;
const p=(n,ist,soll)=>{ if(JSON.stringify(ist)===JSON.stringify(soll)) ok++;
  else { bad++; console.log('FEHLER',n,'\n  ist :',JSON.stringify(ist),'\n  soll:',JSON.stringify(soll)); } };
const z=t=>{const r=G.zerlege(t); return [r.titel,r.untertitel];};
const e=t=>{const r=G.errate(t); return r?[r.type,r.grund]:null;};

/* --- Zerlegen: die beiden echten Beispiele --- */
p('Ellen mit Beinamen', z('Ellen - Die Sternenwächterin'), ['Ellen','Die Sternenwächterin']);
p('miep mit Notiz',     z('miep -Ort der valküren'),       ['miep','Ort der valküren']);
p('Halbgeviert',        z('Ellen – Die Sternenwächterin'), ['Ellen','Die Sternenwächterin']);
p('Geviert',            z('Ellen — Die Wächterin'),        ['Ellen','Die Wächterin']);
p('ohne Strich',        z('Nur ein Gedanke'),              ['Nur ein Gedanke','']);
p('Satz mit Gedankenstrich bleibt ganz',
  z('Der Fluss friert von unten zu und niemand weiß warum - vielleicht die Quellen'),
  ['Der Fluss friert von unten zu und niemand weiß warum - vielleicht die Quellen','']);
p('Strich am Anfang trennt nicht', z('- Einfall'), ['- Einfall','']);
p('Strich am Ende trennt nicht',   z('Einfall -'), ['Einfall -','']);
p('Bindestrichname bleibt ganz',   z('Alt-Arven'), ['Alt-Arven','']);
p('Doppelname bleibt ganz',        z('Sankt-Aelfric der Zweite'), ['Sankt-Aelfric der Zweite','']);
p('Halbgeviert trennt auch ohne Luft', z('Ellen–Die Wächterin'), ['Ellen','Die Wächterin']);
p('Leerraum wird gestutzt',        z('  Ellen   -   Die Wächterin  '), ['Ellen','Die Wächterin']);

/* --- Erraten --- */
p('Sternenwächterin ist eine Figur', e('Ellen - Die Sternenwächterin'), ['character','wächterin']);
p('Ort der Walküren ist ein Ort',    e('miep - Ort der Walküren'),      ['location','ort']);
p('Nebelmoor ist ein Ort',           e('Nebelmoor'),                    ['location','moor']);
p('Schlacht ist ein Ereignis',       e('Die Schlacht am Nebelpass'),    ['moment','schlacht']);
p('Königsschwert ist ein Gegenstand',e('Das Königsschwert'),            ['artifact','schwert']);
p('Königreich schlaegt König',       e('Königreich Aschen'),            ['location','königreich']);
p('Nichts Verraeterisches',          e('miep'),                         null);
p('Leeres schweigt',                 e('   '),                          null);
p('Nur Wortende zaehlt',             e('Ortung des Signals'),           null);
/*
 * Die Wortgrenze prueft man rechts, nicht links: „Ortsschild" endet auf
 * „schild" und wird deshalb als Gegenstand vorgeschlagen - so ist die Regel
 * gemeint, deutsche Komposita tragen ihre Art hinten. Falsch waere es, wenn
 * sie mitten im Wort anschluege.
 */
p('Wortmitte schlaegt nicht an',     e('Schildkroetenpanzer aus Erz'), null);
p('Umlaut vor dem Wort stoert nicht',e('Ätherwächterin'),              ['character','wächterin']);
p('Grossschreibung egal',            e('ELLEN DIE WÄCHTERIN'),          ['character','wächterin']);
p('Drache ist eine Kreatur',         e('Der alte Drache vom Berg')[0],  'creature');
p('Legende ist Lore',                e('Die Legende vom Fluss'),        ['lore','legende']);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
