import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/beziehungsgruppen.ts --bundle --format=esm --outfile=${S}/t/bg.mjs`,{stdio:'pipe'});
execSync(`npx esbuild src/lib/relations.ts --bundle --format=esm --outfile=${S}/t/rel2.mjs`,{stdio:'pipe'});
const G = await import(S+'/t/bg.mjs');
const R = await import(S+'/t/rel2.mjs');
let ok=0,bad=0;
const p=(n,ist,soll)=>{ if(JSON.stringify(ist)===JSON.stringify(soll)) ok++;
  else { bad++; console.log('FEHLER',n,'\n  ist :',JSON.stringify(ist),'\n  soll:',JSON.stringify(soll)); } };

// Dieselbe Kante, zwei Richtungen, zwei Fragen
p('lebt in -> wo',        G.gruppeVonKante('lives_in', true),  'wo');
p('beherbergt -> wer',    G.gruppeVonKante('lives_in', false), 'wer');
p('enthaelt -> was',      G.gruppeVonKante('contains', true),  'was');
p('gehoert zu -> wo',     G.gruppeVonKante('contains', false), 'wo');
p('herrschte -> was',     G.gruppeVonKante('ruled', true),     'was');
p('stand unter -> wer',   G.gruppeVonKante('ruled', false),    'wer');
p('Schauplatz von -> geschah', G.gruppeVonKante('plays_at', false), 'geschah');
p('Unbekanntes faellt nicht raus', G.gruppeVonKante('gibtsnicht', true), 'stoff');

// Jede Beziehungsart ist zugeordnet
const fehlend = R.RELATION_TYPES.filter(t => G.gruppeVonKante(t.id,true)==='stoff' && t.id!=='made_of'
  && t.id!=='comes_from' && t.id!=='created_by' && t.id!=='follows_dna' && t.id!=='variant_of');
p('keine Beziehungsart vergessen', fehlend.map(t=>t.id), []);

// Buendeln
const g = (label, typ, out, n=1) => ({ label, color:'#000',
  items: Array.from({length:n},(_,i)=>({ outgoing:out, relation:{ type:typ, id:label+i } })) });

p('kurze Liste bleibt ungegliedert',
  G.gruppiereBeziehungen([g('lebt in','lives_in',true,2), g('enthält','contains',true,2)])
    .map(x=>[x.gruppe.id, x.gruppen.length]), [['alles',2]]);

const viele = [g('beherbergt','lives_in',false,3), g('enthält','contains',true,2),
               g('Schauplatz von','plays_at',false,2), g('gehört zu','contains',false,1)];
p('lange Liste wird gegliedert',
  G.gruppiereBeziehungen(viele).map(x=>x.gruppe.id), ['wer','was','wo','geschah']);
p('keine Kante geht verloren',
  G.gruppiereBeziehungen(viele).flatMap(x=>x.gruppen).length, viele.length);
p('leere Eingabe bleibt leer', G.gruppiereBeziehungen([]), []);
p('Sammelgruppe hat keine Frage',
  G.gruppiereBeziehungen([g('lebt in','lives_in',true,1)])[0].gruppe.frage, '');

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);
