// Die Feldgruppierung direkt pruefen - kein Feld darf verloren gehen.
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
import { mkdirSync } from 'fs';
const S = ARBEIT;
mkdirSync(S+'/t',{recursive:true});
execSync(`npx esbuild src/lib/feldgruppen.ts --bundle --format=esm --outfile=${S}/t/fg.mjs`,{stdio:'pipe'});
execSync(`npx esbuild src/lib/templates.ts  --bundle --format=esm --outfile=${S}/t/tpl.mjs`,{stdio:'pipe'});
const G = await import(S+'/t/fg.mjs');
const T = await import(S+'/t/tpl.mjs');
const tpls = Object.values(T).find(v=>Array.isArray(v)&&v[0]?.fields);

let ok=0,bad=0;
const p=(n,ist,soll)=>{ if(JSON.stringify(ist)===JSON.stringify(soll)) ok++;
  else { bad++; console.log('FEHLER',n,'\n  ist :',JSON.stringify(ist),'\n  soll:',JSON.stringify(soll)); } };
const F = (...k) => k.map(key=>({key}));

// 1. Kein Feld geht verloren - ueber alle 28 Vorlagen
let verloren = [];
for (const t of tpls) {
  const rein = t.fields.map(f=>f.key);
  const raus = G.gruppiere(t.fields).flatMap(g=>g.felder.map(f=>f.key));
  if (rein.length !== raus.length || rein.some(k=>!raus.includes(k))) verloren.push(t.type);
}
p('kein Feld geht verloren', verloren, []);

/*
 * 2. und 3. pruefen jetzt die **Absicht** statt einer Momentaufnahme.
 *
 * Beide standen jahrelang auf Rot, ohne dass es jemand sah: Sie verglichen
 * das Ergebnis mit einer ausgeschriebenen Liste aus einem frueheren
 * Gruppen-Wortschatz („inneres", „leben"), den es nicht mehr gibt. Der Code
 * hatte recht, die Pruefung war alt.
 *
 * Eine Zusicherung, die eine ganze Aufteilung woertlich festschreibt, geht
 * bei jeder Umbenennung kaputt und sagt dann nichts ueber den Fehler, den sie
 * eigentlich fangen soll. Gehalten wird deshalb nur noch das, was wirklich
 * gilt – und was bei einem echten Fehler auch wirklich bricht.
 */

// 2. Reihenfolge innerhalb einer Gruppe bleibt die der Vorlage
{
  const rein = ['personality','goals','face','routine','hair','speech','wishes'];
  const gruppen = G.gruppiere(F(...rein));
  /* In jeder Gruppe stehen die Felder in der Reihenfolge, in der sie kamen. */
  const verdreht = gruppen
    .map(g => g.felder.map(f => rein.indexOf(f.key)))
    .filter(ix => ix.some((n,i) => i > 0 && n < ix[i-1]));
  p('Reihenfolge in der Gruppe', verdreht, []);
}

// 3. Gruppenreihenfolge folgt FELDGRUPPEN, nicht dem Eingang
{
  const ordnung = G.FELDGRUPPEN.map(g => g.id);
  const ids = G.gruppiere(F('prompt','wishes','habitat','personality','goals','light','growth'))
    .map(g => g.gruppe.id);
  const rang = ids.map(id => ordnung.indexOf(id));
  p('Gruppenreihenfolge folgt FELDGRUPPEN',
    rang.filter((n,i) => i > 0 && n < rang[i-1]), []);
  /* Und der Eingang bestimmt sie gerade *nicht*: „wesen" kam als viertes. */
  p('und nicht dem Eingang', ids[0], 'wesen');
}

// 4. Leere Gruppen entfallen
p('keine leeren Gruppen',
  G.gruppiere(F('personality','face','hair','goals','routine','speech','voice')).every(g=>g.felder.length>0), true);

// 5. Kurze Listen bleiben ungegliedert
p('sechs Felder ohne Gliederung',
  G.gruppiere(F('instruments','tempo','mood','light','goals','face')).map(g=>[g.gruppe.id,g.felder.length]),
  [['alles',6]]);
p('sieben Felder werden gegliedert',
  G.gruppiere(F('instruments','tempo','mood','light','goals','face','hair')).length > 1, true);
p('nichts bleibt nichts', G.gruppiere([]), []);

// 6. Die Sammelgruppe traegt weder Ueberschrift noch Frage
const alles = G.gruppiere(F('a','b','c'))[0].gruppe;
p('Sammelgruppe ohne Beschriftung', [alles.label, alles.frage], ['','']);

// 7. „Weiteres" wird beim Bearbeiten beschriftet, im Lesemodus nicht befragt
const w = G.FELDGRUPPEN.find(g=>g.id==='weiteres');
p('Weiteres: Label ja, Frage nein', [w.label, w.frage], ['Weiteres','']);

// 8. Unbekanntes faellt ans Ende, verschwindet aber nicht
p('unbekannter Schluessel', G.gruppeVon('voellig_neues_feld'), 'weiteres');
p('Unbekanntes steht hinten',
  G.gruppiere(F('xyz','personality','goals','face','habitat','light','growth')).map(g=>g.gruppe.id).at(-1),
  'weiteres');

// 9. Zwei Zuordnungen, die aus dem Lesemodus kamen
/*
 * Die Absicht steht im Namen der Zusicherung und in `feldgruppen.ts`:
 * „Das eine ist, woher jemand kommt, das andere, wo er gerade ist."
 * Geprueft wird deshalb genau das – und nicht, wie die Gruppe heisst.
 * Vorher stand hier `'inneres'`, eine Gruppe, die es nicht mehr gibt.
 */
p('Vergangenheit ist kein Umfeld', G.gruppeVon('background') === 'umfeld', false);
p('Vergangenheit steht bei der Herkunft',
  G.gruppeVon('background'), G.gruppeVon('origin'));
p('Ausdrucksbilder sind Herstellung', G.gruppeVon('expressions'), 'handwerk');

// 10. Jede Gruppe in FELDGRUPPEN wird auch wirklich benutzt
const benutzt = new Set(tpls.flatMap(t=>t.fields.map(f=>G.gruppeVon(f.key))));
p('keine tote Gruppe', G.FELDGRUPPEN.filter(g=>!benutzt.has(g.id)).map(g=>g.id), []);

console.log(`\n${ok} bestanden, ${bad} fehlgeschlagen`);

/*
 * Der Rückgabewert.
 *
 * Er fehlte, und damit konnte diese Prüfung den Testlauf nicht rot machen:
 * `scripts/test.mjs` liest den Ausgangsstatus, und ohne diese Zeile war er
 * immer 0. Die Zeile „x fehlgeschlagen" stand in der Ausgabe und niemand las
 * sie – ein Netz, das reisst, ohne ein Geräusch zu machen.
 */
process.exit(bad ? 1 : 0);
