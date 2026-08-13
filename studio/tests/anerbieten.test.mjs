/*
 * Das Anerbieten.
 *
 * Die Zusicherungen hier sind fast alle Verneinungen, und das ist richtig so:
 * Bei einem System, das ungefragt sprechen darf, ist nicht interessant, ob es
 * spricht – sondern ob es schweigt, wenn es soll. „Schweigen > unnoetiges
 * Anerbieten" laesst sich pruefen, und hier wird es geprueft.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
for (const [n, f] of [['ab','anerbieten'],['gd','gedaechtnis'],['bo','beobachtung'],['rl','relevanz'],['bt','beobachter']])
  execSync(`npx esbuild src/lib/anerbieten/${f}.ts --bundle --format=esm --outfile=${S}/t/an-${n}.mjs`, { stdio: 'pipe' });
const A = await import(S + '/t/an-ab.mjs');
const G = await import(S + '/t/an-gd.mjs');
const B = await import(S + '/t/an-bo.mjs');
const R = await import(S + '/t/an-rl.mjs');
const T = await import(S + '/t/an-bt.mjs');

let ok = 0, bad = 0;
const p = (n, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else { bad++; console.log('FEHLER', n, '\n  ist :', JSON.stringify(ist), '\n  soll:', JSON.stringify(soll)); }
};
const wahr = (n, b) => p(n, !!b, true);

const JETZT = 1_700_000_000_000;
const TAG = 24 * 60 * 60 * 1000;

const beob = (o = {}) => ({
  id: 'b1', art: 'figur:spiegel', betrifft: 'e1', natur: 'schoepferisch',
  stand: 'beobachtung', text: 'Etwas ist entstanden.',
  belege: [{ entryId: 'e2', warum: 'lebt in Mooshalde' }, { entryId: 'e3', warum: 'war bei Arven' }],
  zuversicht: 0.9, ...o,
});
const ruhig = (o = {}) => ({ beschaeftigt: false, verweildauer: 9000, umfang: 40, ...o });

/* ----------------------------------------- 1. Ohne Beleg kein Wort */

wahr('1 mit Belegen tragfähig', B.tragfaehig(beob()));
wahr('  ohne Beleg nicht', !B.tragfaehig(beob({ belege: [] })));
wahr('  ohne Text nicht', !B.tragfaehig(beob({ text: '  ' })));
wahr('  als Kanon nie', !B.tragfaehig(beob({ stand: 'kanon' })));
p('  und nichts davon wird angeboten',
  A.waehle([beob({ belege: [] }), beob({ id: 'b2', stand: 'kanon' })], [], ruhig(), JETZT).anerbieten,
  undefined);

/* -------------------------- 2. Das Dragoncore-Gesetz: nie eine Warnung */

/*
 * Die wichtigste Zusicherung des Auftrags. Eine schoepferische Beobachtung
 * darf bei *keiner* Zahl zur Warnung werden – auch nicht bei Zuversicht 1,
 * auch nicht, wenn sie die Seite betrifft, die gerade offen liegt.
 */
let warnungen = 0;
for (let z = 0; z <= 1.0001; z += 0.05) {
  for (const r of [0, 0.3, 0.55, 0.7, 0.9, 1]) {
    if (B.stufeVon(beob({ zuversicht: z }), r) === 'warnung') warnungen++;
  }
}
p('2 Schöpferisches wird nie zur Warnung', warnungen, 0);
p('  Technisches sehr wohl', B.stufeVon(beob({ natur: 'technisch' }), 0.7), 'warnung');
p('  aber nicht bei geringer Relevanz', B.stufeVon(beob({ natur: 'technisch' }), 0.2), 'still');
p('  Schöpferisches erreicht höchstens ein Anerbieten',
  B.stufeVon(beob(), 1), 'anerbieten');

/* --------------------------------------- 3. Beschäftigt heisst beschäftigt */

p('3 beim Schreiben Relevanz null',
  R.relevanz(beob(), [], ruhig({ beschaeftigt: true })), 0);
p('  auch bei einem technischen Befund',
  R.relevanz(beob({ natur: 'technisch', zuversicht: 1 }), [], ruhig({ beschaeftigt: true })), 0);
p('  und daher kein Anerbieten',
  A.waehle([beob({ natur: 'technisch', zuversicht: 1 })], [], ruhig({ beschaeftigt: true }), JETZT),
  { leise: [] });
p('  frisch aufgeschlagen ebenfalls nichts',
  R.relevanz(beob(), [], ruhig({ verweildauer: 500 })), 0);
