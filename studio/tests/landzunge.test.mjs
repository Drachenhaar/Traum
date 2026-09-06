/*
 * Die Landzunge – der Spiegel der Bucht.
 *
 * Geprüft wird vor allem, wo die Spiegelung **gilt** und wo sie absichtlich
 * bricht:
 *
 *   gilt    Was ein Strich verbindet, ist danach eine Fläche.
 *   gilt    Ein Strich, der nichts trifft, ändert nichts.
 *   bricht  Die Bucht trifft alles ausser Wasser. Die Landzunge wächst an
 *           genau einer Fläche – sonst wüchse ein Wald ins Meer hinaus.
 *   neu     Das Wasser weicht, weil es sonst über der Landzunge läge.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';

const S = ARBEIT;
execSync(`npx esbuild src/lib/karte/landzunge.ts --bundle --format=esm --outfile=${S}/t/landzunge.mjs`, {
  stdio: 'pipe',
});
const L = await import(S + '/t/landzunge.mjs');
execSync(`npx esbuild src/lib/karte/kontur.ts --bundle --format=esm --outfile=${S}/t/kontur2.mjs`, {
  stdio: 'pipe',
});
const K = await import(S + '/t/kontur2.mjs');

let ok = 0;
let bad = 0;
function wahr(was, bedingung, hinweis = '') {
  if (bedingung) {
    ok++;
  } else {
    bad++;
    console.error(`  ✗ ${was}${hinweis ? ` – ${hinweis}` : ''}`);
  }
}

/** Eine unruhige Küste – siehe `bucht.test.mjs`, warum kein Quadrat. */
function kueste(seed, cx, cy, r, n = 40) {
  let z = seed;
  const zuf = () => ((z = (z * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const p = [];
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2;
    const rr = r * (0.9 + zuf() * 0.2);
    p.push([cx + Math.cos(w) * rr, cy + Math.sin(w) * rr]);
  }
  return p;
}
const spur = (ax, ay, bx, by, n = 30) => {
  const p = [];
  for (let i = 0; i <= n; i++) p.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n]);
  return p;
};
const inhalt = (p) => Math.abs(K.flaechenmass(p)) / 2;
const drin = (x, y, poly) => {
  let ja = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ja = !ja;
  }
  return ja;
};

/* ==========================================================================
 * 1  SIE WÄCHST DORT, WO SIE GEZOGEN WIRD
 * ======================================================================= */

console.log('\n1 Die Landzunge');

{
  const land = { id: 'f_land', art: 'land', punkte: kueste(5, 400, 500, 180), seed: 11, entryId: 'e_insel' };
  const vorher = inhalt(land.punkte);
  /* Von innen heraus nach rechts – aus der Küste hinaus ins Freie. */
  const nachher = L.landzungeZiehen([land], spur(380, 500, 750, 500), 26);
  wahr('  es passiert etwas', Array.isArray(nachher));
  const jetzt = nachher.find((f) => f.id === 'f_land');
  wahr('  die Fläche bleibt dieselbe', !!jetzt);
  wahr('  und behält ihre Seite', jetzt?.entryId === 'e_insel');
  wahr(
    `  sie wird grösser (${Math.round(vorher)} → ${Math.round(inhalt(jetzt.punkte))})`,
    inhalt(jetzt.punkte) > vorher,
  );
  /*
   * Und zwar dort, wo gezogen wurde. Gemessen an der Fläche selbst statt am
   * Umriss – siehe `bucht.test.mjs`, wo eine Messung am Umriss die falsche
   * Stelle traf.
   */
  wahr('  vorher lag der Punkt draussen', !drin(700, 500, land.punkte));
  wahr('  danach liegt er auf der Zunge', drin(700, 500, jetzt.punkte));
  wahr('  und ein Punkt daneben bleibt draussen', !drin(700, 700, jetzt.punkte));
  wahr(`  es bleibt eine Fläche (${nachher.length})`, nachher.length === 1);
}

/* ==========================================================================
 * 2  WAS SIE VERBINDET, IST DANACH EINS
 *
 * Die genaue Umkehrung des Durchtrennens – und sie kostet keine Zeile
 * Sonderbehandlung, weil eine Maske nicht weiss, wie viele Flächen sie war.
 * ======================================================================= */

console.log('\n2 Verschmelzen');

