/*
 * Die Tiefenkarte – Bedeutung gehört der Seite.
 *
 * Diese Datei hat schon zweimal etwas anderes geprüft, und die Geschichte
 * gehört dazu, weil sie zeigt, wie ein Fehler sich als Fortschritt tarnt:
 *
 *   Fassung 1  Die vier Richtungen bedeuteten überall dasselbe. Ein globales
 *              Menü mit Gesten statt Knöpfen.
 *   Fassung 2  Die Bedeutung hing an Arbeitsraumklassen – Buch, Welt,
 *              Charakter, Roman, Artbook. Fühlte sich richtig an und war
 *              derselbe Fehler in fünffacher Ausfertigung: immer noch eine
 *              Tabelle im Programm.
 *   Jetzt      Die sichtbare Seite meldet ihre Karte an. Das Programm nimmt
 *              sie entgegen und weiß nicht, wie sie zustande kam.
 *
 * Und die Zusicherung, die zwischen Fassung 2 und jetzt **umgedreht** wurde:
 * „jede Richtung führt überall mindestens eine Ebene weit" – begründet damit,
 * dass eine fehlende Tür schlimmer sei als eine kleine. Das Argument
 * unterschlägt den Preis: Eine Richtung offenzuhalten, in der es nichts gibt,
 * heißt dort etwas zu *erfinden*. Jetzt gilt das Gegenteil, und es wird
 * geprüft.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
for (const [aus, ein] of [
  ['w-karte', 'src/lib/raum/tiefenkarte.ts'],
  ['w-vorlagen', 'src/lib/raum/tiefenvorlagen.ts'],
  ['w-geste', 'src/lib/raum/geste.ts'],
  ['w-konfig', 'src/lib/raum/konfig.ts'],
  ['w-flaeche', 'src/lib/raum/flaeche.ts'],
  ['w-figur', 'src/lib/raum/figurkarte.ts'],
])
  execSync(`npx esbuild ${ein} --bundle --format=esm --outfile=${S}/t/${aus}.mjs`, { stdio: 'pipe' });
const T = await import(S + '/t/w-karte.mjs');
const V = await import(S + '/t/w-vorlagen.mjs');
const G = await import(S + '/t/w-geste.mjs');
const K = await import(S + '/t/w-konfig.mjs');
const F = await import(S + '/t/w-flaeche.mjs');
const FK = await import(S + '/t/w-figur.mjs');

let ok = 0,
  bad = 0;
const p = (n, ist, soll) => {
  if (JSON.stringify(ist) === JSON.stringify(soll)) ok++;
  else {
    bad++;
    console.log('FEHLER', n, '\n  ist :', JSON.stringify(ist), '\n  soll:', JSON.stringify(soll));
  }
};
const wahr = (n, b) => p(n, !!b, true);

const k = K.VORGABE;
const RICHTUNGEN = ['links', 'rechts', 'oben', 'unten'];
/* Die Inhalte, die es zu zeigen gibt. Mehr darf keine Karte nennen. */
const INHALTE = ['wesen', 'zusammenhang', 'geflecht', 'welt', 'wissen', 'notizen'];

const mitte = { ort: 'mitte', tiefe: 0 };

/* ------------------------------------------- Eine Karte darf Lücken haben - */

console.log('\n1 Nicht jede Seite hat vier Richtungen');

{
  /* Eine Seite mit genau einer sinnvollen Richtung. Das ist eine vollständige
   * Karte, keine halbe. */
  const einfach = T.karte({
    rechts: T.weg('Beteiligte', 'Wer dabei ist', 'Wer dabei war', 'wesen'),
  });
  p('  sie bietet genau eine Richtung an', T.richtungen(einfach), ['rechts']);
  wahr('  dort führt sie hin', T.hatRichtung(einfach, 'rechts'));
  wahr('  und sonst nirgends', !T.hatRichtung(einfach, 'links'));
  p('  eine leere Richtung hat Reichweite null', T.reichweite(einfach, 'oben'), 0);

  /*
   * **Die Kernzusicherung dieser Datei.**
   *
   * Eine Richtung ohne Bedeutung öffnet nichts. Nicht „öffnet etwas
   * Naheliegendes", nicht „öffnet eine leere Liste" – nichts. Stünde hier das
   * Gegenteil, wäre jede weitere Prüfung Kosmetik.
   */
  wahr('  eine unbelegte Richtung öffnet nichts', !T.gesteErlaubt(einfach, mitte, 'links'));
  wahr('  eine belegte schon', T.gesteErlaubt(einfach, mitte, 'rechts'));

  /* Und die leere Karte ist gültig: eine Seite ganz ohne Umgebung. */
  p('  die leere Karte bietet nichts an', T.richtungen(T.OHNE_TIEFE), []);
  for (const r of RICHTUNGEN)
    wahr(`  aus ihr führt ${r} nirgendwohin`, !T.gesteErlaubt(T.OHNE_TIEFE, mitte, r));
}

