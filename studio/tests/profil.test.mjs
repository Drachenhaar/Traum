/*
 * Das Profil.
 *
 * Die Zusicherungen hier sind nicht „sortiert es richtig" – das ist Geschmack.
 * Sie sind: Geht nie etwas verloren? Ist wirklich alles erreichbar? Und faellt
 * ein Buch aus der Zeit davor auf die vorsichtigste Auslegung und nicht auf
 * die reichste?
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
execSync(`npx esbuild src/lib/profil.ts --bundle --format=esm --outfile=${S}/t/profil.mjs`, { stdio: 'pipe' });
const P = await import(S + '/t/profil.mjs');

let ok = 0, bad = 0;
const p = (n, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { bad++; console.log('FEHLER', n, '\n  ist :', JSON.stringify(ist), '\n  soll:', JSON.stringify(soll)); }
};
const wahr = (n, b) => p(n, !!b, true);

/* Ein Satz Werkzeuge, der die fuenf Schwerpunkte abdeckt. */
const W = [
  { id: 'roman', gewicht: { schreiben: 1 } },
  { id: 'karte', gewicht: { welt: 0.9, bild: 0.4 } },
  { id: 'tafeln', gewicht: { bild: 1 } },
  { id: 'runde', gewicht: { spiel: 1 } },
  { id: 'rohdaten', gewicht: { system: 1 }, ab: 'system' },
  { id: 'zeitstrahl', gewicht: { welt: 0.7, schreiben: 0.3 } },
  { id: 'entdeckungen', gewicht: { system: 0.6, welt: 0.5 }, ab: 'standard' },
  { id: 'spiegel', gewicht: { schreiben: 0.6 }, ab: 'tief' },
  { id: 'lose', gewicht: { bild: 0.6, welt: 0.3 } },
  { id: 'werkbank', gewicht: { bild: 0.5, system: 0.4 }, ab: 'tief' },
  { id: 'register', gewicht: { welt: 0.4, system: 0.3 } },
  { id: 'druck', gewicht: { bild: 0.5, welt: 0.4 } },
];
const alle = (g) => [...g.vorn, ...g.weiter].map((w) => w.id).sort();
const namen = (g) => g.vorn.map((w) => w.id);

/* --------------------------------------------- 1. Es geht nie etwas verloren */

for (const a of P.ABSICHTEN) {
  const prof = P.profilAus(a.id);
  const g = P.ordne(W, prof);
  p(`1 „${a.name}" verliert nichts`, alle(g), W.map((w) => w.id).sort());
}
/* Auch mit Sonderwuenschen auf beiden Seiten. */
const eigen = { ...P.profilAus('erzaehlen'), dazu: ['runde'], weg: ['roman'] };
p('  auch mit dazu und weg', alle(P.ordne(W, eigen)), W.map((w) => w.id).sort());
p('  nichts steht doppelt',
  P.ordne(W, eigen).vorn.filter((w) => P.ordne(W, eigen).weiter.some((x) => x.id === w.id)), []);

/* ------------------------------------- 2. Die Absicht verschiebt tatsaechlich */

/*
 * Jede Absicht in ihrer *eigenen* Tiefe – so, wie sie beim Anlegen entsteht.
 * Alle auf „Standard" zu zwingen misst eine Lage, die es nie gibt: „Entwerfen"
 * kommt mit „System", und ohne die stehen die Rohdaten zu Recht hinten.
 */
const vorn = (id) => namen(P.ordne(W, P.profilAus(id)));
wahr('2 Erzählen holt den Roman nach vorn', vorn('erzaehlen')[0] === 'roman');
wahr('  Artbook die Tafeln', vorn('zeigen')[0] === 'tafeln');
wahr('  Spielen die Runde', vorn('spiel')[0] === 'runde');
wahr('  Welt die Karte', vorn('welt')[0] === 'karte');
wahr('  Entwerfen die Rohdaten', vorn('entwerfen')[0] === 'rohdaten');
/* Und was nicht gemeint ist, steht auch nicht vorn. */
wahr('  Artbook zeigt die Runde nicht vorn', !vorn('zeigen').includes('runde'));
wahr('  Erzählen zeigt die Rohdaten nicht vorn', !vorn('erzaehlen').includes('rohdaten'));

