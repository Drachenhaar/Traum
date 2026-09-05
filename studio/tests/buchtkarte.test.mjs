/*
 * Die Bucht auf einer ganzen Karte.
 *
 * `bucht.test.mjs` prüft die Geometrie: Was macht ein Strich aus *einer*
 * Fläche? Hier geht es um die drei Fragen darüber –
 *
 *   Welche Flächen eine Bucht überhaupt angeht.
 *   Wer nach dem Durchtrennen den Namen behält.
 *   Woran man erkennt, dass gar nichts geschehen ist.
 *
 * Sie standen zuerst im Bauteil `Weltkarte.tsx` und waren damit nur durch
 * Hinsehen zu belegen. Bedeutung gehört in `lib`, und was in `lib` steht,
 * kann man ausführen.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';

const S = ARBEIT;
execSync(`npx esbuild src/lib/karte/bucht.ts --bundle --format=esm --outfile=${S}/t/buchtkarte.mjs`, {
  stdio: 'pipe',
});
const B = await import(S + '/t/buchtkarte.mjs');

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

/** Eine Karte, wie sie jemand gemalt hätte: Land, ein Wald darauf, ein See daneben. */
const karte = () => [
  { id: 'f_land', art: 'land', punkte: kueste(5, 500, 500, 260), seed: 111, entryId: 'e_insel' },
  { id: 'f_wald', art: 'wald', punkte: kueste(9, 560, 500, 90), seed: 222, entryId: 'e_forst' },
  { id: 'f_see', art: 'wasser', punkte: kueste(3, 330, 500, 70), seed: 333 },
];

/* ==========================================================================
 * 1  WEN SIE ANGEHT
 * ======================================================================= */

console.log('\n1 Wen die Bucht angeht');

{
  /*
   * Ein Strich von links quer durch Land, See und Wald.
   *
   * Land und Wald müssen beide nachgeben; der See nicht. Eine Bucht, die das
   * Land wegnimmt und den Wald stehen lässt, ergäbe einen Wald, der über dem
   * Meer hängt – das war der Grund, überhaupt *alle* getroffenen Flächen zu
   * bearbeiten statt der am meisten getroffenen.
   */
  const vorher = karte();
  const nachher = B.buchtZiehen(vorher, spur(120, 500, 600, 500), 34);
  wahr('  es passiert etwas', Array.isArray(nachher));

  const zahl = (art) => nachher.filter((f) => f.art === art).length;
  const punkteVon = (id) => vorher.find((f) => f.id === id).punkte;
  const jetzt = (id) => nachher.find((f) => f.id === id);

  /*
   * „Geändert" heisst hier zweierlei, und beides muss stimmen: Die Fläche ist
   * **noch da**, und ihre Punkte sind andere. Der erste Anlauf fragte nur das
   * Zweite – und weil eine verschwundene Fläche ebenfalls „andere Punkte" hat
   * (nämlich keine), wäre die Zusicherung grün geblieben, wenn das Land ganz
   * abhandengekommen wäre. Gefunden hat das die Gegenprobe, die daran
   * abgestürzt ist statt zu melden.
   */
  const geaendert = (id) => !!jetzt(id) && jetzt(id).punkte !== punkteVon(id);

  wahr('  das Land hat sich geändert', geaendert('f_land'));
  wahr('  der Wald darauf ebenfalls', geaendert('f_wald'), 'sonst hinge er über dem Meer');
  wahr(
    '  das Wasser bleibt unangetastet',
    jetzt('f_see')?.punkte === punkteVon('f_see'),
    'eine Bucht ist Wasser – sie kann das Meer nicht wegnehmen',
  );
  wahr(`  und der See ist noch da (${zahl('wasser')})`, zahl('wasser') === 1);
}

/*
 * Ein Strich, der nur über Wasser läuft, tut nichts – auch dann nicht, wenn
 * er das Wasser voll trifft. Ohne diese Zusicherung wäre „Wasser bleibt
 * verschont" nur die Beobachtung, dass zufällig nichts passiert ist.
 */
{
  const nur = [{ id: 'f_see', art: 'wasser', punkte: kueste(3, 500, 500, 200), seed: 1 }];
  wahr(
    '  ein Strich mitten durchs Wasser ändert nichts',
    B.buchtZiehen(nur, spur(200, 500, 800, 500), 40) === undefined,
  );
}