/*
 * Der Bauhelfer wirft leere Wege heraus.
 *
 * Damit muss `hatRichtung` nie zwischen „gibt es nicht" und „gibt es, ist
 * aber leer" unterscheiden – zwei Zustände für dieselbe Sache wären genau die
 * Art Unterschied, den man drei Monate später falsch abfragt.
 */
{
  const mitLeerem = T.karte({
    rechts: { name: 'Nichts', was: 'leer', stufen: [] },
    unten: T.weg('Notizen', 'Gedanken', 'Was notiert wurde', 'notizen'),
  });
  p('  ein Weg ohne Stufen kommt gar nicht erst hinein', T.richtungen(mitLeerem), ['unten']);
  p('  eine nicht genannte Richtung auch nicht', mitLeerem.oben, undefined);
}

/* --------------------------------------------- Die Grammatik bleibt ------ */

console.log('\n2 Was in jeder Karte gleich bleibt');

{
  const tief = T.karte({
    rechts: T.tieferWeg('Beziehungen', 'Wer dazugehört', [
      { titel: 'Wer nahesteht', raum: 'wesen' },
      { titel: 'Wie sie zusammenhängen', raum: 'zusammenhang' },
      { titel: 'Das ganze Geflecht', raum: 'geflecht' },
    ]),
    unten: T.weg('Notizen', 'Gedanken', 'Was notiert wurde', 'notizen'),
  });

  p('  aus der Mitte führt rechts in die erste Tiefe',
    G.naechsterStand(mitte, 'rechts', k, T.reichweite(tief, 'rechts')), { ort: 'rechts', tiefe: 1 });

  /* Tiefer geht es genau bis zum Ende des Weges – nie weiter. */
  let stand = mitte;
  for (let i = 0; i < 6; i++) stand = G.naechsterStand(stand, 'rechts', k, T.reichweite(tief, 'rechts'));
  p('  und endet bei der dritten Stufe', stand, { ort: 'rechts', tiefe: 3 });
  wahr('  ab dort geht es nicht weiter', !T.gesteErlaubt(tief, { ort: 'rechts', tiefe: 3 }, 'rechts'));
  wahr('  eine Stufe davor schon', T.gesteErlaubt(tief, { ort: 'rechts', tiefe: 2 }, 'rechts'));

  /* Ein Weg mit einer Stufe endet nach einer Stufe. */
  wahr('  ein einstufiger Weg endet nach der ersten', !T.gesteErlaubt(tief, { ort: 'unten', tiefe: 1 }, 'unten'));

  /*
   * **Der Weg zurück hängt an keiner Karte.**
   *
   * Ohne diese Ausnahme könnte ein Seitenwechsel jemanden in einer Tiefe
   * einsperren: Die neue Seite kennt die Richtung nicht, in der er steht, und
   * plötzlich führt auch die Gegenrichtung nirgendwohin. Der Doppeltipp wäre
   * dann die einzige Rettung – und eine Bedienung, die eine Rettung braucht,
   * ist kaputt.
   */
  for (const r of RICHTUNGEN)
    wahr(
      `  aus ${r} führt die Gegenrichtung immer zurück`,
      T.gesteErlaubt(T.OHNE_TIEFE, { ort: r, tiefe: 1 }, G.GEGEN[r]),
    );
  p('  und landet in der Mitte',
    G.naechsterStand({ ort: 'rechts', tiefe: 1 }, 'links', k, 0), mitte);

  /* Quer aus der Tiefe bleibt weiterhin stehen – die Regel gegen Verirren. */
  p('  quer aus der Tiefe bleibt stehen',
    G.naechsterStand({ ort: 'rechts', tiefe: 2 }, 'oben', k, 3), { ort: 'rechts', tiefe: 2 });
}