wahr('  nach der Ruhezeit schon', R.relevanz(beob(), [], ruhig({ verweildauer: R.RUHE_MS + 1 })) > 0);

/* ------------------------------------------- 4. Eine junge Welt schweigt */

p('4 unter zwölf Seiten nichts', R.relevanz(beob(), [], ruhig({ umfang: 5 })), 0);
p('  auch technisch nichts',
  R.relevanz(beob({ natur: 'technisch', zuversicht: 1 }), [], ruhig({ umfang: 5 })), 0);
wahr('  darüber schon', R.relevanz(beob(), [], ruhig({ umfang: R.ZU_JUNG })) > 0);

/* ------------------------------------------------- 5. Das Gedächtnis hält */

const nie = [{ id: 'x', art: 'figur:spiegel', betrifft: 'e1', wann: JETZT - 400 * TAG, antwort: 'nie' }];
wahr('5 „Nicht mehr hierzu" gilt', !G.darfSprechen(nie, beob(), JETZT));
wahr('  auch nach einem Jahr', !G.darfSprechen(nie, beob(), JETZT + 400 * TAG));
wahr('  aber nur für diese Sache', G.darfSprechen(nie, beob({ betrifft: 'e9' }), JETZT));
wahr('  und nur für diese Art', G.darfSprechen(nie, beob({ art: 'werk:muster' }), JETZT));

const spaeter = [{ id: 'x', art: 'figur:spiegel', betrifft: 'e1', wann: JETZT, antwort: 'spaeter' }];
wahr('  „Später" schweigt zunächst', !G.darfSprechen(spaeter, beob(), JETZT + TAG));
wahr('  und meldet sich wieder', G.darfSprechen(spaeter, beob(), JETZT + 4 * TAG));

const geoeffnet = [{ id: 'b1', art: 'figur:spiegel', betrifft: 'e1', wann: JETZT, antwort: 'geoeffnet' }];
wahr('  Geöffnetes kommt nicht zweimal', !G.darfSprechen(geoeffnet, beob(), JETZT + 100 * TAG));

/* „nie" überlebt das Kürzen, alles andere darf verfallen. */
let g = [];
for (let i = 0; i < 500; i++) {
  g = G.merke(g, { id: 'n' + i, art: 'werk:muster', wann: JETZT, antwort: 'weg' }, JETZT);
}
g = G.merke(g, { id: 'ewig', art: 'figur:spiegel', betrifft: 'e1', wann: JETZT, antwort: 'nie' }, JETZT);
wahr('  das Gedächtnis wächst nicht unbegrenzt', g.length <= 210);
wahr('  „nie" bleibt trotzdem stehen', g.some((n) => n.antwort === 'nie'));
wahr('  und wirkt weiter', !G.darfSprechen(g, beob(), JETZT));

/* ------------------------------------------ 6. Wer weghört, hat recht */

const dreimalWeg = [1, 2, 3].map((i) => ({ id: 'w' + i, art: 'figur:spiegel', wann: JETZT, antwort: 'weg' }));
wahr('6 dreimal weggewinkt senkt die Neigung deutlich', G.neigung(dreimalWeg, 'figur:spiegel') < 0.4);
wahr('  Geöffnetes hebt sie', G.neigung([{ id: 'a', art: 'figur:spiegel', wann: JETZT, antwort: 'geoeffnet' }], 'figur:spiegel') > 1);
wahr('  andere Arten bleiben unberührt', G.neigung(dreimalWeg, 'werk:muster') === 1);
const leiser = R.relevanz(beob({ id: 'neu' }), dreimalWeg, ruhig());
const voll = R.relevanz(beob({ id: 'neu' }), [], ruhig());
wahr('  und das schlägt auf die Relevanz durch', leiser < voll * 0.5);

/* --------------------------------------------- 7. Höchstens eines, nie zwei */

const viele = [1, 2, 3, 4, 5].map((i) => beob({ id: 'v' + i, betrifft: 'e' + i, zuversicht: 0.95 }));
const gewaehlt = A.waehle(viele, [], ruhig({ beiEintrag: 'e3' }), JETZT);
wahr('7 höchstens ein Anerbieten', !!gewaehlt.anerbieten);
p('  und nur eines', [gewaehlt.anerbieten].filter(Boolean).length, 1);
p('  das über die offene Seite', gewaehlt.anerbieten.beobachtung.betrifft, 'e3');
wahr('  es steht nicht auch noch leise dabei',
  !gewaehlt.leise.some((b) => b.id === gewaehlt.anerbieten.beobachtung.id));