/* ------------------------------------------------ 3. Die Tiefe oeffnet stufig */

const zahl = (t) => P.ordne(W, { ...P.profilAus('welt'), tiefe: t }).vorn.length;
wahr('3 Sanft zeigt am wenigsten', zahl('sanft') < zahl('standard'));
wahr('  Standard weniger als Tief', zahl('standard') < zahl('tief'));
wahr('  System zeigt alles', zahl('system') === W.length);
p('  bei System bleibt nichts hinten', P.ordne(W, { ...P.profilAus('welt'), tiefe: 'system' }).weiter, []);

/* „ab" haelt zurueck, auch wenn das Gewicht traegt. */
const sanftEntwurf = P.ordne(W, { ...P.profilAus('entwerfen'), tiefe: 'sanft' });
wahr('  Rohdaten bleiben bei Sanft hinten', !namen(sanftEntwurf).includes('rohdaten'));
wahr('  sind aber erreichbar', sanftEntwurf.weiter.some((w) => w.id === 'rohdaten'));

/* ------------------------------------ 4. Die ausdrueckliche Wahl schlaegt alles */

const dazu = P.ordne(W, { ...P.profilAus('zeigen'), dazu: ['rohdaten'] });
wahr('4 Dazugeholtes steht vorn, auch gegen Absicht und Tiefe',
  namen(dazu).includes('rohdaten'));
const weggelegt = P.ordne(W, { ...P.profilAus('zeigen'), weg: ['tafeln'] });
wahr('  Weggelegtes steht hinten, auch wenn es am schwersten wiegt',
  !namen(weggelegt).includes('tafeln'));
wahr('  und ist trotzdem da', weggelegt.weiter.some((w) => w.id === 'tafeln'));

/* --------------------------------------------------- 5. Die Reihenfolge haelt */

const a1 = P.ordne(W, P.profilAus('welt'));
const a2 = P.ordne(W, P.profilAus('welt'));
p('5 zweimal dasselbe Profil, dieselbe Ordnung', namen(a1), namen(a2));
/*
 * Die richtige Zusicherung, und sie ist schwaecher als die erste, die hier
 * stand.
 *
 * „Vorn und Hinten aneinandergehaengt ergibt immer dieselbe Folge" ist falsch
 * und muss es sein: Eine Stufe wie »ab: system« verschiebt einen Eintrag ueber
 * die Falte, und damit aendert sich die Verkettung zwangslaeufig.
 *
 * Was wirklich gilt und was man auch sieht: *Jede* der beiden Listen liest
 * sich in der Reihenfolge des Ganzen. Beim Aufklappen sortiert sich nichts um,
 * und was einmal unter etwas anderem stand, steht dort wieder.
 */
const global = P.ordne(W, { ...P.profilAus('welt'), tiefe: 'system' }).vorn.map((w) => w.id);
const teilfolge = (liste) => {
  let i = -1;
  return liste.every((id) => { const j = global.indexOf(id); const gut = j > i; i = j; return gut; });
};
for (const t of ['sanft', 'standard', 'tief', 'system']) {
  const g = P.ordne(W, { ...P.profilAus('welt'), tiefe: t });
  wahr(`  bei „${t}" liest sich Vorn in der Folge des Ganzen`, teilfolge(namen(g)));
  wahr(`  und Weiter ebenso`, teilfolge(g.weiter.map((w) => w.id)));
}

/* ---------------------------------------------- 6. Alte Bücher bleiben sanft */