/* ------------------------------------------------------- Die Stufen ------ */

console.log('\n3 Welche Stufe wo liegt');

{
  const w = T.karte({
    rechts: T.tieferWeg('Beziehungen', 'Wer dazugehört', [
      { titel: 'Erste', raum: 'wesen' },
      { titel: 'Zweite', raum: 'zusammenhang' },
    ]),
  });
  p('  Stufe 1', T.stufe(w, 'rechts', 1).titel, 'Erste');
  p('  Stufe 2', T.stufe(w, 'rechts', 2).titel, 'Zweite');
  /* Über das Ende hinaus: die letzte, nicht `undefined`. Letzte Verteidigung. */
  p('  über das Ende hinaus die letzte', T.stufe(w, 'rechts', 9).titel, 'Zweite');
  p('  unterhalb der ersten die erste', T.stufe(w, 'rechts', 0).titel, 'Erste');
  p('  in einer leeren Richtung gar nichts', T.stufe(w, 'links', 1), undefined);
}

/* --------------------------------------------------- Die Rückfallkarten -- */

console.log('\n4 Die Rückfallkarten – ausdrücklich das Zweitbeste');

for (const [name, karte] of [
  ['Figur', V.karteFuerEintrag('character')],
  ['Ort', V.karteFuerEintrag('location')],
  ['Gegenstand', V.karteFuerEintrag('item')],
  ['Buchseite', V.karteFuerBuchseite()],
]) {
  for (const r of T.richtungen(karte)) {
    const w = karte[r];
    wahr(`  ${name}/${r} hat einen Namen`, w.name.length > 0);
    wahr(`  ${name}/${r} hat eine Zeile dazu`, w.was.length > 0);
    wahr(`  ${name}/${r} bleibt unter der höchsten Tiefe`, w.stufen.length <= k.geste.hoechsteTiefe);
    for (const st of w.stufen) {
      /* Der Fehler, der in diesem Projekt schon einmal zwei Räume still leer ließ. */
      wahr(`  ${name}/${r}: „${st.raum}" ist ein Inhalt, den es gibt`, INHALTE.includes(st.raum));
      wahr(`  ${name}/${r}: „${st.titel}" ist eine Überschrift`, st.titel.length > 0);
    }
  }
}

/*
 * Die Rückfallkarten sind nicht alle gleich – sonst wäre die ganze Änderung
 * eine kompliziertere Fassung von vorher.
 */
{
  const abdruck = (karte) => T.richtungen(karte).map((r) => `${r}${T.reichweite(karte, r)}`).join('|');
  const alle = [
    abdruck(V.karteFuerEintrag('character')),
    abdruck(V.karteFuerEintrag('location')),
    abdruck(V.karteFuerEintrag('item')),
    abdruck(V.karteFuerBuchseite()),
  ];
  wahr('  sie unterscheiden sich', new Set(alle).size > 1);
}

/*
 * **Und mindestens eine lässt Richtungen frei.**
 *
 * Das ist die Zusicherung gegen den Rückfall in die alte Gewohnheit: Solange
 * irgendeine Vorlage vier Richtungen füllt, weil vier schöner aussieht als
 * zwei, ist die Regel „nichts erfinden" nur eine Absicht.
 */
{
  const gegenstand = V.karteFuerEintrag('item');
  wahr('  ein Gegenstand bekommt weniger als vier Richtungen', T.richtungen(gegenstand).length < 4);
  wahr('  aber mindestens eine', T.richtungen(gegenstand).length >= 1);
}

/* Die Figur ist die reichste – dort liegt das ganze Geflecht. */
{
  const figur = V.karteFuerEintrag('character');
  wahr('  eine Figur führt rechts am weitesten', T.reichweite(figur, 'rechts') === 3);
  wahr('  und dort liegt das Geflecht',
    figur.rechts.stufen.some((s) => s.raum === 'geflecht'));
}

