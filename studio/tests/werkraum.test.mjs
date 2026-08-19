/*
 * Kontext statt globaler Navigation.
 *
 * Die interessanten Zusicherungen hier sind wieder Verneinungen, und diesmal
 * aus einem anderen Grund als bei der Geste: Eine Bedienung, die sich je nach
 * Ort verändert, ist genau so lange gut, wie man ihr trotzdem trauen kann.
 * Geprüft wird deshalb vor allem, was **nicht** wechselt:
 *
 *   – Es gibt überall vier Richtungen, nie drei.
 *   – Jede Richtung führt überall mindestens eine Ebene weit.
 *   – Kein Arbeitsraum verweist auf einen Inhalt, den es nicht gibt.
 *   – Die Regel „dieselbe Richtung geht tiefer, die Gegenrichtung zurück"
 *     gilt in jedem Arbeitsraum wörtlich gleich.
 *
 * Was sich unterscheiden *darf*, ist der Wortschatz: Namen, Zeilen, Tiefen.
 * Dass sich das tatsächlich unterscheidet, wird ebenfalls geprüft – eine
 * kontextuelle Bedienung, in der alle Kontexte gleich aussehen, ist nur eine
 * kompliziertere globale.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';
const S = ARBEIT;
for (const [aus, ein] of [
  ['w-werkraum', 'src/lib/raum/werkraum.ts'],
  ['w-geste', 'src/lib/raum/geste.ts'],
  ['w-konfig', 'src/lib/raum/konfig.ts'],
  ['w-flaeche', 'src/lib/raum/flaeche.ts'],
])
  execSync(`npx esbuild ${ein} --bundle --format=esm --outfile=${S}/t/${aus}.mjs`, { stdio: 'pipe' });
const W = await import(S + '/t/w-werkraum.mjs');
const G = await import(S + '/t/w-geste.mjs');
const K = await import(S + '/t/w-konfig.mjs');
const F = await import(S + '/t/w-flaeche.mjs');

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
const RAEUME = Object.keys(W.WERKRAEUME);
/* Die sechs Inhalte, die es gibt. Mehr darf keine Tabelle nennen. */
const INHALTE = ['wesen', 'zusammenhang', 'geflecht', 'welt', 'wissen', 'notizen'];

/* ------------------------------------------------- Die Grammatik bleibt -- */

console.log('\n1 Was in jedem Arbeitsraum gleich ist');

wahr('  es gibt mehr als einen Arbeitsraum', RAEUME.length > 1);

for (const r of RAEUME) {
  const w = W.wege(r);
  p(`  ${r} hat genau vier Richtungen`, Object.keys(w).sort(), [...RICHTUNGEN].sort());

  for (const ri of RICHTUNGEN) {
    /*
     * Keine geschlossene Tür.
     *
     * Eine Richtung, die in einem Arbeitsraum ins Leere führt, ist schlimmer
     * als eine, die in einen kleinen Raum führt: Beim ersten Mal hält man sie
     * für kaputt, beim zweiten traut man der Geste nicht mehr.
     */
    wahr(`  ${r}/${ri} führt mindestens eine Ebene weit`, W.hoechsteTiefe(r, ri) >= 1);
    wahr(`  ${r}/${ri} hat einen Namen`, W.weg(r, ri).name.length > 0);
    wahr(`  ${r}/${ri} hat eine Zeile dazu`, W.weg(r, ri).was.length > 0);

    for (const e of W.weg(r, ri).ebenen) {
      /* Der Fehler, der in diesem Projekt schon einmal zwei Räume still leer ließ. */
      wahr(`  ${r}/${ri}: „${e.raum}" ist ein Inhalt, den es gibt`, INHALTE.includes(e.raum));
      wahr(`  ${r}/${ri}: „${e.titel}" ist eine Überschrift`, e.titel.length > 0);
    }
  }
}

/* Kein Weg reicht über die globale Obergrenze hinaus. */
for (const r of RAEUME)
  for (const ri of RICHTUNGEN)
    wahr(
      `  ${r}/${ri} bleibt unter der höchsten Tiefe`,
      W.hoechsteTiefe(r, ri) <= k.geste.hoechsteTiefe,
    );

/* --------------------------------------------- Die Regel gilt überall ---- */

console.log('\n2 Dieselbe Regel in jedem Arbeitsraum');

