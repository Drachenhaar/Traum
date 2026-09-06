/*
 * Die Kartografie – Saumlinien und Namenslage.
 *
 * Beide Ableitungen sind im Entwurf **einmal falsch gebaut** worden, und beide
 * Fehler waren im Bild sofort zu sehen und im Code unsichtbar. Genau die
 * halten die Zusicherungen hier fest:
 *
 *   Der Versatz je Eckpunkt überschlägt sich an enger Krümmung – aus einer
 *   Linie wird ein Knäuel. Geprüft wird deshalb, dass die Saumlinien sich
 *   nicht selbst schneiden.
 *
 *   Bei einer rundlichen Fläche gibt es keine lange Achse; die gemessene
 *   Richtung ist dann Rauschen. Geprüft wird deshalb, dass der Name dort
 *   waagerecht bleibt.
 */
import { execSync } from 'child_process';
import { ARBEIT } from './arbeit.mjs';

const S = ARBEIT;
execSync(
  `npx esbuild src/lib/karte/kartografie.ts --bundle --format=esm --outfile=${S}/t/kartografie.mjs`,
  { stdio: 'pipe' },
);
const G = await import(S + '/t/kartografie.mjs');

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
function kueste(seed, cx, cy, rx, ry = rx, n = 40) {
  let z = seed;
  const zuf = () => ((z = (z * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const p = [];
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2;
    const f = 0.9 + zuf() * 0.2;
    p.push([cx + Math.cos(w) * rx * f, cy + Math.sin(w) * ry * f]);
  }
  return p;
}

const flaeche = (p) => {
  let m = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    m += p[j][0] * p[i][1] - p[i][0] * p[j][1];
  }
  return Math.abs(m) / 2;
};

/**
 * Schneidet sich dieser Umriss selbst?
 *
 * Das ist die Frage, an der der erste Entwurf scheiterte: Ein Versatz je
 * Eckpunkt liefert an enger Krümmung eine Schleife, die durch sich selbst
 * hindurchläuft. Man sieht es sofort und misst es nur so.
 *
 * Benachbarte Kanten werden übersprungen – die berühren sich am gemeinsamen
 * Punkt, und das ist kein Schnitt, sondern eine Ecke.
 */
function schneidetSich(p) {
  const kreuzt = (a, b, c, d) => {
    const r = (o, x, y) => Math.sign((x[0] - o[0]) * (y[1] - o[1]) - (x[1] - o[1]) * (y[0] - o[0]));
    const d1 = r(a, b, c);
    const d2 = r(a, b, d);
    const d3 = r(c, d, a);
    const d4 = r(c, d, b);
    return d1 !== d2 && d3 !== d4 && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0;
  };
  const n = p.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (kreuzt(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return `${i}/${j}`;
    }
  }
  return null;
}

/* ==========================================================================
 * 1  DIE SAUMLINIEN LIEGEN AUSSEN – UND SCHNEIDEN SICH NICHT
 * ======================================================================= */

console.log('\n1 Die Saumlinien');

{
  const insel = kueste(7, 500, 500, 260);
  const [nah, fern] = G.saumlinien(insel, [16, 42]);
  wahr(`  ein Saum je Abstand (${nah?.length}, ${fern?.length})`, nah?.length === 1 && fern?.length === 1);
  wahr(
    `  der nahe liegt aussen (${Math.round(flaeche(insel))} → ${Math.round(flaeche(nah[0]))})`,
    flaeche(nah[0]) > flaeche(insel),
  );
  wahr('  der ferne noch weiter aussen', flaeche(fern[0]) > flaeche(nah[0]));
  /*
   * Und nicht beliebig weit. Ein Saum, der die Fläche verdoppelt, ist kein
   * Saum mehr, sondern ein zweites Land.
   */
  wahr(
    `  aber massvoll (${(flaeche(fern[0]) / flaeche(insel)).toFixed(2)}×)`,
    flaeche(fern[0]) / flaeche(insel) < 1.5,
  );
}

/*
 * Die Form, an der der Versatz je Eckpunkt zerbrach: eine lange, schmale
 * Landzunge mit spitzen Enden. Dort ist die Krümmung enger als der Abstand,
 * und der naive Weg legt die verschobenen Punkte übereinander.
 */
{
  const zunge = kueste(3, 500, 500, 380, 90, 48);
  for (const d of [14, 26, 44]) {
    const saum = G.saumlinien(zunge, [d])[0];
    wahr(`  Landzunge, Saum bei ${d}: eine Schleife (${saum.length})`, saum.length === 1);
    const kreuz = schneidetSich(saum[0]);
    wahr(`  und sie schneidet sich nicht`, kreuz === null, kreuz ? `bei Kanten ${kreuz}` : '');
  }
}

/* Auch die Fläche selbst darf sich nicht plötzlich in Stücke teilen. */
{
  const zwei = G.saumlinien(kueste(5, 500, 500, 200), [10])[0];
  wahr('  eine Insel gibt einen Saum, nicht zwei', zwei.length === 1);
}

/* ==========================================================================
 * 1b  DER SAUM GEHÖRT DER KÜSTE, NICHT DER INSEL
 *
 * Je Fläche gerechnet bekommt jede Insel ihren eigenen Ring – und wo zwei
 * Inseln einander nahe kommen, laufen zwei Ringe durcheinander hindurch. Auf
 * dem Telefon sah das aus wie ein Fehler im Papier.
 * ======================================================================= */

console.log('\n1b Zwei Inseln, eine Küste');

{
  /* Zwei Inseln so nah beieinander, dass ihre Säume einander erreichen. */
  const a = kueste(7, 380, 500, 150);
  const b = kueste(11, 700, 500, 130);
  const abstand = 42;

  /* Je Fläche: zwei Ringe, die sich gegenseitig durchqueren. */
  const einzeln = [...G.saumlinien(a, [abstand])[0], ...G.saumlinien(b, [abstand])[0]];
  wahr(`  je Fläche sind es zwei Ringe (${einzeln.length})`, einzeln.length === 2);
  const kreuzen = einzeln[0].some(([x, y], i) => {
    const n = einzeln[0][(i + 1) % einzeln[0].length];
    return einzeln[1].some(([px, py], j) => {
      const m = einzeln[1][(j + 1) % einzeln[1].length];
      const r = (o, u, v) => Math.sign((u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]));
      const d1 = r([x, y], n, [px, py]);
      const d2 = r([x, y], n, m);
      const d3 = r([px, py], m, [x, y]);
      const d4 = r([px, py], m, n);
      return d1 !== d2 && d3 !== d4;
    });
  });
  wahr('  und sie kreuzen einander wirklich', kreuzen, 'sonst prüft die nächste Zusicherung nichts');

  /* Gemeinsam gerechnet: eine Linie um beide. */
  const gemeinsam = G.kuestensaum([a, b], [abstand])[0];
  wahr(`  gemeinsam ist es eine Linie (${gemeinsam.length})`, gemeinsam.length === 1);
  const kreuz = schneidetSich(gemeinsam[0]);
  wahr('  und sie schneidet sich nicht', kreuz === null, kreuz ? `bei Kanten ${kreuz}` : '');
  wahr(
    '  sie umfasst beide Inseln',
    flaeche(gemeinsam[0]) > flaeche(a) + flaeche(b),
  );

  /*
   * Und sie liegt **überall** weit genug draussen.
   *
   * Das ist die Zusicherung für das Minimum über alle Küsten. Nähme das Feld
   * statt des nächsten Abstands irgendeinen – etwa den der zuletzt geprüften
   * Insel –, bekäme eine Stelle dicht an A den viel grösseren Abstand zu B
   * und gälte damit als weit vom Land entfernt. Der Saum würde dort nach
   * innen gezogen, genau in der Meerenge, wo man am ehesten hinsieht.
   *
   * Geprüft an Punkten knapp ausserhalb von A: Sie müssen alle innerhalb des
   * gemeinsamen Saums liegen.
   */
  const drinIn = (px, py, poly) => {
    let ja = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ja = !ja;
    }
    return ja;
  };
  const knappDraussen = a.map(([x, y]) => {
    const dx = x - 380;
    const dy = y - 500;
    const l = Math.hypot(dx, dy) || 1;
    return [x + (dx / l) * abstand * 0.5, y + (dy / l) * abstand * 0.5];
  });
  const draussen = knappDraussen.filter(([x, y]) => !drinIn(x, y, gemeinsam[0]));
  wahr(
    `  und liegt überall weit genug draussen (${draussen.length} von ${knappDraussen.length} daneben)`,
    draussen.length === 0,
  );
}