{
  const gross = { id: 'f_gross', art: 'land', punkte: kueste(5, 300, 500, 150), seed: 11, entryId: 'e_gross' };
  const klein = { id: 'f_klein', art: 'land', punkte: kueste(9, 720, 500, 90), seed: 22, entryId: 'e_klein' };
  const nachher = L.landzungeZiehen([gross, klein], spur(300, 500, 720, 500), 24);
  const land = nachher.filter((f) => f.art === 'land');
  wahr(`  aus zwei Inseln wird eine (${land.length})`, land.length === 1);
  /*
   * Und der Name des **grösseren Ausgangsstücks** überlebt. Beim Durchtrennen
   * entschied das grösste Ergebnis, hier das grösste Mitgebrachte: Dort
   * zerfiel eine Fläche und es ging um „welcher Teil bleibt sie", hier
   * verschmelzen mehrere und es geht um „wessen Name überlebt".
   */
  wahr('  und behält den Namen der grösseren', land[0]?.id === 'f_gross');
  wahr('  die kleinere ist verschwunden', !nachher.some((f) => f.id === 'f_klein'));
  wahr(
    '  die neue Fläche umfasst beide alten',
    drin(300, 500, land[0].punkte) && drin(720, 500, land[0].punkte),
  );
  wahr(
    `  und mehr als ihre Summe (${Math.round(inhalt(land[0].punkte))})`,
    inhalt(land[0].punkte) > inhalt(gross.punkte) + inhalt(klein.punkte),
    'der Steg dazwischen gehört dazu',
  );
}

/* ==========================================================================
 * 3  WO DIE SPIEGELUNG BRICHT
 *
 * Die Bucht trifft **alles**, was sie berührt – sonst hinge ein Wald über dem
 * Meer. Die Landzunge wächst an **einer** Fläche: Wer sie zieht, meint Land,
 * und dass dabei ein Wald mit ins Meer hinauswüchse, hat niemand gemeint.
 * ======================================================================= */

console.log('\n3 Nur eine wächst');

{
  const land = { id: 'f_land', art: 'land', punkte: kueste(5, 400, 500, 200), seed: 11 };
  const wald = { id: 'f_wald', art: 'wald', punkte: kueste(9, 420, 500, 90), seed: 22 };
  /* Der Strich beginnt mitten im Wald und zieht hinaus über die Küste. */
  const nachher = L.landzungeZiehen([land, wald], spur(420, 500, 800, 500), 24);
  const jetztWald = nachher.find((f) => f.id === 'f_wald');
  const jetztLand = nachher.find((f) => f.id === 'f_land');
  wahr('  der Wald wächst (dort begann der Strich)', inhalt(jetztWald.punkte) > inhalt(wald.punkte));
  wahr(
    '  das Land darunter bleibt unberührt',
    jetztLand.punkte === land.punkte,
    'sonst wüchsen zwei Flächen an einem Strich',
  );
}

{
  const land = { id: 'f_land', art: 'land', punkte: kueste(5, 400, 500, 200), seed: 11 };
  const wald = { id: 'f_wald', art: 'wald', punkte: kueste(9, 420, 500, 90), seed: 22 };
  /* Und andersherum: ausserhalb des Waldes beginnen, aber im Land. */
  const nachher = L.landzungeZiehen([land, wald], spur(560, 500, 900, 500), 24);
  wahr(
    '  beginnt der Strich im Land, wächst das Land',
    inhalt(nachher.find((f) => f.id === 'f_land').punkte) > inhalt(land.punkte),
  );
  wahr(
    '  und der Wald bleibt, wie er war',
    nachher.find((f) => f.id === 'f_wald').punkte === wald.punkte,
  );
}

/* ==========================================================================
 * 4  DAS WASSER WEICHT
 *
 * Wasser wird über Land gezeichnet (`EBENEN`). Eine Landzunge in einen See
 * hinein verschwände sonst darunter – man zöge einen Strich und sähe nichts.
 * ======================================================================= */

console.log('\n4 Das Wasser weicht');

{
  const land = { id: 'f_land', art: 'land', punkte: kueste(5, 300, 500, 150), seed: 11 };
  const see = { id: 'f_see', art: 'wasser', punkte: kueste(3, 640, 500, 150), seed: 33 };
  const nachher = L.landzungeZiehen([land, see], spur(300, 500, 700, 500), 26);
  const jetztSee = nachher.find((f) => f.id === 'f_see');
  wahr('  der See ist noch da', !!jetztSee);
  wahr(
    `  aber kleiner (${Math.round(inhalt(see.punkte))} → ${Math.round(inhalt(jetztSee.punkte))})`,
    inhalt(jetztSee.punkte) < inhalt(see.punkte),
    'sonst läge er über der Landzunge',
  );
  wahr(
    '  und genau dort, wo die Zunge liegt, ist kein Wasser mehr',
    drin(640, 500, see.punkte) && !drin(640, 500, jetztSee.punkte),
  );
}