p('6 der alte Erzähler wird zur Geschichte', P.profilAusAltemWeg('erzaehler').absicht, 'erzaehlen');
p('  der Weltenbauer zur Welt', P.profilAusAltemWeg('weltenbauer').absicht, 'welt');
p('  der Spielleiter zum Spiel', P.profilAusAltemWeg('spielleiter').absicht, 'spiel');
p('  der Traumweber bleibt offen', P.profilAusAltemWeg('traumweber').absicht, 'frei');
p('  der Chronist wird zur Welt', P.profilAusAltemWeg('chronist').absicht, 'welt');
for (const w of ['erzaehler', 'weltenbauer', 'spielleiter', 'traumweber', 'chronist']) {
  p(`  „${w}" bleibt sanft`, P.profilAusAltemWeg(w).tiefe, 'sanft');
}
p('  ohne Weg die Vorgabe', P.profilAusAltemWeg(undefined), P.PROFIL_VORGABE);
p('  ein unbekannter Weg ebenso', P.profilAusAltemWeg('astronaut'), P.PROFIL_VORGABE);

/* ------------------------------------------------ 7. Nichts bringt es zu Fall */

p('7 kein Profil, kein Weg', P.profilVon(undefined), P.PROFIL_VORGABE);
p('  leeres Buch', P.profilVon({}), P.PROFIL_VORGABE);
p('  Unsinn im Feld', P.profilVon({ profil: 'kaputt' }), P.PROFIL_VORGABE);
p('  halbes Profil bekommt die Vorgaben seiner Absicht',
  P.profilVon({ profil: { absicht: 'spiel' } }),
  { absicht: 'spiel', tiefe: 'tief', anmutung: 'buch', dazu: [], weg: [] });
p('  unbekannte Absicht fällt zurück',
  P.profilVon({ profil: { absicht: 'raumfahrt' }, weg: 'spielleiter' }).absicht, 'spiel');
p('  unbekannte Tiefe fällt auf die der Absicht',
  P.profilVon({ profil: { absicht: 'erzaehlen', tiefe: 'ultra' } }).tiefe, 'sanft');
p('  Zahlen in dazu fliegen raus',
  P.profilVon({ profil: { absicht: 'welt', dazu: ['roman', 7, null] } }).dazu, ['roman']);
p('  ein gesetztes Profil schlägt den alten Weg',
  P.profilVon({ profil: { absicht: 'zeigen' }, weg: 'spielleiter' }).absicht, 'zeigen');

/* ------------------------------------- 8. Der Wechsel verliert keine Entscheidung */

const vorher = { ...P.profilAus('erzaehlen'), dazu: ['runde'], weg: ['tafeln'] };
const nachher = P.profilAus('entwerfen', vorher);
p('8 Dazugeholtes überlebt den Wechsel', nachher.dazu, ['runde']);
p('  Weggelegtes ebenso', nachher.weg, ['tafeln']);
p('  die Tiefe folgt der neuen Absicht', nachher.tiefe, 'system');

/* --------------------------------------------------------- 9. Kleinkram */

p('9 sechs Absichten', P.ABSICHTEN.length, 6);
wahr('  jede hat alle fünf Schwerpunkte',
  P.ABSICHTEN.every((a) => P.SCHWERPUNKTE.every((s) => typeof a.schwerpunkte[s] === 'number')));
wahr('  keiner über 1 oder unter 0',
  P.ABSICHTEN.every((a) => P.SCHWERPUNKTE.every((s) => a.schwerpunkte[s] >= 0 && a.schwerpunkte[s] <= 1)));
wahr('  jede Absicht hat einen deutlichen Schwerpunkt',
  P.ABSICHTEN.filter((a) => a.id !== 'frei').every((a) => Math.max(...P.SCHWERPUNKTE.map((s) => a.schwerpunkte[s])) === 1));
p('  Innereien nur bei System', P.ABSICHTEN.map((a) => P.zeigtInnereien(P.profilAus(a.id))),
  [false, false, false, true, false, false]);
p('  leere Liste bleibt leer', P.ordne([], P.PROFIL_VORGABE), { vorn: [], weiter: [] });

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
