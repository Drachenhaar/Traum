import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/erkennung.ts --bundle --format=esm --outfile=${S}/t/erk.mjs`,{stdio:'pipe'});
const E = await import(S+'/t/erk.mjs');
let ok=0,bad=0;
const p=(n,ist,soll)=>{ if(JSON.stringify(ist)===JSON.stringify(soll)) ok++;
  else { bad++; console.log('FEHLER',n,'\n  ist :',JSON.stringify(ist),'\n  soll:',JSON.stringify(soll)); } };

let nr=0;
const Ent=(id,title,type='character')=>({ id, title, subtitle:'', type, category:'', description:'',
  tags:[], status:'Idee', favorite:false, createdAt:++nr, updatedAt:1, linkedEntryIds:[], blocks:[], fields:{} });

/* Der echte Text des Nutzers. */
const BUM = `Bum ist ein lebendiger Baum. Er hat einige Freunde die ihn immer besuchen kommen. Das ist Niko das Eichhörnchen und die Birke die Nebenan steht. Die spielen aichvimmer Spiele zusammen . Wikinerschach. Niko muss immer die Figuren aufstellen. Zusammen sind sie ein Trio. Alles ist gut bis zu dem Tag als sich eine Säurewolke kommt und mit Zerstörung kommt. Es wird sich erzählt das Bäume frühler laufen konnten bevor sie sesshaft wurden. Und keiner weiß mehr wie es geht und da Niko der einzige ist der sich bewegen kann beschließt Niko sich auf die Reise zum Sumpf der Antworten zu begeben. Auf der Reise begegnet er einem Eichhörnchen namens Tip und einer Schildkröte namens Elsa.`;

const funde = E.findeWesen(BUM, [], 'bum', new Set());
const namen = funde.map(f=>f.name);
console.log('Gefunden:', JSON.stringify(funde.map(f=>[f.name,f.type,f.grund])));

p('Tip erkannt',  namen.includes('Tip'), true);
p('Elsa erkannt', namen.includes('Elsa'), true);
p('Niko erkannt', namen.includes('Niko'), true);
p('Sumpf der Antworten erkannt', namen.some(n=>/Sumpf der Antworten/.test(n)), true);
p('Tip traegt seinen Beleg', funde.find(f=>f.name==='Tip').satz.includes('namens Tip'), true);
p('kein "Tag" als Name',    namen.includes('Tag'), false);
p('kein "Alles" als Name',  namen.includes('Alles'), false);
p('kein "Figuren" als Name',namen.includes('Figuren'), false);
p('kein "Zerstörung"',      namen.includes('Zerstörung'), false);

/* Bekanntes wird als bekannt gemeldet, nicht als neu. */
const welt = [Ent('n1','Niko'), Ent('b1','Birke','plant'), Ent('bum','Bum')];
const mitWelt = E.findeWesen(BUM, welt, 'bum', new Set());
const niko = mitWelt.find(f=>f.name==='Niko');
p('Vorhandenes Niko zeigt auf den Eintrag', niko.vorhandenId, 'n1');
p('Niko nicht doppelt', mitWelt.filter(f=>f.name==='Niko').length, 1);
p('Eigene Seite nicht vorgeschlagen', mitWelt.some(f=>f.vorhandenId==='bum'), false);

/* Schon Verbundenes faellt weg. */
const ohneNiko = E.findeWesen(BUM, welt, 'bum', new Set(['n1']));
p('Bereits Verbundenes entfaellt', ohneNiko.some(f=>f.vorhandenId==='n1'), false);

/* Einzelfaelle */
const nur = (t) => E.findeWesen(t, [], 'x', new Set()).map(f=>[f.name,f.type]);
p('namens mit bekannter Gattung',
  nur('Ein Drache namens Fyra kam.'), [['Fyra','creature']]);
p('namens ohne bekannte Gattung wird Figur',
  nur('Ein Eichhörnchen namens Tip kam.'), [['Tip','character']]);
p('Apposition',        nur('Das ist Niko das Eichhörnchen.'), [['Niko','character']]);
p('Genitivfuegung',    nur('die Reise zum Sumpf der Antworten'), [['Sumpf der Antworten','location']]);
p('kurzer Name faellt weg', nur('Ein Wesen namens Ka kam.'), []);
p('kleingeschrieben ist kein Name', nur('ein hund namens bello'), []);
p('leerer Text schweigt', nur(''), []);
p('Satz ohne Muster schweigt', nur('Es regnete den ganzen Tag und niemand ging hinaus.'), []);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