{
  /* Ein See, den der Strich gar nicht berührt, bleibt unangetastet. */
  const land = { id: 'f_land', art: 'land', punkte: kueste(5, 300, 500, 150), seed: 11 };
  const fern = { id: 'f_fern', art: 'wasser', punkte: kueste(3, 700, 150, 80), seed: 33 };
  const nachher = L.landzungeZiehen([land, fern], spur(300, 500, 600, 500), 24);
  wahr(
    '  ein See abseits bleibt, wie er war',
    nachher.find((f) => f.id === 'f_fern').punkte === fern.punkte,
  );
}

/* ==========================================================================
 * 5  WAS NICHTS TUN SOLL
 * ======================================================================= */

console.log('\n5 Wenn nichts geschieht');

const nurLand = [{ id: 'f_land', art: 'land', punkte: kueste(5, 400, 500, 150), seed: 11 }];

wahr(
  '  ein Strich frei im Wasser ist keine Landzunge',
  L.landzungeZiehen(nurLand, spur(800, 100, 950, 250), 26) === undefined,
  'das wäre eine Insel – und Inseln malt man mit „Land"',
);
wahr('  auf leerer Karte geschieht nichts', L.landzungeZiehen([], spur(100, 100, 400, 400), 26) === undefined);
wahr('  ein Tippen auch nicht', L.landzungeZiehen(nurLand, [[400, 500]], 26) === undefined);
/*
 * Und an Wasser wächst nichts an. Eine Landzunge, die aus einem See
 * herauswächst, wäre kein Wort dieser Sprache – sie ist Land.
 */
wahr(
  '  an einer Wasserfläche wächst nichts',
  L.landzungeZiehen(
    [{ id: 'f_see', art: 'wasser', punkte: kueste(3, 400, 500, 150), seed: 1 }],
    spur(400, 500, 800, 500),
    26,
  ) === undefined,
);

/* ==========================================================================
 * 6  DAS ANFÜGEN FÜR SICH
 *
 * `landzungeZiehen` prüft den Treffer selbst, bevor es `anfuegen` ruft – die
 * Wache dort ist auf diesem Weg unerreichbar. Sie steht trotzdem richtig:
 * `anfuegen` ist eine öffentliche Funktion des Konturenzugs und muss allein
 * stehen können. Also wird sie hier auch allein geprüft.
 * ======================================================================= */

console.log('\n6 Das Anfügen für sich');

{
  const insel = kueste(5, 400, 500, 150);
  wahr(
    '  ein Strich abseits fügt nichts an',
    K.anfuegen([insel], spur(850, 120, 960, 230), 20) === undefined,
  );
  wahr('  ohne Fläche geht nichts', K.anfuegen([], spur(100, 100, 400, 400), 20) === undefined);
  wahr('  und ein Tippen ist kein Strich', K.anfuegen([insel], [[400, 500]], 20) === undefined);

  const gewachsen = K.anfuegen([insel], spur(400, 500, 760, 500), 22);
  wahr(`  ein Strich hinaus verlängert die Küste (${gewachsen?.length})`, gewachsen?.length === 1);
  wahr('  und macht sie grösser', inhalt(gewachsen[0]) > inhalt(insel));

  /*
   * Zwei Flächen, ein Strich, ein Umriss – ohne dass irgendwo „verschmelzen"
   * stünde. Eine Maske weiss nicht, wie viele Flächen sie einmal war.
   */
  const zweite = kueste(9, 780, 500, 90);
  const eins = K.anfuegen([insel, zweite], spur(400, 500, 780, 500), 22);
  wahr(`  zwei Flächen und ein Strich ergeben eine (${eins?.length})`, eins?.length === 1);
  wahr(
    '  und sie umfasst beide',
    drin(400, 500, eins[0]) && drin(780, 500, eins[0]),
  );
}

console.log(`\n  ${ok} bestanden, ${bad} gescheitert\n`);
process.exit(bad ? 1 : 0);