/* Ein Ort bekommt seine Umgebung, keine Beziehungen als tiefsten Weg. */
{
  const ort = V.karteFuerEintrag('location');
  wahr('  ein Ort führt links in die Umgebung', T.reichweite(ort, 'links') >= 1);
  wahr('  und nicht bis ins ganze Geflecht',
    !Object.values(ort).some((w) => w.stufen.some((s) => s.raum === 'geflecht')));
}

/* Und der Pfad entscheidet nur, welcher Rückfall gilt – mehr nicht. */
p('  ein Eintrag mit einer Figur', T.richtungen(V.standardkarte('/eintrag/e1', 'character')),
  T.richtungen(V.karteFuerEintrag('character')));
p('  eine gewöhnliche Buchseite', T.richtungen(V.standardkarte('/inhalt')),
  T.richtungen(V.karteFuerBuchseite()));

/* -------------------------------------------------- Die Oberfläche ------- */

console.log('\n5 Wann die Oberfläche zurücktritt');

const lage = (teil) => ({ tiefe: 0, phase: 'ruhe', beruehrt: false, seitMs: 0, ...teil });

p('  frisch berührt: Arbeit', F.flaechenzustand(lage({ seitMs: 100 }), k), 'arbeit');
p('  lange nichts: Ruhe', F.flaechenzustand(lage({ seitMs: 99999 }), k), 'ruhe');
p('  ein Finger liegt auf: Berührung', F.flaechenzustand(lage({ seitMs: 99999, beruehrt: true }), k), 'beruehrung');
p('  in der Tiefe: Tiefe', F.flaechenzustand(lage({ seitMs: 99999, tiefe: 2 }), k), 'tiefe');
p('  auf dem Heimweg: Heimkehr', F.flaechenzustand(lage({ phase: 'heimkehrend' }), k), 'heimkehr');

/*
 * Die beiden Fälle, die man beim Danebensitzen nie erwischt, weil sie
 * Zeitfenster von wenigen hundert Millisekunden sind.
 */
p('  während einer laufenden Geste tritt nichts zurück',
  F.flaechenzustand(lage({ seitMs: 99999, phase: 'verpflichtend' }), k), 'arbeit');
p('  die Heimkehr schlägt auch die Tiefe',
  F.flaechenzustand(lage({ tiefe: 3, phase: 'heimkehrend' }), k), 'heimkehr');
p('  die Tiefe schlägt die Berührung',
  F.flaechenzustand(lage({ tiefe: 1, beruehrt: true }), k), 'tiefe');

console.log('\n6 Nichts verschwindet ganz');

for (const z of ['ruhe', 'beruehrung', 'arbeit', 'tiefe', 'heimkehr'])
  wahr(`  ${z} bleibt sichtbar`, F.deutlichkeit(z, k) >= 0.12);

{
  const null_ = { ...k, flaeche: { ...k.flaeche, ruheDeckkraft: 0 } };
  wahr('  auch mit dem Regler auf null',
    F.deutlichkeit('ruhe', null_) >= 0.12 && F.deutlichkeit('tiefe', null_) >= 0.12);
}

p('  bei der Arbeit steht alles voll da', F.deutlichkeit('arbeit', k), 1);
wahr('  in Ruhe weniger als bei Berührung', F.deutlichkeit('ruhe', k) < F.deutlichkeit('beruehrung', k));
wahr('  bei Berührung weniger als bei Arbeit', F.deutlichkeit('beruehrung', k) < F.deutlichkeit('arbeit', k));
wahr('  Beruhigen dauert länger als Erscheinen', F.uebergangMs('ruhe', k) > F.uebergangMs('arbeit', k));

/* ======================================================================== */

console.log('\n7 Die Wahl – wo eine Geste allein nicht weiterkommt');

/*
 * Der Weg aus dem Auftrag zur Charakterseite:
 *
 *     Vaelorian → Beziehungen → Miraelys → gemeinsame Geschichte
 *
 * Der dritte Schritt hat ein anderes Subjekt als der zweite, und welches,
 * kann keine Karte im Voraus wissen. Eine Geste kennt eine Richtung, keine
 * Person. Also verlangt die erste Stufe eine Wahl – und ohne sie führt der
 * Weg nicht weiter. Das ist dieselbe Regel wie bei einer fehlenden Richtung:
 * nichts erfinden.
 */