/*
 * Die offene Seite gewinnt – auch wenn beide oben anstossen.
 *
 * Hier fehlte eine Zusicherung, und der Browser hat es gefunden: Die
 * Relevanz war auf 1 gekappt, also kamen zwei sehr sichere Beobachtungen als
 * 1 und 1 heraus und waren gleich gut. Auf Arins Seite gewann daraufhin eine
 * Beobachtung ueber die ganze Welt, weil sie in der Beobachterliste weiter
 * vorn stand. Der wichtigste Zuschlag des ganzen Systems war wirkungslos.
 */
const weltweit = beob({ id: 'w', art: 'werk:muster', betrifft: undefined, zuversicht: 1,
  belege: [{ entryId: 'e9', warum: 'x' }, { entryId: 'e8', warum: 'y' }, { entryId: 'e7', warum: 'z' }] });
const hier = beob({ id: 'h', betrifft: 'e3', zuversicht: 1 });
wahr('  die offene Seite schlägt das Weltweite',
  A.waehle([weltweit, hier], [], ruhig({ beiEintrag: 'e3' }), JETZT).anerbieten.beobachtung.id === 'h');
wahr('  und umgekehrt, wenn man woanders steht',
  A.waehle([weltweit, hier], [], ruhig({ beiEintrag: 'e9' }), JETZT).anerbieten.beobachtung.id === 'w');

/* Das Tagespensum. */
const zweiHeute = [
  { id: 'h1', art: 'werk:muster', wann: JETZT - 1000, antwort: 'geoeffnet' },
  { id: 'h2', art: 'werk:muster', wann: JETZT - 2000, antwort: 'spaeter' },
];
p('  nach zwei Anerbieten am Tag Ruhe',
  A.waehle(viele, zweiHeute, ruhig(), JETZT).anerbieten, undefined);
wahr('  das leise Zeichen bleibt trotzdem erlaubt',
  A.waehle([beob({ zuversicht: 0.4 })], zweiHeute, ruhig(), JETZT).leise.length === 1);
wahr('  am nächsten Tag wieder',
  !!A.waehle(viele, zweiHeute, ruhig(), JETZT + 2 * TAG).anerbieten);

/* --------------------------------------- 8. Nichts verändert die Welt */

/*
 * Die Probe aufs Exempel: Die Welt wird eingefroren, alle Beobachter laufen,
 * und danach muss sie Zeichen fuer Zeichen dieselbe sein. Analyse und
 * Veraenderung sind getrennt – hier wird es gemessen statt behauptet.
 */
const welt = {
  entries: [
    { id: 'e1', title: 'Arin', type: 'character', description: 'Loyal.', tags: [], status: 'Idee',
      favorite: false, createdAt: 1, updatedAt: 1, linkedEntryIds: [], blocks: [], fields: {},
      subtitle: '', category: '' },
    { id: 'e2', title: 'Mira', type: 'character', description: '', tags: [], status: 'Idee',
      favorite: false, createdAt: 1, updatedAt: 1, linkedEntryIds: [], blocks: [], fields: {},
      subtitle: '', category: '' },
    { id: 'e3', title: 'Mooshalde', type: 'location', description: '', tags: [], status: 'Idee',
      favorite: false, createdAt: 1, updatedAt: 1, linkedEntryIds: [], blocks: [], fields: {},
      subtitle: '', category: '' },
  ],
  relations: [
    { id: 'r1', fromId: 'e1', toId: 'e3', type: 'lives_in', createdAt: 1 },
    { id: 'r2', fromId: 'e2', toId: 'e3', type: 'lives_in', createdAt: 1 },
  ],
};
/*
 * Die Serialisierung vorher und nachher – Zeichen fuer Zeichen.
 *
 * Der zentrale Invariantentest: Es genuegt nicht, dass „ungefaehr nichts"
 * passiert ist. Wenn ein Beobachter irgendwo ein Feld setzt, eine Liste
 * sortiert oder ein Objekt in-place aendert, faellt es hier auf – und nur
 * hier, weil man es sonst erst Wochen spaeter an einer verschobenen
 * Reihenfolge merkt.
 *
 * Bewusst der ganze Bestand und nicht eine Stichprobe: Der teuerste Schaden,
 * den diese Maschine anrichten koennte, ist der leiseste.
 */
const vorher = JSON.stringify(welt);
const gesehen = T.beobachte(welt);
p('8 die Welt ist danach Zeichen für Zeichen dieselbe', JSON.stringify(welt), vorher);