/*
 * `naechsterStand` bekommt die Reichweite jetzt von außen. Die Regel selbst
 * darf davon nicht abhängen – nur ihr Anschlag.
 */
for (const r of RAEUME) {
  for (const ri of RICHTUNGEN) {
    const reich = W.hoechsteTiefe(r, ri);
    p(
      `  ${r}: aus der Mitte führt ${ri} in die erste Tiefe`,
      G.naechsterStand({ ort: 'mitte', tiefe: 0 }, ri, k, reich),
      { ort: ri, tiefe: 1 },
    );
    p(
      `  ${r}: aus Tiefe 1 führt ${ri} zurück in die Mitte`,
      G.naechsterStand({ ort: ri, tiefe: 1 }, G.GEGEN[ri], k, reich),
      { ort: 'mitte', tiefe: 0 },
    );
    /* Und tiefer geht es genau bis zum Anschlag dieses Weges – nie weiter. */
    let stand = { ort: 'mitte', tiefe: 0 };
    for (let i = 0; i < 6; i++) stand = G.naechsterStand(stand, ri, k, reich);
    p(`  ${r}: ${ri} endet bei Tiefe ${reich}`, stand, { ort: ri, tiefe: reich });
  }
}

/*
 * Die Quergeste tut weiterhin nichts – das ist die Regel, die Verirren
 * verhindert, und sie darf durch die Reichweite nicht aufgeweicht werden.
 */
p(
  '  quer aus der Tiefe bleibt stehen',
  G.naechsterStand({ ort: 'rechts', tiefe: 2 }, 'oben', k, 3),
  { ort: 'rechts', tiefe: 2 },
);

/* Ohne Reichweite gilt weiterhin die Konfiguration – alte Aufrufe bleiben gültig. */
p(
  '  ohne Angabe gilt die globale Obergrenze',
  G.naechsterStand({ ort: 'rechts', tiefe: 3 }, 'rechts', k),
  { ort: 'rechts', tiefe: k.geste.hoechsteTiefe },
);

/* -------------------------------------------- Der Wortschatz wechselt ---- */

console.log('\n3 Was sich unterscheidet');

/*
 * Wenn alle Arbeitsräume dieselben vier Namen trügen, wäre diese ganze
 * Änderung eine kompliziertere Fassung von vorher.
 */
{
  const namen = RAEUME.map((r) => RICHTUNGEN.map((ri) => W.weg(r, ri).name).join('|'));
  wahr('  nicht alle Arbeitsräume heißen gleich', new Set(namen).size > 1);
  const tiefen = RAEUME.map((r) => RICHTUNGEN.map((ri) => W.hoechsteTiefe(r, ri)).join('|'));
  wahr('  nicht alle reichen gleich weit', new Set(tiefen).size > 1);
}

/* Der Charakterraum ist der tiefste – dort liegt das ganze Geflecht. */
wahr(
  '  im Charakterraum reichen die Beziehungen am weitesten',
  W.hoechsteTiefe('charakter', 'rechts') >= W.hoechsteTiefe('roman', 'rechts'),
);
wahr(
  '  und dort liegt das Geflecht',
  W.weg('charakter', 'rechts').ebenen.some((e) => e.raum === 'geflecht'),
);

/*
 * Der Romanraum ist der ruhigste. Wer beim Schreiben drei Ebenen tief geht,
 * schreibt nicht mehr – deshalb reicht hier kein Weg so weit wie der tiefste
 * Weg des Systems.
 */
for (const ri of RICHTUNGEN)
  wahr(`  der Romanraum bleibt flach (${ri})`, W.hoechsteTiefe('roman', ri) <= 2);

/* Der Weltraum legt das Gewicht auf die Orte. */
wahr(
  '  im Weltraum reichen die Orte weiter als im Buchraum',
  W.hoechsteTiefe('welt', 'links') > W.hoechsteTiefe('buch', 'links'),
);

/* Der Buchraum ist die Fassung von vorher – der Heimatraum ändert sich nicht. */
p('  im Buchraum ist links eine Ebene tief', W.hoechsteTiefe('buch', 'links'), 1);
p('  und rechts drei', W.hoechsteTiefe('buch', 'rechts'), 3);
p('  rechts liegen dort Wesen, Zusammenhang, Geflecht', W.weg('buch', 'rechts').ebenen.map((e) => e.raum), [
  'wesen',
  'zusammenhang',
  'geflecht',
]);

