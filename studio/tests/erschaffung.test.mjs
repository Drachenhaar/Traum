/*
 * Der Weg durch die Erschaffung.
 *
 * Gemessen war er dreizehn Klicks lang, davon sechs eine Führung an einer
 * fremden Beispielwelt – **bevor** das eigene Buch ein Wort enthielt. Dieser
 * Test hält die Entscheidung fest, die daraus folgte:
 *
 *   Die Führung liegt nicht im Pflichtweg.
 *   Und sie kehrt dorthin zurück, wo sie verlassen wurde.
 *
 * Beide Sätze sind Aussagen über die Bedienung, nicht über die Darstellung –
 * und deshalb hier prüfbar statt nur nachklickbar.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';

const S = ARBEIT;
execSync(`npx esbuild src/lib/onboarding/weg.ts --bundle --format=esm --outfile=${S}/t/weg.mjs`, {
  stdio: 'pipe',
});
const W = await import(S + '/t/weg.mjs');

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

/* ==========================================================================
 * 1  DER PFLICHTWEG
 * ======================================================================= */

console.log('\n1 Der Pflichtweg');

wahr(
  `  drei Abschnitte, nicht vier (${W.PFLICHTWEG.join(' → ')})`,
  W.PFLICHTWEG.length === 3,
);
wahr(
  '  und die Führung ist keiner davon',
  !W.PFLICHTWEG.includes('fuehrung'),
  'sie stand einmal zwischen Buch und erstem Wort',
);
wahr('  er beginnt bei der Absicht', W.PFLICHTWEG[0] === 'absicht');
wahr('  und endet beim eigenen Anfang', W.PFLICHTWEG.at(-1) === 'anfang');

/*
 * Und der gelaufene Weg ist wirklich der aufgeschriebene.
 *
 * Ohne diese Zusicherung wäre `PFLICHTWEG` eine Behauptung neben dem Code:
 * Man könnte die Führung wieder einhängen, ohne die Liste zu ändern, und der
 * Test bliebe grün.
 */
{
  const gelaufen = ['absicht'];
  let jetzt = 'absicht';
  for (const was of ['gewaehlt', 'gebunden']) {
    jetzt = W.naechsterAbschnitt(jetzt, was);
    gelaufen.push(jetzt);
  }
  wahr(
    `  wer nur weiterklickt, läuft genau ihn (${gelaufen.join(' → ')})`,
    JSON.stringify(gelaufen) === JSON.stringify([...W.PFLICHTWEG]),
  );
}

/* ==========================================================================
 * 2  DER ABSTECHER
 * ======================================================================= */

console.log('\n2 Der Abstecher');

wahr(
  '  die Führung ist vom Anfang aus erreichbar',
  W.naechsterAbschnitt('anfang', 'fuehrungGewuenscht') === 'fuehrung',
);

/*
 * Und danach steht man wieder vor derselben Frage.
 *
 * **Nicht** im Buch. Die Führung war die Antwort auf „ich weiss noch nicht,
 * was ich schreiben soll" – jemanden danach an dieser Frage vorbeizuschicken
 * hiesse, ihm genau die zu ersparen, die er beantworten wollte.
 */
wahr(
  '  und führt an genau die Stelle zurück, die man verlassen hat',
  W.naechsterAbschnitt('fuehrung', 'fuehrungFertig') === 'anfang',
);

/* Von der Führung aus kommt man nirgends anders hin. */
wahr(
  '  aus der Führung heraus gibt es keinen anderen Ausgang',
  ['gewaehlt', 'gebunden', 'fuehrungGewuenscht'].every(
    (was) => W.naechsterAbschnitt('fuehrung', was) === 'fuehrung',
  ),
);

/* ==========================================================================
 * 3  WAS NICHT PASSIEREN DARF
 *
 * Ein Weg, der bei einem unerwarteten Ereignis rät, verliert Leute an
 * Stellen, an denen niemand nachsieht. Unbekannte Übergänge lassen den
 * Abschnitt deshalb stehen.
 * ======================================================================= */

console.log('\n3 Was nichts tut');

wahr(
  '  ein fremdes Ereignis bewegt nichts',
  W.naechsterAbschnitt('absicht', 'gebunden') === 'absicht' &&
    W.naechsterAbschnitt('buch', 'gewaehlt') === 'buch' &&
    W.naechsterAbschnitt('anfang', 'gebunden') === 'anfang',
);

/*
 * Und keine Rückwärtstür.
 *
 * Aus dem gebundenen Buch heraus noch einmal die Absicht zu fragen wäre eine
 * Tür, die im Kreis führt – dieselbe Überlegung, aus der die Schauseiten kein
 * „Zurück" auf ihrer ersten Seite haben. Wer die Wahl ändern will, findet sie
 * in „Mein Buch".
 */
{
  const alle = ['absicht', 'buch', 'fuehrung', 'anfang'];
  const ereignisse = ['gewaehlt', 'gebunden', 'fuehrungGewuenscht', 'fuehrungFertig'];
  const rueckwaerts = [];
  for (const von of alle) {
    for (const was of ereignisse) {
      const nach = W.naechsterAbschnitt(von, was);
      /* „Zurück" heisst: von einem späteren Pflichtabschnitt auf einen früheren. */
      const a = W.PFLICHTWEG.indexOf(von);
      const b = W.PFLICHTWEG.indexOf(nach);
      if (a >= 0 && b >= 0 && b < a) rueckwaerts.push(`${von} --${was}--> ${nach}`);
    }
  }
  wahr(`  niemand wird zurückgeschickt (${rueckwaerts.length})`, rueckwaerts.length === 0, rueckwaerts.join(', '));
}

console.log(`\n  ${ok} bestanden, ${bad} gescheitert\n`);
process.exit(bad ? 1 : 0);