const dreiweg = T.karte({
  rechts: T.tieferWeg('Beziehungen', 'Verbündete · Konflikte', [
    { titel: 'Wer ihr nahesteht', raum: 'beziehungen', wahl: 'noetig' },
    { titel: 'Diese Verbindung', raum: 'beziehung' },
    { titel: 'Gemeinsame Geschichte', raum: 'gemeinsameGeschichte' },
  ]),
});

p('7 gebaut ist der Weg drei Ebenen lang', T.reichweite(dreiweg, 'rechts'), 3);
p('  begehbar ist er ohne Wahl nur eine', T.begehbar(dreiweg, 'rechts', []), 1);
p('  mit einer Wahl bis zum Ende', T.begehbar(dreiweg, 'rechts', ['e_mir']), 3);

/*
 * Der Unterschied ist keine Feinheit: „Tiefe 1 von 3" ist eine Lüge, solange
 * niemand gewählt hat. Wer die Zahl trotzdem zeigt, verspricht einen Weg, den
 * die Geste gleich verweigert – und dann sieht es aus, als sei die Bedienung
 * kaputt.
 */
wahr('  aus der Mitte führt rechts hinein', T.gesteErlaubt(dreiweg, { ort: 'mitte', tiefe: 0 }, 'rechts', []));
wahr(
  '  ohne Wahl führt sie nicht weiter',
  !T.gesteErlaubt(dreiweg, { ort: 'rechts', tiefe: 1 }, 'rechts', []),
);
wahr(
  '  mit Wahl schon',
  T.gesteErlaubt(dreiweg, { ort: 'rechts', tiefe: 1 }, 'rechts', ['e_mir']),
);
wahr(
  '  von Ebene zwei weiter, ohne neue Wahl',
  T.gesteErlaubt(dreiweg, { ort: 'rechts', tiefe: 2 }, 'rechts', ['e_mir']),
);
wahr(
  '  am Ende ist Schluss',
  !T.gesteErlaubt(dreiweg, { ort: 'rechts', tiefe: 3 }, 'rechts', ['e_mir']),
);

/* Der Weg zurück hängt an keiner Wahl – sonst sperrte eine fehlende Wahl ein. */
wahr(
  '  heraus geht es immer',
  T.gesteErlaubt(dreiweg, { ort: 'rechts', tiefe: 1 }, 'links', []),
);
wahr('  auch aus der Tiefe ohne Wahl', T.gesteErlaubt(dreiweg, { ort: 'rechts', tiefe: 2 }, 'links', []));

/* Ohne Angabe eines Pfades wird gar nicht nach Wahlen gefragt – Altbestand. */
wahr(
  '  alte Aufrufe ohne Pfad bleiben gültig',
  T.gesteErlaubt(dreiweg, { ort: 'rechts', tiefe: 1 }, 'rechts') === false,
);

p('  wahlOffen sagt, woran es liegt', T.wahlOffen(dreiweg, 'rechts', 1, []), true);
p('  und schweigt, wenn gewählt ist', T.wahlOffen(dreiweg, 'rechts', 1, ['e_mir']), false);
p('  eine Stufe ohne Wahl fragt nie', T.wahlOffen(dreiweg, 'rechts', 2, []), false);

console.log('\n8 Keine feste Obergrenze in der Architektur');

/*
 * Der Auftrag ist hier ausdrücklich: „Nicht hart codieren: depth max = 3."
 * Die Zusicherung dazu baut einen Weg mit sieben Stufen – die Kette aus dem
 * Auftrag – und prüft, dass die Bedienung ihn ganz begeht. Vorher schnitt ein
 * `Math.min(k.geste.hoechsteTiefe, …)` in `naechsterStand` bei drei ab.
 */