/* Zweimal hintereinander muss dasselbe herauskommen. */
const nochmal = T.beobachte(welt);
p('  und ein zweiter Durchlauf sieht dasselbe',
  nochmal.map((b) => b.id).sort(), gesehen.map((b) => b.id).sort());
p('  auch danach unverändert', JSON.stringify(welt), vorher);
wahr('  und es wurde trotzdem etwas gesehen', Array.isArray(gesehen));
wahr('  jede Beobachtung trägt Belege', gesehen.every((b) => b.belege.length > 0));
wahr('  keine ist Kanon', gesehen.every((b) => b.stand !== 'kanon'));
wahr('  jede nennt ihre Art', gesehen.every((b) => typeof b.art === 'string' && b.art));
wahr('  Zuversicht liegt zwischen 0 und 1',
  gesehen.every((b) => b.zuversicht >= 0 && b.zuversicht <= 1));

/* Ein Beobachter, der stolpert, nimmt die anderen nicht mit. */
const kaputt = { entries: null, relations: null };
let geflogen = false;
try { T.beobachte(kaputt); } catch { geflogen = true; }
p('  eine kaputte Welt bringt nichts zum Absturz', geflogen, false);

/* ------------------------------------------------ 9. Drei Beobachter */

p('9 drei Beobachter', T.BEOBACHTER.map((b) => b.art), ['weltstruktur', 'werk', 'figur']);
wahr('  jeder erklärt sich', T.BEOBACHTER.every((b) => b.beschreibung.length > 20));
p('  leere Welt, keine Beobachtung', T.beobachte({ entries: [], relations: [] }), []);

/* -------------------------- 9b. Das Gesetz an echten Weltregeln geprueft */

/*
 * Der Test oben prueft das Gesetz an *erfundenen* Beobachtungen. Das genuegt
 * nicht: Zwei Fehler steckten in der Uebersetzung der echten Weltregeln, und
 * beide waren still.
 *
 * Die Menge technischer Regeln nannte `zeitregeln` – so heisst die Variable,
 * die Regel heisst `zeit`. Sie traf also nie zu, und nichts haette je eine
 * Warnung werden koennen. Ein System, das nie warnt, sieht genauso aus wie
 * eines, das zurueckhaltend ist.
 *
 * Und dieselbe Regel meldet beides: „endet vor seinem Anfang" – das kann
 * niemand gemeint haben – und „traegt noch keine Zeit", was der Normalzustand
 * ist. Ohne die zweite Bedingung waere jede undatierte Seite eine Warnung
 * geworden.
 */
const w2 = (extra) => ({
  entries: [
    e2('a', 'Arven', 'event', extra),
    e2('b', 'Mooshalde', 'location'),
    e2('c', 'Elian', 'character'),
  ],
  relations: [{ id: 'r', fromId: 'c', toId: 'b', type: 'lives_in', createdAt: 1 }],
});
function e2(id, title, type, o = {}) {
  return { id, title, type, description: '', tags: [], status: 'Idee', favorite: false,
    createdAt: 1, updatedAt: 1, linkedEntryIds: [], blocks: [], fields: {}, subtitle: '',
    category: '', ...o };
}
const verdreht = T.beobachte(w2({ beginn: '1090', ende: '1044' }));
const technisch = verdreht.filter((b) => b.natur === 'technisch');
wahr('9b ein Ende vor dem Anfang ist technisch', technisch.length >= 1);
wahr('  und erreicht damit die Warnung',
  technisch.some((b) => B.stufeVon(b, 0.7) === 'warnung'));

const ohneDatum = T.beobachte(w2({}));
p('  eine bloß undatierte Welt ist es nicht',
  ohneDatum.filter((b) => b.natur === 'technisch').map((b) => b.text), []);
wahr('  meldet aber trotzdem etwas', ohneDatum.length > 0);
p('  und nichts davon kann warnen',
  ohneDatum.filter((b) => B.stufeVon(b, 1) === 'warnung'), []);

/* -------------------------------------- 10. Die Sprache verrät nichts */

/*
 * Kein „analysiert", kein „basierend auf", kein „KI". Geprueft an allem, was
 * die Beobachter tatsaechlich ausgeben – nicht an einer Wunschliste.
 */
const verboten = /\b(analysiert|basierend auf|KI-|Optimierung|empfohlen|Score|Confidence|Error|Fehler:)/i;
const schlimm = gesehen.filter((b) => verboten.test(b.text));
p('10 keine Maschinensprache in den Texten', schlimm.map((b) => b.text), []);

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