{
  /* Weit auseinander bleiben es zwei – das darf nicht verschmelzen. */
  const a = kueste(7, 200, 200, 90);
  const b = kueste(11, 800, 800, 90);
  wahr('  weit entfernte Inseln behalten je einen Saum', G.kuestensaum([a, b], [20])[0].length === 2);
}

/* ==========================================================================
 * 2  NACH INNEN
 *
 * Dieselbe Rechnung, andere Richtung – und hier ist der Versatz je Eckpunkt
 * zuerst zerbrochen. Über das Abstandsfeld geht auch das.
 * ======================================================================= */

console.log('\n2 Nach innen');

{
  const insel = kueste(7, 500, 500, 260);
  const innen = G.versetzt(insel, -60);
  wahr(`  es kommt etwas zurück (${innen.length})`, innen.length >= 1);
  wahr('  und liegt innen', flaeche(innen[0]) < flaeche(insel));
  const kreuz = schneidetSich(innen[0]);
  wahr('  ohne sich zu schneiden', kreuz === null, kreuz ? `bei Kanten ${kreuz}` : '');
}

{
  /*
   * Tiefer als die Fläche dick ist, bleibt nichts – und das ist die richtige
   * Antwort, keine Störung.
   */
  const klein = kueste(9, 500, 500, 60);
  wahr('  zu tief nach innen lässt nichts übrig', G.versetzt(klein, -200).length === 0);
}