const lang = T.karte({
  rechts: T.tieferWeg('Weit', 'sehr weit', [
    { titel: 'Beziehung', raum: 'beziehungen' },
    { titel: 'Person', raum: 'beziehung' },
    { titel: 'Ereignis', raum: 'gemeinsameGeschichte' },
    { titel: 'Ort', raum: 'herkunft' },
    { titel: 'Epoche', raum: 'wissen' },
    { titel: 'Fraktion', raum: 'zusammenhang' },
    { titel: 'Geflecht', raum: 'geflecht' },
  ]),
});
p('8 sieben Stufen sind sieben', T.reichweite(lang, 'rechts'), 7);
wahr('  und die Geste kommt bis zur siebten', T.gesteErlaubt(lang, { ort: 'rechts', tiefe: 6 }, 'rechts', []));
{
  let stand = { ort: 'mitte', tiefe: 0 };
  for (let i = 0; i < 9; i++) stand = G.naechsterStand(stand, 'rechts', K.VORGABE, 7);
  p('  neunmal ziehen endet bei sieben, nicht bei drei', stand, { ort: 'rechts', tiefe: 7 });
}

console.log('\n9 Die Karte einer Figur – nichts erfinden');

const figur = (felder = {}, extra = {}) => ({
  id: 'f', bookId: 'b', title: 'Vaelorian', subtitle: '', type: 'character', category: '',
  description: '', tags: [], status: 'Idee', favorite: false, createdAt: 0, updatedAt: 0,
  linkedEntryIds: [], blocks: [], fields: felder, ...extra,
});
const figurlage = (entry, kanten = []) => ({ entry, kanten, kennt: () => true });

p(
  '9 eine leere Figur hat keine Umgebung',
  T.richtungen(FK.figurkarte(figurlage(figur()))),
  [],
);
p(
  '  ein Satz Text öffnet oben',
  T.richtungen(FK.figurkarte(figurlage(figur({}, { description: 'Er kam aus dem Norden.' })))),
  ['oben'],
);
p(
  '  eine Verwandte öffnet rechts',
  T.richtungen(
    FK.figurkarte(figurlage(figur(), [{ relation: { type: 'related' }, otherId: 'x' }])),
  ),
  ['rechts'],
);
p(
  '  ein Schwert öffnet unten und nicht rechts',
  T.richtungen(FK.figurkarte(figurlage(figur(), [{ relation: { type: 'owns' }, otherId: 'x' }]))),
  ['unten'],
);
p(
  '  ein Wohnort öffnet links',
  T.richtungen(FK.figurkarte(figurlage(figur(), [{ relation: { type: 'lives_in' }, otherId: 'x' }]))),
  ['links'],
);

/*
 * Die Probe, die den Sinn der Trennung zeigt: Dieselbe Kantentabelle, drei
 * verschiedene Fragen. Ein Ort ist keine Beziehung, ein Schwert ist keine
 * Person – und trotzdem steht alles in derselben Tabelle.
 */
{
  const kanten = [
    { relation: { type: 'related' }, otherId: 'a' },
    { relation: { type: 'lives_in' }, otherId: 'b' },
    { relation: { type: 'owns' }, otherId: 'c' },
  ];
  const l = figurlage(figur(), kanten);
  p('  Beziehungen zählen nur Wesen', FK.beziehungenVon(l).length, 1);
  p('  Herkunft zählt nur Orte', FK.herkunftVon(l).length, 1);
  p('  Fundstücke zählen nur Dinge', FK.fundstueckeVon(l).length, 1);
}

/* Eine Kante auf eine Seite, die es nicht gibt, zählt nicht. */
p(
  '  eine Kante ins Leere öffnet nichts',
  T.richtungen(
    FK.figurkarte({
      entry: figur(),
      kanten: [{ relation: { type: 'related' }, otherId: 'weg' }],
      kennt: () => false,
    }),
  ),
  [],
);

/* Und der Weg nach rechts ist der mit der Wahl – so wie der Auftrag ihn will. */
{
  const k9 = FK.figurkarte(figurlage(figur(), [{ relation: { type: 'related' }, otherId: 'x' }]));
  p('  rechts geht drei Ebenen tief', T.reichweite(k9, 'rechts'), 3);
  p('  und verlangt auf Ebene eins eine Wahl', T.wahlOffen(k9, 'rechts', 1, []), true);
  p('  ohne Wahl ist er eine Ebene lang', T.begehbar(k9, 'rechts', []), 1);
}

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