/* ------------------------------------------------------- Wo bin ich? ----- */

console.log('\n4 Welcher Pfad führt in welchen Arbeitsraum');

p('  die Weltkarte ist der Weltraum', W.werkraumVon('/weltkarte'), 'welt');
p('  die Faltkarte auch', W.werkraumVon('/karte'), 'welt');
p('  der Schreibraum ist der Romanraum', W.werkraumVon('/schreiben/r1'), 'roman');
p('  das Romanregal auch', W.werkraumVon('/roman'), 'roman');
p('  der Tafelteil ist das Artbook', W.werkraumVon('/tafeln'), 'artbook');
p('  der Charakterspiegel ist der Charakterraum', W.werkraumVon('/spiegel/e1'), 'charakter');

/*
 * Der einzige Fall, den der Pfad allein nicht beantwortet.
 *
 * Einem Ort „Beziehungen" als tiefsten Weg anzubieten wäre eine Auskunft, die
 * nicht stimmt – also entscheidet der Anker mit.
 */
p('  ein Eintrag mit einer Figur ist der Charakterraum', W.werkraumVon('/eintrag/e1', 'character'), 'charakter');
p('  ein Eintrag mit einem Ort ist der Weltraum', W.werkraumVon('/eintrag/e1', 'location'), 'welt');
p('  ein Gegenstand landet im Heimatraum', W.werkraumVon('/eintrag/e1', 'item'), 'buch');
p('  und ohne Anker ebenfalls nicht', W.werkraumVon('/eintrag/e1'), 'buch');

/* Unbekanntes landet im Heimatraum und nicht im nächstbesten. */
p('  ein unbekannter Pfad ist der Buchraum', W.werkraumVon('/gibtesnicht'), 'buch');
p('  das Inhaltsverzeichnis auch', W.werkraumVon('/inhalt'), 'buch');

/* Und ein unbekannter Arbeitsraum liefert Wege statt eines Absturzes. */
p('  ein unbekannter Arbeitsraum fällt auf das Buch zurück', W.wege('gibtesnicht'), W.wege('buch'));

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
p(
  '  während einer laufenden Geste tritt nichts zurück',
  F.flaechenzustand(lage({ seitMs: 99999, phase: 'verpflichtend' }), k),
  'arbeit',
);
p(
  '  die Heimkehr schlägt auch die Tiefe',
  F.flaechenzustand(lage({ tiefe: 3, phase: 'heimkehrend' }), k),
  'heimkehr',
);
p(
  '  die Tiefe schlägt die Berührung',
  F.flaechenzustand(lage({ tiefe: 1, beruehrt: true }), k),
  'tiefe',
);

/*
 * Die Grenze, die der Auftrag ausdrücklich zieht: Zurückhaltung ja,
 * Verschwinden nein. Auch dann nicht, wenn jemand den Regler ganz nach unten
 * dreht – die Untergrenze steht im Code und nicht im Regler.
 */
console.log('\n6 Nichts verschwindet ganz');

for (const z of ['ruhe', 'beruehrung', 'arbeit', 'tiefe', 'heimkehr'])
  wahr(`  ${z} bleibt sichtbar`, F.deutlichkeit(z, k) >= 0.12);

{
  const null_ = { ...k, flaeche: { ...k.flaeche, ruheDeckkraft: 0 } };
  wahr(
    '  auch mit dem Regler auf null',
    F.deutlichkeit('ruhe', null_) >= 0.12 && F.deutlichkeit('tiefe', null_) >= 0.12,
  );
}

p('  bei der Arbeit steht alles voll da', F.deutlichkeit('arbeit', k), 1);
wahr('  in Ruhe weniger als bei Berührung', F.deutlichkeit('ruhe', k) < F.deutlichkeit('beruehrung', k));
wahr('  bei Berührung weniger als bei Arbeit', F.deutlichkeit('beruehrung', k) < F.deutlichkeit('arbeit', k));

/*
 * Zurücktreten darf langsam sein, Zurückkommen nicht. Wer den Finger auflegt
 * und wartet, legt ihn noch einmal auf.
 */
wahr('  Beruhigen dauert länger als Erscheinen', F.uebergangMs('ruhe', k) > F.uebergangMs('arbeit', k));

console.log(`\n${ok} bestanden, ${bad} gescheitert`);
process.exit(bad ? 1 : 0);