/* ==========================================================================
 * 2  WER DEN NAMEN BEHÄLT
 * ======================================================================= */

console.log('\n2 Wer den Namen behält');

{
  /* Ein Schnitt quer durch alles – die Landmasse zerfällt. */
  const vorher = karte();
  const nachher = B.buchtZiehen(vorher, spur(120, 480, 880, 520), 30);
  const land = nachher.filter((f) => f.art === 'land');
  wahr(`  aus einer Landmasse werden mehrere (${land.length})`, land.length >= 2);

  /*
   * Mit `?.` weiter, nicht mit `.`.
   *
   * Die Gegenprobe – dem Hauptstück Kennung und Seite wegnehmen – liess den
   * Testlauf hier abstürzen statt eine Zeile zu melden. Eine Prüfung, die bei
   * dem Fehler abbricht, den sie sucht, verschweigt alles, was danach käme.
   */
  const haupt = land.find((f) => f.id === 'f_land');
  wahr('  eines davon ist die alte Fläche', !!haupt);
  wahr('  und behält seine Seite', haupt?.entryId === 'e_insel');

  const rest = land.filter((f) => f.id !== 'f_land');
  wahr('  die übrigen sind namenlos', rest.every((f) => f.entryId === undefined));
  wahr('  haben eigene Kennungen', rest.every((f) => f.id && f.id !== 'f_land'));
  /*
   * Aber denselben Startwert. Daran hängen die Bäume: Ein Wald, der beim
   * Durchtrennen auf einer Seite neu ausgewürfelt würde, spränge vor den
   * Augen des Verfassers an einen anderen Ort.
   */
  wahr('  und erben den Startwert', rest.every((f) => f.seed === 111));

  const flaeche = (p) => {
    let m = 0;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      m += p[j][0] * p[i][1] - p[i][0] * p[j][1];
    }
    return Math.abs(m) / 2;
  };
  wahr(
    `  das Hauptstück ist das grösste (${haupt ? Math.round(flaeche(haupt.punkte)) : '—'})`,
    !!haupt && rest.every((f) => flaeche(f.punkte) <= flaeche(haupt.punkte)),
  );
}

/* ==========================================================================
 * 3  WORAN MAN ERKENNT, DASS NICHTS GESCHAH
 *
 * Der Unterschied zwischen „nichts geändert" und „geändert, aber es sieht
 * gleich aus" ist oben ein Eintrag im Rückgängig. Wer ihn verliert, muss
 * dreimal „Zurücknehmen" drücken, um einen Strich zurückzunehmen.
 * ======================================================================= */

console.log('\n3 Wenn nichts geschieht');

wahr(
  '  ein Strich neben der Karte gibt undefined',
  B.buchtZiehen(karte(), spur(20, 20, 90, 60), 30) === undefined,
);
wahr('  auf einer leeren Karte auch', B.buchtZiehen([], spur(100, 100, 400, 400), 30) === undefined);
wahr('  und ein Tippen ebenfalls', B.buchtZiehen(karte(), [[500, 500]], 30) === undefined);

/*
 * Und wenn eine Fläche ganz weggenommen wird, verschwindet sie – die Liste
 * kommt kürzer zurück, nicht mit einer leeren Fläche darin.
 */
{
  const klein = [
    { id: 'f_a', art: 'land', punkte: kueste(7, 500, 500, 40), seed: 1 },
    { id: 'f_b', art: 'land', punkte: kueste(7, 200, 200, 120), seed: 2 },
  ];
  const nachher = B.buchtZiehen(klein, spur(400, 500, 600, 500), 90);
  wahr(`  eine ganz abgetragene Fläche fällt weg (${nachher?.length})`, nachher?.length === 1);
  wahr('  und die andere steht noch', nachher[0].id === 'f_b');
}

console.log(`\n  ${ok} bestanden, ${bad} gescheitert\n`);
process.exit(bad ? 1 : 0);