/* ==========================================================================
 * 3  DIE NAMENSLAGE
 * ======================================================================= */

console.log('\n3 Wo der Name liegt');

{
  /* Eine rundliche Insel hat keine Richtung. */
  const rund = kueste(7, 500, 500, 240);
  const a = G.hauptachse(rund);
  wahr(`  eine runde Insel ist nicht gestreckt (${a.streckung.toFixed(2)})`, a.streckung < G.DEUTLICH);
  const lage = G.namenslage(rund);
  wahr(
    '  ihr Name bleibt waagerecht',
    lage.grad === 0,
    'sonst entscheidet das Rauschen der Küste über die Drehung',
  );
  wahr('  und ungesperrt', lage.sperrung === 0);
  wahr('  er sitzt im Schwerpunkt', Math.abs(lage.mx - 500) < 40 && Math.abs(lage.my - 500) < 40);
}

{
  /* Eine liegende Landzunge: viermal so lang wie breit, waagerecht. */
  const quer = kueste(3, 500, 500, 380, 95, 48);
  const a = G.hauptachse(quer);
  wahr(`  eine Landzunge ist gestreckt (${a.streckung.toFixed(2)})`, a.streckung > G.DEUTLICH);
  const lage = G.namenslage(quer);
  wahr(`  und ihr Name folgt ihr (${lage.grad.toFixed(1)}°)`, Math.abs(lage.grad) < 12);
  wahr('  gesperrt gesetzt', lage.sperrung > 0);
}

{
  /* Und eine stehende – der Name muss mitdrehen, aber nicht kopfstehen. */
  const hoch = kueste(3, 500, 500, 95, 380, 48);
  const lage = G.namenslage(hoch);
  wahr(`  eine stehende Zunge dreht mit (${lage.grad.toFixed(1)}°)`, Math.abs(Math.abs(lage.grad) - 90) < 12);
  /*
   * Auf −90…90 gebracht: Ein Name, der auf dem Kopf steht, ist auf keiner
   * Karte je richtig gewesen. Ohne diese Normierung liefert `atan2` je nach
   * Streuung auch Winkel jenseits davon.
   */
  wahr('  und steht nicht auf dem Kopf', lage.grad >= -90 && lage.grad <= 90);
}

{
  /* Eine schräge Zunge – 30 Grad gedreht. */
  const w = (30 * Math.PI) / 180;
  const schraeg = kueste(3, 500, 500, 380, 95, 48).map(([x, y]) => [
    500 + (x - 500) * Math.cos(w) - (y - 500) * Math.sin(w),
    500 + (x - 500) * Math.sin(w) + (y - 500) * Math.cos(w),
  ]);
  const lage = G.namenslage(schraeg);
  wahr(`  eine schräge Zunge ergibt ihren Winkel (${lage.grad.toFixed(1)}°)`, Math.abs(lage.grad - 30) < 12);
}

console.log(`\n  ${ok} bestanden, ${bad} gescheitert\n`);
process.exit(bad ? 1 : 0);
